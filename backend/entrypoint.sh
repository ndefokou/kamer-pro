#!/bin/sh
set -e

echo "--- Running entrypoint.sh ---"
echo "Running as user: $(whoami)"
echo "DATABASE_URL is set"

# Wait for Postgres to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -d "$DATABASE_URL"; do
  echo "Postgres is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is ready!"

# Ensure uploads directory exists and has correct permissions
mkdir -p /app/public/uploads
chown -R appuser:appuser /app/public

# Migration handling friendly to managed DBs (e.g., Supabase)
if [ "$RESET_DB" = "true" ]; then
    echo "RESET_DB=true: attempting full reset (may fail on managed DBs)..."
    sqlx database reset -y --source /app/migrations || echo "Reset skipped/failed; continuing."
fi

echo "Running migrations..."
sqlx migrate run --source /app/migrations

echo "--- Starting application ---"
exec su-exec appuser ./backend
