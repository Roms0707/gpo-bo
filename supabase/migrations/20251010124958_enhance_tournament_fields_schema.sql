/*
  # Enhance Tournament Fields Schema

  1. Schema Changes
    - Add `options` column to `tournament_fields` table
      - Stores dropdown/multi-select choices as JSONB array
      - Example: ["Option 1", "Option 2", "Option 3"]
    - Add `validation_rules` column to `tournament_fields` table
      - Stores field-specific validation as JSONB object
      - Example: {"minLength": 10, "maxLength": 15, "pattern": "^[0-9]+$"}
    - Add `field_category` column to `tournament_fields` table
      - Categories: 'contact', 'personal', 'identification', 'custom'
    - Add `placeholder_text` column to `tournament_fields` table
      - Provides helpful guidance text for users
    - Add `display_order` column to `tournament_fields` table
      - Controls the order fields appear in forms

  2. Notes
    - All new columns are nullable for backward compatibility
    - Existing fields will continue to work without modification
    - JSONB type allows flexible storage of structured data
*/

-- Add new columns to tournament_fields table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_fields' AND column_name = 'options'
  ) THEN
    ALTER TABLE tournament_fields ADD COLUMN options JSONB DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_fields' AND column_name = 'validation_rules'
  ) THEN
    ALTER TABLE tournament_fields ADD COLUMN validation_rules JSONB DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_fields' AND column_name = 'field_category'
  ) THEN
    ALTER TABLE tournament_fields ADD COLUMN field_category TEXT DEFAULT 'custom';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_fields' AND column_name = 'placeholder_text'
  ) THEN
    ALTER TABLE tournament_fields ADD COLUMN placeholder_text TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_fields' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE tournament_fields ADD COLUMN display_order INTEGER DEFAULT 0;
  END IF;
END $$;