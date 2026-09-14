CREATE TABLE IF NOT EXISTS analytics_sessions_daily (
  day TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  landing_path TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'direct',
  medium TEXT,
  campaign TEXT,
  content TEXT,
  tracking_link TEXT,
  referrer_host TEXT,
  country TEXT,
  language TEXT,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(day, session_hash)
);

CREATE INDEX IF NOT EXISTS idx_sessions_day_source ON analytics_sessions_daily(day, source);
CREATE INDEX IF NOT EXISTS idx_sessions_day_link ON analytics_sessions_daily(day, tracking_link);
CREATE INDEX IF NOT EXISTS idx_sessions_day_campaign ON analytics_sessions_daily(day, campaign);
