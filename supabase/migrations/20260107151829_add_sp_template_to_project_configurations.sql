/*
  # Add sp_template Column to project_configurations

  1. Schema Changes
    - Add `sp_template` column (text, nullable) to `project_configurations` table
    - This column mirrors `template_id` for compatibility with external systems

  2. Data Migration
    - Populate `sp_template` with existing `template_id` values for all rows

  3. Purpose
    - Both `template_id` and `sp_template` will always contain the same value
    - They are kept in sync at the application layer during create/update operations
*/

ALTER TABLE project_configurations
ADD COLUMN IF NOT EXISTS sp_template text;

UPDATE project_configurations
SET sp_template = template_id
WHERE template_id IS NOT NULL AND sp_template IS NULL;
