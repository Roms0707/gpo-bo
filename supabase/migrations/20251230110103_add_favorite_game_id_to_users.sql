/*
  # Add Favorite Game Selection to Users

  1. Changes
    - Add `favorite_game_id` column to `users` table
    - This column stores the user's preferred game for theme personalization
    - When NULL, the system will auto-detect based on user activity
    - Foreign key reference to `games` table

  2. Security
    - No RLS changes needed - existing users table policies apply
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'favorite_game_id'
  ) THEN
    ALTER TABLE users ADD COLUMN favorite_game_id uuid REFERENCES games(id) ON DELETE SET NULL;
  END IF;
END $$;