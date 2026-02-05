/*
  # Add IGDB Artwork Columns to Games Table

  1. New Columns
    - `igdb_game_id` (text) - IGDB's unique game identifier for API lookups
    - `igdb_artwork_url` (text) - Wide promotional/background artwork URL from IGDB
    - `igdb_last_updated` (timestamptz) - Timestamp for cache invalidation (7-day refresh cycle)

  2. Purpose
    - Store wide landscape artwork from IGDB for game hub carousel backgrounds
    - IGDB provides higher quality promotional artwork compared to Twitch's vertical covers
    - Uses same Twitch credentials (IGDB is owned by Twitch/Amazon)

  3. Notes
    - Twitch cover remains as fallback when IGDB artwork unavailable
    - Automatic scheduled sync will refresh stale artwork
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'igdb_game_id'
  ) THEN
    ALTER TABLE games ADD COLUMN igdb_game_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'igdb_artwork_url'
  ) THEN
    ALTER TABLE games ADD COLUMN igdb_artwork_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'igdb_last_updated'
  ) THEN
    ALTER TABLE games ADD COLUMN igdb_last_updated timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_games_igdb_game_id ON games(igdb_game_id);
CREATE INDEX IF NOT EXISTS idx_games_igdb_last_updated ON games(igdb_last_updated);