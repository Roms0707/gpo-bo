/*
  # Create Player Match Notifications System

  1. New Tables
    - `player_match_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users) - Player receiving the notification
      - `tournament_id` (uuid, foreign key to tournaments)
      - `match_id` (uuid, foreign key to tournament_matches) - The specific match
      - `round_number` (integer) - Round number
      - `notification_type` (text) - Type: 'match_starting', 'match_result', 'next_opponent'
      - `opponent_id` (uuid, foreign key to users) - The opponent player
      - `opponent_game_ids` (jsonb) - Opponent's game publisher IDs
      - `match_result` (text) - Result: 'won', 'lost', 'draw', null for match_starting
      - `message` (text) - Notification message in French
      - `metadata` (jsonb) - Additional data (tournament title, round name, etc.)
      - `is_read` (boolean) - Whether notification has been read
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on table
    - Players can only view their own notifications
    - Admins can create and manage all notifications
    - Players can mark their own notifications as read

  3. Indexes
    - Index on user_id for fast player queries
    - Index on tournament_id for tournament filtering
    - Index on is_read for unread notification queries
    - Index on created_at for sorting

  4. Important Notes
    - Notifications are created automatically when rounds start/end
    - opponent_game_ids contains the game publisher IDs from game_publisher_id_for_users table
    - Supports real-time updates via Supabase Realtime
    - Messages are in French for player-facing interface
*/

-- Create player_match_notifications table
CREATE TABLE IF NOT EXISTS player_match_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id uuid REFERENCES tournament_matches(id) ON DELETE CASCADE,
  round_number integer NOT NULL CHECK (round_number > 0),
  notification_type text NOT NULL CHECK (notification_type IN ('match_starting', 'match_result', 'next_opponent')),
  opponent_id uuid REFERENCES users(id) ON DELETE SET NULL,
  opponent_game_ids jsonb DEFAULT '{}'::jsonb,
  match_result text CHECK (match_result IN ('won', 'lost', 'draw')),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_notifications_user_id
  ON player_match_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_player_notifications_tournament_id
  ON player_match_notifications(tournament_id);

CREATE INDEX IF NOT EXISTS idx_player_notifications_match_id
  ON player_match_notifications(match_id);

CREATE INDEX IF NOT EXISTS idx_player_notifications_is_read
  ON player_match_notifications(is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_player_notifications_created_at
  ON player_match_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_notifications_user_unread
  ON player_match_notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

-- Enable Row Level Security
ALTER TABLE player_match_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_match_notifications

-- Players can view their own notifications
CREATE POLICY "Players can view own notifications"
  ON player_match_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
  ON player_match_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Admins can create notifications
CREATE POLICY "Admins can create notifications"
  ON player_match_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Players can mark their own notifications as read
CREATE POLICY "Players can update own notifications"
  ON player_match_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can update all notifications
CREATE POLICY "Admins can update all notifications"
  ON player_match_notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Admins can delete notifications
CREATE POLICY "Admins can delete notifications"
  ON player_match_notifications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Add helpful comments
COMMENT ON TABLE player_match_notifications IS
  'Stores real-time notifications for players about their matches, results, and next opponents in tournaments.';

COMMENT ON COLUMN player_match_notifications.notification_type IS
  'Type of notification: match_starting (match is about to begin), match_result (match ended), next_opponent (info about next round opponent)';

COMMENT ON COLUMN player_match_notifications.opponent_game_ids IS
  'JSON object containing opponent game publisher IDs from game_publisher_id_for_users table. Used by players to add opponent as friend in the game.';

COMMENT ON COLUMN player_match_notifications.match_result IS
  'Result of the match from player perspective: won, lost, or draw. Null for match_starting notifications.';

COMMENT ON COLUMN player_match_notifications.metadata IS
  'JSON metadata including tournament title, round name, match details, etc.';

COMMENT ON COLUMN player_match_notifications.is_read IS
  'Whether this notification has been read/acknowledged by the player. Used for unread badge count.';