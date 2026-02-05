/*
  # Add operation_id to Kliento Configuration
  
  1. Changes
    - Updates the Kliento configuration in `platform_api_integrations` 
    - Adds `operation_id` to the `extra_config` JSONB field
    
  2. Details
    - `operation_id`: Kliento-level identifier used for Sendito SMS integration
    - This value is required when calling the Sendito API for OTP delivery
    
  3. Notes
    - The operation_id is a placeholder value that should be updated with the actual Kliento operation_id
    - This value is provided by Kliento and is specific to each deployment
*/

UPDATE platform_api_integrations
SET 
  extra_config = COALESCE(extra_config, '{}'::jsonb) || jsonb_build_object('operation_id', 'KLIENTO_OPERATION_ID_PLACEHOLDER'),
  updated_at = now()
WHERE api_name = 'kliento';