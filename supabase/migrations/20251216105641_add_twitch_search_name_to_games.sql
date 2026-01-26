/*
  # Add Twitch Search Name Column to Games Table

  1. New Columns
    - `twitch_search_name` (text, nullable) - Override name used for Twitch API game lookups
      This allows admins to specify an alternate name when the game's display name
      doesn't match Twitch's game catalog (e.g., "Counter Strike 2" vs "Counter-Strike 2")

  2. Notes
    - Column is nullable; when NULL, the edge function will use hardcoded mappings
      or fall back to the game's regular name
    - This provides granular control without requiring code changes for edge cases
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'twitch_search_name'
  ) THEN
    ALTER TABLE games ADD COLUMN twitch_search_name text;
    COMMENT ON COLUMN games.twitch_search_name IS 'Override name for Twitch API game lookups. When set, this name is used instead of the game name when searching the Twitch API for cover art.';
  END IF;
END $$;
