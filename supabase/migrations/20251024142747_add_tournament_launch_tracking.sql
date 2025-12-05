/*
  # Add Tournament Launch Tracking Fields

  ## Overview
  This migration adds fields to track the tournament launch process and manage registrations
  when a tournament is launched with fewer participants than initially configured.

  ## Changes
  
  1. New Columns Added to `tournaments` Table
    - `initial_max_players` (integer, nullable): Stores the originally configured maximum number of players
    - `actual_participants` (integer, nullable): Records the actual number of participants when bracket is launched
    - `registration_locked` (boolean, default false): Indicates if registrations are locked/closed
    - `bracket_launched_at` (timestamptz, nullable): Timestamp when the bracket was first generated

  ## Purpose
  
  These fields enable:
  - Historical tracking of planned vs actual tournament size
  - Automatic registration closure at the configured end date
  - Manual admin control over registration status
  - Audit trail of when tournaments were launched
  
  ## Data Migration
  
  For existing tournaments:
  - `registration_locked` defaults to false (registrations remain open unless manually closed)
  - Other nullable fields remain null for historical data
  - No data loss or breaking changes
  
  ## Security
  
  - All fields follow existing RLS policies on the tournaments table
  - No new security risks introduced
*/

-- Add initial_max_players to store the originally configured maximum
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS initial_max_players integer;

-- Add actual_participants to store the real number when bracket is launched
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS actual_participants integer;

-- Add registration_locked to control registration status
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS registration_locked boolean DEFAULT false;

-- Add bracket_launched_at to track when the bracket was generated
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS bracket_launched_at timestamptz;

-- Add comments for documentation
COMMENT ON COLUMN tournaments.initial_max_players IS 'Originally configured maximum number of players/teams for the tournament';
COMMENT ON COLUMN tournaments.actual_participants IS 'Actual number of approved participants when the bracket was launched';
COMMENT ON COLUMN tournaments.registration_locked IS 'Whether registrations are locked/closed for this tournament';
COMMENT ON COLUMN tournaments.bracket_launched_at IS 'Timestamp when the tournament bracket was first generated';

-- Create an index on registration_locked for efficient queries
CREATE INDEX IF NOT EXISTS idx_tournaments_registration_locked 
ON tournaments(registration_locked) 
WHERE registration_locked = true;

-- Create an index on bracket_launched_at for sorting and filtering
CREATE INDEX IF NOT EXISTS idx_tournaments_bracket_launched_at 
ON tournaments(bracket_launched_at) 
WHERE bracket_launched_at IS NOT NULL;