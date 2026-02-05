/*
  # Add IGDB Search Name Column to Games Table

  1. New Columns
    - `igdb_search_name` (text) - Optional custom search term for IGDB API lookups
    
  2. Purpose
    - Allows specifying an alternative name for IGDB searches when the game name
      doesn't match IGDB's naming (e.g., "FC26" needs to search for "EA Sports FC 25")
    - Provides admin control over IGDB matching for problematic game names
    - Works alongside automatic name mapping for common abbreviations

  3. Notes
    - This column is optional - when NULL, the system uses automatic name mapping
    - Admins can set this to override automatic behavior for specific games
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'igdb_search_name'
  ) THEN
    ALTER TABLE games ADD COLUMN igdb_search_name text;
  END IF;
END $$;

COMMENT ON COLUMN games.igdb_search_name IS 'Optional custom search term for IGDB API lookups when game name does not match IGDB naming';