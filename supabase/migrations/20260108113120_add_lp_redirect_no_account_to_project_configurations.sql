/*
  # Add lp_redirect_no_account Column to project_configurations

  1. Schema Changes
    - Add `lp_redirect_no_account` column (text, nullable) to `project_configurations` table
    - This column stores an optional redirect URL for Kliento authentication
    - Used when a user has no existing account and needs to be redirected to a landing page

  2. Purpose
    - Provides a configurable redirect URL for the Kliento authentication flow
    - When set, users without an account will be redirected to this URL
    - Only applicable when auth_method is 'kliento'
*/

ALTER TABLE project_configurations
ADD COLUMN IF NOT EXISTS lp_redirect_no_account text;
