/*
  # Update FC26 Stats Platforms to Empty Array

  1. Changes
    - Sets `stats_platforms` to an empty array for FC26/EA FC/FIFA games
    - This will show "No tracking platform available" message instead of hiding the section

  2. Affected Games
    - Games where name contains 'FC', 'FIFA', or 'EA Sports'
*/

UPDATE game_coaching_ui_config
SET stats_platforms = '[]'::jsonb
WHERE game_id IN (
  SELECT id FROM games 
  WHERE LOWER(name) LIKE '%fc%' 
    OR LOWER(name) LIKE '%fifa%' 
    OR LOWER(name) LIKE '%ea sports fc%'
);
