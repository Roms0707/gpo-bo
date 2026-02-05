/*
  # Add display_order to coaching_ai_config table

  1. Schema Changes
    - `coaching_ai_config`
      - Add `display_order` column (integer, default 0)
      - This enables ordering of config entries (especially for topic_priority)
      - Allows drag-and-drop reordering in the admin UI

  2. Notes
    - Existing records will default to display_order = 0
    - Lower numbers appear first when sorted
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coaching_ai_config' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE coaching_ai_config ADD COLUMN display_order integer DEFAULT 0;
  END IF;
END $$;