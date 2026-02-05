/*
  # Add Discord URL to Project Configurations

  1. Changes
    - Adds `discord_url` column to `project_configurations` table
    - Column type: TEXT, nullable
    - Default value: 'https://discord.gg/orangearena'
    
  2. Description
    - This field stores the Discord server invite URL for each project configuration
    - Used in the Contact page template within legal documents
    - Optional field - can be null if no Discord server is configured
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'discord_url'
  ) THEN
    ALTER TABLE project_configurations 
    ADD COLUMN discord_url TEXT DEFAULT 'https://discord.gg/orangearena';
  END IF;
END $$;