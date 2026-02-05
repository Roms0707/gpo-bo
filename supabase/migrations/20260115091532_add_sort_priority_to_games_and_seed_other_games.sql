/*
  # Add Sort Priority to Games and Seed "Other Games" Entry

  1. Schema Changes
    - Add `sort_priority` column to `games` table (integer, default 0)
    - This allows certain games (like "Other Games") to be sorted to specific positions
    - Lower values appear first, higher values appear last

  2. New Data
    - Insert "Other Games" catch-all entry for Galaxy Rubric mappings
    - Uses a game controller icon as placeholder image
    - Set sort_priority to 999 to always appear at end of list

  3. Notes
    - Existing games get sort_priority = 0 (default)
    - "Other Games" gets sort_priority = 999 to sort last
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'sort_priority'
  ) THEN
    ALTER TABLE games ADD COLUMN sort_priority integer DEFAULT 0;
  END IF;
END $$;

INSERT INTO games (name, publisher, image_url, sort_priority)
SELECT 'Other Games', 'Various', 'https://img.icons8.com/color/512/controller.png', 999
WHERE NOT EXISTS (
  SELECT 1 FROM games WHERE name = 'Other Games'
);