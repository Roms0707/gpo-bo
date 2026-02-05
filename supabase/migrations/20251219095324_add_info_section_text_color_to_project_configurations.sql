/*
  # Add Info Section Text Color to Project Configurations

  1. Changes
    - Adds `info_section_text_color` column to `project_configurations` table
    - This allows each configuration to customize the text color of info boxes/sections
    - Optional field (nullable) - falls back to accent color when not set

  2. Field Details
    - `info_section_text_color` (text, nullable): Hex color code for info section text
      Example: "#D4A574" for a golden/amber color
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'info_section_text_color'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN info_section_text_color text;
  END IF;
END $$;