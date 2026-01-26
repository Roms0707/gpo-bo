/*
  # Add Discord User ID to Users Table

  1. Changes
    - Add `discord_user_id` column to `users` table (nullable text)
    - Create index on `discord_user_id` for faster lookups during Discord server membership verification

  2. Purpose
    - Store the Discord OAuth user ID separately from the discord_handle (username)
    - Enable Discord server membership verification by querying Discord API with user ID
    - Support the verify-discord-membership edge function which checks if users are members of tournament Discord servers

  3. Notes
    - Column is nullable since not all users have linked Discord
    - Existing users will have NULL until they re-link Discord or are backfilled via migration script
    - The sessionService already populates this field on new OAuth links
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

CREATE INDEX IF NOT EXISTS idx_users_discord_user_id ON public.users(discord_user_id)
  WHERE discord_user_id IS NOT NULL;
