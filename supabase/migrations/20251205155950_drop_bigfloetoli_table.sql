/*
  # Drop bigfloetoli Table

  1. Cleanup
    - Drops the `bigfloetoli` table if it exists
    - All associated RLS policies will be automatically dropped
    - All data in the table will be permanently deleted

  2. Notes
    - Uses IF EXISTS to safely handle cases where table may not exist
    - This is a destructive operation and cannot be undone
*/

DROP TABLE IF EXISTS bigfloetoli CASCADE;
