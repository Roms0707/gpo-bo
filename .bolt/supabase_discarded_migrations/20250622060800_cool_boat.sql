/*
  # Update timezone default to Europe/Paris (UTC+2)

  1. Changes
    - Updates the default timezone in admin_settings to 'Europe/Paris'
    - Updates existing records to use 'Europe/Paris' timezone
*/

-- Update the default for new records
ALTER TABLE admin_settings 
ALTER COLUMN timezone SET DEFAULT 'Europe/Paris';

-- Update existing records to use Europe/Paris timezone
UPDATE admin_settings
SET timezone = 'Europe/Paris'
WHERE timezone = 'UTC';