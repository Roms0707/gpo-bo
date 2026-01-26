/*
  # Add max_nb_players column to tournaments table

  1. Changes
    - Add `max_nb_players` column to the `tournaments` table to store the maximum number of players/teams for Swiss and Round Robin tournaments
*/

-- Add max_nb_players column to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS max_nb_players integer;

-- Add comment to explain the column's purpose
COMMENT ON COLUMN tournaments.max_nb_players IS 'Maximum number of players/teams for Swiss and Round Robin tournaments';
