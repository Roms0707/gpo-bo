/*
  # Add Smartpages API Integration

  1. New Entry in platform_api_integrations
    - `api_name`: 'smartpages' - Identifier for the Smartpages redirect URL service
    - `api_url`: Base URL endpoint for the Smartpages API
    - `api_key`: API key for authentication with Smartpages service
    - `api_type`: 'redirect' - Indicates this API is used for redirect URL generation
    - `is_active`: true - Enable the integration by default

  2. Purpose
    - Provides dynamic subscription redirect URL generation
    - Called when users need to be redirected for subscription renewal
    - Returns personalized URLs based on user and package information

  3. Security
    - API key is stored securely in the database
    - Only accessible by edge functions with service role key
*/

INSERT INTO platform_api_integrations (api_name, api_url, api_key, api_type, is_active)
VALUES (
  'smartpages',
  'https://smartpages.dve-dev.com/spdvpass/sp_api/get',
  '83a73c64922f3cfb993533531841fce8',
  'redirect',
  true
)
ON CONFLICT (api_name) DO UPDATE SET
  api_url = EXCLUDED.api_url,
  api_key = EXCLUDED.api_key,
  api_type = EXCLUDED.api_type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
