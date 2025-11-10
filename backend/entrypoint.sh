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

# IMPORTANT: Only create database if it doesn't exist
if [ ! -f /app/data/database.db ]; then
    echo "Database not found. Creating new database..."
    touch /app/data/database.db
    chown appuser:appuser /app/data/database.db
    
    # Run all migrations
    for migration in /app/migrations/*.sql; do
        if [ -f "$migration" ]; then
            migration_name=$(basename "$migration")
            echo "Running migration: $migration"
            
            if ! sqlite3 /app/data/database.db < "$migration"; then
                echo "❌ Migration $migration_name failed. Exiting."
                exit 1
            fi
            
            echo "✓ Migration $migration_name completed successfully"
        fi
    done
else
    echo "Database already exists. Skipping migrations."
    echo "To run migrations manually, exec into the pod and run:"
    echo "  sqlite3 /app/data/database.db < /app/migrations/MIGRATION_FILE.sql"
fi

echo "--- Starting application ---"
echo "About to run backend binary..."
ls -l /app/backend || echo "⚠️ Backend binary not found!"
echo "Running as user: $(whoami)"

# Run the backend
exec su-exec appuser ./backend || {
    echo "❌ Backend exited with code $?";
    exit 1;
}
