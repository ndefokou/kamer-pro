-- Add password and registration number fields to architect_companies table
ALTER TABLE architect_companies ADD COLUMN password_hash TEXT;
ALTER TABLE architect_companies ADD COLUMN registration_number TEXT;
ALTER TABLE architect_companies ADD COLUMN is_active INTEGER DEFAULT 1;

-- Create index on registration number for faster lookups
CREATE INDEX IF NOT EXISTS idx_architect_companies_registration_number ON architect_companies(registration_number);

-- Add project_cost column to architect_projects if it doesn't exist
-- This is needed for the architect projects functionality
ALTER TABLE architect_projects ADD COLUMN project_cost REAL DEFAULT 0.0;
