/*
  # Add Discord Join Clicked Tracking

  1. Changes
    - Adds `discord_join_clicked_at` column to `tournament_registrations` table
    - This tracks when a user clicks the "Join Discord Server" button in the DiscordInviteModal
    - Used to show appropriate reminders to users who clicked but haven't verified membership

  2. Purpose
    - Track user intent to join Discord server
    - Enable differentiated messaging for users who clicked join vs those who didn't
    - Support the enhanced Discord registration flow
*/

ALTER TABLE tournament_registrations
ADD COLUMN IF NOT EXISTS discord_join_clicked_at timestamptz;
