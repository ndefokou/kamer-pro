#!/bin/sh
set -e

echo "--- Running entrypoint.sh ---"
echo "Running as user: $(whoami)"
echo "DATABASE_URL is set"
ls -la ./backend
ldd ./backend || echo "ldd not available or failed"

# Optionally wait for Postgres to be ready (skip when SKIP_DB_WAIT=true)
if [ "$SKIP_DB_WAIT" = "true" ]; then
  echo "SKIP_DB_WAIT=true: skipping database readiness wait."
else
  echo "Waiting for PostgreSQL to be ready..."
  : "${MAX_DB_WAIT_SECONDS:=60}"
  waited=0
  # Use a short timeout on pg_isready to fail quickly
  until pg_isready -d "$DATABASE_URL" -t 2; do
    echo "Postgres is unavailable - sleeping"
    sleep 2
    waited=$((waited+2))
    if [ "$waited" -ge "$MAX_DB_WAIT_SECONDS" ]; then
      echo "Reached MAX_DB_WAIT_SECONDS=$MAX_DB_WAIT_SECONDS. Proceeding without confirmed DB readiness."
      break
    fi
  done
  echo "Database wait finished (waited ${waited}s)."
fi

# Ensure uploads directory exists and has correct permissions
mkdir -p /app/public/uploads
chown -R appuser:appuser /app/public

# Controlled migrations (set RUN_MIGRATIONS=true to run on container start)
if [ "$RESET_DB" = "true" ]; then
    echo "RESET_DB=true: attempting full reset (may fail on managed DBs)..."
    sqlx database reset -y --source /app/migrations || echo "Reset skipped/failed; continuing."
fi

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "RUN_MIGRATIONS=true: running migrations..."
  sqlx migrate run --source /app/migrations
else
  echo "RUN_MIGRATIONS not set; skipping migrations at container start."
fi

echo "--- Starting application ---"
exec su-exec appuser ./backend
