/*
  # Add Discord Server ID to Tournaments

  1. Changes
    - Adds `discord_server_id` column to the `tournaments` table
    - This field stores the Discord server ID for tournament integration
    - Optional field (nullable)

  2. Notes
    - The Discord Server ID is separate from the Discord URL (invite link)
    - Server ID is needed for deeper Discord integrations (bots, roles, etc.)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournaments' AND column_name = 'discord_server_id'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN discord_server_id text

  END IF

END $$
