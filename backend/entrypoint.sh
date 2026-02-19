#!/bin/sh
set -e

echo "--- Running entrypoint.sh ---"
echo "Running as user: $(whoami)"
echo "DATABASE_URL is set"

# Optionally wait for Postgres to be ready (skip when SKIP_DB_WAIT=true or for SQLite)
case "$DATABASE_URL" in
  sqlite*)
    echo "SQLite detected: skipping database readiness wait."
    ;;
  *)
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
    ;;
esac

# Ensure uploads directory exists and has correct permissions
echo "Setting up directories and permissions..."
mkdir -p /app/public/uploads

# Only attempt chown if running as root
if [ "$(id -u)" = "0" ]; then
  chown -R appuser:appuser /app/public
  echo "Permissions set successfully."
else
  echo "Not running as root, skipping chown..."
fi

# Migrations are now handled INTERNALLY by the application when MIGRATE_ON_START=true
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "RUN_MIGRATIONS=true: enabling internal migrations via MIGRATE_ON_START=true"
  export MIGRATE_ON_START=true
fi

echo "--- DEBUG START ---"
echo "Binary info:"
ls -la /app/backend
ldd /app/backend || echo "ldd failed or not available"
echo "--- DEBUG END ---"

echo "--- Starting application ---"
# Only use su-exec if we are currently root
if [ "$(id -u)" = "0" ]; then
  echo "Dropping privileges to appuser..."
  exec su-exec appuser ./backend
else
  echo "Already running as non-root, starting application directly..."
  exec ./backend
fi
