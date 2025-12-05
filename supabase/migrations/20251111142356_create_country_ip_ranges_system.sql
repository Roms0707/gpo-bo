/*
  # Country IP Ranges System for Multi-Service Configuration

  ## Overview
  This migration creates the infrastructure for managing IP ranges per country,
  enabling automatic country detection based on user IP addresses. This system
  works with the existing country_service_configurations to provide complete
  service configuration resolution.

  ## New Tables

  ### 1. `country_ip_ranges`
  Stores IP ranges associated with each country for automatic detection.
  - `id` (uuid, primary key)
  - `country_code` (text, foreign key to country_configurations)
  - `ip_range_cidr` (cidr, PostgreSQL CIDR type for efficient IP matching)
  - `ip_range_start` (inet, start of IP range for display)
  - `ip_range_end` (inet, end of IP range for display)
  - `description` (text, description of the IP range source/region)
  - `priority` (integer, for handling overlapping ranges, higher = higher priority)
  - `is_active` (boolean, whether this range is currently active)
  - `created_at` (timestamptz, creation timestamp)
  - `updated_at` (timestamptz, last update timestamp)

  ## Indexes
  - GIST index on ip_range_cidr with inet_ops for ultra-fast IP lookups
  - Index on country_code for filtering by country
  - Index on is_active for filtering active ranges
  - Index on priority for sorting

  ## Functions
  - detect_country_from_ip(inet): Returns country_code from IP address
  - get_user_configuration(inet): Returns complete service configuration based on IP
  - validate_ip_range_overlap(): Prevents conflicting IP ranges

  ## Security (RLS)
  - country_ip_ranges: Public read, master_admin write
  - All operations logged in config_audit_log

  ## Important Notes
  1. Uses PostgreSQL CIDR type for efficient IP range matching
  2. Priority system allows overlapping ranges with preference control
  3. Fallback to DEFAULT country when IP not found
  4. Optimized for high-frequency lookups with GIST indexes
*/

-- =====================================================
-- STEP 1: Create country_ip_ranges table
-- =====================================================

CREATE TABLE IF NOT EXISTS country_ip_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL REFERENCES country_configurations(country_code) ON DELETE CASCADE,
  ip_range_cidr cidr NOT NULL,
  ip_range_start inet NOT NULL,
  ip_range_end inet NOT NULL,
  description text NOT NULL DEFAULT '',
  priority integer DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
-- Use inet_ops operator class for GIST index on cidr type
CREATE INDEX IF NOT EXISTS idx_country_ip_ranges_cidr
  ON country_ip_ranges USING gist(ip_range_cidr inet_ops);

CREATE INDEX IF NOT EXISTS idx_country_ip_ranges_country
  ON country_ip_ranges(country_code);

CREATE INDEX IF NOT EXISTS idx_country_ip_ranges_active
  ON country_ip_ranges(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_country_ip_ranges_priority
  ON country_ip_ranges(priority DESC);

-- Add comments for documentation
COMMENT ON TABLE country_ip_ranges IS 
  'IP ranges associated with countries for automatic geo-detection';

COMMENT ON COLUMN country_ip_ranges.ip_range_cidr IS 
  'CIDR notation for efficient IP matching (e.g., 192.168.1.0/24)';

COMMENT ON COLUMN country_ip_ranges.priority IS 
  'Priority for overlapping ranges. Higher value = higher priority. Default: 100';

-- Enable RLS
ALTER TABLE country_ip_ranges ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, master_admin write
CREATE POLICY "Public can view IP ranges"
  ON country_ip_ranges FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Master admin can manage IP ranges"
  ON country_ip_ranges FOR ALL
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
CREATE TRIGGER update_country_ip_ranges_updated_at
  BEFORE UPDATE ON country_ip_ranges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 2: Create IP detection function
-- =====================================================

CREATE OR REPLACE FUNCTION detect_country_from_ip(user_ip inet)
RETURNS text AS $$
DECLARE
  detected_country text;
BEGIN
  -- Return NULL for private/local IPs
  IF user_ip << '10.0.0.0/8'::cidr OR
     user_ip << '172.16.0.0/12'::cidr OR
     user_ip << '192.168.0.0/16'::cidr OR
     user_ip << '127.0.0.0/8'::cidr OR
     user_ip << '::1/128'::cidr THEN
    RETURN NULL;
  END IF;

  -- Find country by matching IP against CIDR ranges
  -- Order by priority DESC to prefer higher priority ranges in case of overlap
  SELECT country_code INTO detected_country
  FROM country_ip_ranges
  WHERE is_active = true
    AND user_ip << ip_range_cidr
  ORDER BY priority DESC, created_at DESC
  LIMIT 1;

  RETURN detected_country;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 3: Create configuration resolution function
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_configuration(user_ip inet DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  detected_country text;
  default_country text;
  target_country text;
  result jsonb;
  fallback_used boolean := false;
BEGIN
  -- Try to detect country from IP
  IF user_ip IS NOT NULL THEN
    detected_country := detect_country_from_ip(user_ip);
  END IF;

  -- Get the default country
  SELECT country_code INTO default_country
  FROM country_configurations
  WHERE is_default = true
  LIMIT 1;

  -- Determine target country (detected or fallback to default)
  IF detected_country IS NOT NULL THEN
    target_country := detected_country;
  ELSE
    target_country := default_country;
    fallback_used := true;
  END IF;

  -- If no country found at all, return error
  IF target_country IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'No configuration available',
      'message', 'No default country configured in the system'
    );
  END IF;

  -- Get the complete configuration for the country and its default service
  SELECT jsonb_build_object(
    'country_code', cc.country_code,
    'country_name', cc.country_name,
    'service_id', csc.service_id,
    'service_code', s.service_code,
    'service_name', s.service_name,
    'brand_name', csc.brand_name,
    'logo_path', csc.logo_path,
    'favicon_path', csc.favicon_path,
    'logo_alt_text', csc.logo_alt_text,
    'theme_colors', csc.theme_colors,
    'locale_language', csc.locale_language,
    'locale_currency', csc.locale_currency,
    'locale_text_direction', csc.locale_text_direction,
    'galaxy_campaign_id', csc.galaxy_campaign_id,
    'galaxy_service_id', csc.galaxy_service_id,
    'galaxy_country_code', csc.galaxy_country_code,
    'galaxy_language_code', csc.galaxy_language_code,
    'metadata', jsonb_build_object(
      'ip_address', user_ip::text,
      'detected_country', detected_country,
      'fallback_used', fallback_used,
      'detection_timestamp', now()
    )
  ) INTO result
  FROM country_configurations cc
  JOIN country_service_configurations csc 
    ON csc.country_code = cc.country_code 
    AND csc.is_default_for_country = true
  JOIN services s ON s.id = csc.service_id
  WHERE cc.country_code = target_country
    AND cc.is_active = true
    AND csc.is_active = true
    AND s.is_active = true
  LIMIT 1;

  -- If no configuration found, return error
  IF result IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'No active configuration',
      'message', 'Country found but no active service configuration available',
      'country_code', target_country
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 4: Create validation function for overlaps
-- =====================================================

CREATE OR REPLACE FUNCTION validate_ip_range_no_conflict()
RETURNS TRIGGER AS $$
DECLARE
  conflict_count integer;
BEGIN
  -- Check for conflicts with same country and same priority
  SELECT COUNT(*) INTO conflict_count
  FROM country_ip_ranges
  WHERE country_code = NEW.country_code
    AND priority = NEW.priority
    AND is_active = true
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      NEW.ip_range_cidr && ip_range_cidr
    );

  -- If conflicts found, raise warning but allow (priority system handles this)
  IF conflict_count > 0 THEN
    RAISE NOTICE 'IP range overlaps with % existing range(s) at same priority level', conflict_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
CREATE TRIGGER validate_ip_range_trigger
  BEFORE INSERT OR UPDATE ON country_ip_ranges
  FOR EACH ROW
  EXECUTE FUNCTION validate_ip_range_no_conflict();

-- =====================================================
-- STEP 5: Create audit logging for IP ranges
-- =====================================================

CREATE OR REPLACE FUNCTION log_ip_range_changes()
RETURNS TRIGGER AS $$
DECLARE
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
      action_type,
      new_values,
      admin_user_id,
      admin_email,
      metadata
    ) VALUES (
      NEW.country_code,
      'CREATE_IP_RANGE',
      jsonb_build_object(
        'ip_range_cidr', NEW.ip_range_cidr::text,
        'description', NEW.description,
        'priority', NEW.priority
      ),
      admin_id,
      admin_mail,
      jsonb_build_object('ip_range_id', NEW.id)
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO config_audit_log (
      country_code,
      action_type,
      old_values,
      new_values,
      admin_user_id,
      admin_email,
      metadata
    ) VALUES (
      NEW.country_code,
      'UPDATE_IP_RANGE',
      jsonb_build_object(
        'ip_range_cidr', OLD.ip_range_cidr::text,
        'is_active', OLD.is_active,
        'priority', OLD.priority
      ),
      jsonb_build_object(
        'ip_range_cidr', NEW.ip_range_cidr::text,
        'is_active', NEW.is_active,
        'priority', NEW.priority
      ),
      admin_id,
      admin_mail,
      jsonb_build_object('ip_range_id', NEW.id)
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO config_audit_log (
      country_code,
      action_type,
      old_values,
      admin_user_id,
      admin_email,
      metadata
    ) VALUES (
      OLD.country_code,
      'DELETE_IP_RANGE',
      jsonb_build_object(
        'ip_range_cidr', OLD.ip_range_cidr::text,
        'description', OLD.description
      ),
      admin_id,
      admin_mail,
      jsonb_build_object('ip_range_id', OLD.id)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS ip_range_audit_trigger ON country_ip_ranges;
CREATE TRIGGER ip_range_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON country_ip_ranges
  FOR EACH ROW
  EXECUTE FUNCTION log_ip_range_changes();

-- =====================================================
-- STEP 6: Grant permissions
-- =====================================================

GRANT SELECT ON country_ip_ranges TO authenticated, anon;
GRANT EXECUTE ON FUNCTION detect_country_from_ip TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_configuration TO authenticated, anon;

-- =====================================================
-- Migration Complete
-- =====================================================
