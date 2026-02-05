/*
  # Rename subscription_redirect_url to template_id and add package_id

  1. Modified Columns
    - `project_configurations.subscription_redirect_url` renamed to `template_id`
      - Text field for storing template identifier (Kliento auth only)
    
  2. New Columns
    - `project_configurations.package_id` (text, nullable)
      - Package identifier for Kliento authentication configurations
  
  3. Notes
    - Both fields are only used when auth_method is 'kliento'
    - Existing data in subscription_redirect_url will be preserved in template_id
*/

ALTER TABLE project_configurations
  RENAME COLUMN subscription_redirect_url TO template_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'package_id'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN package_id text;
  END IF;
END $$;