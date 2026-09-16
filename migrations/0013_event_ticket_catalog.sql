PRAGMA foreign_keys = ON;

-- Keep the existing event_tickets entity and expand it into a complete
-- per-event catalog. Existing rows remain valid and are backfilled below.
ALTER TABLE event_tickets ADD COLUMN visible INTEGER NOT NULL DEFAULT 1;
ALTER TABLE event_tickets ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE event_tickets ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE event_tickets ADD COLUMN compare_price_cents INTEGER;
ALTER TABLE event_tickets ADD COLUMN purchase_mode TEXT NOT NULL DEFAULT 'sympla';
ALTER TABLE event_tickets ADD COLUMN whatsapp_url TEXT;
ALTER TABLE event_tickets ADD COLUMN sympla_url TEXT;
ALTER TABLE event_tickets ADD COLUMN custom_url TEXT;
ALTER TABLE event_tickets ADD COLUMN availability TEXT NOT NULL DEFAULT 'available';
ALTER TABLE event_tickets ADD COLUMN theme TEXT NOT NULL DEFAULT 'light';
ALTER TABLE event_tickets ADD COLUMN content_pt_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE event_tickets ADD COLUMN content_es_json TEXT NOT NULL DEFAULT '{}';

UPDATE event_tickets
SET sympla_url = COALESCE(sympla_url, sales_url)
WHERE sales_url IS NOT NULL AND TRIM(sales_url) <> '';

UPDATE event_tickets
SET purchase_mode = CASE
  WHEN sales_url IS NOT NULL AND TRIM(sales_url) <> '' THEN 'sympla'
  ELSE 'none'
END;

UPDATE event_tickets
SET availability = CASE status
  WHEN 'active' THEN 'available'
  WHEN 'sold_out' THEN 'sold_out'
  WHEN 'closed' THEN 'closed'
  ELSE 'coming_soon'
END;

CREATE INDEX IF NOT EXISTS idx_event_tickets_public
ON event_tickets(event_id, visible, position);
