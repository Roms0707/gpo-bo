/*
  # Add Subscription Redirect URL to Project Configurations

  1. Changes to project_configurations table
    - `subscription_redirect_url` (text): URL to redirect users when their Kliento subscription has expired
    - This URL allows users to re-subscribe to their plan

  2. Purpose
    - Enables configurable per-project subscription renewal URLs
    - Used by the frontend to redirect Kliento users who are no longer subscribed

  3. Notes
    - Only applicable for projects using Kliento authentication (auth_method = 'kliento')
    - The URL should point to the Kliento subscription/re-subscription page
*/

-- Add subscription_redirect_url column to project_configurations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'subscription_redirect_url'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN subscription_redirect_url text;
  END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN project_configurations.subscription_redirect_url IS 'URL to redirect Kliento users when their subscription has expired, allowing them to re-subscribe';