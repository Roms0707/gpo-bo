/*
  # Add UPDATE RLS policy to project_config_games

  1. Security Changes
    - Add missing UPDATE policy for `project_config_games` table
    - Allows authenticated users to update rows (e.g., sort_order)
    - Table already has SELECT, INSERT, DELETE policies but was missing UPDATE

  2. Impact
    - Fixes "Sort order update failed: N of N rows were not updated" error
    - Enables drag-and-drop game reordering to persist correctly
*/

CREATE POLICY "Authenticated users can update project config games"
  ON project_config_games
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
