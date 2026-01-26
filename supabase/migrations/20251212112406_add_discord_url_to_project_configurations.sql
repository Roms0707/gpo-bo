/*
  # Add Discord URL to Project Configurations

  1. New Columns
    - `discord_url` (text, nullable) - The Discord server invite URL displayed on the Contact page

  2. Description
    - Adds a new configurable field for the Discord invite link
    - This allows each project configuration to have its own Discord server link
    - Falls back to the default Discord invite if not set

  3. Usage
    - The field will be available in the Config Management back-office
    - Can be customized per configuration/brand
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'discord_url'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN discord_url text;
  END IF;
END $$;
