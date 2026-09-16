ALTER TABLE freelancer_applications ADD COLUMN risk_flags_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS recruitment_risk_state (
  cpf TEXT PRIMARY KEY,
  first_birth_date TEXT,
  underage_attempts INTEGER NOT NULL DEFAULT 0,
  duplicate_attempts INTEGER NOT NULL DEFAULT 0,
  first_underage_at TEXT,
  last_underage_at TEXT,
  last_duplicate_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recruitment_risk_updated ON recruitment_risk_state(updated_at DESC);
