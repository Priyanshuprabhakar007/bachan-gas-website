-- Migration: auth_sessions for Cloudflare Worker D1 session management

CREATE TABLE IF NOT EXISTS auth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash ON auth_sessions(token_hash);
