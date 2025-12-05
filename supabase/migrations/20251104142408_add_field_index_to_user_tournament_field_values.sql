/*
  # Add Multi-Value Support for User Tournament Field Values

  This migration enables storing multiple values for a single tournament field per user.
  For example, a user can now provide multiple contact methods (Discord ID, Phone, etc.)
  under the same "User Tournament Info" field.

  ## Changes Made

  ### 1. Schema Modifications
  - Add `field_index` column to `user_tournament_field_values` table
    - Type: INTEGER
    - Default: 1
    - Purpose: Differentiates multiple values for the same field (Champ 1, Champ 2, etc.)
  
  ### 2. Constraint Updates
  - Remove old UNIQUE constraint: `UNIQUE(user_id, tournament_id, field_id)`
  - Add new UNIQUE constraint: `UNIQUE(user_id, tournament_id, field_id, field_index)`
  - This allows multiple rows with different field_index values
  
  ### 3. Index Updates
  - Add composite index on `(user_id, tournament_id, field_id, field_index)` for query performance
  
  ### 4. Data Migration
  - Set `field_index = 1` for all existing records
  - Ensures backward compatibility with existing data
  
  ## Example Usage

  Before (single value):
  | user_id | tournament_id | field_id | value         |
  |---------|---------------|----------|---------------|
  | user123 | tourney1      | contact  | aziz_shadow   |

  After (multiple values):
  | user_id | tournament_id | field_id | field_index | value           |
  |---------|---------------|----------|-------------|-----------------|
  | user123 | tourney1      | contact  | 1           | aziz_shadowww   |
  | user123 | tourney1      | contact  | 2           | +21658357860    |

  ## Security
  - All existing RLS policies remain unchanged and functional
  - No changes to data access permissions
*/

-- =====================================================
-- 1. Add field_index column
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_tournament_field_values' AND column_name = 'field_index'
  ) THEN
    ALTER TABLE user_tournament_field_values 
    ADD COLUMN field_index INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- =====================================================
-- 2. Migrate existing data
-- =====================================================

-- Set field_index = 1 for all existing records
UPDATE user_tournament_field_values
SET field_index = 1
WHERE field_index IS NULL OR field_index = 0;

-- =====================================================
-- 3. Drop old unique constraint
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_tournament_field_values_user_id_tournament_id_field_id_key'
  ) THEN
    ALTER TABLE user_tournament_field_values
    DROP CONSTRAINT user_tournament_field_values_user_id_tournament_id_field_id_key;
  END IF;
END $$;

-- =====================================================
-- 4. Add new unique constraint with field_index
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_tournament_field_values_unique_with_index'
  ) THEN
    ALTER TABLE user_tournament_field_values
    ADD CONSTRAINT user_tournament_field_values_unique_with_index
    UNIQUE(user_id, tournament_id, field_id, field_index);
  END IF;
END $$;

-- =====================================================
-- 5. Create composite index for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_tournament_field_values_composite
ON user_tournament_field_values(user_id, tournament_id, field_id, field_index);
