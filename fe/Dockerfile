## Multi-stage build for frontend (Vite + Bun in monorepo)

# Build stage with Bun to leverage workspace and speed
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy minimal files first to leverage cache
COPY bun.lock package.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY serve-backend/package.json ./serve-backend/package.json
COPY packages/types/package.json ./packages/types/package.json

# Install all workspace deps with frozen lockfile
RUN bun install

# Copy the rest of the repo
COPY . .

# Build backend first (to generate types if needed), then build frontend
RUN bun run build:backend \
 && bun run build:frontend


# Runtime stage using Node to statically serve built assets
FROM node:22-alpine AS runner
WORKDIR /app

# Copy build output
COPY --from=builder /app/frontend/dist ./dist

# Copy entrypoint to inject env at runtime
COPY frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh \
 && npm install -g serve

ENV NODE_ENV=production
EXPOSE 5173

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["serve", "-s", "dist", "-l", "5173"]