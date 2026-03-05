/*
  # Add project_config_id to xp_events table

  Adds tenant scoping to XP events so all future XP awards are properly isolated per white-label tenant.

  1. Modified Tables
    - `xp_events`
      - Added `project_config_id` (uuid, nullable for backward compatibility with existing rows)

  2. Indexes
    - (project_config_id, user_id, created_at DESC) — tenant-scoped XP queries
    - (project_config_id, source, created_at DESC) — tenant-scoped source filtering

  3. Important Notes
    - Column is nullable to preserve existing data that predates tenant scoping
    - All new inserts going forward should include project_config_id
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'xp_events' AND column_name = 'project_config_id'
  ) THEN
    ALTER TABLE xp_events ADD COLUMN project_config_id uuid REFERENCES project_configurations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_xp_events_config_user_created
  ON xp_events (project_config_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_xp_events_config_source_created
  ON xp_events (project_config_id, source, created_at DESC);
