/*
  # Add Smartpages SP Template to Project Configurations

  1. Changes to project_configurations table
    - `sp_template` (text): The Smartpages SP Template page identifier used when calling the Smartpages API
    - Works in conjunction with the existing `package_id` column

  2. Purpose
    - Enables dynamic subscription redirect URL generation via the Smartpages API
    - When a user without an active subscription is detected, the system calls the Smartpages API
      with the package_id and sp_template to get a personalized redirect URL

  3. Notes
    - Only applicable for projects using Kliento authentication (auth_method = 'kliento')
    - Requires `package_id` to also be configured for full functionality
    - Falls back to static `subscription_redirect_url` if Smartpages integration is not configured
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'sp_template'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN sp_template text;
  END IF;
END $$;

COMMENT ON COLUMN project_configurations.sp_template IS 'Smartpages SP Template page identifier for dynamic subscription redirect URL generation';
