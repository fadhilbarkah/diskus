FROM oven/bun:1-alpine

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Create directory for SQLite DB
RUN mkdir -p /data

# Default environment variables
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/sqlite.db

# Expose port
EXPOSE 3000

# Copy and setup entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
