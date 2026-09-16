ALTER TABLE freelancer_applications ADD COLUMN privacy_accepted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE freelancer_applications ADD COLUMN privacy_accepted_at TEXT;
ALTER TABLE freelancer_applications ADD COLUMN privacy_notice_version TEXT;
ALTER TABLE freelancer_applications ADD COLUMN privacy_notice_locale TEXT;
ALTER TABLE freelancer_applications ADD COLUMN privacy_notice_text TEXT;
