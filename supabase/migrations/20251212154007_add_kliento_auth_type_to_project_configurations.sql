/*
  # Add Kliento Auth Type to Project Configurations

  1. Changes
    - Adds `kliento_auth_type` column to `project_configurations` table
    - This field specifies the authentication sub-type when auth_method = 'kliento'
    - Values: 'password' (default) or 'otp' (phone-based OTP)
    
  2. Notes
    - Default value is 'password' to preserve existing behavior
    - Only relevant when auth_method = 'kliento'
    - NULL is allowed for non-kliento configurations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'kliento_auth_type'
  ) THEN
    ALTER TABLE project_configurations 
    ADD COLUMN kliento_auth_type text 
    DEFAULT 'password'
    CHECK (kliento_auth_type IS NULL OR kliento_auth_type IN ('password', 'otp'));

    COMMENT ON COLUMN project_configurations.kliento_auth_type IS 
      'Kliento authentication sub-type: password (default) or otp (4-digit phone OTP). Only relevant when auth_method = kliento.';
  END IF;
END $$;
