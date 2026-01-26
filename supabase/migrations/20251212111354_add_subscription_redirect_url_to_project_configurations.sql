/*
  # Add Subscription Redirect URL to Project Configurations

  1. Changes
    - Add `subscription_redirect_url` column to `project_configurations` table
      - Type: text (nullable)
      - Purpose: Stores the URL where users with expired subscriptions are redirected for Kliento authentication

  2. Notes
    - This field is optional and only used when auth_method is 'kliento'
    - No default value - will be NULL if not specified
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'subscription_redirect_url'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN subscription_redirect_url text;
  END IF;
END $$;
