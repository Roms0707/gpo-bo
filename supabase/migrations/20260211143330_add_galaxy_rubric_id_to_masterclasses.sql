/*
  # Add Galaxy rubric ID to masterclasses

  1. Modified Tables
    - `masterclasses`
      - Added `galaxy_rubric_id` (text, nullable) - Links a masterclass to a Galaxy DVE rubric for video content
  
  2. Data Updates
    - Sets `galaxy_rubric_id = '285651'` on the "rise-of-battle-royale" masterclass as proof of concept
      (maps to the "Masterclass - Battle Royale" rubric in Galaxy)

  3. Important Notes
    - Column is nullable so existing masterclasses without Galaxy integration keep working
    - Only one masterclass is wired up for the initial proof of concept
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'masterclasses' AND column_name = 'galaxy_rubric_id'
  ) THEN
    ALTER TABLE masterclasses ADD COLUMN galaxy_rubric_id text;
  END IF;
END $$;

UPDATE masterclasses
SET galaxy_rubric_id = '285651'
WHERE slug = 'rise-of-battle-royale'
  AND galaxy_rubric_id IS NULL;
