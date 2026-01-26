/*
  # Add Others Game Support and Rubric Names

  1. Changes to `galaxy_rubric_mappings` table
    - Add `rubric_name` column (text) to store human-readable display names for rubrics
    - This enables dynamic tab generation in the Others hub

  2. Changes to `games` table
    - Add `sort_order` column (integer) to control display order in carousels and sidebars
    - Add `is_collection` column (boolean) to mark special collection entries like "Others"
    - "Others" game will have highest sort_order to appear last

  3. Security
    - No RLS changes needed as these are public read columns

  4. Notes
    - The "Others" game entry should be created manually with slug='others'
    - Rubric names can be populated via admin interface or SQL updates
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'galaxy_rubric_mappings' AND column_name = 'rubric_name'
  ) THEN
    ALTER TABLE galaxy_rubric_mappings ADD COLUMN rubric_name text;
    COMMENT ON COLUMN galaxy_rubric_mappings.rubric_name IS 'Human-readable display name for the rubric, used in UI tabs';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE games ADD COLUMN sort_order integer DEFAULT 0;
    COMMENT ON COLUMN games.sort_order IS 'Display order for games in carousels and sidebars. Higher values appear later.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'is_collection'
  ) THEN
    ALTER TABLE games ADD COLUMN is_collection boolean DEFAULT false;
    COMMENT ON COLUMN games.is_collection IS 'Flag to indicate if this is a collection entry (like Others) rather than a single game';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_games_sort_order ON games(sort_order);

CREATE INDEX IF NOT EXISTS idx_galaxy_rubric_mappings_game_id ON galaxy_rubric_mappings(game_id);
