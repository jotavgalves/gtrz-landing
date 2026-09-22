CREATE TABLE IF NOT EXISTS event_feedback (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  anonymous INTEGER NOT NULL DEFAULT 1 CHECK(anonymous IN (0,1)),
  name TEXT,
  message TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'pt-BR' CHECK(locale IN ('pt-BR','es')),
  source_path TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewed','archived')),
  admin_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_feedback_status_created
  ON event_feedback(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_feedback_event_created
  ON event_feedback(event_name, created_at DESC);
