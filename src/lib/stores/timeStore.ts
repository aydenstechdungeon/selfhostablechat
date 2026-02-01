import { readable } from 'svelte/store';

/**
 * A readable store that updates the current time at dynamic intervals.
 * - Updates every 5 seconds initially (for accurate "Xs ago" displays)
 * - After 1 minute of being active, slows to every 30 seconds
 * - After 5 minutes, slows to every 60 seconds
 * 
 * This provides a good balance between accuracy and performance.
 */
export function createTimeStore() {
  return readable(new Date(), (set) => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let currentInterval = 1500;
    let startTime = Date.now();
    
    const tick = () => {
      set(new Date());
      
      // Dynamic interval adjustment based on how long the store has been running
      const elapsed = Date.now() - startTime;
      let newInterval: number;
      
      if (elapsed < 60000) {
        // Under 1 minute: update every 1.5 seconds for "Xs ago" accuracy
        newInterval = 1500;
      } else if (elapsed < 300000) {
        // 1-5 minutes: update every 30 seconds for "Xm ago" accuracy
        newInterval = 30000;
      } else {
        // Over 5 minutes: update every minute
        newInterval = 65000;
      }
      
      // If interval changed, restart with new timing
      if (newInterval !== currentInterval) {
        currentInterval = newInterval;
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = setInterval(tick, currentInterval);
        }
      }
    };

    // Start with 5 second interval
    intervalId = setInterval(tick, currentInterval);

    // Cleanup
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  });
}

// Global singleton instance - import this to use reactive time
export const now = createTimeStore();
