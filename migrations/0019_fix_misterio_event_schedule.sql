-- Restore the MISTÉRIO event schedule after the event start/end fields
-- were accidentally shifted while editing the event.
-- Guarded by the exact incorrect values so later intentional edits are preserved.
UPDATE events
SET
  starts_at = '2026-10-24T21:00',
  ends_at = '2026-10-25T05:00',
  updated_at = CURRENT_TIMESTAMP
WHERE slug = 'misterio'
  AND starts_at = '2026-09-21T11:00'
  AND ends_at = '2026-10-24T21:00';
