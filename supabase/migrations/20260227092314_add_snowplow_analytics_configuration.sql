/*
  # Add Snowplow Analytics Configuration

  1. Schema Changes
    - Add `snowplow_enabled` (boolean, NOT NULL, default false) to `project_configurations`
      - Controls whether the frontend initializes the Snowplow tracker for this tenant
      - Default is false so all existing and new tenants start with tracking disabled
    - Add `snowplow_app_id` (text, nullable) to `project_configurations`
      - Stores the per-tenant Snowplow application identifier (e.g., "orange-arena-tn")
      - NULL when Snowplow is not configured for the tenant

  2. Platform Integration
    - Insert a global Snowplow collector row into `platform_api_integrations`
      - Shared collector endpoint used by all tenants
      - Only the `app_id` (stored per-tenant in project_configurations) differs

  3. Security
    - No RLS changes needed: existing project_configurations policies already cover new columns
    - platform_api_integrations remains restricted to admin/service-role only
    - The Edge Function uses service role internally to read the collector URL

  4. Important Notes
    - The `default` (Shard Arena) configuration stays with snowplow_enabled = false
    - Other tenants will need their snowplow_app_id populated when ready to enable
    - The collector URL placeholder must be replaced with the actual Snowplow collector endpoint
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'snowplow_enabled'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN snowplow_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'snowplow_app_id'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN snowplow_app_id TEXT;
  END IF;
END $$;

INSERT INTO platform_api_integrations (api_name, api_url, api_key, api_type, is_active, extra_config)
VALUES (
  'snowplow',
  '',
  NULL,
  'analytics',
  true,
  '{}'::jsonb
)
ON CONFLICT (api_name) DO NOTHING;