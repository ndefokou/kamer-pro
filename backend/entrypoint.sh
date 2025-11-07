#!/bin/sh
set -e

echo "--- Running entrypoint.sh ---"
echo "Running as user: $(whoami)"
echo "DATABASE_URL in entrypoint: $DATABASE_URL"
echo "RUST_LOG in entrypoint: $RUST_LOG"

# Ensure data directory exists
mkdir -p /app/data

echo "Permissions for /app/data before chown:"
ls -la /app/data

# Change ownership of data directory to appuser
chown -R appuser:appuser /app/data
chown -R appuser:appuser /app/public

echo "Permissions for /app/data after setup:"
ls -la /app/data

# Run migrations using sqlite3
echo "--- Running migrations ---"

for migration in /app/migrations/*.sql; do
    echo "Running migration: $migration"
    sqlite3 /app/data/database.db < "$migration" || echo "Migration failed, continuing..."
done

echo "--- Starting application ---"
echo "About to run backend binary..."
ls -l /app/backend || echo "⚠️ Backend binary not found!"
echo "Running as user: $(whoami)"

# Run the backend
exec su-exec appuser ./backend || {
    echo "❌ Backend exited with code $?";
    exit 1;
}
