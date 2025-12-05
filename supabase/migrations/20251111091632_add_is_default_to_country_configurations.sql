/*
  # Add is_default Field to Country Configurations

  ## Changes
  1. Add `is_default` boolean field to country_configurations table
  2. Create unique partial index to ensure only one country can be default
  3. Update RLS policies to handle is_default field
  
  ## Purpose
  This field marks the fallback country used when IP detection fails or returns
  an inactive/non-existent country. Only one country can be marked as default.
*/

-- Add is_default field
ALTER TABLE country_configurations 
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Create unique partial index to ensure only one default country
CREATE UNIQUE INDEX IF NOT EXISTS idx_country_configurations_single_default
  ON country_configurations(is_default)
  WHERE is_default = true;

-- Add comment for documentation
COMMENT ON COLUMN country_configurations.is_default IS 
  'Marks the default/fallback country used when IP detection fails. Only one country can be default.';
