ALTER TABLE users RENAME TO _users_old;
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    credential_id TEXT,
    public_key TEXT,
    counter INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO users (id, username, email, credential_id, public_key, counter, created_at, updated_at)
  SELECT id, username, email, credential_id, public_key, counter, created_at, updated_at
  FROM _users_old;
DROP TABLE _users_old;