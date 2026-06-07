FROM oven/bun:1-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -S diskus && adduser -S diskus -G diskus

# Copy dependency files
COPY package.json bun.lock* bun.lockb* ./

# Install dependencies
RUN bun install

# Copy source files
COPY . .

# Create directory for SQLite DB and give ownership to non-root user
RUN mkdir -p /data && chown -R diskus:diskus /data /app

# Default environment variables
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/sqlite.db

# Expose port
EXPOSE 3000

# Copy and setup entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Run as non-root user
USER diskus

ENTRYPOINT ["/app/entrypoint.sh"]
