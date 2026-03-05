/*
  # Add metadata column to notifications table

  1. Modified Tables
    - `notifications`
      - Added `metadata` (jsonb, nullable, default '{}') - stores dynamic values for i18n interpolation

  2. Important Notes
    - This column allows the frontend to translate notification content client-side
    - The `title` field will store an i18n key (e.g., "notif.bracket_advance")
    - The `metadata` field will store dynamic values (e.g., {"tournament_title": "Cup #1"})
    - Old notifications without metadata will fall back to their raw French text
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE notifications ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
