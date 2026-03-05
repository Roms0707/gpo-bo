/*
  # Add rubric-to-project mapping support and locale columns

  1. Modified Tables
    - `project_configurations`
      - `country_code` (text, nullable) - Country code for Galaxy API calls per config
      - `language_code` (text, nullable) - Language code for Galaxy API calls per config
    - `galaxy_rubric_mappings`
      - `game_id` changed from NOT NULL to nullable - allows project-level rubrics
      - `scope` (text, not null, default 'game') - 'game' or 'project' scope
      - `display_on_frontend` (boolean, not null, default true) - controls frontend visibility

  2. Constraint Changes
    - Dropped old unique constraint `galaxy_rubric_mappings_unique_mapping` on (project_config_id, game_id, rubric_id)
    - Added partial unique index for game-scoped mappings: (project_config_id, game_id, rubric_id) WHERE game_id IS NOT NULL
    - Added partial unique index for project-scoped mappings: (project_config_id, rubric_id) WHERE game_id IS NULL

  3. Important Notes
    - Existing mappings are preserved and default to scope='game', display_on_frontend=true
    - The foreign key on game_id is kept but now allows NULL for project-level rubrics
    - Two partial unique indexes replace the single unique constraint to handle NULL game_id correctly
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN country_code text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'language_code'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN language_code text;
  END IF;
END $$;

ALTER TABLE galaxy_rubric_mappings ALTER COLUMN game_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'galaxy_rubric_mappings' AND column_name = 'scope'
  ) THEN
    ALTER TABLE galaxy_rubric_mappings ADD COLUMN scope text NOT NULL DEFAULT 'game';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'galaxy_rubric_mappings' AND column_name = 'display_on_frontend'
  ) THEN
    ALTER TABLE galaxy_rubric_mappings ADD COLUMN display_on_frontend boolean NOT NULL DEFAULT true;
  END IF;
END $$;

ALTER TABLE galaxy_rubric_mappings DROP CONSTRAINT IF EXISTS galaxy_rubric_mappings_unique_mapping;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rubric_mappings_game_scope
  ON galaxy_rubric_mappings (project_config_id, game_id, rubric_id)
  WHERE game_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rubric_mappings_project_scope
  ON galaxy_rubric_mappings (project_config_id, rubric_id)
  WHERE game_id IS NULL;
