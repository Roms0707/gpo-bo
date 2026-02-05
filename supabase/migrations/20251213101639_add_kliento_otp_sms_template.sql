/*
  # Add Kliento OTP SMS Template to Project Configurations

  1. Changes
    - Add `kliento_otp_sms_template` column to `project_configurations` table
    - Column type: text, nullable
    - Default value: 'Your OTP is {{OTP_CODE}}'

  2. Purpose
    - Allows customization of SMS messages sent for OTP authentication
    - The {{OTP_CODE}} placeholder will be replaced with the actual verification code
    - Only relevant when auth_method = 'kliento' AND kliento_auth_type = 'otp'

  3. Notes
    - Recommended max length is 160 characters to avoid SMS splitting
    - Template must contain {{OTP_CODE}} placeholder for code insertion
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'kliento_otp_sms_template'
  ) THEN
    ALTER TABLE project_configurations 
    ADD COLUMN kliento_otp_sms_template text DEFAULT 'Your OTP is {{OTP_CODE}}';
  END IF;
END $$;

COMMENT ON COLUMN project_configurations.kliento_otp_sms_template IS 'SMS template for OTP messages. Use {{OTP_CODE}} placeholder for the verification code. Max 160 characters recommended.';