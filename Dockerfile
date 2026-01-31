# Build stage
FROM oven/bun:1-debian AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./

# Install production dependencies using npm
RUN npm install --omit=dev

# Copy built application from builder
COPY --from=builder /app/build ./build

# Environment variables
ENV NODE_ENV=production
ENV PORT=3420
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3420

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3420/health || exit 1

# Start the application
CMD ["node", "./build/index.js"]
