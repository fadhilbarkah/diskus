#!/bin/sh
set -e

# Ensure the database directory exists
mkdir -p $(dirname "$DATABASE_PATH")

echo "Running database migrations..."
bun run db:migrate

echo "Starting backend server..."
exec bun run src/index.ts
