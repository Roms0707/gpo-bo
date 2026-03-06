/*
  # Create Project Config Games Junction Table

  1. New Tables
    - `project_config_games`
      - `id` (uuid, primary key)
      - `project_config_id` (uuid, foreign key to project_configurations)
      - `game_id` (uuid, foreign key to games)
      - `created_at` (timestamp)
      
  2. Constraints
    - Unique constraint on (project_config_id, game_id) to prevent duplicate links
    
  3. Security
    - Enable RLS on the table
    - Add policies for authenticated users
    
  4. Data Migration
    - Backfill from existing galaxy_rubric_mappings to preserve current relationships
*/

CREATE TABLE IF NOT EXISTS project_config_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_config_id uuid NOT NULL REFERENCES project_configurations(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_project_config_game UNIQUE (project_config_id, game_id)
);


CREATE INDEX IF NOT EXISTS idx_project_config_games_project_id ON project_config_games(project_config_id);

CREATE INDEX IF NOT EXISTS idx_project_config_games_game_id ON project_config_games(game_id);


ALTER TABLE project_config_games ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Authenticated users can view project config games"
  ON project_config_games
  FOR SELECT
  TO authenticated
  USING (true);


CREATE POLICY "Authenticated users can insert project config games"
  ON project_config_games
  FOR INSERT
  TO authenticated
  WITH CHECK (true);


CREATE POLICY "Authenticated users can delete project config games"
  ON project_config_games
  FOR DELETE
  TO authenticated
  USING (true);


INSERT INTO project_config_games (project_config_id, game_id)
SELECT DISTINCT project_config_id, game_id
FROM galaxy_rubric_mappings
WHERE project_config_id IS NOT NULL AND game_id IS NOT NULL
ON CONFLICT (project_config_id, game_id) DO NOTHING;
;
