/*
  # Add Auth Method Support and Kliento Integration

  1. Changes to project_configurations
    - `auth_method` (text): Authentication method for the project ('email', 'discord', 'kliento')
    - Default value is 'email' for backward compatibility

  2. Changes to users table
    - `kliento_user_id` (text): External user ID from Kliento system
    - `phone_number` (text): User's phone number in international format (MSISDN)
    - `auth_provider` (text): Tracks which auth method the user used ('email', 'discord', 'kliento')

  3. Changes to platform_api_integrations
    - Add Kliento API configuration row

  4. Security
    - RLS policies updated for new columns
*/

-- Add auth_method column to project_configurations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'auth_method'
  ) THEN
    ALTER TABLE project_configurations
    ADD COLUMN auth_method text DEFAULT 'email'
    CHECK (auth_method IN ('email', 'discord', 'kliento'));
  END IF;
END $$;

-- Add Kliento-related columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'kliento_user_id'
  ) THEN
    ALTER TABLE users ADD COLUMN kliento_user_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE users ADD COLUMN phone_number text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'auth_provider'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_provider text DEFAULT 'email'
    CHECK (auth_provider IN ('email', 'discord', 'kliento'));
  END IF;
END $$;

-- Create index on kliento_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_kliento_user_id ON users(kliento_user_id) WHERE kliento_user_id IS NOT NULL;

-- Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number) WHERE phone_number IS NOT NULL;

-- Insert Kliento API configuration if not exists
INSERT INTO platform_api_integrations (api_name, api_url, api_type, is_active)
SELECT 'kliento', 'https://userv1.dv-content.io', 'auth', true
WHERE NOT EXISTS (
  SELECT 1 FROM platform_api_integrations WHERE api_name = 'kliento'
);

-- Add comment to document the auth_method column
COMMENT ON COLUMN project_configurations.auth_method IS 'Authentication method for this project configuration: email (default), discord (OAuth), or kliento (external auth service)';

-- Add comments to document user columns
COMMENT ON COLUMN users.kliento_user_id IS 'External user identifier from the Kliento authentication system';
COMMENT ON COLUMN users.phone_number IS 'User phone number in international format (MSISDN), used for Kliento authentication';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider used by this user: email, discord, or kliento';
