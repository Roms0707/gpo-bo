/*
  # Add Discord Server ID to Tournaments

  1. New Columns
    - `discord_server_id` (text, nullable) - Stores the Discord server/guild ID for member verification
      - Used to validate that players are members of the tournament's Discord server
      - Should be a numeric string (17-20 digits) representing the Discord guild ID

  2. Purpose
    - Enables Discord member verification for tournament participants
    - Works in conjunction with the existing discord_url field
    - Allows healthcheck verification via Discord API to ensure bot has access to the server

  3. Notes
    - Field is optional to maintain backward compatibility
    - When discord_url is provided, discord_server_id should also be provided for verification
*/

ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS discord_server_id TEXT;

COMMENT ON COLUMN tournaments.discord_server_id IS 'Discord server/guild ID for member verification. Obtain by enabling Developer Mode in Discord and copying the server ID.';