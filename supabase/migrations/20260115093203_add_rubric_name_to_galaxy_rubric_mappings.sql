/*
  # Add rubric_name column to galaxy_rubric_mappings

  1. Changes
    - Adds `rubric_name` column (nullable TEXT) to `galaxy_rubric_mappings` table
    - This stores the human-readable rubric name locally for display purposes
    - Nullable to allow existing records to remain valid

  2. Purpose
    - Enables displaying rubric names without requiring API calls
    - Supports sync functionality to keep names updated with Galaxy API
    - Improves UX for "Other Games" category by showing meaningful labels
*/

ALTER TABLE galaxy_rubric_mappings
ADD COLUMN IF NOT EXISTS rubric_name TEXT;

COMMENT ON COLUMN galaxy_rubric_mappings.rubric_name IS 'Human-readable rubric name from Galaxy API, stored locally for display';
