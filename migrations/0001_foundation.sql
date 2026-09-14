PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  template TEXT NOT NULL DEFAULT 'standard',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS page_localizations (
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK(locale IN ('pt-BR','es')),
  title TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  og_media_id TEXT,
  PRIMARY KEY(page_id, locale)
);

CREATE TABLE IF NOT EXISTS page_sections (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_page_sections_page_position ON page_sections(page_id, position);

CREATE TABLE IF NOT EXISTS section_localizations (
  section_id TEXT NOT NULL REFERENCES page_sections(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK(locale IN ('pt-BR','es')),
  content_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY(section_id, locale)
);

CREATE TABLE IF NOT EXISTS content_revisions (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_revisions_entity ON content_revisions(entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  alt_pt TEXT,
  alt_es TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','published','sales_open','sold_out','finished','archived')),
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'BR',
  venue_name TEXT,
  venue_address TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  theme_json TEXT NOT NULL DEFAULT '{}',
  hero_media_id TEXT REFERENCES media_assets(id),
  logo_media_id TEXT REFERENCES media_assets(id),
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, starts_at);

CREATE TABLE IF NOT EXISTS event_localizations (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK(locale IN ('pt-BR','es')),
  title TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  PRIMARY KEY(event_id, locale)
);

CREATE TABLE IF NOT EXISTS event_tickets (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'BRL',
  sales_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft','active','sold_out','closed')),
  position INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT
);

CREATE TABLE IF NOT EXISTS event_artists (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  media_id TEXT REFERENCES media_assets(id),
  instagram_url TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role_key TEXT,
  media_id TEXT REFERENCES media_assets(id),
  instagram_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);

CREATE TABLE IF NOT EXISTS team_localizations (
  team_member_id TEXT NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK(locale IN ('pt-BR','es')),
  role_label TEXT,
  bio TEXT,
  PRIMARY KEY(team_member_id, locale)
);

CREATE TABLE IF NOT EXISTS freelancer_applications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  instagram TEXT,
  roles_json TEXT NOT NULL DEFAULT '[]',
  portfolio_url TEXT,
  resume_media_id TEXT REFERENCES media_assets(id),
  availability TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','approved','contacted','inactive','rejected')),
  source TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_freelancers_city_status ON freelancer_applications(city, status);

CREATE TABLE IF NOT EXISTS partnership_leads (
  id TEXT PRIMARY KEY,
  contact_name TEXT NOT NULL,
  company_name TEXT,
  partnership_type TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  city TEXT,
  message TEXT,
  source TEXT,
  campaign TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','contacted','negotiating','won','lost')),
  owner_user_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','paused','finished')),
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracking_links (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  destination_path TEXT NOT NULL,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  medium TEXT NOT NULL,
  content TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  click_count INTEGER NOT NULL DEFAULT 0,
  last_clicked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_daily (
  day TEXT NOT NULL,
  metric TEXT NOT NULL,
  dimension_key TEXT NOT NULL DEFAULT '',
  value REAL NOT NULL DEFAULT 0,
  PRIMARY KEY(day, metric, dimension_key)
);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_metric_day ON analytics_daily(metric, day);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK(role IN ('owner','admin','editor','analytics')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash, expires_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

INSERT OR IGNORE INTO pages (id, slug, status, template, published_at)
VALUES ('page_home', 'home', 'published', 'institutional', CURRENT_TIMESTAMP);
