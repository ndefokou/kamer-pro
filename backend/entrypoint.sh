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

# Create a migrations tracking table if it doesn't exist
sqlite3 /app/data/database.db << 'EOF'
CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_file TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

for migration in /app/migrations/*.sql; do
    if [ -f "$migration" ]; then
        migration_name=$(basename "$migration")
        
        # Check if migration has already been applied
        already_applied=$(sqlite3 /app/data/database.db "SELECT COUNT(*) FROM schema_migrations WHERE migration_file = '$migration_name'")
        
        if [ "$already_applied" -eq "0" ]; then
            echo "Running migration: $migration"
            
            # Run the migration and capture the exit code
            if sqlite3 /app/data/database.db < "$migration" 2>&1; then
                # Mark migration as applied
                sqlite3 /app/data/database.db "INSERT INTO schema_migrations (migration_file) VALUES ('$migration_name')"
                echo "✓ Migration $migration_name completed successfully"
            else
                echo "⚠ Warning: Migration $migration_name encountered an error, but continuing..."
                # Still mark it as applied to avoid re-running
                sqlite3 /app/data/database.db "INSERT OR IGNORE INTO schema_migrations (migration_file) VALUES ('$migration_name')"
            fi
        else
            echo "⊘ Skipping already applied migration: $migration_name"
        fi
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
