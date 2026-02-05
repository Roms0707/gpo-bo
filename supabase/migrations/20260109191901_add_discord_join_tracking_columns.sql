/*
  # Add Discord Join Tracking Columns for 24-Hour Mandatory Join System

  1. Changes to `tournament_registrations` table
    - Add `discord_join_shown_at` (timestamptz) - tracks when the mandatory Discord join popup was first shown
    - Add `discord_warning_sent_at` (timestamptz) - tracks when the 20-hour warning notification was sent
    - Add `disqualification_reason` (text) - stores reason for disqualification (e.g., "Did not join Discord server within 24 hours")
    - Update status check constraint to include 'disqualified' status

  2. Security
    - No changes to RLS policies needed as existing policies cover these new columns

  3. Notes
    - The 24-hour countdown starts from `discord_join_shown_at`
    - Warning notification is sent at 20 hours (4 hours before deadline)
    - Disqualification happens automatically at 24 hours if user hasn't joined Discord
*/

-- Add new columns to tournament_registrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_registrations' AND column_name = 'discord_join_shown_at'
  ) THEN
    ALTER TABLE tournament_registrations ADD COLUMN discord_join_shown_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_registrations' AND column_name = 'discord_warning_sent_at'
  ) THEN
    ALTER TABLE tournament_registrations ADD COLUMN discord_warning_sent_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_registrations' AND column_name = 'disqualification_reason'
  ) THEN
    ALTER TABLE tournament_registrations ADD COLUMN disqualification_reason text;
  END IF;
END $$;

-- Update the status check constraint to include 'disqualified'
-- First, we need to drop the existing constraint if it exists and recreate it
DO $$
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tournament_registrations_status_check' 
    AND table_name = 'tournament_registrations'
  ) THEN
    ALTER TABLE tournament_registrations DROP CONSTRAINT tournament_registrations_status_check;
  END IF;
  
  -- Add the new constraint with 'disqualified' status
  ALTER TABLE tournament_registrations ADD CONSTRAINT tournament_registrations_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'validated', 'refused', 'backup', 'disqualified'));
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Constraint already exists with correct values
END $$;

-- Add index for efficient querying of registrations needing warnings or disqualification
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_discord_join_tracking 
  ON tournament_registrations (discord_join_shown_at, discord_warning_sent_at, status)
  WHERE discord_join_shown_at IS NOT NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN tournament_registrations.discord_join_shown_at IS 'Timestamp when the mandatory Discord join popup was first shown to the user. 24-hour countdown starts from this time.';
COMMENT ON COLUMN tournament_registrations.discord_warning_sent_at IS 'Timestamp when the 20-hour warning notification was sent (4 hours before disqualification deadline).';
COMMENT ON COLUMN tournament_registrations.disqualification_reason IS 'Reason for disqualification, e.g., "Did not join Discord server within 24 hours".';