/*
  # Add External Stats Columns to User Game Manual Profiles

  1. Changes
    - Add `external_stats_validated` (boolean) - Whether external stats have been validated/fetched
    - Add `external_stats_validated_at` (timestamptz) - When stats were last validated
    - Add `external_stats_cached_data` (jsonb) - Cached scraped stats from external URL
    - Add `external_stats_last_fetched` (timestamptz) - When stats were last fetched

  2. Purpose
    These columns support the external stats scraping feature:
    - Track whether a user's external stats URL has been validated
    - Cache the scraped stats data (rank, win rate, K/D, etc.)
    - Track when stats were last fetched for rate limiting
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_game_manual_profiles' AND column_name = 'external_stats_validated'
  ) THEN
    ALTER TABLE user_game_manual_profiles ADD COLUMN external_stats_validated boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_game_manual_profiles' AND column_name = 'external_stats_validated_at'
  ) THEN
    ALTER TABLE user_game_manual_profiles ADD COLUMN external_stats_validated_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_game_manual_profiles' AND column_name = 'external_stats_cached_data'
  ) THEN
    ALTER TABLE user_game_manual_profiles ADD COLUMN external_stats_cached_data jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_game_manual_profiles' AND column_name = 'external_stats_last_fetched'
  ) THEN
    ALTER TABLE user_game_manual_profiles ADD COLUMN external_stats_last_fetched timestamptz;
  END IF;
END $$;