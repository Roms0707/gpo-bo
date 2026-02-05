/*
  # Add Foreign Key Constraint for game_trailers.config_id

  1. Purpose
    - Link game_trailers to project_configurations via config_id
    - Ensure referential integrity between trailers and project configurations
    - Enable cascading deletes when a project configuration is removed

  2. Data Migration
    - Updates existing trailers with hardcoded 'orange' config_id to reference
      a valid config_id from the project_configurations table
    - Uses the first active configuration as the fallback for existing data

  3. Schema Changes
    - Adds FOREIGN KEY constraint on game_trailers.config_id
    - References project_configurations(config_id)
    - ON DELETE CASCADE: Trailers are automatically deleted when their
      associated project configuration is removed

  4. Important Notes
    - The unique partial index (one home trailer per config_id) remains in place
    - Backoffice can manage home trailers per project configuration
    - Frontend dynamically loads trailers based on the current configId context
*/

-- Step 1: Migrate existing trailer data to valid config_id
-- Update any trailers with invalid config_ids (like hardcoded 'orange')
-- to use a valid config_id from project_configurations
DO $$
DECLARE
  valid_config_id text;
BEGIN
  -- Get a valid config_id from project_configurations (prefer active ones)
  SELECT config_id INTO valid_config_id
  FROM project_configurations
  WHERE is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  -- If no active config found, try any config
  IF valid_config_id IS NULL THEN
    SELECT config_id INTO valid_config_id
    FROM project_configurations
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Only update if we found a valid config_id
  IF valid_config_id IS NOT NULL THEN
    -- Update trailers that have config_ids not matching any project_configuration
    UPDATE game_trailers gt
    SET config_id = valid_config_id
    WHERE NOT EXISTS (
      SELECT 1 FROM project_configurations pc
      WHERE pc.config_id = gt.config_id
    );

    RAISE NOTICE 'Migrated orphaned trailers to config_id: %', valid_config_id;
  ELSE
    RAISE NOTICE 'No project configurations found. Trailers not migrated.';
  END IF;
END $$;

-- Step 2: Add the foreign key constraint
-- Only add if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'game_trailers_config_id_fkey'
    AND table_name = 'game_trailers'
  ) THEN
    ALTER TABLE game_trailers
    ADD CONSTRAINT game_trailers_config_id_fkey
    FOREIGN KEY (config_id)
    REFERENCES project_configurations(config_id)
    ON DELETE CASCADE;

    RAISE NOTICE 'Foreign key constraint added successfully';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists';
  END IF;
END $$;

-- Add comment to document the foreign key relationship
COMMENT ON COLUMN game_trailers.config_id IS 'References project_configurations.config_id. Each project configuration can have its own home trailer (is_default=true). Deleting a project configuration cascades to delete its associated trailers.';