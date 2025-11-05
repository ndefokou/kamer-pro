#!/bin/sh
#!/bin/sh
set -e

echo "--- Running entrypoint.sh ---"
echo "Running as user: $(whoami)"

echo "Permissions for /app/data before chown:"
ls -ld /app/data

# Create the database file if it doesn't exist and ensure the directory exists
mkdir -p /app/data
touch /app/data/database.db

# Give ownership of the /app/data directory to the appuser.
chown -R appuser:appuser /app/data
chown -R appuser:appuser /app/public

echo "Permissions for /app/data after setup:"
ls -lA /app/data

echo "--- Running migrations ---"
setpriv --reuid=appuser --regid=appuser --clear-groups /usr/local/bin/sqlx migrate run --source /app/migrations --database-url "sqlite:/app/data/database.db"

echo "--- Starting application ---"
# Execute the main command (passed as arguments to this script) as the appuser
exec setpriv --reuid=appuser --regid=appuser --clear-groups "$@"