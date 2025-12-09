/*
  # Add Authentication Method to Project Configurations

  1. Changes
    - Add `auth_method` column to `project_configurations` table
    - Column type: text with check constraint for valid values ('email', 'discord', 'kliento')
    - Default value: 'email' (standard email/password authentication)
    - Existing records will be set to 'email' by default
  
  2. Purpose
    - Allow each project configuration to specify its authentication method
    - Support multiple auth providers: email/password, Discord OAuth, Kliento phone auth
    - Kliento requires a Product ID to be set for proper functionality
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'auth_method'
  ) THEN
    ALTER TABLE project_configurations 
    ADD COLUMN auth_method text DEFAULT 'email' NOT NULL;
    
    ALTER TABLE project_configurations 
    ADD CONSTRAINT project_configurations_auth_method_check 
    CHECK (auth_method IN ('email', 'discord', 'kliento'));
  END IF;
END $$;
