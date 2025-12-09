/*
  # Add Optional Accent Color to Project Configurations

  1. Schema Changes
    - `project_configurations` table
      - `accent_color` (text, nullable) - Optional third brand color for text variations, accents, and opacity effects

  2. Validation
    - Adds CHECK constraint to validate hex color format (#RRGGBB) when accent_color is not null

  3. Notes
    - This column is optional - when null/empty, frontend applications should skip using it
    - Default behavior: black (#000000) is suggested in UI but stored as null if not customized
    - Constraint allows null values but validates format when a value is provided
*/

ALTER TABLE project_configurations
ADD COLUMN IF NOT EXISTS accent_color text DEFAULT NULL;

ALTER TABLE project_configurations
ADD CONSTRAINT accent_color_hex_format
CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$');
