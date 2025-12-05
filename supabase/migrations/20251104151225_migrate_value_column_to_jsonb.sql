/*
  # Migration: Convert value column to JSONB for flexible structured data storage

  ## Overview
  This migration transforms the `value` column in `user_tournament_field_values` 
  from TEXT to JSONB to support storing multiple key-value pairs in a single field.

  ## Changes Made

  ### 1. Data Type Migration
  - Convert `value` column from TEXT to JSONB
  - Preserve all existing data by wrapping TEXT values in JSON structure: `{"value": "original_text"}`
  - This ensures backward compatibility with existing data

  ### 2. Structure Examples
  
  **Before (TEXT):**
  ```
  value: "aziz_shadowww"
  ```

  **After (JSONB) - Simple converted value:**
  ```json
  {"value": "aziz_shadowww"}
  ```

  **After (JSONB) - Multiple key-value pairs:**
  ```json
  {
    "Discord ID": "aziz_shadowww",
    "Téléphone": "+21658357860"
  }
  ```

  ### 3. Performance Optimization
  - Create GIN index on the JSONB column for fast querying
  - Allows efficient JSON key lookups and searches

  ### 4. Data Validation
  - Add CHECK constraint to ensure value is always valid JSON
  - Prevents insertion of malformed JSON data

  ## Benefits
  - Flexible structure: each user can provide different information
  - Multiple values in single field: store Discord ID, phone, etc. together
  - Dynamic CSV export: automatically adapt to different data structures
  - Full backward compatibility: existing data preserved and accessible
  - Efficient queries: GIN index enables fast JSON operations

  ## Migration Strategy
  - Uses ALTER COLUMN with USING clause to transform existing data
  - All existing TEXT values automatically wrapped in JSON structure
  - No data loss: 100% preservation of existing information
  - Transaction-safe: entire migration succeeds or rolls back

  ## Security
  - All existing RLS policies remain unchanged
  - No changes to data access permissions
  - CHECK constraint prevents invalid JSON insertion
*/

-- =====================================================
-- 1. Convert value column from TEXT to JSONB
-- =====================================================

-- First, we need to convert all existing TEXT values to valid JSONB
-- We wrap existing TEXT values in a JSON object: {"value": "original_text"}
ALTER TABLE user_tournament_field_values 
ALTER COLUMN value TYPE JSONB 
USING CASE 
  WHEN value IS NULL THEN NULL
  WHEN value = '' THEN '{"value": ""}'::jsonb
  ELSE jsonb_build_object('value', value)
END;

-- =====================================================
-- 2. Add CHECK constraint for valid JSON
-- =====================================================

-- Ensure that the value column always contains valid JSONB
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_tournament_field_values_value_is_json'
  ) THEN
    ALTER TABLE user_tournament_field_values
    ADD CONSTRAINT user_tournament_field_values_value_is_json
    CHECK (jsonb_typeof(value) = 'object');
  END IF;
END $$;

-- =====================================================
-- 3. Create GIN index for efficient JSONB queries
-- =====================================================

-- GIN index allows fast lookups within the JSONB structure
CREATE INDEX IF NOT EXISTS idx_user_tournament_field_values_value_gin
ON user_tournament_field_values USING GIN (value);

-- =====================================================
-- 4. Add helpful comment on the column
-- =====================================================

COMMENT ON COLUMN user_tournament_field_values.value IS 
'JSONB structure storing flexible key-value pairs. 
Example: {"Discord ID": "user123", "Téléphone": "+123456789"}
For legacy data: {"value": "original_text_value"}';
