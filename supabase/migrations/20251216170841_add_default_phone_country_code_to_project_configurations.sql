/*
  # Add Default Phone Country Code to Project Configurations

  1. Changes to project_configurations table
    - `default_phone_country_code` (text): Default country code for phone number inputs
    - Used when users enter phone numbers without a country code prefix
    - Examples: '33' for France, '251' for Ethiopia, '216' for Tunisia

  2. Purpose
    - Enables configurable per-project default phone country codes
    - Allows each deployment to set the appropriate default for their region
    - Used by phone input components and validation utilities

  3. Notes
    - Nullable field - when NULL, the application uses its built-in default
    - Should contain only numeric characters (no '+' prefix)
*/

-- Add default_phone_country_code column to project_configurations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'default_phone_country_code'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN default_phone_country_code text;
  END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN project_configurations.default_phone_country_code IS 'Default country code for phone number inputs (e.g., 33 for France, 251 for Ethiopia). Used when users enter phone numbers without a country code prefix.';