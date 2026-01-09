/*
  # Add Discord User ID to Users Table

  1. Changes
    - Adds `discord_user_id` column to the `users` table
    - This column stores the numeric Discord user ID (snowflake ID)
    - Used for Discord API membership verification

  2. Notes
    - Column is nullable since not all users will have Discord linked
    - Discord user IDs are 17-20 digit numbers stored as text
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'discord_user_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN discord_user_id text;
  END IF;
END $$;