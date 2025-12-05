/*
  # Country Configuration System - Multi-Tenancy Support

  ## Overview
  This migration creates the complete infrastructure for managing country-specific configurations
  including Galaxy API integrations, rubric mappings, and audit logging.

  ## New Tables

  ### 1. `galaxy_rubric_mappings`
  Maps internal rubric definitions to Galaxy API rubric IDs per country.
  - `id` (uuid, primary key)
  - `country_code` (text, foreign key to country_configurations)
  - `rubric_id` (text, internal identifier)
  - `rubric_name` (text, human-readable name)
  - `galaxy_rubric_id` (text, Galaxy API rubric ID)
  - `is_active` (boolean, whether this mapping is currently active)
  - `created_at` (timestamptz, creation timestamp)
  - `updated_at` (timestamptz, last update timestamp)

  ### 2. `config_audit_log`
  Tracks all changes made to country configurations for compliance and debugging.
  - `id` (uuid, primary key)
  - `country_code` (text, which country was modified)
  - `action_type` (text, type of action: CREATE, UPDATE, DELETE, etc.)
  - `changed_fields` (jsonb, list of fields that were changed)
  - `old_values` (jsonb, previous values before change)
  - `new_values` (jsonb, new values after change)
  - `admin_user_id` (uuid, who made the change)
  - `admin_email` (text, email of admin for easy tracking)
  - `timestamp` (timestamptz, when the change was made)
  - `metadata` (jsonb, additional context about the change)

  ## Indexes
  - Index on galaxy_rubric_mappings.country_code for fast lookups
  - Index on galaxy_rubric_mappings.is_active for filtering
  - Index on config_audit_log.country_code for audit queries
  - Index on config_audit_log.timestamp for chronological sorting
  - Index on config_audit_log.admin_user_id for user activity tracking

  ## Security (RLS)
  - galaxy_rubric_mappings: Public read, master_admin write
  - config_audit_log: master_admin read only, automatic writes via trigger
  - country_configurations: Enhanced policies for master_admin management

  ## Important Notes
  1. Galaxy API credentials are stored per country in country_configurations
  2. Rubric mappings allow different Galaxy rubric IDs per country
  3. All configuration changes are automatically logged
  4. Master admin role is required for all write operations
*/

-- Create galaxy_rubric_mappings table
CREATE TABLE IF NOT EXISTS galaxy_rubric_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  rubric_id text NOT NULL,
  rubric_name text NOT NULL,
  galaxy_rubric_id text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_country_code
    FOREIGN KEY (country_code)
    REFERENCES country_configurations(country_code)
    ON DELETE CASCADE
);

-- Create unique constraint to prevent duplicate rubric mappings per country
CREATE UNIQUE INDEX IF NOT EXISTS idx_galaxy_rubric_unique
  ON galaxy_rubric_mappings(country_code, rubric_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_galaxy_rubric_country
  ON galaxy_rubric_mappings(country_code);

CREATE INDEX IF NOT EXISTS idx_galaxy_rubric_active
  ON galaxy_rubric_mappings(is_active);

-- Create config_audit_log table
CREATE TABLE IF NOT EXISTS config_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  action_type text NOT NULL,
  changed_fields jsonb DEFAULT '[]'::jsonb,
  old_values jsonb DEFAULT '{}'::jsonb,
  new_values jsonb DEFAULT '{}'::jsonb,
  admin_user_id uuid,
  admin_email text,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_country
  ON config_audit_log(country_code);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp
  ON config_audit_log(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_admin
  ON config_audit_log(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_action
  ON config_audit_log(action_type);

-- Enable Row Level Security
ALTER TABLE galaxy_rubric_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for galaxy_rubric_mappings

-- Allow public read access to rubric mappings
CREATE POLICY "Public can view rubric mappings"
  ON galaxy_rubric_mappings FOR SELECT
  TO public
  USING (true);

-- Only master_admin can insert rubric mappings
CREATE POLICY "Master admin can insert rubric mappings"
  ON galaxy_rubric_mappings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master_admin'
    )
  );

-- Only master_admin can update rubric mappings
CREATE POLICY "Master admin can update rubric mappings"
  ON galaxy_rubric_mappings FOR UPDATE
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

-- Only master_admin can delete rubric mappings
CREATE POLICY "Master admin can delete rubric mappings"
  ON galaxy_rubric_mappings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master_admin'
    )
  );

-- RLS Policies for config_audit_log

-- Only master_admin can view audit logs
CREATE POLICY "Master admin can view audit logs"
  ON config_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master_admin'
    )
  );

-- Allow system to insert audit logs (we'll use a trigger)
CREATE POLICY "System can insert audit logs"
  ON config_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for galaxy_rubric_mappings
DROP TRIGGER IF EXISTS update_galaxy_rubric_mappings_updated_at ON galaxy_rubric_mappings;
CREATE TRIGGER update_galaxy_rubric_mappings_updated_at
  BEFORE UPDATE ON galaxy_rubric_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for country_configurations (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_country_configurations_updated_at'
  ) THEN
    CREATE TRIGGER update_country_configurations_updated_at
      BEFORE UPDATE ON country_configurations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create function to log country configuration changes
CREATE OR REPLACE FUNCTION log_country_config_changes()
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
    -- Log creation
    INSERT INTO config_audit_log (
      country_code,
      action_type,
      new_values,
      admin_user_id,
      admin_email
    ) VALUES (
      NEW.country_code,
      'CREATE',
      to_jsonb(NEW),
      admin_id,
      admin_mail
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Build list of changed fields
    IF OLD.country_name != NEW.country_name THEN
      changed_fields := changed_fields || jsonb_build_array('country_name');
      old_vals := old_vals || jsonb_build_object('country_name', OLD.country_name);
      new_vals := new_vals || jsonb_build_object('country_name', NEW.country_name);
    END IF;

    IF OLD.brand_name != NEW.brand_name THEN
      changed_fields := changed_fields || jsonb_build_array('brand_name');
      old_vals := old_vals || jsonb_build_object('brand_name', OLD.brand_name);
      new_vals := new_vals || jsonb_build_object('brand_name', NEW.brand_name);
    END IF;

    IF OLD.logo_path != NEW.logo_path THEN
      changed_fields := changed_fields || jsonb_build_array('logo_path');
      old_vals := old_vals || jsonb_build_object('logo_path', OLD.logo_path);
      new_vals := new_vals || jsonb_build_object('logo_path', NEW.logo_path);
    END IF;

    IF OLD.favicon_path != NEW.favicon_path THEN
      changed_fields := changed_fields || jsonb_build_array('favicon_path');
      old_vals := old_vals || jsonb_build_object('favicon_path', OLD.favicon_path);
      new_vals := new_vals || jsonb_build_object('favicon_path', NEW.favicon_path);
    END IF;

    IF OLD.theme_colors::text != NEW.theme_colors::text THEN
      changed_fields := changed_fields || jsonb_build_array('theme_colors');
      old_vals := old_vals || jsonb_build_object('theme_colors', OLD.theme_colors);
      new_vals := new_vals || jsonb_build_object('theme_colors', NEW.theme_colors);
    END IF;

    IF OLD.locale_language != NEW.locale_language THEN
      changed_fields := changed_fields || jsonb_build_array('locale_language');
      old_vals := old_vals || jsonb_build_object('locale_language', OLD.locale_language);
      new_vals := new_vals || jsonb_build_object('locale_language', NEW.locale_language);
    END IF;

    IF OLD.locale_currency != NEW.locale_currency THEN
      changed_fields := changed_fields || jsonb_build_array('locale_currency');
      old_vals := old_vals || jsonb_build_object('locale_currency', OLD.locale_currency);
      new_vals := new_vals || jsonb_build_object('locale_currency', NEW.locale_currency);
    END IF;

    IF OLD.is_active != NEW.is_active THEN
      changed_fields := changed_fields || jsonb_build_array('is_active');
      old_vals := old_vals || jsonb_build_object('is_active', OLD.is_active);
      new_vals := new_vals || jsonb_build_object('is_active', NEW.is_active);
    END IF;

    IF COALESCE(OLD.galaxy_campaign_id, '') != COALESCE(NEW.galaxy_campaign_id, '') THEN
      changed_fields := changed_fields || jsonb_build_array('galaxy_campaign_id');
      old_vals := old_vals || jsonb_build_object('galaxy_campaign_id', OLD.galaxy_campaign_id);
      new_vals := new_vals || jsonb_build_object('galaxy_campaign_id', NEW.galaxy_campaign_id);
    END IF;

    IF COALESCE(OLD.galaxy_service_id, '') != COALESCE(NEW.galaxy_service_id, '') THEN
      changed_fields := changed_fields || jsonb_build_array('galaxy_service_id');
      old_vals := old_vals || jsonb_build_object('galaxy_service_id', OLD.galaxy_service_id);
      new_vals := new_vals || jsonb_build_object('galaxy_service_id', NEW.galaxy_service_id);
    END IF;

    -- Only log if there are actual changes
    IF jsonb_array_length(changed_fields) > 0 THEN
      INSERT INTO config_audit_log (
        country_code,
        action_type,
        changed_fields,
        old_values,
        new_values,
        admin_user_id,
        admin_email
      ) VALUES (
        NEW.country_code,
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
    -- Log deletion
    INSERT INTO config_audit_log (
      country_code,
      action_type,
      old_values,
      admin_user_id,
      admin_email
    ) VALUES (
      OLD.country_code,
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

-- Create trigger to automatically log changes
DROP TRIGGER IF EXISTS country_config_audit_trigger ON country_configurations;
CREATE TRIGGER country_config_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON country_configurations
  FOR EACH ROW
  EXECUTE FUNCTION log_country_config_changes();

-- Update RLS policies for country_configurations to allow master_admin full access
-- First, enable RLS if not already enabled
DO $$
BEGIN
  ALTER TABLE country_configurations ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Master admin can manage country configurations" ON country_configurations;
  DROP POLICY IF EXISTS "Public can view country configurations" ON country_configurations;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create policy for public read access
CREATE POLICY "Public can view country configurations"
  ON country_configurations FOR SELECT
  TO public
  USING (true);

-- Create policy for master_admin full access
CREATE POLICY "Master admin can manage country configurations"
  ON country_configurations FOR ALL
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

-- Grant necessary permissions
GRANT SELECT ON galaxy_rubric_mappings TO authenticated;
GRANT SELECT ON config_audit_log TO authenticated;
GRANT SELECT ON country_configurations TO authenticated;
