/*
  # Add Info Section Text Color to Project Configurations

  1. Changes
    - Adds `info_section_text_color` column to `project_configurations` table
    - This optional field stores a hex color code for text in info sections
    - When null, the frontend should fall back to the accent color

  2. Notes
    - Column is nullable to allow fallback behavior
    - Uses VARCHAR(7) to store hex color codes like #FFFFFF
*/

ALTER TABLE project_configurations
ADD COLUMN IF NOT EXISTS info_section_text_color VARCHAR(7) DEFAULT NULL;
