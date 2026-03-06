/*
  # Add sort_order to project_config_games

  1. Modified Tables
    - `project_config_games`
      - Added `sort_order` (integer, default 0) to control display ordering in the frontend

  2. Data Backfill
    - Existing rows are backfilled with sequential sort_order values
      based on the linked game's `sort_priority` from the `games` table
    - Games with lower sort_priority appear first
    - Ties are broken alphabetically by game name
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_config_games' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE project_config_games ADD COLUMN sort_order integer DEFAULT 0;

  END IF;

END $$;


UPDATE project_config_games AS pcg
SET sort_order = sub.new_order
FROM (
  SELECT
    pcg2.id,
    ROW_NUMBER() OVER (
      PARTITION BY pcg2.project_config_id
      ORDER BY COALESCE(g.sort_priority, 999) ASC, COALESCE(g.name, '') ASC
    ) AS new_order
  FROM project_config_games pcg2
  LEFT JOIN games g ON pcg2.game_id = g.id
) AS sub
WHERE pcg.id = sub.id;

;
