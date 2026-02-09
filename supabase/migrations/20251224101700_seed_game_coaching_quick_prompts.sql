/*
  # Seed Multilingual Quick Prompts for Game Coaching

  1. Purpose
    - Populate quick_prompts JSONB with English and French prompts for all configured games
    - Each game has contextually relevant conversation starters

  2. Games Updated
    - Valorant (FPS): Agent tips, aim improvement, crosshair placement
    - Overwatch 2 (Hero Shooter): Hero counters, ultimate timing, positioning
    - Rocket League (Sports): Aerials, boost management, rotation
    - League of Legends (MOBA): CS, wave management, vision control
    - Apex Legends (Battle Royale): Landing, movement, loadouts
    - CS2 (FPS): Spray control, economy, utility lineups
    - Fortnite (Battle Royale): Building, editing, box fighting
    - EA FC / FIFA (Sports): Skill moves, tactics, formations
    - Tekken 8 (Fighting): Combos, frame data, punishes
    - Street Fighter 6 (Fighting): Combo routes, Drive system, neutral
    - TFT (Autobattler): Comp building, economy, positioning
    - Dota 2 (MOBA): Hero picks, lane control, teamfight timing
    - Call of Duty Warzone (Battle Royale): Loadouts, movement, zone rotation

  3. Language Support
    - English (en): Primary language
    - French (fr): Full translation for all prompts
*/

UPDATE game_coaching_ui_config
SET quick_prompts = '{
  "en": ["Improve my aim", "Agent ability combos", "Crosshair placement tips", "Economy management", "Map control strategies"],
  "fr": ["Améliorer ma visée", "Combos de compétences d''agent", "Conseils de placement du viseur", "Gestion de l''économie", "Stratégies de contrôle de carte"]
}'::jsonb,
updated_at = now()
WHERE game_id IN (SELECT id FROM games WHERE LOWER(name) LIKE '%valorant%');

UPDATE game_coaching_ui_config
SET quick_prompts = '{
  "en": ["Hero counters", "Ultimate timing", "Positioning tips", "Team composition advice", "Map-specific strategies"],
  "fr": ["Contres de héros", "Timing des ultimates", "Conseils de positionnement", "Conseils de composition d''équipe", "Stratégies par carte"]
}'::jsonb,
updated_at = now()
WHERE game_id IN (SELECT id FROM games WHERE LOWER(name) LIKE '%overwatch%');

UPDATE game_coaching_ui_config
SET quick_prompts = '{
  "en": ["Improve my aerials", "Boost management tips", "Rotation strategies", "Kickoff techniques", "Car control advice"],
  "fr": ["Améliorer mes aériens", "Conseils de gestion du boost", "Stratégies de rotation", "Techniques de kickoff", "Conseils de contrôle de voiture"]
}'::jsonb,
updated_at = now()
WHERE game_id IN (SELECT id FROM games WHERE LOWER(name) LIKE '%rocket league%');

UPDATE game_coaching_ui_config
SET quick_prompts = '{
  "en": ["Improve my CS", "Wave management tips", "Vision control", "Champion recommendations", "Teamfight positioning"],
  "fr": ["Améliorer mon CS", "Conseils de gestion des vagues", "Contrôle de la vision", "Recommandations de champions", "Positionnement en teamfight"]
}'::jsonb,
updated_at = now()
WHERE game_id IN (SELECT id FROM games WHERE LOWER(name) LIKE '%league of legends%' OR LOWER(name) = 'lol');

UPDATE game_coaching_ui_config
SET quick_prompts = '{
  "en": ["Landing strategies", "Movement techniques", "Best loadouts", "Ring rotation tips", "Legend synergies"],
  "fr": ["Stratégies d''atterrissage", "Techniques de mouvement", "Meilleurs équipements", "Conseils de rotation de zone", "Synergies de Légendes"]
}'::jsonb,
updated_at = now()
WHERE game_id IN (SELECT id FROM games WHERE LOWER(name) LIKE '%apex%');

UPDATE game_coaching_ui_config
SET quick_prompts = '{
  "en": ["Spray control tips", "Economy management", "Utility lineups", "Map rotations", "Clutch situation advice"],
  "fr": ["Conseils de contrôle du spray", "Gestion de l''économie", "Lineups d''utilitaires", "Rotations sur la carte", "Conseils en situation de clutch"]
}'::jsonb,
updated_at = now()
WHERE game_id IN (SELECT id FROM games WHERE LOWER(name) LIKE '%counter-strike%' OR LOWER(name) LIKE '%cs2%' OR LOWER(name) LIKE '%csgo%');

UPDATE game_coaching_ui_config
SET quick_prompts = '{
  "en": ["Building techniques", "Edit plays", "Weapon loadout tips", "Zone rotation strategies", "Box fighting advice"],
  "fr": ["Techniques de construction", "Plays d''édition", "Conseils d''équipement d''armes", "Stratégies de rotation de zone", "Conseils de box fight"]
}'::jsonb,
updated_at = now()
WHERE game_id IN (SELECT id FROM games WHERE LOWER(name) LIKE '%fortnite%');

UPDATE game_coaching_ui_config
SET quick_prompts = '{
  "en": ["Skill moves tips", "Defensive tactics", "Formation advice", "Custom tactics setup", "Player chemistry optimization"],
  "fr": ["Conseils sur les gestes techniques", "Tactiques défensives", "Conseils de formation", "Configuration des tactiques", "Optimisation de l''alchimie"]
}'::jsonb,
updated_at = now()
WHERE game_id IN (SELECT id FROM games WHERE LOWER(name) LIKE '%fc 2%' OR LOWER(name) LIKE '%fifa%' OR LOWER(name) LIKE '%ea fc%' OR LOWER(name) LIKE '%ea sports fc%');

UPDATE game_coaching_ui_config
SET quick_prompts = '{
  "en": ["Combo execution tips", "Frame data basics", "Punish options", "Matchup advice", "Movement fundamentals"],
  "fr": ["Conseils d''exécution des combos", "Bases des frame data", "Options de punition", "Conseils de matchup", "Fondamentaux du mouvement"]
}'::jsonb,
updated_at = now()
WHERE game_id IN (SELECT id FROM games WHERE LOWER(name) LIKE '%tekken%');

UPDATE game_coaching_ui_config
SET quick_prompts = '{
  "en": ["Combo routes", "Drive system tips", "Anti-air options", "Neutral game advice", "Okizeme setups"],
  "fr": ["Routes de combos", "Conseils sur le système Drive", "Options anti-air", "Conseils pour le jeu neutre", "Setups d''okizeme"]
}'::jsonb,
updated_at = now()
WHERE game_id IN (SELECT id FROM games WHERE LOWER(name) LIKE '%street fighter%');

UPDATE game_coaching_ui_config
SET quick_prompts = '{
  "en": ["Comp building tips", "Economy management", "Positioning advice", "Item priorities", "Augment choices"],
  "fr": ["Conseils de construction de compo", "Gestion de l''économie", "Conseils de positionnement", "Priorités d''objets", "Choix d''augments"]
}'::jsonb,
updated_at = now()
WHERE game_id IN (SELECT id FROM games WHERE LOWER(name) LIKE '%teamfight tactics%' OR LOWER(name) = 'tft');

UPDATE game_coaching_ui_config
SET quick_prompts = '{
  "en": ["Hero picks for my rank", "Lane control tips", "Item build advice", "Teamfight timing", "Map awareness strategies"],
  "fr": ["Choix de héros pour mon rang", "Conseils de contrôle de lane", "Conseils de build d''objets", "Timing des teamfights", "Stratégies de vision de la carte"]
}'::jsonb,
updated_at = now()
WHERE game_id IN (SELECT id FROM games WHERE LOWER(name) LIKE '%dota%');

INSERT INTO game_coaching_ui_config (game_id, game_category, character_field_label, character_field_placeholder, stats_platforms, rank_tiers, quick_prompts)
SELECT
  g.id,
  'battle_royale',
  'Preferred Loadouts',
  'e.g., SMG/AR, Sniper/Shotgun',
  '[{"platform": "tracker.gg", "name": "Tracker.gg", "url_pattern": "tracker.gg/warzone/profile/", "url_example": "https://tracker.gg/warzone/profile/atvi/PlayerName/overview"}]'::jsonb,
  '["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Crimson", "Iridescent", "Top 250"]'::jsonb,
  '{
    "en": ["Best loadout builds", "Movement tips", "Zone rotation strategies", "Gulag advice", "Audio cue awareness"],
    "fr": ["Meilleures configurations de classes", "Conseils de déplacement", "Stratégies de rotation de zone", "Conseils pour le goulag", "Conscience des indices audio"]
  }'::jsonb
FROM games g
WHERE (LOWER(g.name) LIKE '%warzone%' OR LOWER(g.name) LIKE '%call of duty%')
  AND NOT EXISTS (
    SELECT 1 FROM game_coaching_ui_config c WHERE c.game_id = g.id
  )
ON CONFLICT (game_id) DO UPDATE SET
  quick_prompts = EXCLUDED.quick_prompts,
  updated_at = now();
