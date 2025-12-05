/*
  # Add ID Primary Key and Service Name to Country Configurations

  ## Overview
  This migration adds an ID column as primary key to country_configurations
  and adds a service_name field for single service per country model.

  ## Changes
  1. Add `id` (uuid) column as new primary key
  2. Keep `country_code` as unique constraint
  3. Add `service_name` (text) field
  4. Update foreign key in country_ip_ranges to reference id
  5. Update config_audit_log to include country_id

  ## Important
  - Each country now has exactly one service configuration
  - One country can be marked as DEFAULT (is_default = true) for fallback
  - Foreign key references now use country_configurations.id
*/

-- =====================================================
-- STEP 1: Add id column to country_configurations
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'country_configurations'
    AND column_name = 'id'
  ) THEN
    -- Add id column with default UUID generation
    ALTER TABLE country_configurations
    ADD COLUMN id uuid DEFAULT gen_random_uuid();
    
    -- Populate id for any existing rows
    UPDATE country_configurations
    SET id = gen_random_uuid()
    WHERE id IS NULL;
    
    -- Make id NOT NULL
    ALTER TABLE country_configurations
    ALTER COLUMN id SET NOT NULL;
    
    -- Create unique index on id
    CREATE UNIQUE INDEX idx_country_configurations_id_unique
    ON country_configurations(id);
    
    RAISE NOTICE 'Added id column to country_configurations';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Add service_name column
-- =====================================================

ALTER TABLE country_configurations
ADD COLUMN IF NOT EXISTS service_name text DEFAULT 'Main Service';

-- Update any NULL values
UPDATE country_configurations
SET service_name = 'Main Service'
WHERE service_name IS NULL;

-- Make it NOT NULL after setting default
ALTER TABLE country_configurations
ALTER COLUMN service_name SET NOT NULL;

-- =====================================================
-- STEP 3: Update country_ip_ranges to use country_id
-- =====================================================

DO $$
BEGIN
  -- Add country_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'country_ip_ranges'
    AND column_name = 'country_id'
  ) THEN
    -- Add the column
    ALTER TABLE country_ip_ranges
    ADD COLUMN country_id uuid;
    
    -- Populate country_id from country_code
    UPDATE country_ip_ranges cir
    SET country_id = cc.id
    FROM country_configurations cc
    WHERE cir.country_code = cc.country_code;
    
    -- Make it NOT NULL
    ALTER TABLE country_ip_ranges
    ALTER COLUMN country_id SET NOT NULL;
    
    -- Drop old foreign key constraint
    ALTER TABLE country_ip_ranges
    DROP CONSTRAINT IF EXISTS country_ip_ranges_country_code_fkey;
    
    -- Add new foreign key constraint
    ALTER TABLE country_ip_ranges
    ADD CONSTRAINT country_ip_ranges_country_id_fkey
    FOREIGN KEY (country_id)
    REFERENCES country_configurations(id)
    ON DELETE CASCADE;
    
    -- Create index on country_id
    CREATE INDEX idx_country_ip_ranges_country_id
    ON country_ip_ranges(country_id);
    
    RAISE NOTICE 'Updated country_ip_ranges to use country_id foreign key';
  END IF;
END $$;

-- =====================================================
-- STEP 4: Update config_audit_log to include country_id
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'config_audit_log'
    AND column_name = 'country_id'
  ) THEN
    -- Add country_id column
    ALTER TABLE config_audit_log
    ADD COLUMN country_id uuid;
    
    -- Populate country_id from country_code for existing logs
    UPDATE config_audit_log cal
    SET country_id = cc.id
    FROM country_configurations cc
    WHERE cal.country_code = cc.country_code;
    
    -- Create index on country_id
    CREATE INDEX idx_audit_country_id
    ON config_audit_log(country_id);
    
    RAISE NOTICE 'Added country_id to config_audit_log';
  END IF;
END $$;

-- =====================================================
-- STEP 5: Switch primary key on country_configurations
-- =====================================================

DO $$
BEGIN
  -- Check if country_code is still the primary key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'country_configurations_pkey'
    AND table_name = 'country_configurations'
  ) THEN
    -- Drop old primary key (CASCADE to drop dependent objects)
    ALTER TABLE country_configurations
    DROP CONSTRAINT country_configurations_pkey CASCADE;
    
    -- Add new primary key on id
    ALTER TABLE country_configurations
    ADD PRIMARY KEY (id);
    
    -- Ensure country_code remains unique
    CREATE UNIQUE INDEX IF NOT EXISTS country_configurations_country_code_unique
    ON country_configurations(country_code);
    
    RAISE NOTICE 'Switched primary key from country_code to id';
  END IF;
END $$;

-- =====================================================
-- STEP 6: Update audit logging function
-- =====================================================

CREATE OR REPLACE FUNCTION log_country_config_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields jsonb := '[]'::jsonb;
  old_vals jsonb := '{}'::jsonb;
  new_vals jsonb := '{}'::jsonb;
  admin_id uuid;
  admin_mail text;
BEGIN
  SELECT id, email INTO admin_id, admin_mail
  FROM users
  WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO config_audit_log (
      country_code,
      country_id,
      action_type,
      new_values,
      admin_user_id,
      admin_email
    ) VALUES (
      NEW.country_code,
      NEW.id,
      'CREATE',
      to_jsonb(NEW),
      admin_id,
      admin_mail
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.country_name != NEW.country_name THEN
      changed_fields := changed_fields || jsonb_build_array('country_name');
      old_vals := old_vals || jsonb_build_object('country_name', OLD.country_name);
      new_vals := new_vals || jsonb_build_object('country_name', NEW.country_name);
    END IF;

    IF COALESCE(OLD.service_name, '') != COALESCE(NEW.service_name, '') THEN
      changed_fields := changed_fields || jsonb_build_array('service_name');
      old_vals := old_vals || jsonb_build_object('service_name', OLD.service_name);
      new_vals := new_vals || jsonb_build_object('service_name', NEW.service_name);
    END IF;

    IF COALESCE(OLD.brand_name, '') != COALESCE(NEW.brand_name, '') THEN
      changed_fields := changed_fields || jsonb_build_array('brand_name');
      old_vals := old_vals || jsonb_build_object('brand_name', OLD.brand_name);
      new_vals := new_vals || jsonb_build_object('brand_name', NEW.brand_name);
    END IF;

    IF OLD.is_active != NEW.is_active THEN
      changed_fields := changed_fields || jsonb_build_array('is_active');
      old_vals := old_vals || jsonb_build_object('is_active', OLD.is_active);
      new_vals := new_vals || jsonb_build_object('is_active', NEW.is_active);
    END IF;

    IF OLD.is_default != NEW.is_default THEN
      changed_fields := changed_fields || jsonb_build_array('is_default');
      old_vals := old_vals || jsonb_build_object('is_default', OLD.is_default);
      new_vals := new_vals || jsonb_build_object('is_default', NEW.is_default);
    END IF;

    IF jsonb_array_length(changed_fields) > 0 THEN
      INSERT INTO config_audit_log (
        country_code,
        country_id,
        action_type,
        changed_fields,
        old_values,
        new_values,
        admin_user_id,
        admin_email
      ) VALUES (
        NEW.country_code,
        NEW.id,
        'UPDATE',
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
      country_id,
      action_type,
      old_values,
      admin_user_id,
      admin_email
    ) VALUES (
      OLD.country_code,
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      admin_id,
      admin_mail
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 7: Update IP detection function
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_configuration(user_ip inet DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  detected_country_code text;
  default_country_code text;
  target_country_code text;
  result jsonb;
  fallback_used boolean := false;
BEGIN
  IF user_ip IS NOT NULL THEN
    detected_country_code := detect_country_from_ip(user_ip);
  END IF;

  SELECT country_code INTO default_country_code
  FROM country_configurations
  WHERE is_default = true
  LIMIT 1;

  IF detected_country_code IS NOT NULL THEN
    target_country_code := detected_country_code;
  ELSE
    target_country_code := default_country_code;
    fallback_used := true;
  END IF;

  IF target_country_code IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'No configuration available',
      'message', 'No default country configured in the system'
    );
  END IF;

  SELECT jsonb_build_object(
    'id', cc.id,
    'country_code', cc.country_code,
    'country_name', cc.country_name,
    'service_name', cc.service_name,
    'brand_name', cc.brand_name,
    'logo_path', cc.logo_path,
    'favicon_path', cc.favicon_path,
    'logo_alt_text', cc.logo_alt_text,
    'theme_colors', cc.theme_colors,
    'locale_language', cc.locale_language,
    'locale_currency', cc.locale_currency,
    'locale_text_direction', cc.locale_text_direction,
    'galaxy_campaign_id', cc.galaxy_campaign_id,
    'galaxy_service_id', cc.galaxy_service_id,
    'galaxy_country_code', cc.galaxy_country_code,
    'galaxy_language_code', cc.galaxy_language_code,
    'extra_metadata', cc.extra_metadata,
    'metadata', jsonb_build_object(
      'ip_address', user_ip::text,
      'detected_country', detected_country_code,
      'fallback_used', fallback_used,
      'detection_timestamp', now()
    )
  ) INTO result
  FROM country_configurations cc
  WHERE cc.country_code = target_country_code
    AND cc.is_active = true
  LIMIT 1;

  IF result IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'No active configuration',
      'message', 'Country found but no active configuration available',
      'country_code', target_country_code
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 8: Create indexes and add comments
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_country_configurations_service_name
ON country_configurations(service_name);

CREATE INDEX IF NOT EXISTS idx_country_configurations_is_active
ON country_configurations(is_active);

COMMENT ON COLUMN country_configurations.id IS 'Primary key for country configuration, used for foreign key references';
COMMENT ON COLUMN country_configurations.country_code IS 'ISO country code (e.g., US, MA, FR) - unique identifier';
COMMENT ON COLUMN country_configurations.service_name IS 'Name of the service for this country configuration';
COMMENT ON COLUMN country_configurations.is_default IS 'Marks the default/fallback country used when no specific country is detected';
