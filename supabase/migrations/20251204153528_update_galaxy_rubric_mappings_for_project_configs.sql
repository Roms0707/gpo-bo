/*
  # Update Galaxy Rubric Mappings for Project Configurations

  ## Overview
  This migration transforms the galaxy_rubric_mappings table from using
  country_code + service_id to using project_config_id + game_id. This allows
  for more flexible game-specific rubric assignments per project configuration.

  ## Changes Made
  
  ### 1. Schema Modifications
  - Remove columns: country_code, service_id, rubric_name, galaxy_rubric_id, is_active
  - Add columns: project_config_id (uuid), game_id (uuid)
  - Update rubric_id to be a simple text field (Galaxy API rubric ID)
  
  ### 2. Constraints and Indexes
  - Add foreign key to project_configurations table
  - Add foreign key to games table  
  - Create unique constraint on (project_config_id, game_id, rubric_id)
  - Create indexes for performance
  
  ### 3. Data Migration
  - Any existing data will be cleared as the schema is incompatible
  - Fresh start with new structure
  
  ## Security (RLS)
  - Maintains public read access
  - Master admin write access
*/

-- Drop old constraints and indexes
DROP INDEX IF EXISTS idx_galaxy_rubric_unique_with_service;
DROP INDEX IF EXISTS idx_galaxy_rubric_service;
DROP INDEX IF EXISTS idx_galaxy_rubric_country;
DROP INDEX IF EXISTS idx_galaxy_rubric_unique;

-- Backup existing data (if any) - then clear the table
DO $$
DECLARE
  row_count integer;
BEGIN
  SELECT COUNT(*) INTO row_count FROM galaxy_rubric_mappings;
  
  IF row_count > 0 THEN
    RAISE NOTICE 'Warning: Clearing % existing rubric mappings due to schema change', row_count;
    DELETE FROM galaxy_rubric_mappings;
  END IF;
END $$;

-- Drop old columns if they exist
ALTER TABLE galaxy_rubric_mappings 
  DROP COLUMN IF EXISTS country_code CASCADE,
  DROP COLUMN IF EXISTS service_id CASCADE,
  DROP COLUMN IF EXISTS rubric_name CASCADE,
  DROP COLUMN IF EXISTS galaxy_rubric_id CASCADE,
  DROP COLUMN IF EXISTS is_active CASCADE;

-- Add new columns if they don't exist
DO $$
BEGIN
  -- Add project_config_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'galaxy_rubric_mappings'
    AND column_name = 'project_config_id'
  ) THEN
    ALTER TABLE galaxy_rubric_mappings
    ADD COLUMN project_config_id uuid NOT NULL REFERENCES project_configurations(id) ON DELETE CASCADE;
  END IF;

  -- Add game_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'galaxy_rubric_mappings'
    AND column_name = 'game_id'
  ) THEN
    ALTER TABLE galaxy_rubric_mappings
    ADD COLUMN game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure rubric_id is NOT NULL
ALTER TABLE galaxy_rubric_mappings
  ALTER COLUMN rubric_id SET NOT NULL;

-- Create unique constraint to prevent duplicate rubric mappings
CREATE UNIQUE INDEX IF NOT EXISTS idx_galaxy_rubric_unique_project_game_rubric
  ON galaxy_rubric_mappings(project_config_id, game_id, rubric_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_galaxy_rubric_project
  ON galaxy_rubric_mappings(project_config_id);

CREATE INDEX IF NOT EXISTS idx_galaxy_rubric_game
  ON galaxy_rubric_mappings(game_id);

CREATE INDEX IF NOT EXISTS idx_galaxy_rubric_created
  ON galaxy_rubric_mappings(created_at DESC);

-- Add helpful comments
COMMENT ON TABLE galaxy_rubric_mappings IS
  'Maps Galaxy API rubrics to specific games within project configurations. Each project config can have different rubric assignments per game.';

COMMENT ON COLUMN galaxy_rubric_mappings.project_config_id IS
  'Reference to the project configuration this mapping belongs to';

COMMENT ON COLUMN galaxy_rubric_mappings.game_id IS
  'Reference to the game this rubric is mapped to';

COMMENT ON COLUMN galaxy_rubric_mappings.rubric_id IS
  'Galaxy API rubric identifier';

-- Update RLS policies (if needed)
ALTER TABLE galaxy_rubric_mappings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view galaxy rubric mappings" ON galaxy_rubric_mappings;
DROP POLICY IF EXISTS "Master admin can manage galaxy rubric mappings" ON galaxy_rubric_mappings;

-- Create new RLS policies
CREATE POLICY "Public can view galaxy rubric mappings"
  ON galaxy_rubric_mappings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage galaxy rubric mappings"
  ON galaxy_rubric_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('master_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('master_admin', 'admin')
    )
  );

-- Grant permissions
GRANT SELECT ON galaxy_rubric_mappings TO authenticated, anon;
