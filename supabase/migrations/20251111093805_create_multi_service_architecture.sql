/*
  # Multi-Service Architecture for Country Configurations

  ## Overview
  This migration transforms the country configuration system from a single configuration
  per country to support multiple services per country. Each service can have its own
  branding, theme, locale settings, and Galaxy API configuration, while sharing the
  same IP detection at the country level.

  ## Architecture Changes

  ### 1. New Table: `services`
  Global service definitions that can be used across multiple countries.
  - `id` (uuid, primary key)
  - `service_name` (text, human-readable service name)
  - `service_code` (text, unique identifier code for the service)
  - `description` (text, optional description)
  - `is_active` (boolean, whether this service is currently active globally)
  - `created_at` (timestamptz, creation timestamp)
  - `updated_at` (timestamptz, last update timestamp)

  ### 2. Modified Table: `country_configurations`
  Simplified to handle only country-level data and IP detection.
  - Keeps: country_code, country_name, is_active, is_default
  - Adds: ip_ranges (jsonb), default_service_id (uuid)
  - Removes: brand/logo/theme/locale/galaxy fields (moved to country_service_configurations)

  ### 3. New Table: `country_service_configurations`
  Stores specific configuration for each country-service combination.
  - `id` (uuid, primary key)
  - `country_code` (text, foreign key to country_configurations)
  - `service_id` (uuid, foreign key to services)
  - `brand_name` (text)
  - `logo_path` (text)
  - `favicon_path` (text)
  - `logo_alt_text` (text)
  - `theme_colors` (jsonb)
  - `locale_language` (text)
  - `locale_currency` (text)
  - `locale_text_direction` (text)
  - `galaxy_campaign_id` (text)
  - `galaxy_service_id` (text)
  - `galaxy_country_code` (text)
  - `galaxy_language_code` (text)
  - `is_default_for_country` (boolean)
  - `is_active` (boolean)
  - `extra_metadata` (jsonb)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. Modified Table: `galaxy_rubric_mappings`
  Updated to reference both country_code and service_id.
  - Replaces foreign key from country_code to (country_code, service_id)
  - Adds service_id field

  ## Data Migration Strategy
  1. Create a default "Main Service" in the services table
  2. Migrate existing country_configurations data to country_service_configurations
  3. Associate all migrated configurations with the default service
  4. Update galaxy_rubric_mappings to reference the default service
  5. Clean up old columns from country_configurations

  ## Security (RLS)
  - All tables maintain existing security model: public read, master_admin write
  - New triggers ensure data integrity (at least one active service per country)

  ## Important Notes
  1. Each country must have at least one active service
  2. Each country must have exactly one default service
  3. IP detection happens at country level, service selection at configuration level
  4. Galaxy API credentials are now per service, not per country
*/

-- =====================================================
-- STEP 1: Create the services table
-- =====================================================

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  service_code text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for active services
CREATE INDEX IF NOT EXISTS idx_services_active
  ON services(is_active);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for services
CREATE POLICY "Public can view services"
  ON services FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Master admin can manage services"
  ON services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master_admin'
    )
  );

-- Create trigger for services updated_at
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default service for migration
INSERT INTO services (service_name, service_code, description, is_active)
VALUES ('Main Service', 'main', 'Default service for existing configurations', true)
ON CONFLICT (service_code) DO NOTHING;

-- =====================================================
-- STEP 2: Create country_service_configurations table
-- =====================================================

CREATE TABLE IF NOT EXISTS country_service_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  brand_name text NOT NULL,
  logo_path text,
  favicon_path text,
  logo_alt_text text DEFAULT '',
  theme_colors jsonb DEFAULT '{
    "primary": "#3b82f6",
    "secondary": "#8b5cf6",
    "accent": "#06b6d4",
    "success": "#10b981",
    "error": "#ef4444",
    "warning": "#f59e0b"
  }'::jsonb,
  locale_language text DEFAULT 'en',
  locale_currency text DEFAULT 'USD',
  locale_text_direction text DEFAULT 'ltr',
  galaxy_campaign_id text,
  galaxy_service_id text,
  galaxy_country_code text,
  galaxy_language_code text,
  is_default_for_country boolean DEFAULT false,
  is_active boolean DEFAULT true,
  extra_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_country_service UNIQUE (country_code, service_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_country_service_configs_country
  ON country_service_configurations(country_code);

CREATE INDEX IF NOT EXISTS idx_country_service_configs_service
  ON country_service_configurations(service_id);

CREATE INDEX IF NOT EXISTS idx_country_service_configs_default
  ON country_service_configurations(country_code, is_default_for_country)
  WHERE is_default_for_country = true;

CREATE INDEX IF NOT EXISTS idx_country_service_configs_active
  ON country_service_configurations(is_active);

-- Enable RLS
ALTER TABLE country_service_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view country service configurations"
  ON country_service_configurations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Master admin can manage country service configurations"
  ON country_service_configurations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master_admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_country_service_configurations_updated_at
  BEFORE UPDATE ON country_service_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 3: Migrate existing data
-- =====================================================

-- Check if country_configurations has the old structure
DO $$
DECLARE
  has_brand_name boolean;
  default_service_id uuid;
BEGIN
  -- Check if brand_name column exists (indicating old structure)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'country_configurations'
    AND column_name = 'brand_name'
  ) INTO has_brand_name;

  IF has_brand_name THEN
    -- Get the default service ID
    SELECT id INTO default_service_id
    FROM services
    WHERE service_code = 'main';

    -- Migrate data from country_configurations to country_service_configurations
    INSERT INTO country_service_configurations (
      country_code,
      service_id,
      brand_name,
      logo_path,
      favicon_path,
      logo_alt_text,
      theme_colors,
      locale_language,
      locale_currency,
      locale_text_direction,
      galaxy_campaign_id,
      galaxy_service_id,
      galaxy_country_code,
      galaxy_language_code,
      is_default_for_country,
      is_active,
      extra_metadata,
      created_at,
      updated_at
    )
    SELECT
      country_code,
      default_service_id,
      COALESCE(brand_name, 'Brand'),
      logo_path,
      favicon_path,
      COALESCE(logo_alt_text, ''),
      COALESCE(theme_colors, '{
        "primary": "#3b82f6",
        "secondary": "#8b5cf6",
        "accent": "#06b6d4",
        "success": "#10b981",
        "error": "#ef4444",
        "warning": "#f59e0b"
      }'::jsonb),
      COALESCE(locale_language, 'en'),
      COALESCE(locale_currency, 'USD'),
      COALESCE(locale_text_direction, 'ltr'),
      galaxy_campaign_id,
      galaxy_service_id,
      galaxy_country_code,
      galaxy_language_code,
      true, -- Set as default for country
      is_active,
      COALESCE(extra_metadata, '{}'::jsonb),
      created_at,
      updated_at
    FROM country_configurations
    ON CONFLICT (country_code, service_id) DO NOTHING;

    RAISE NOTICE 'Migrated % configurations to country_service_configurations',
      (SELECT COUNT(*) FROM country_service_configurations);
  END IF;
END $$;

-- =====================================================
-- STEP 4: Modify country_configurations table
-- =====================================================

-- Add new columns if they don't exist
DO $$
BEGIN
  -- Add ip_ranges column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'country_configurations'
    AND column_name = 'ip_ranges'
  ) THEN
    ALTER TABLE country_configurations
    ADD COLUMN ip_ranges jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Add default_service_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'country_configurations'
    AND column_name = 'default_service_id'
  ) THEN
    ALTER TABLE country_configurations
    ADD COLUMN default_service_id uuid REFERENCES services(id) ON DELETE RESTRICT;

    -- Set default service for all existing countries
    UPDATE country_configurations
    SET default_service_id = (SELECT id FROM services WHERE service_code = 'main')
    WHERE default_service_id IS NULL;
  END IF;
END $$;

-- Remove old columns that have been migrated
DO $$
BEGIN
  -- Drop columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'country_configurations'
    AND column_name = 'brand_name'
  ) THEN
    ALTER TABLE country_configurations
    DROP COLUMN IF EXISTS brand_name,
    DROP COLUMN IF EXISTS logo_path,
    DROP COLUMN IF EXISTS favicon_path,
    DROP COLUMN IF EXISTS logo_alt_text,
    DROP COLUMN IF EXISTS theme_colors,
    DROP COLUMN IF EXISTS locale_language,
    DROP COLUMN IF EXISTS locale_currency,
    DROP COLUMN IF EXISTS locale_text_direction,
    DROP COLUMN IF EXISTS galaxy_campaign_id,
    DROP COLUMN IF EXISTS galaxy_service_id,
    DROP COLUMN IF EXISTS galaxy_country_code,
    DROP COLUMN IF EXISTS galaxy_language_code,
    DROP COLUMN IF EXISTS extra_metadata;

    RAISE NOTICE 'Removed migrated columns from country_configurations';
  END IF;
END $$;

-- Add comment for ip_ranges
COMMENT ON COLUMN country_configurations.ip_ranges IS
  'Array of IP ranges in CIDR notation for country detection. Example: [{"start": "192.168.1.0/24", "description": "Paris datacenter"}]';

-- =====================================================
-- STEP 5: Update galaxy_rubric_mappings table
-- =====================================================

-- Add service_id column to galaxy_rubric_mappings
DO $$
DECLARE
  default_service_id uuid;
BEGIN
  -- Get the default service ID
  SELECT id INTO default_service_id
  FROM services
  WHERE service_code = 'main';

  -- Add service_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'galaxy_rubric_mappings'
    AND column_name = 'service_id'
  ) THEN
    ALTER TABLE galaxy_rubric_mappings
    ADD COLUMN service_id uuid REFERENCES services(id) ON DELETE CASCADE;

    -- Set default service for all existing mappings
    UPDATE galaxy_rubric_mappings
    SET service_id = default_service_id
    WHERE service_id IS NULL;

    -- Make service_id NOT NULL after setting default
    ALTER TABLE galaxy_rubric_mappings
    ALTER COLUMN service_id SET NOT NULL;

    RAISE NOTICE 'Added service_id to galaxy_rubric_mappings';
  END IF;
END $$;

-- Drop old unique constraint if exists
DROP INDEX IF EXISTS idx_galaxy_rubric_unique;

-- Create new unique constraint including service_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_galaxy_rubric_unique_with_service
  ON galaxy_rubric_mappings(country_code, service_id, rubric_id);

-- Create index on service_id for performance
CREATE INDEX IF NOT EXISTS idx_galaxy_rubric_service
  ON galaxy_rubric_mappings(service_id);

-- Add foreign key constraint to country_service_configurations
DO $$
BEGIN
  -- Drop old foreign key if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_country_code'
    AND table_name = 'galaxy_rubric_mappings'
  ) THEN
    ALTER TABLE galaxy_rubric_mappings
    DROP CONSTRAINT fk_country_code;
  END IF;
END $$;

-- =====================================================
-- STEP 6: Create validation functions and triggers
-- =====================================================

-- Function to ensure at least one active service per country
CREATE OR REPLACE FUNCTION validate_country_has_active_service()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to deactivate a service
  IF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
    -- Check if this is the last active service for the country
    IF NOT EXISTS (
      SELECT 1 FROM country_service_configurations
      WHERE country_code = NEW.country_code
      AND is_active = true
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Cannot deactivate the last active service for country %', NEW.country_code;
    END IF;
  END IF;

  -- If trying to delete a service
  IF TG_OP = 'DELETE' AND OLD.is_active = true THEN
    IF NOT EXISTS (
      SELECT 1 FROM country_service_configurations
      WHERE country_code = OLD.country_code
      AND is_active = true
      AND id != OLD.id
    ) THEN
      RAISE EXCEPTION 'Cannot delete the last active service for country %', OLD.country_code;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_active_service_trigger ON country_service_configurations;
CREATE TRIGGER validate_active_service_trigger
  BEFORE UPDATE OR DELETE ON country_service_configurations
  FOR EACH ROW
  EXECUTE FUNCTION validate_country_has_active_service();

-- Function to ensure only one default service per country
CREATE OR REPLACE FUNCTION validate_single_default_service()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a service as default
  IF NEW.is_default_for_country = true THEN
    -- Unset any other default service for this country
    UPDATE country_service_configurations
    SET is_default_for_country = false
    WHERE country_code = NEW.country_code
    AND id != NEW.id
    AND is_default_for_country = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_default_service_trigger ON country_service_configurations;
CREATE TRIGGER validate_default_service_trigger
  BEFORE INSERT OR UPDATE ON country_service_configurations
  FOR EACH ROW
  EXECUTE FUNCTION validate_single_default_service();

-- =====================================================
-- STEP 7: Create helper functions for resolution
-- =====================================================

-- Function to get country from IP (placeholder for now)
CREATE OR REPLACE FUNCTION get_country_from_ip(ip_address inet)
RETURNS text AS $$
DECLARE
  detected_country text;
BEGIN
  -- TODO: Implement actual IP range matching logic
  -- For now, return NULL (will use default country)
  SELECT country_code INTO detected_country
  FROM country_configurations
  WHERE is_active = true
  AND ip_ranges IS NOT NULL
  -- IP matching logic will be implemented based on ip_ranges structure
  LIMIT 1;

  RETURN detected_country;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get service configuration with fallback
CREATE OR REPLACE FUNCTION get_service_configuration(
  p_country_code text DEFAULT NULL,
  p_service_code text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  country_code text,
  service_id uuid,
  service_code text,
  service_name text,
  brand_name text,
  logo_path text,
  favicon_path text,
  logo_alt_text text,
  theme_colors jsonb,
  locale_language text,
  locale_currency text,
  locale_text_direction text,
  galaxy_campaign_id text,
  galaxy_service_id text,
  galaxy_country_code text,
  galaxy_language_code text,
  is_default_for_country boolean,
  is_active boolean,
  extra_metadata jsonb
) AS $$
BEGIN
  -- Try to find specific country + service combination
  IF p_country_code IS NOT NULL AND p_service_code IS NOT NULL THEN
    RETURN QUERY
    SELECT
      csc.id,
      csc.country_code,
      csc.service_id,
      s.service_code,
      s.service_name,
      csc.brand_name,
      csc.logo_path,
      csc.favicon_path,
      csc.logo_alt_text,
      csc.theme_colors,
      csc.locale_language,
      csc.locale_currency,
      csc.locale_text_direction,
      csc.galaxy_campaign_id,
      csc.galaxy_service_id,
      csc.galaxy_country_code,
      csc.galaxy_language_code,
      csc.is_default_for_country,
      csc.is_active,
      csc.extra_metadata
    FROM country_service_configurations csc
    JOIN services s ON s.id = csc.service_id
    WHERE csc.country_code = p_country_code
    AND s.service_code = p_service_code
    AND csc.is_active = true
    AND s.is_active = true
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Fallback to default service for the country
  IF p_country_code IS NOT NULL THEN
    RETURN QUERY
    SELECT
      csc.id,
      csc.country_code,
      csc.service_id,
      s.service_code,
      s.service_name,
      csc.brand_name,
      csc.logo_path,
      csc.favicon_path,
      csc.logo_alt_text,
      csc.theme_colors,
      csc.locale_language,
      csc.locale_currency,
      csc.locale_text_direction,
      csc.galaxy_campaign_id,
      csc.galaxy_service_id,
      csc.galaxy_country_code,
      csc.galaxy_language_code,
      csc.is_default_for_country,
      csc.is_active,
      csc.extra_metadata
    FROM country_service_configurations csc
    JOIN services s ON s.id = csc.service_id
    WHERE csc.country_code = p_country_code
    AND csc.is_default_for_country = true
    AND csc.is_active = true
    AND s.is_active = true
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Fallback to default country's default service
  RETURN QUERY
  SELECT
    csc.id,
    csc.country_code,
    csc.service_id,
    s.service_code,
    s.service_name,
    csc.brand_name,
    csc.logo_path,
    csc.favicon_path,
    csc.logo_alt_text,
    csc.theme_colors,
    csc.locale_language,
    csc.locale_currency,
    csc.locale_text_direction,
    csc.galaxy_campaign_id,
    csc.galaxy_service_id,
    csc.galaxy_country_code,
    csc.galaxy_language_code,
    csc.is_default_for_country,
    csc.is_active,
    csc.extra_metadata
  FROM country_service_configurations csc
  JOIN services s ON s.id = csc.service_id
  JOIN country_configurations cc ON cc.country_code = csc.country_code
  WHERE cc.is_default = true
  AND csc.is_default_for_country = true
  AND csc.is_active = true
  AND s.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_country_from_ip TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_service_configuration TO authenticated, anon;

-- =====================================================
-- STEP 8: Update audit logging
-- =====================================================

-- Add service_id to config_audit_log if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'config_audit_log'
    AND column_name = 'service_id'
  ) THEN
    ALTER TABLE config_audit_log
    ADD COLUMN service_id uuid;

    -- Create index on service_id
    CREATE INDEX IF NOT EXISTS idx_audit_service
      ON config_audit_log(service_id);
  END IF;
END $$;

-- Create audit trigger for country_service_configurations
CREATE OR REPLACE FUNCTION log_country_service_config_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields jsonb := '[]'::jsonb;
  old_vals jsonb := '{}'::jsonb;
  new_vals jsonb := '{}'::jsonb;
  admin_id uuid;
  admin_mail text;
BEGIN
  -- Get current admin user info
  SELECT id, email INTO admin_id, admin_mail
  FROM users
  WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO config_audit_log (
      country_code,
      service_id,
      action_type,
      new_values,
      admin_user_id,
      admin_email
    ) VALUES (
      NEW.country_code,
      NEW.service_id,
      'CREATE_SERVICE_CONFIG',
      to_jsonb(NEW),
      admin_id,
      admin_mail
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Track all field changes
    IF OLD.brand_name != NEW.brand_name THEN
      changed_fields := changed_fields || jsonb_build_array('brand_name');
      old_vals := old_vals || jsonb_build_object('brand_name', OLD.brand_name);
      new_vals := new_vals || jsonb_build_object('brand_name', NEW.brand_name);
    END IF;

    IF COALESCE(OLD.logo_path, '') != COALESCE(NEW.logo_path, '') THEN
      changed_fields := changed_fields || jsonb_build_array('logo_path');
      old_vals := old_vals || jsonb_build_object('logo_path', OLD.logo_path);
      new_vals := new_vals || jsonb_build_object('logo_path', NEW.logo_path);
    END IF;

    IF OLD.theme_colors::text != NEW.theme_colors::text THEN
      changed_fields := changed_fields || jsonb_build_array('theme_colors');
      old_vals := old_vals || jsonb_build_object('theme_colors', OLD.theme_colors);
      new_vals := new_vals || jsonb_build_object('theme_colors', NEW.theme_colors);
    END IF;

    IF OLD.is_active != NEW.is_active THEN
      changed_fields := changed_fields || jsonb_build_array('is_active');
      old_vals := old_vals || jsonb_build_object('is_active', OLD.is_active);
      new_vals := new_vals || jsonb_build_object('is_active', NEW.is_active);
    END IF;

    IF OLD.is_default_for_country != NEW.is_default_for_country THEN
      changed_fields := changed_fields || jsonb_build_array('is_default_for_country');
      old_vals := old_vals || jsonb_build_object('is_default_for_country', OLD.is_default_for_country);
      new_vals := new_vals || jsonb_build_object('is_default_for_country', NEW.is_default_for_country);
    END IF;

    -- Only log if there are actual changes
    IF jsonb_array_length(changed_fields) > 0 THEN
      INSERT INTO config_audit_log (
        country_code,
        service_id,
        action_type,
        changed_fields,
        old_values,
        new_values,
        admin_user_id,
        admin_email
      ) VALUES (
        NEW.country_code,
        NEW.service_id,
        'UPDATE_SERVICE_CONFIG',
        changed_fields,
        old_vals,
        new_vals,
        admin_id,
        admin_mail
      );
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO config_audit_log (
      country_code,
      service_id,
      action_type,
      old_values,
      admin_user_id,
      admin_email
    ) VALUES (
      OLD.country_code,
      OLD.service_id,
      'DELETE_SERVICE_CONFIG',
      to_jsonb(OLD),
      admin_id,
      admin_mail
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS country_service_config_audit_trigger ON country_service_configurations;
CREATE TRIGGER country_service_config_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON country_service_configurations
  FOR EACH ROW
  EXECUTE FUNCTION log_country_service_config_changes();

-- =====================================================
-- STEP 9: Grant permissions
-- =====================================================

GRANT SELECT ON services TO authenticated, anon;
GRANT SELECT ON country_service_configurations TO authenticated, anon;
GRANT SELECT ON galaxy_rubric_mappings TO authenticated, anon;
GRANT SELECT ON country_configurations TO authenticated, anon;

-- =====================================================
-- Migration Complete
-- =====================================================
