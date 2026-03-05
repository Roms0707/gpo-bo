/*
  # Add content_category to galaxy_rubric_mappings

  1. Modified Tables
    - `galaxy_rubric_mappings`
      - Added `content_category` (text, not null, default 'tips')
      - CHECK constraint ensures value is one of: 'tips', 'masterclass', 'grind_zone', 'article'

  2. Index Changes
    - Dropped `idx_galaxy_rubric_unique_project_game` (was on project_config_id, game_id, rubric_id without category)
    - Dropped `idx_rubric_mappings_game_scope` (was on project_config_id, game_id, rubric_id where game_id IS NOT NULL)
    - Dropped `idx_rubric_mappings_project_scope` (was on project_config_id, rubric_id where game_id IS NULL)
    - Recreated `idx_rubric_mappings_game_scope` on (project_config_id, game_id, rubric_id, content_category) WHERE game_id IS NOT NULL
    - Recreated `idx_rubric_mappings_project_scope` on (project_config_id, rubric_id, content_category) WHERE game_id IS NULL

  3. Important Notes
    - Existing rows default to 'tips' category
    - The same rubric can now be mapped to multiple categories for the same game
    - No data is deleted or modified beyond adding the new column with its default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'galaxy_rubric_mappings' AND column_name = 'content_category'
  ) THEN
    ALTER TABLE galaxy_rubric_mappings
      ADD COLUMN content_category text NOT NULL DEFAULT 'tips';
  END IF;
END $$;

ALTER TABLE galaxy_rubric_mappings
  DROP CONSTRAINT IF EXISTS chk_content_category;

ALTER TABLE galaxy_rubric_mappings
  ADD CONSTRAINT chk_content_category
  CHECK (content_category IN ('tips', 'masterclass', 'grind_zone', 'article'));

DROP INDEX IF EXISTS idx_galaxy_rubric_unique_project_game;
DROP INDEX IF EXISTS idx_rubric_mappings_game_scope;
DROP INDEX IF EXISTS idx_rubric_mappings_project_scope;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rubric_mappings_game_scope
  ON galaxy_rubric_mappings (project_config_id, game_id, rubric_id, content_category)
  WHERE (game_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rubric_mappings_project_scope
  ON galaxy_rubric_mappings (project_config_id, rubric_id, content_category)
  WHERE (game_id IS NULL);
