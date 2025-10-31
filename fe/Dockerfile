## Multi-stage build for frontend (Vite + Bun)

# Build stage installs dependencies and compiles the app
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy dependency manifests separately to leverage Docker layer cache
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the frontend source and build it
COPY . .
RUN bun run build

# Runtime stage using Node to statically serve built assets
FROM node:22-alpine AS runner
WORKDIR /app

# Copy build output from the builder stage
COPY --from=builder /app/dist ./dist

# Copy entrypoint to inject env at runtime
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh \
 && npm install -g serve

ENV NODE_ENV=production
EXPOSE 5173

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["serve", "-s", "dist", "-l", "5173"]
