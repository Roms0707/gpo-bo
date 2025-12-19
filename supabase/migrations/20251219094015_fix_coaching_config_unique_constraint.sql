/*
  # Fix coaching_ai_config unique constraint

  1. Schema Changes
    - Remove the UNIQUE constraint on (game_id, config_key)
    - This allows multiple entries per config_key per game
    - Each game can have multiple topic_priorities, emphasis_areas, etc.

  2. Notes
    - The UI (CoachingConfigPage.tsx) expects multiple entries per config_key
    - Topics can be drag-and-drop reordered using display_order
*/

ALTER TABLE coaching_ai_config 
DROP CONSTRAINT IF EXISTS coaching_ai_config_game_id_config_key_key;