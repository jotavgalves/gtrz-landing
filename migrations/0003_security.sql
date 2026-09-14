CREATE TABLE IF NOT EXISTS login_attempts (
  actor_hash TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS form_rate_limits (
  key_hash TEXT PRIMARY KEY,
  window_started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_lock ON login_attempts(locked_until);
CREATE INDEX IF NOT EXISTS idx_form_rate_window ON form_rate_limits(window_started_at);
