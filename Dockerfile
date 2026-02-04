# Base stage
FROM oven/bun:1-debian AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
# Install build dependencies for native modules if needed
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=3072"
RUN bun x svelte-kit sync
RUN bun run build

# Runner stage
FROM oven/bun:1-debian AS runner
WORKDIR /app

# Install runtime dependencies (curl for healthcheck)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3420
ENV HOST=0.0.0.0
# Prefer IPv4 DNS results (helps with container networking)
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

# Copy package files and install only production dependencies
COPY package.json bun.lock ./
# copying the lockfile is important for --frozen-lockfile
RUN bun install --frozen-lockfile --production

# Copy built application
COPY --from=builder /app/build ./build

# Expose port
EXPOSE 3420

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3420/health || exit 1

# Start the application
CMD ["bun", "run", "build/index.js"]
