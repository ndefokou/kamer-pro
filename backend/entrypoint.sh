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

# Delete the old database to ensure a clean slate
rm -f /app/data/database.db

for migration in /app/migrations/*.sql; do
    if [ -f "$migration" ]; then
        migration_name=$(basename "$migration")
        echo "Running migration: $migration"
        
        # Run the migration and exit on error
        if ! sqlite3 /app/a pp/data/database.db < "$migration"; then
            echo "❌ Migration $migration_name failed. Exiting."
            exit 1
        fi
        
        echo "✓ Migration $migration_name completed successfully"
    fi
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
