#!/bin/bash

# Script to initialize the admin account
# This should be run once to create the initial admin user

# Load environment variables if .env file exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default admin credentials (can be overridden by environment variables)
ADMIN_USERNAME=${ADMIN_USERNAME:-"admin"}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-"admin123"}
ADMIN_EMAIL=${ADMIN_EMAIL:-"admin@kamer-pro.com"}

# API URL
API_URL=${BACKEND_URL:-"http://localhost:8082"}

echo "Initializing admin account..."
echo "Username: $ADMIN_USERNAME"
echo "Email: $ADMIN_EMAIL"
echo ""

# Hash the password using a simple bcrypt implementation
# Note: In production, you should use a proper password hashing tool
# For now, we'll insert directly into the database

# Path to the database
DB_PATH="./backend/db.sqlite"

if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database file not found at $DB_PATH"
    echo "Please make sure the backend has been initialized first."
    exit 1
fi

# Check if admin table exists
TABLE_EXISTS=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='admins';" 2>/dev/null)

if [ -z "$TABLE_EXISTS" ]; then
    echo "Error: admins table does not exist. Please run migrations first."
    exit 1
fi

# Check if admin already exists
ADMIN_EXISTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM admins WHERE username='$ADMIN_USERNAME';" 2>/dev/null)

if [ "$ADMIN_EXISTS" -gt 0 ]; then
    echo "Admin user '$ADMIN_USERNAME' already exists."
    read -p "Do you want to reset the password? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    
    # Generate password hash using Python (bcrypt)
    PASSWORD_HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw('$ADMIN_PASSWORD'.encode(), bcrypt.gensalt()).decode())")
    
    # Update existing admin
    sqlite3 "$DB_PATH" "UPDATE admins SET password_hash='$PASSWORD_HASH', updated_at=CURRENT_TIMESTAMP WHERE username='$ADMIN_USERNAME';"
    echo "Admin password has been reset successfully!"
else
    # Generate password hash using Python (bcrypt)
    PASSWORD_HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw('$ADMIN_PASSWORD'.encode(), bcrypt.gensalt()).decode())")
    
    # Insert new admin
    sqlite3 "$DB_PATH" "INSERT INTO admins (username, email, password_hash, created_at, updated_at) VALUES ('$ADMIN_USERNAME', '$ADMIN_EMAIL', '$PASSWORD_HASH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);"
    echo "Admin account created successfully!"
fi

echo ""
echo "Admin credentials:"
echo "  Username: $ADMIN_USERNAME"
echo "  Password: $ADMIN_PASSWORD"
echo "  Email: $ADMIN_EMAIL"
echo ""
echo "You can now login at: http://localhost:5173/admin-login"
echo ""
echo "IMPORTANT: Please change the default password after first login!"
