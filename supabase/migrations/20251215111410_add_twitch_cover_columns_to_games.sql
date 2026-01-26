/*
  # Add Twitch Cover Metadata to Games Table

  1. Schema Changes
    - Add `twitch_cover_url` column to store high-resolution game covers from Twitch API
    - Add `twitch_game_id` column to store the Twitch game ID for future API calls
    - Add `cover_last_updated` timestamp for cache invalidation (refresh every 7 days)

  2. Purpose
    - Enable automatic game cover fetching from Twitch Helix API
    - Cache covers locally to avoid repeated API calls
    - Support the Game Hub carousel with high-quality game artwork

  3. Notes
    - twitch_cover_url provides 600x800 resolution covers by default
    - cover_last_updated is used to determine when to refresh the cache
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'twitch_cover_url'
  ) THEN
    ALTER TABLE games ADD COLUMN twitch_cover_url text;
    COMMENT ON COLUMN games.twitch_cover_url IS 'High-resolution game cover URL from Twitch API (600x800)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'twitch_game_id'
  ) THEN
    ALTER TABLE games ADD COLUMN twitch_game_id text;
    COMMENT ON COLUMN games.twitch_game_id IS 'Twitch game ID for API reference';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'cover_last_updated'
  ) THEN
    ALTER TABLE games ADD COLUMN cover_last_updated timestamptz;
    COMMENT ON COLUMN games.cover_last_updated IS 'Timestamp when the Twitch cover was last refreshed';
  END IF;
END $$;
