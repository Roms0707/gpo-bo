/*
  # Seed Game Coaching UI Configurations

  1. Purpose
    Seed default UI configurations for common competitive games to enable
    the database-driven coaching form fields.

  2. Games Configured
    - Valorant (FPS with Agents)
    - Overwatch 2 (Hero Shooter)
    - Rocket League (Sports/Racing)
    - League of Legends (MOBA)
    - Apex Legends (Battle Royale)
    - CS2 / Counter-Strike 2 (FPS)
    - Fortnite (Battle Royale)
    - EA FC / FIFA (Sports)
    - Tekken 8 (Fighting)
    - Street Fighter 6 (Fighting)
    - TFT / Teamfight Tactics (Autobattler)
    - Dota 2 (MOBA)

  3. Configuration Details
    Each game has:
    - game_category: The type of game for UI logic
    - character_field_label: What to call the main characters/agents/etc
    - character_field_placeholder: Example text for the input
    - stats_platforms: External stat tracking sites
    - rank_tiers: Available ranks for the dropdown
*/

INSERT INTO game_coaching_ui_config (game_id, game_category, character_field_label, character_field_placeholder, stats_platforms, rank_tiers)
SELECT 
  g.id,
  'fps',
  'Main Agents',
  'e.g., Jett, Reyna, Sage',
  '[{"platform": "tracker.gg", "name": "Tracker.gg", "url_pattern": "tracker.gg/valorant/profile/", "url_example": "https://tracker.gg/valorant/profile/riot/PlayerName%23TAG"}]'::jsonb,
  '["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"]'::jsonb
FROM games g
WHERE LOWER(g.name) LIKE '%valorant%'
ON CONFLICT (game_id) DO UPDATE SET
  game_category = EXCLUDED.game_category,
  character_field_label = EXCLUDED.character_field_label,
  character_field_placeholder = EXCLUDED.character_field_placeholder,
  stats_platforms = EXCLUDED.stats_platforms,
  rank_tiers = EXCLUDED.rank_tiers,
  updated_at = now();

INSERT INTO game_coaching_ui_config (game_id, game_category, character_field_label, character_field_placeholder, stats_platforms, rank_tiers)
SELECT 
  g.id,
  'hero_shooter',
  'Main Heroes',
  'e.g., Tracer, Ana, Reinhardt',
  '[{"platform": "tracker.gg", "name": "Tracker.gg", "url_pattern": "tracker.gg/overwatch/profile/", "url_example": "https://tracker.gg/overwatch/profile/battlenet/PlayerName%231234"}, {"platform": "overbuff", "name": "Overbuff", "url_pattern": "overbuff.com/players/", "url_example": "https://www.overbuff.com/players/pc/PlayerName-1234"}]'::jsonb,
  '["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Champion"]'::jsonb
FROM games g
WHERE LOWER(g.name) LIKE '%overwatch%'
ON CONFLICT (game_id) DO UPDATE SET
  game_category = EXCLUDED.game_category,
  character_field_label = EXCLUDED.character_field_label,
  character_field_placeholder = EXCLUDED.character_field_placeholder,
  stats_platforms = EXCLUDED.stats_platforms,
  rank_tiers = EXCLUDED.rank_tiers,
  updated_at = now();

INSERT INTO game_coaching_ui_config (game_id, game_category, character_field_label, character_field_placeholder, stats_platforms, rank_tiers)
SELECT 
  g.id,
  'sports',
  'Preferred Cars',
  'e.g., Octane, Fennec, Dominus',
  '[{"platform": "tracker.gg", "name": "Tracker.gg", "url_pattern": "tracker.gg/rocket-league/profile/", "url_example": "https://tracker.gg/rocket-league/profile/steam/PlayerName"}]'::jsonb,
  '["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Champion", "Grand Champion", "Supersonic Legend"]'::jsonb
FROM games g
WHERE LOWER(g.name) LIKE '%rocket league%'
ON CONFLICT (game_id) DO UPDATE SET
  game_category = EXCLUDED.game_category,
  character_field_label = EXCLUDED.character_field_label,
  character_field_placeholder = EXCLUDED.character_field_placeholder,
  stats_platforms = EXCLUDED.stats_platforms,
  rank_tiers = EXCLUDED.rank_tiers,
  updated_at = now();

INSERT INTO game_coaching_ui_config (game_id, game_category, character_field_label, character_field_placeholder, stats_platforms, rank_tiers)
SELECT 
  g.id,
  'moba',
  'Main Champions',
  'e.g., Yasuo, Lux, Thresh',
  '[{"platform": "op.gg", "name": "OP.GG", "url_pattern": "op.gg/summoners/", "url_example": "https://www.op.gg/summoners/euw/SummonerName-TAG"}, {"platform": "u.gg", "name": "U.GG", "url_pattern": "u.gg/lol/profile/", "url_example": "https://u.gg/lol/profile/euw1/SummonerName/overview"}]'::jsonb,
  '["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"]'::jsonb
FROM games g
WHERE LOWER(g.name) LIKE '%league of legends%' OR LOWER(g.name) = 'lol'
ON CONFLICT (game_id) DO UPDATE SET
  game_category = EXCLUDED.game_category,
  character_field_label = EXCLUDED.character_field_label,
  character_field_placeholder = EXCLUDED.character_field_placeholder,
  stats_platforms = EXCLUDED.stats_platforms,
  rank_tiers = EXCLUDED.rank_tiers,
  updated_at = now();

INSERT INTO game_coaching_ui_config (game_id, game_category, character_field_label, character_field_placeholder, stats_platforms, rank_tiers)
SELECT 
  g.id,
  'battle_royale',
  'Main Legends',
  'e.g., Wraith, Octane, Bloodhound',
  '[{"platform": "tracker.gg", "name": "Tracker.gg", "url_pattern": "tracker.gg/apex/profile/", "url_example": "https://tracker.gg/apex/profile/origin/PlayerName"}]'::jsonb,
  '["Rookie", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Apex Predator"]'::jsonb
FROM games g
WHERE LOWER(g.name) LIKE '%apex%'
ON CONFLICT (game_id) DO UPDATE SET
  game_category = EXCLUDED.game_category,
  character_field_label = EXCLUDED.character_field_label,
  character_field_placeholder = EXCLUDED.character_field_placeholder,
  stats_platforms = EXCLUDED.stats_platforms,
  rank_tiers = EXCLUDED.rank_tiers,
  updated_at = now();

INSERT INTO game_coaching_ui_config (game_id, game_category, character_field_label, character_field_placeholder, stats_platforms, rank_tiers)
SELECT 
  g.id,
  'fps',
  'Preferred Weapons',
  'e.g., AK-47, AWP, M4A4',
  '[{"platform": "leetify", "name": "Leetify", "url_pattern": "leetify.com/app/profile/", "url_example": "https://leetify.com/app/profile/76561198012345678"}, {"platform": "tracker.gg", "name": "Tracker.gg", "url_pattern": "tracker.gg/cs2/profile/", "url_example": "https://tracker.gg/cs2/profile/steam/PlayerName"}]'::jsonb,
  '["Silver", "Gold Nova", "Master Guardian", "Legendary Eagle", "Supreme", "Global Elite"]'::jsonb
FROM games g
WHERE LOWER(g.name) LIKE '%counter-strike%' OR LOWER(g.name) LIKE '%cs2%' OR LOWER(g.name) LIKE '%csgo%'
ON CONFLICT (game_id) DO UPDATE SET
  game_category = EXCLUDED.game_category,
  character_field_label = EXCLUDED.character_field_label,
  character_field_placeholder = EXCLUDED.character_field_placeholder,
  stats_platforms = EXCLUDED.stats_platforms,
  rank_tiers = EXCLUDED.rank_tiers,
  updated_at = now();

INSERT INTO game_coaching_ui_config (game_id, game_category, character_field_label, character_field_placeholder, stats_platforms, rank_tiers)
SELECT 
  g.id,
  'battle_royale',
  'Preferred Loadouts',
  'e.g., Shotgun/SMG, Sniper/AR',
  '[{"platform": "fortnitetracker", "name": "Fortnite Tracker", "url_pattern": "fortnitetracker.com/profile/", "url_example": "https://fortnitetracker.com/profile/all/PlayerName"}]'::jsonb,
  '["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Elite", "Champion", "Unreal"]'::jsonb
FROM games g
WHERE LOWER(g.name) LIKE '%fortnite%'
ON CONFLICT (game_id) DO UPDATE SET
  game_category = EXCLUDED.game_category,
  character_field_label = EXCLUDED.character_field_label,
  character_field_placeholder = EXCLUDED.character_field_placeholder,
  stats_platforms = EXCLUDED.stats_platforms,
  rank_tiers = EXCLUDED.rank_tiers,
  updated_at = now();

INSERT INTO game_coaching_ui_config (game_id, game_category, character_field_label, character_field_placeholder, stats_platforms, rank_tiers)
SELECT 
  g.id,
  'sports',
  'Preferred Formations',
  'e.g., 4-3-3, 4-2-3-1, 3-5-2',
  '[{"platform": "tracker.gg", "name": "Tracker.gg", "url_pattern": "tracker.gg/fc/profile/", "url_example": "https://tracker.gg/fc/profile/xbl/PlayerName"}]'::jsonb,
  '["Division 10", "Division 9", "Division 8", "Division 7", "Division 6", "Division 5", "Division 4", "Division 3", "Division 2", "Division 1", "Elite"]'::jsonb
FROM games g
WHERE LOWER(g.name) LIKE '%fc 2%' OR LOWER(g.name) LIKE '%fifa%' OR LOWER(g.name) LIKE '%ea fc%' OR LOWER(g.name) LIKE '%ea sports fc%'
ON CONFLICT (game_id) DO UPDATE SET
  game_category = EXCLUDED.game_category,
  character_field_label = EXCLUDED.character_field_label,
  character_field_placeholder = EXCLUDED.character_field_placeholder,
  stats_platforms = EXCLUDED.stats_platforms,
  rank_tiers = EXCLUDED.rank_tiers,
  updated_at = now();

INSERT INTO game_coaching_ui_config (game_id, game_category, character_field_label, character_field_placeholder, stats_platforms, rank_tiers)
SELECT 
  g.id,
  'fighting',
  'Main Characters',
  'e.g., Jin, Kazuya, King',
  '[]'::jsonb,
  '["Beginner", "1st Dan", "2nd Dan", "Fighter", "Strategist", "Vanquisher", "Destroyer", "Eliminator", "Garyu", "Tekken King", "Tekken God"]'::jsonb
FROM games g
WHERE LOWER(g.name) LIKE '%tekken%'
ON CONFLICT (game_id) DO UPDATE SET
  game_category = EXCLUDED.game_category,
  character_field_label = EXCLUDED.character_field_label,
  character_field_placeholder = EXCLUDED.character_field_placeholder,
  stats_platforms = EXCLUDED.stats_platforms,
  rank_tiers = EXCLUDED.rank_tiers,
  updated_at = now();

INSERT INTO game_coaching_ui_config (game_id, game_category, character_field_label, character_field_placeholder, stats_platforms, rank_tiers)
SELECT 
  g.id,
  'fighting',
  'Main Characters',
  'e.g., Ryu, Ken, Chun-Li',
  '[]'::jsonb,
  '["Rookie", "Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Legend"]'::jsonb
FROM games g
WHERE LOWER(g.name) LIKE '%street fighter%'
ON CONFLICT (game_id) DO UPDATE SET
  game_category = EXCLUDED.game_category,
  character_field_label = EXCLUDED.character_field_label,
  character_field_placeholder = EXCLUDED.character_field_placeholder,
  stats_platforms = EXCLUDED.stats_platforms,
  rank_tiers = EXCLUDED.rank_tiers,
  updated_at = now();

INSERT INTO game_coaching_ui_config (game_id, game_category, character_field_label, character_field_placeholder, stats_platforms, rank_tiers)
SELECT 
  g.id,
  'autobattler',
  'Preferred Comps',
  'e.g., Reroll, Fast 8, Slow Roll',
  '[{"platform": "tactics.tools", "name": "Tactics.Tools", "url_pattern": "tactics.tools/player/", "url_example": "https://tactics.tools/player/euw/SummonerName"}]'::jsonb,
  '["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"]'::jsonb
FROM games g
WHERE LOWER(g.name) LIKE '%teamfight tactics%' OR LOWER(g.name) = 'tft'
ON CONFLICT (game_id) DO UPDATE SET
  game_category = EXCLUDED.game_category,
  character_field_label = EXCLUDED.character_field_label,
  character_field_placeholder = EXCLUDED.character_field_placeholder,
  stats_platforms = EXCLUDED.stats_platforms,
  rank_tiers = EXCLUDED.rank_tiers,
  updated_at = now();

INSERT INTO game_coaching_ui_config (game_id, game_category, character_field_label, character_field_placeholder, stats_platforms, rank_tiers)
SELECT 
  g.id,
  'moba',
  'Main Heroes',
  'e.g., Invoker, Pudge, Crystal Maiden',
  '[{"platform": "dotabuff", "name": "Dotabuff", "url_pattern": "dotabuff.com/players/", "url_example": "https://www.dotabuff.com/players/123456789"}, {"platform": "opendota", "name": "OpenDota", "url_pattern": "opendota.com/players/", "url_example": "https://www.opendota.com/players/123456789"}]'::jsonb,
  '["Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"]'::jsonb
FROM games g
WHERE LOWER(g.name) LIKE '%dota%'
ON CONFLICT (game_id) DO UPDATE SET
  game_category = EXCLUDED.game_category,
  character_field_label = EXCLUDED.character_field_label,
  character_field_placeholder = EXCLUDED.character_field_placeholder,
  stats_platforms = EXCLUDED.stats_platforms,
  rank_tiers = EXCLUDED.rank_tiers,
  updated_at = now();