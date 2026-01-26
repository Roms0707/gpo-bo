/*
  # Update Game Trailers Table for Typewriter Phrases

  1. Schema Changes
    - Remove `description` column (no longer used in hero carousel)
    - Add `typewriter_phrase_1` (text) - First rotating phrase for default slide
    - Add `typewriter_phrase_2` (text) - Second rotating phrase for default slide

  2. Data Migration
    - Update existing default trailer with default phrases:
      - Phrase 1: "Welcome To the Arena"
      - Phrase 2: "Welcome to {brandName}" (brandName interpolated at runtime)

  3. Notes
    - These columns are only used for the default slide (is_default = true)
    - Featured tournament slides use tournament.title directly
    - The {brandName} placeholder is interpolated in the frontend
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_trailers' AND column_name = 'typewriter_phrase_1'
  ) THEN
    ALTER TABLE game_trailers ADD COLUMN typewriter_phrase_1 text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_trailers' AND column_name = 'typewriter_phrase_2'
  ) THEN
    ALTER TABLE game_trailers ADD COLUMN typewriter_phrase_2 text;
  END IF;
END $$;

UPDATE game_trailers
SET
  typewriter_phrase_1 = 'Welcome To the Arena',
  typewriter_phrase_2 = 'Welcome to {brandName}'
WHERE is_default = true
AND typewriter_phrase_1 IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_trailers' AND column_name = 'description'
  ) THEN
    ALTER TABLE game_trailers DROP COLUMN description;
  END IF;
END $$;
