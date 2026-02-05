/*
  # Insert FC26 Game Coaching UI Configuration

  1. Purpose
    - Add coaching configuration for FC26 (EA Sports FC 26)
    - Set empty stats_platforms array since no tracking platform is available for this game
    - The original seed migration used pattern '%fc 2%' which did not match 'FC26'

  2. Configuration Details
    - game_id: a41e04cb-bded-4867-9474-555ba247ef50
    - game_category: sports
    - character_field_label: Preferred Formations
    - stats_platforms: [] (empty - no tracking available)
    - rank_tiers: Division-based ranking system

  3. Notes
    - Uses ON CONFLICT to handle cases where entry might already exist
    - Empty stats_platforms will trigger the "No tracking platform available" message in UI
*/

INSERT INTO game_coaching_ui_config (
  game_id,
  game_category,
  character_field_label,
  character_field_placeholder,
  stats_platforms,
  rank_tiers
)
VALUES (
  'a41e04cb-bded-4867-9474-555ba247ef50',
  'sports',
  'Preferred Formations',
  'e.g., 4-3-3, 4-2-3-1, 3-5-2',
  '[]'::jsonb,
  '["Division 10", "Division 9", "Division 8", "Division 7", "Division 6", "Division 5", "Division 4", "Division 3", "Division 2", "Division 1", "Elite"]'::jsonb
)
ON CONFLICT (game_id) DO UPDATE SET
  game_category = EXCLUDED.game_category,
  character_field_label = EXCLUDED.character_field_label,
  character_field_placeholder = EXCLUDED.character_field_placeholder,
  stats_platforms = EXCLUDED.stats_platforms,
  rank_tiers = EXCLUDED.rank_tiers,
  updated_at = now();