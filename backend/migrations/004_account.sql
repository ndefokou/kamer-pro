-- User profile data for account settings
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY,
  legal_name TEXT,
  preferred_first_name TEXT,
  phone TEXT,
  residential_address TEXT,
  mailing_address TEXT,
  identity_verified BOOLEAN DEFAULT FALSE,
  language TEXT,
  currency TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
