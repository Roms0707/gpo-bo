/*
  # Project Configurations System - Multi-Tenant Branding Management

  ## Overview
  This migration creates the complete infrastructure for managing project-specific configurations
  that control branding, theming, and external integrations. This system replaces the previous
  country_configurations table with a more flexible project-based configuration approach.

  ## New Tables

  ### 1. `project_configurations`
  Stores all project-specific branding and configuration settings.
  
  **Columns:**
  - `id` (uuid, primary key) - Auto-generated unique identifier
  - `config_id` (varchar, unique) - Human-readable configuration identifier (e.g., "default", "partner-xyz")
  - `config_name` (varchar) - Descriptive name for the configuration
  - `is_active` (boolean) - Whether this configuration is currently active
  - `brand_name` (varchar) - Brand name displayed in the application
  - `logo_path` (varchar) - Path to logo file (stored in Supabase Storage)
  - `favicon_path` (varchar) - Path to favicon file (stored in Supabase Storage)
  - `logo_alt_text` (varchar) - Accessibility text for logo
  - `primary_color` (varchar) - Primary brand color in #RRGGBB format
  - `secondary_color` (varchar) - Secondary brand color in #RRGGBB format
  - `product_id` (varchar, nullable) - External product identifier
  - `campaign_id` (varchar, nullable) - External campaign identifier
  - `extra_metadata` (jsonb) - Additional configuration data as JSON
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Indexes
  - Unique index on config_id for fast lookups and uniqueness
  - Index on is_active for filtering active configurations
  - Index on created_at for chronological sorting

  ## Security (RLS)
  - Public users can read active configurations
  - Only master_admin can create, update, or delete configurations
  - Storage bucket has public read access for assets, master_admin write access

  ## Validation Constraints
  - config_id must be 3-50 characters, lowercase alphanumeric with hyphens
  - primary_color and secondary_color must match #RRGGBB hex format
  - All required text fields have length constraints

  ## Important Notes
  1. This system replaces the previous country_configurations approach
  2. Asset files (logos, favicons) are stored in Supabase Storage bucket "project-config-assets"
  3. Configuration is loaded by frontend based on VITE_PROJECT_CONFIG_ID environment variable
  4. Only one configuration should be marked as default (enforced by application logic)
  5. Inactive configurations are not accessible by public users
*/

-- Create project_configurations table
CREATE TABLE IF NOT EXISTS project_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id varchar(50) NOT NULL UNIQUE,
  config_name varchar(200) NOT NULL,
  is_active boolean DEFAULT true,
  brand_name varchar(200) NOT NULL,
  logo_path varchar(500) NOT NULL,
  favicon_path varchar(500) NOT NULL,
  logo_alt_text varchar(200) NOT NULL,
  primary_color varchar(7) NOT NULL,
  secondary_color varchar(7) NOT NULL,
  product_id varchar(100),
  campaign_id varchar(100),
  extra_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Validation constraints
  CONSTRAINT config_id_format CHECK (config_id ~ '^[a-z0-9-]{3,50}$'),
  CONSTRAINT primary_color_format CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT secondary_color_format CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT config_name_length CHECK (char_length(config_name) >= 3),
  CONSTRAINT brand_name_length CHECK (char_length(brand_name) >= 3),
  CONSTRAINT logo_alt_text_length CHECK (char_length(logo_alt_text) >= 3)
);

-- Create indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_config_id 
  ON project_configurations(config_id);

CREATE INDEX IF NOT EXISTS idx_project_config_active 
  ON project_configurations(is_active);

CREATE INDEX IF NOT EXISTS idx_project_config_created 
  ON project_configurations(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_project_configurations_updated_at ON project_configurations;
CREATE TRIGGER update_project_configurations_updated_at
  BEFORE UPDATE ON project_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_project_config_updated_at();

-- Enable Row Level Security
ALTER TABLE project_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can view active configurations
CREATE POLICY "Public can view active project configurations"
  ON project_configurations FOR SELECT
  TO public
  USING (is_active = true);

-- RLS Policy: Authenticated users can view all configurations
CREATE POLICY "Authenticated users can view all project configurations"
  ON project_configurations FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Master admin can insert configurations
CREATE POLICY "Master admin can insert project configurations"
  ON project_configurations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master_admin'
    )
  );

-- RLS Policy: Master admin can update configurations
CREATE POLICY "Master admin can update project configurations"
  ON project_configurations FOR UPDATE
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

-- RLS Policy: Master admin can delete configurations
CREATE POLICY "Master admin can delete project configurations"
  ON project_configurations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master_admin'
    )
  );

-- Grant necessary permissions
GRANT SELECT ON project_configurations TO authenticated;
GRANT SELECT ON project_configurations TO anon;

-- Insert a default configuration example
INSERT INTO project_configurations (
  config_id,
  config_name,
  is_active,
  brand_name,
  logo_path,
  favicon_path,
  logo_alt_text,
  primary_color,
  secondary_color,
  product_id,
  campaign_id,
  extra_metadata
) VALUES (
  'default',
  'Default Configuration',
  true,
  'Orange Arena',
  '/assets/logos/logo-default.svg',
  '/assets/favicons/favicon-default.svg',
  'Orange Arena E-Sport',
  '#FF6B00',
  '#000000',
  null,
  null,
  '{"is_default": true}'::jsonb
) ON CONFLICT (config_id) DO NOTHING;
