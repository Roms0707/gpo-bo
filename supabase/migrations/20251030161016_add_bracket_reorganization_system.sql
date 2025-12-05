/*
  # Add Bracket Reorganization System for Cross-Round BYE Management

  1. New Tables
    - `bracket_modifications_log`
      - `id` (uuid, primary key)
      - `tournament_id` (uuid, foreign key to tournaments)
      - `match_id` (uuid, foreign key to tournament_matches)
      - `round` (integer) - Round number where modification occurred
      - `modification_type` (text) - Type of modification: 'player_swap', 'player_reassign', 'bye_fill', 'manual_move'
      - `previous_state` (jsonb) - State before modification
      - `new_state` (jsonb) - State after modification
      - `reason` (text) - Reason for modification (e.g., "BYE detected in Round 3")
      - `modified_by` (uuid, foreign key to users)
      - `created_at` (timestamptz)

  2. Table Modifications
    - Add `manual_assignment` (boolean) to tournament_matches
      - Tracks if a match was manually modified by an admin
      - Default false for automatically generated matches
    - Add `original_round` (integer) to tournament_matches
      - Tracks the original round assignment before any manual moves
      - Helps maintain audit trail of player movements

  3. Security
    - Enable RLS on bracket_modifications_log
    - Only admins can view modification logs
    - All modifications are automatically logged
    - Cannot delete modification logs (audit trail protection)

  4. Indexes
    - Index on tournament_id for fast log retrieval
    - Index on match_id for tracking match-specific changes
    - Index on modified_by for admin activity tracking
    - Index on created_at for chronological queries
    - Index on tournament_matches.manual_assignment for filtering

  5. Important Notes
    - This system enables complete freedom to reorganize players across rounds when BYE is detected
    - Manual assignments are preserved during automatic round generation
    - Modification logs cannot be deleted to maintain complete audit trail
    - All changes are timestamped and attributed to specific admin users
*/

-- Add new columns to tournament_matches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_matches' AND column_name = 'manual_assignment'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN manual_assignment boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_matches' AND column_name = 'original_round'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN original_round integer;
  END IF;
END $$;

-- Create bracket_modifications_log table
CREATE TABLE IF NOT EXISTS bracket_modifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id uuid REFERENCES tournament_matches(id) ON DELETE SET NULL,
  round integer NOT NULL,
  modification_type text NOT NULL CHECK (modification_type IN ('player_swap', 'player_reassign', 'bye_fill', 'manual_move', 'cross_round_move')),
  previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  modified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bracket_modifications_tournament_id 
  ON bracket_modifications_log(tournament_id);

CREATE INDEX IF NOT EXISTS idx_bracket_modifications_match_id 
  ON bracket_modifications_log(match_id);

CREATE INDEX IF NOT EXISTS idx_bracket_modifications_modified_by 
  ON bracket_modifications_log(modified_by);

CREATE INDEX IF NOT EXISTS idx_bracket_modifications_created_at 
  ON bracket_modifications_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_manual_assignment 
  ON tournament_matches(tournament_id, manual_assignment) 
  WHERE manual_assignment = true;

CREATE INDEX IF NOT EXISTS idx_tournament_matches_round 
  ON tournament_matches(tournament_id, round);

-- Enable Row Level Security
ALTER TABLE bracket_modifications_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bracket_modifications_log

-- Admins can view all modification logs
CREATE POLICY "Admins can view bracket modification logs"
  ON bracket_modifications_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Admins can insert modification logs (system will use this)
CREATE POLICY "Admins can create bracket modification logs"
  ON bracket_modifications_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- NO DELETE POLICY - Modification logs are permanent audit trail
-- NO UPDATE POLICY - Modification logs are immutable once created

-- Update original_round for existing matches (one-time data migration)
UPDATE tournament_matches 
SET original_round = round 
WHERE original_round IS NULL;

-- Add comment explaining the purpose
COMMENT ON TABLE bracket_modifications_log IS 
  'Audit log for all manual bracket modifications across rounds. Enables tracking of BYE management and player reorganizations.';

COMMENT ON COLUMN tournament_matches.manual_assignment IS 
  'Indicates if this match was manually modified by an admin, especially for cross-round BYE management.';

COMMENT ON COLUMN tournament_matches.original_round IS 
  'Original round assignment before any manual moves. Preserved for audit trail.';
