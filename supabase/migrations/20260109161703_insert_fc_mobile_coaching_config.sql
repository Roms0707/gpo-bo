/*
  # Insert FC Mobile Game Coaching UI Configuration

  1. Purpose
    - Add coaching configuration for FC Mobile (EA Sports FC Mobile)
    - Set empty stats_platforms array since no tracking platform is available for mobile
    - Configure division-based ranking system consistent with other EA FC titles

  2. Configuration Details
    - game_id: ca9408a6-94b1-4744-9177-834c2b63fa10
    - game_category: sports
    - character_field_label: Preferred Formations
    - stats_platforms: [] (empty - no tracking available for mobile)
    - rank_tiers: Division-based ranking system (Division 10 through Elite)
    - quick_prompts: Multilingual (English and French) coaching prompts

  3. Quick Prompts
    - English: Skill moves tips, Defensive tactics, Formation advice, Custom tactics setup, Player chemistry optimization
    - French: Conseils sur les gestes techniques, Tactiques defensives, Conseils de formation, Configuration des tactiques, Optimisation de l'alchimie

  4. Notes
    - Uses ON CONFLICT to handle cases where entry might already exist
    - Empty stats_platforms will trigger the "No tracking platform available" message in UI
    - FC Mobile uses the same coaching structure as FC26/FC25 for consistency
*/

INSERT INTO game_coaching_ui_config (
  game_id,
  game_category,
  character_field_label,
  character_field_placeholder,
  stats_platforms,
  rank_tiers,
  quick_prompts
)
VALUES (
  'ca9408a6-94b1-4744-9177-834c2b63fa10',
  'sports',
  'Preferred Formations',
  'e.g., 4-3-3, 4-2-3-1, 3-5-2',
  '[]'::jsonb,
  '["Division 10", "Division 9", "Division 8", "Division 7", "Division 6", "Division 5", "Division 4", "Division 3", "Division 2", "Division 1", "Elite"]'::jsonb,
  '{
    "en": ["Skill moves tips", "Defensive tactics", "Formation advice", "Custom tactics setup", "Player chemistry optimization"],
    "fr": ["Conseils sur les gestes techniques", "Tactiques défensives", "Conseils de formation", "Configuration des tactiques", "Optimisation de l''alchimie"]
  }'::jsonb
)
ON CONFLICT (game_id) DO UPDATE SET
  game_category = EXCLUDED.game_category,
  character_field_label = EXCLUDED.character_field_label,
  character_field_placeholder = EXCLUDED.character_field_placeholder,
  stats_platforms = EXCLUDED.stats_platforms,
  rank_tiers = EXCLUDED.rank_tiers,
  quick_prompts = EXCLUDED.quick_prompts,
  updated_at = now();