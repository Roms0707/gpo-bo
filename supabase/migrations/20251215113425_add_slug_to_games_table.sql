/*
  # Add Slug Column to Games Table

  1. Schema Changes
    - Add `slug` column (text, unique) to the `games` table
    - Slug will be used for human-readable URLs like /hub/apex-legends
    - Create unique index on slug for fast lookups

  2. Data Migration
    - Populate existing games with slugs generated from their names
    - Convert names to lowercase, replace spaces with hyphens, remove special characters

  3. Purpose
    - Enable cleaner, SEO-friendly URLs for game hub pages
    - Replace UUID-based URLs with readable slugs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'slug'
  ) THEN
    ALTER TABLE games ADD COLUMN slug text;
    COMMENT ON COLUMN games.slug IS 'URL-friendly slug for the game (e.g., apex-legends)';
  END IF;
END $$;

UPDATE games
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'games' AND indexname = 'idx_games_slug_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_games_slug_unique ON games(slug);
  END IF;
END $$;