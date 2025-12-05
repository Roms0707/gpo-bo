/*
  # Rename FC25 to FC26 in Users Table

  This migration renames the fc25_ea_id column to fc26_ea_id to reflect the new EA SPORTS FC 26 game.

  ## Changes
  
  1. Column Rename
    - Rename `users.fc25_ea_id` to `users.fc26_ea_id`
    - Preserves all existing user data
    - Maintains nullable string type

  ## Notes
  
  - All existing user FC25 EA IDs will be preserved under the new column name
  - No data loss occurs during this migration
  - Applications using this field must be updated to reference fc26_ea_id
*/

-- Rename the column from fc25_ea_id to fc26_ea_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'fc25_ea_id'
  ) THEN
    ALTER TABLE users RENAME COLUMN fc25_ea_id TO fc26_ea_id;
  END IF;
END $$;