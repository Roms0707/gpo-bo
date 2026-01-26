/*
  # Fix Galaxy Rubric Mappings Unique Constraint

  1. Problem
    - The table has a UNIQUE constraint on `rubric_id` alone (`galaxy_rubric_mappings_rubric_id_key`)
    - This incorrectly prevents the same rubric from being assigned to multiple games
    - The intended behavior is to allow a rubric to be mapped to multiple games

  2. Changes
    - Drop the incorrect unique constraint on `rubric_id` alone
    - Ensure composite unique constraint on `(project_config_id, game_id, rubric_id)` exists
      - This allows the same rubric to be used across different games
      - While still preventing duplicate mappings for the same game

  3. Security
    - No changes to RLS policies
*/

-- Drop the incorrect unique constraint on rubric_id alone
ALTER TABLE galaxy_rubric_mappings
DROP CONSTRAINT IF EXISTS galaxy_rubric_mappings_rubric_id_key;

-- Ensure the composite unique constraint exists (safe to run if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'galaxy_rubric_mappings_unique_mapping'
  ) THEN
    ALTER TABLE galaxy_rubric_mappings
    ADD CONSTRAINT galaxy_rubric_mappings_unique_mapping
    UNIQUE (project_config_id, game_id, rubric_id);
  END IF;
END $$;
