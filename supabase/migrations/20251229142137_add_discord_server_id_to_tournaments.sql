/*
  # Add Discord Server ID to tournaments table

  1. New Columns
    - `discord_server_id` (text, nullable) - Stores the Discord server/guild ID for the tournament
      This enables server membership verification via the Discord API.
      Discord server IDs are large numeric strings (snowflake IDs, typically 17-20 digits).

  2. Purpose
    - Allow tournament organizers to configure Discord server verification
    - Enable the backend to verify if the Discord bot has access to the server
    - Support member verification for tournament participants

  3. Notes
    - Column is nullable since not all tournaments require Discord integration
    - When discord_server_id is set, the bot can verify server access via the Discord API
*/

ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS discord_server_id TEXT


COMMENT ON COLUMN tournaments.discord_server_id IS 'Discord server/guild ID for tournament member verification'

