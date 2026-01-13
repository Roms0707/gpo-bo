/*
  # Add service_id Column to project_configurations

  1. Schema Changes
    - Add `service_id` column (text, nullable) to `project_configurations` table
    - This column stores the Kliento service identifier

  2. Purpose
    - Provides a configurable service ID for the Kliento authentication flow
    - Required when auth_method is 'kliento'
    - Used to identify which Kliento service to authenticate against
*/

ALTER TABLE project_configurations
ADD COLUMN IF NOT EXISTS service_id text;
