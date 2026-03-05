/*
  # Add banner_url to users table

  1. Modified Tables
    - `users`
      - Added `banner_url` (text, nullable) - URL to user's profile banner image

  2. Notes
    - Allows users to upload and display a custom banner on their profile page
    - Falls back to a theme gradient when no banner is set
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'banner_url'
  ) THEN
    ALTER TABLE users ADD COLUMN banner_url text;
  END IF;
END $$;
