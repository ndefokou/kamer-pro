#!/bin/sh
set -e

echo "--- Running entrypoint.sh ---"
echo "Running as user: $(whoami)"

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
    if [ -f "$migration" ]; then
        echo "Running migration: $migration"
        sqlite3 /app/data/database.db < "$migration" || echo "Migration may have already been applied"
    fi
done

echo "--- Starting application ---"
# Execute the CMD as appuser
exec "$@"