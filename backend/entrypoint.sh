#!/bin/sh
set -e

# Ensure the database directory exists
mkdir -p $(dirname "$DATABASE_PATH")

echo "Running database migrations..."
bun run db:migrate

if [ "$SEED_DB" = "true" ]; then
  echo "Running database seed..."
  bun run src/db/seed.ts
fi

echo "Starting backend server..."
exec bun run src/index.ts
