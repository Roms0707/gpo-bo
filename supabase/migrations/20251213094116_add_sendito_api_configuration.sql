/*
  # Add Sendito SMS API Configuration

  1. Schema Changes
    - Adds `extra_config` JSONB column to `platform_api_integrations` table
    - This column stores additional configuration like secrets, templates, etc.

  2. New Configuration
    - Adds Sendito SMS provider to `platform_api_integrations` table
    - Stores API credentials and configuration for OTP sending

  3. Configuration Details
    - `api_name`: 'sendito' - identifier for the SMS provider
    - `api_url`: Sendito messages endpoint
    - `api_key`: sesame_login credential
    - `api_type`: 'sms' - categorizes this as SMS service
    - `extra_config`: JSON containing:
      - `api_secret_key`: sesame_password (base64 encoded)
      - `message_template`: OTP message template with {otp} placeholder
      - `sender_name`: Default sender name for SMS

  4. Notes
    - Uses INSERT ON CONFLICT to safely upsert the configuration
    - Credentials should be updated with actual values in production
*/

-- Add extra_config column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_api_integrations' AND column_name = 'extra_config'
  ) THEN
    ALTER TABLE platform_api_integrations ADD COLUMN extra_config jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Insert or update Sendito configuration
INSERT INTO platform_api_integrations (
  api_name,
  api_url,
  api_key,
  api_type,
  is_active,
  extra_config
)
VALUES (
  'sendito',
  'https://sendito.contactdve.com/messages',
  'esport_plt_srv',
  'sms',
  true,
  jsonb_build_object(
    'api_secret_key', 'RXNQcnBUbEtsVWRWczMwKg==',
    'message_template', 'Your verification code is: {otp}',
    'sender_name', 'Arena'
  )
)
ON CONFLICT (api_name)
DO UPDATE SET
  api_url = EXCLUDED.api_url,
  api_key = EXCLUDED.api_key,
  api_type = EXCLUDED.api_type,
  is_active = EXCLUDED.is_active,
  extra_config = EXCLUDED.extra_config,
  updated_at = now();
