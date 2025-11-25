-- Make user_id nullable in architect_companies table
-- This is required because admin-created architects don't have a corresponding user account

CREATE TABLE architect_companies_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, -- Removed NOT NULL constraint
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    location TEXT NOT NULL,
    logo_url TEXT,
    banner_url TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    password_hash TEXT,
    registration_number TEXT,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO architect_companies_new (id, user_id, name, email, phone, location, logo_url, banner_url, description, created_at, updated_at, password_hash, registration_number, is_active)
SELECT id, user_id, name, email, phone, location, logo_url, banner_url, description, created_at, updated_at, password_hash, registration_number, is_active FROM architect_companies;

DROP TABLE architect_companies;

ALTER TABLE architect_companies_new RENAME TO architect_companies;

CREATE INDEX idx_architect_companies_registration_number ON architect_companies(registration_number);
