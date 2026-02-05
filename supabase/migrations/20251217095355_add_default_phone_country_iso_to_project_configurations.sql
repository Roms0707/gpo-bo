/*
  # Add Default Phone Country ISO to Project Configurations

  1. New Columns
    - `default_phone_country_iso` (text, nullable)
      - Stores the ISO 3166-1 alpha-2 country code (e.g., 'CI', 'SN', 'GH')
      - Used by Sendito API for OTP SMS delivery
      - Required when using Kliento OTP authentication

  2. Purpose
    - This field complements the existing `default_phone_country_code` (dial code prefix)
    - Together they provide complete country identification for SMS functionality
    - The ISO code is specifically required by the Sendito API

  3. Notes
    - Nullable to maintain backwards compatibility
    - Will be validated at application level when Kliento OTP is enabled
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'default_phone_country_iso'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN default_phone_country_iso text;
    COMMENT ON COLUMN project_configurations.default_phone_country_iso IS 'ISO 3166-1 alpha-2 country code for default phone country (e.g., CI, SN, GH). Required for Sendito API when using Kliento OTP authentication.';
  END IF;
END $$;