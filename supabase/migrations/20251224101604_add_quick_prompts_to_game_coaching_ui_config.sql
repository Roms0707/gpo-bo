/*
  # Add Quick Prompts Column to Game Coaching UI Config

  1. Changes
    - Adds `quick_prompts` JSONB column to `game_coaching_ui_config` table
    - Structure: {"en": ["prompt1", "prompt2"], "fr": ["prompt1", "prompt2"]}
    - Stores multilingual quick action prompts for the AI coaching chat
    - Default value is empty object for backward compatibility

  2. Purpose
    - Enable database-driven, game-specific quick prompts for coaching chat
    - Support multiple languages (English and French) stored directly in the database
    - Replace hardcoded translation keys with database-driven content
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_coaching_ui_config' AND column_name = 'quick_prompts'
  ) THEN
    ALTER TABLE game_coaching_ui_config ADD COLUMN quick_prompts jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

COMMENT ON COLUMN game_coaching_ui_config.quick_prompts IS 'Multilingual quick prompts for coaching chat. Format: {"en": ["prompt1", ...], "fr": ["prompt1", ...]}';
