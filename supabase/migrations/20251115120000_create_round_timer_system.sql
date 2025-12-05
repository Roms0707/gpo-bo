/*
  # Create Round Timer and Notification System for Brackets

  1. New Tables
    - `bracket_round_timers`
      - `id` (uuid, primary key)
      - `tournament_id` (uuid, foreign key to tournaments)
      - `round_number` (integer) - Round number (1, 2, 3, etc.)
      - `duration_minutes` (integer) - Duration in minutes, default 60 (1 hour)
      - `start_time` (timestamptz) - When the timer started
      - `end_time` (timestamptz) - When the timer should end
      - `status` (text) - Status: 'pending', 'active', 'completed', 'paused', 'expired'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `bracket_round_notifications`
      - `id` (uuid, primary key)
      - `tournament_id` (uuid, foreign key to tournaments)
      - `round_number` (integer) - Associated round number
      - `notification_type` (text) - Type: 'round_started', 'round_completed', 'round_expired', 'round_extended'
      - `message` (text) - Notification message in French
      - `metadata` (jsonb) - Additional data (duration, time remaining, etc.)
      - `is_read` (boolean) - Whether notification has been read by front-service
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Admins can insert, update, and delete
    - Authenticated users can read all data
    - Front-service can mark notifications as read

  3. Indexes
    - Index on tournament_id for fast queries
    - Index on round_number for filtering
    - Index on status for active timer queries
    - Composite index on (tournament_id, round_number) with unique constraint
    - Index on is_read for unread notification queries

  4. Important Notes
    - Default duration is 60 minutes (1 hour) per round
    - Timers are created automatically when bracket is generated
    - First timer starts automatically when bracket goes live
    - Notifications are stored for front-service consumption
    - System tracks round progression and creates notifications automatically
*/

-- Create bracket_round_timers table
CREATE TABLE IF NOT EXISTS bracket_round_timers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number integer NOT NULL CHECK (round_number > 0),
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  start_time timestamptz DEFAULT NULL,
  end_time timestamptz DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'paused', 'expired')),
  paused_at timestamptz DEFAULT NULL,
  paused_remaining_seconds integer DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_tournament_round UNIQUE (tournament_id, round_number)
);

-- Create bracket_round_notifications table
CREATE TABLE IF NOT EXISTS bracket_round_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number integer NOT NULL CHECK (round_number > 0),
  notification_type text NOT NULL CHECK (notification_type IN ('round_started', 'round_completed', 'round_expired', 'round_extended', 'round_paused', 'round_resumed')),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_round_timers_tournament_id
  ON bracket_round_timers(tournament_id);

CREATE INDEX IF NOT EXISTS idx_round_timers_round_number
  ON bracket_round_timers(round_number);

CREATE INDEX IF NOT EXISTS idx_round_timers_status
  ON bracket_round_timers(status)
  WHERE status IN ('active', 'paused');

CREATE INDEX IF NOT EXISTS idx_round_timers_tournament_status
  ON bracket_round_timers(tournament_id, status);

CREATE INDEX IF NOT EXISTS idx_round_notifications_tournament_id
  ON bracket_round_notifications(tournament_id);

CREATE INDEX IF NOT EXISTS idx_round_notifications_round_number
  ON bracket_round_notifications(round_number);

CREATE INDEX IF NOT EXISTS idx_round_notifications_is_read
  ON bracket_round_notifications(is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_round_notifications_created_at
  ON bracket_round_notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE bracket_round_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_round_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bracket_round_timers

-- Admins can view all timers
CREATE POLICY "Admins can view round timers"
  ON bracket_round_timers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Admins can insert timers
CREATE POLICY "Admins can create round timers"
  ON bracket_round_timers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Admins can update timers
CREATE POLICY "Admins can update round timers"
  ON bracket_round_timers
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

-- Admins can delete timers
CREATE POLICY "Admins can delete round timers"
  ON bracket_round_timers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- RLS Policies for bracket_round_notifications

-- Authenticated users can view notifications (for front-service consumption)
CREATE POLICY "Authenticated users can view notifications"
  ON bracket_round_notifications
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can create notifications
CREATE POLICY "Admins can create notifications"
  ON bracket_round_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Authenticated users can mark notifications as read (for front-service)
CREATE POLICY "Users can mark notifications as read"
  ON bracket_round_notifications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Admins can delete notifications
CREATE POLICY "Admins can delete notifications"
  ON bracket_round_notifications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_round_timer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_round_timer_timestamp ON bracket_round_timers;
CREATE TRIGGER trigger_update_round_timer_timestamp
  BEFORE UPDATE ON bracket_round_timers
  FOR EACH ROW
  EXECUTE FUNCTION update_round_timer_timestamp();

-- Add helpful comments
COMMENT ON TABLE bracket_round_timers IS
  'Stores timer information for each round in single elimination brackets. Default duration is 60 minutes per round.';

COMMENT ON TABLE bracket_round_notifications IS
  'Stores notifications for front-service consumption about round events (started, completed, expired, etc.)';

COMMENT ON COLUMN bracket_round_timers.duration_minutes IS
  'Duration in minutes for this round. Default is 60 minutes (1 hour). Can be modified in draft mode.';

COMMENT ON COLUMN bracket_round_timers.status IS
  'Timer status: pending (not started), active (running), completed (finished), paused (temporarily stopped), expired (time ran out)';

COMMENT ON COLUMN bracket_round_timers.paused_at IS
  'Timestamp when timer was paused. Used to calculate remaining time on resume.';

COMMENT ON COLUMN bracket_round_timers.paused_remaining_seconds IS
  'Seconds remaining when timer was paused. Used to resume with correct time.';

COMMENT ON COLUMN bracket_round_notifications.is_read IS
  'Whether this notification has been read/consumed by the front-service';

COMMENT ON COLUMN bracket_round_notifications.metadata IS
  'JSON metadata including tournament details, round info, duration, time remaining, etc.';
