/*
  # Add config_id to tournaments table

  1. New Columns
    - `config_id` (text, nullable) - Links tournament to a specific project configuration
      - NULL means worldwide tournament (visible on all frontends)
      - When set, eligible_countries is overridden/ignored

  2. Changes
    - Add foreign key constraint to project_configurations table
    - Add index for efficient filtering by config_id

  3. Security
    - No RLS changes needed (existing tournament policies apply)

  4. Notes
    - When config_id is set, the tournament belongs to that specific project
    - The eligible_countries field is overridden when config_id is set
    - Worldwide tournaments (config_id = NULL) can still use eligible_countries
*/

-- Add config_id column to tournaments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournaments' AND column_name = 'config_id'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN config_id text;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tournaments_config_id_fkey'
  ) THEN
    ALTER TABLE tournaments
    ADD CONSTRAINT tournaments_config_id_fkey
    FOREIGN KEY (config_id) REFERENCES project_configurations(config_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_tournaments_config_id ON tournaments(config_id);

-- Add comment explaining the override behavior
COMMENT ON COLUMN tournaments.config_id IS 'Links to project_configurations. When set, eligible_countries is overridden (ignored). NULL means worldwide tournament.';
