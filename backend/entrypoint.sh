#!/bin/sh
set -e

echo "--- Running entrypoint.sh ---"
echo "Running as user: $(whoami)"
echo "DATABASE_URL in entrypoint: $DATABASE_URL"
echo "RUST_LOG in entrypoint: $RUST_LOG"

# Ensure the appuser can write to the public uploads directory
chown -R appuser:appuser /app/public/uploads

echo "--- Starting application ---"
echo "About to run backend binary..."
ls -l /app/backend || echo "⚠️ Backend binary not found!"
echo "Running as user: $(whoami)"

# Run the backend
exec su-exec appuser ./backend || {
    echo "❌ Backend exited with code $?";
    exit 1;
}
