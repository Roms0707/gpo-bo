/*
  # Seed Counter-Strike 2 Game Coaching UI Configuration

  1. New Entry
    - CS2 UI configuration with appropriate field labels, rank tiers, and stats platforms

  2. Security
    - No RLS changes needed (using existing table policies)
*/

-- Counter Strike 2 game_id: dad78506-9cc6-4bcb-b488-f87007702342

INSERT INTO game_coaching_ui_config (
  game_id,
  game_category,
  character_field_label,
  character_field_placeholder,
  stats_platforms,
  rank_tiers
)
VALUES (
  'dad78506-9cc6-4bcb-b488-f87007702342',
  'fps',
  'Preferred Role',
  'e.g., Entry Fragger, AWPer, Support, Lurker',
  '[
    {"name": "Leetify", "platform": "leetify", "url_example": "https://leetify.com/app/profile/76561198000000000", "url_pattern": "leetify.com/app/profile/"},
    {"name": "Tracker.gg", "platform": "tracker.gg", "url_example": "https://tracker.gg/cs2/profile/steam/PlayerName", "url_pattern": "tracker.gg/cs2/profile/"},
    {"name": "CSStats", "platform": "csstats", "url_example": "https://csstats.gg/player/76561198000000000", "url_pattern": "csstats.gg/player/"}
  ]'::jsonb,
  '["Silver I", "Silver II", "Silver III", "Silver IV", "Silver Elite", "Silver Elite Master", "Gold Nova I", "Gold Nova II", "Gold Nova III", "Gold Nova Master", "Master Guardian I", "Master Guardian II", "Master Guardian Elite", "Distinguished Master Guardian", "Legendary Eagle", "Legendary Eagle Master", "Supreme Master First Class", "The Global Elite"]'::jsonb
)
ON CONFLICT DO NOTHING;
