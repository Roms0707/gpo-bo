/*
  # Add config_id Support to Game Trailers Table

  1. Schema Changes
    - Add `config_id` column (text, NOT NULL) to link trailers to project configurations
    - Create index on `config_id` for efficient filtering
    - Create unique constraint to ensure one home trailer per project configuration

  2. Data Migration
    - Update existing default trailer with 'orange' as the default config_id
    - Update typewriter_phrase columns to use i18n translation keys instead of raw text:
      - `typewriter_phrase_1`: 'heroCarousel.home.phrase1'
      - `typewriter_phrase_2`: 'heroCarousel.home.phrase2'

  3. Notes
    - Each config_id now has its own "home trailer" (the first trailer users see)
    - Translation keys are resolved at runtime using the i18n system
    - The frontend uses t() function with brandName interpolation for phrase2
*/

-- Add config_id column with a default value first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_trailers' AND column_name = 'config_id'
  ) THEN
    ALTER TABLE game_trailers ADD COLUMN config_id text DEFAULT 'orange';
  END IF;
END $$;

-- Update existing records to have the default config_id
UPDATE game_trailers
SET config_id = 'orange'
WHERE config_id IS NULL;

-- Now make config_id NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_trailers'
    AND column_name = 'config_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE game_trailers ALTER COLUMN config_id SET NOT NULL;
  END IF;
END $$;

-- Remove the default value after setting NOT NULL
ALTER TABLE game_trailers ALTER COLUMN config_id DROP DEFAULT;

-- Create index on config_id for efficient filtering
CREATE INDEX IF NOT EXISTS idx_game_trailers_config_id ON game_trailers(config_id);

-- Create unique partial index to ensure one home trailer per config_id
DROP INDEX IF EXISTS idx_game_trailers_one_default_per_config;
CREATE UNIQUE INDEX idx_game_trailers_one_default_per_config
ON game_trailers(config_id)
WHERE is_default = true;

-- Update typewriter phrases to use i18n translation keys
UPDATE game_trailers
SET
  typewriter_phrase_1 = 'heroCarousel.home.phrase1',
  typewriter_phrase_2 = 'heroCarousel.home.phrase2'
WHERE is_default = true;
