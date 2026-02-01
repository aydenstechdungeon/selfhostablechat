interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastAccessed: number; // Track for LRU eviction
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly maxEntries: number; // Prevent unbounded growth

  constructor(maxRequests: number, windowMs: number, maxEntries: number = 10000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.maxEntries = maxEntries;
  }

  check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.limits.get(key);

    // Clean up expired entry if exists
    if (entry && now > entry.resetTime) {
      this.limits.delete(key);
    }

    // Check if we need to evict entries (memory protection)
    if (!this.limits.has(key) && this.limits.size >= this.maxEntries) {
      this.evictLRU();
    }

    if (!entry || now > entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.windowMs,
        lastAccessed: now
      };
      this.limits.set(key, newEntry);
      
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: newEntry.resetTime
      };
    }

    // Update last accessed time
    entry.lastAccessed = now;

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    entry.count++;
    
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  reset(key: string): void {
    this.limits.delete(key);
  }

  private evictLRU(): void {
    // Find and remove the least recently used entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.limits.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.limits.delete(oldestKey);
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  getStats(): { size: number; maxEntries: number } {
    return {
      size: this.limits.size,
      maxEntries: this.maxEntries
    };
  }
}

export const userRateLimiter = new RateLimiter(60, 60000);

export const globalRateLimiter = new RateLimiter(100, 60000);

setInterval(() => {
  userRateLimiter.cleanup();
  globalRateLimiter.cleanup();
}, 60000);

export function checkRateLimit(userId: string | number): { allowed: boolean; remaining: number; resetTime: number } {
  const userKey = `user:${userId}`;
  const userCheck = userRateLimiter.check(userKey);
  
  if (!userCheck.allowed) {
    return userCheck;
  }

  const globalCheck = globalRateLimiter.check('global');

  if (!globalCheck.allowed) {
    // Rollback the user rate limit check since global limit is exceeded
    const userEntry = userRateLimiter['limits'].get(userKey);
    if (userEntry) {
      userEntry.count--;
    }
    return globalCheck;
  }

  return userCheck;
}
