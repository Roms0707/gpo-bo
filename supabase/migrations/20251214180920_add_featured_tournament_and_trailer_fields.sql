/*
  # Add Featured Tournament and Trailer Fields

  This migration adds support for featured tournaments in the hero carousel
  and trailer URLs for games and project configurations.

  1. Modified Tables
    - `tournaments`
      - `is_featured` (boolean) - Marks tournament to appear in hero carousel
    - `games`
      - `trailer_url` (text) - URL for the game's trailer video
    - `project_configurations`
      - `default_trailer_url` (text) - Default trailer URL for the hero section

  2. Indexes
    - Index on tournaments.is_featured for efficient filtering

  3. Notes
    - All new columns are nullable with sensible defaults
    - is_featured defaults to false (tournaments not featured by default)
*/

-- Add is_featured column to tournaments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournaments' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN is_featured boolean DEFAULT false;
  END IF;
END $$;

-- Add trailer_url column to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'trailer_url'
  ) THEN
    ALTER TABLE games ADD COLUMN trailer_url text;
  END IF;
END $$;

-- Add default_trailer_url column to project_configurations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'default_trailer_url'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN default_trailer_url text;
  END IF;
END $$;

-- Create index on is_featured for efficient filtering of featured tournaments
CREATE INDEX IF NOT EXISTS idx_tournaments_is_featured
ON tournaments(is_featured)
WHERE is_featured = true;

-- Add a comment to document the purpose of each new column
COMMENT ON COLUMN tournaments.is_featured IS 'When true, tournament appears in the hero carousel';
COMMENT ON COLUMN games.trailer_url IS 'URL for the game trailer video displayed in hero section';
COMMENT ON COLUMN project_configurations.default_trailer_url IS 'Default trailer URL shown when no specific game/tournament trailer is set';
