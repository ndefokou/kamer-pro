-- Add up migration script here
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    condition TEXT,
    category TEXT,
    location TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    status TEXT DEFAULT 'active',
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Add down migration script here
DROP TABLE products;
