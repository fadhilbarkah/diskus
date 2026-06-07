#!/bin/sh
set -e

# Ensure the database directory exists and fix permissions while we are still root
mkdir -p $(dirname "$DATABASE_PATH")
chown -R diskus:diskus $(dirname "$DATABASE_PATH")

echo "Running database migrations..."
# Drop privileges to 'diskus' user to run the app
su-exec diskus bun run db:migrate

if [ "$SEED_DB" = "true" ]; then
  echo "Running database seed..."
  su-exec diskus bun run src/db/seed.ts
fi

echo "Starting backend server..."
exec su-exec diskus bun run src/index.ts
