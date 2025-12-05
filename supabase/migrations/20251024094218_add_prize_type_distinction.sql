/*
  # Add Prize Type Distinction to Tournament Prizes

  1. Schema Changes
    - Add `prize_type` column to `tournament_prizes` table
      - Type: TEXT with CHECK constraint
      - Values: 'monetary' (cash prizes) or 'physical_digital' (physical goods, digital codes)
      - Default: 'physical_digital' for backward compatibility
    
    - Add `monetary_amount` column to `tournament_prizes` table
      - Type: NUMERIC (for precise decimal handling)
      - Nullable: stores the cash amount when prize_type is 'monetary'
      - Example: 1000.00 for €1000
    
    - Add `currency` column to `tournament_prizes` table
      - Type: TEXT
      - Nullable: stores the currency code when prize_type is 'monetary'
      - Examples: 'EUR', 'USD', 'GBP'
    
    - Add `redemption_code` column to `tournament_prizes` table
      - Type: TEXT
      - Nullable: stores digital codes, download links, or redemption instructions
      - Used for digital prizes like game codes, skins, subscriptions

  2. Data Migration
    - All existing prizes are set to 'physical_digital' type by default
    - Existing prize_name and description fields remain unchanged
    - New columns (monetary_amount, currency, redemption_code) are set to NULL for existing records
    - Admins can update existing prizes to 'monetary' type if needed

  3. Constraints
    - prize_type must be either 'monetary' or 'physical_digital'
    - This ensures data integrity and provides clear categorization

  4. Notes
    - Backward compatible: existing functionality continues to work
    - Monetary prizes display amount with currency (e.g., "€1,000 EUR")
    - Physical/digital prizes display description and optional image
    - Redemption codes provide secure storage for digital prize credentials
*/

-- Add prize_type column with CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_prizes' AND column_name = 'prize_type'
  ) THEN
    ALTER TABLE tournament_prizes 
    ADD COLUMN prize_type TEXT DEFAULT 'physical_digital'
    CHECK (prize_type IN ('monetary', 'physical_digital'));
  END IF;
END $$;

-- Add monetary_amount column for cash prizes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_prizes' AND column_name = 'monetary_amount'
  ) THEN
    ALTER TABLE tournament_prizes ADD COLUMN monetary_amount NUMERIC(10, 2) DEFAULT NULL;
  END IF;
END $$;

-- Add currency column for monetary prizes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_prizes' AND column_name = 'currency'
  ) THEN
    ALTER TABLE tournament_prizes ADD COLUMN currency TEXT DEFAULT NULL;
  END IF;
END $$;

-- Add redemption_code column for digital prizes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_prizes' AND column_name = 'redemption_code'
  ) THEN
    ALTER TABLE tournament_prizes ADD COLUMN redemption_code TEXT DEFAULT NULL;
  END IF;
END $$;

-- Create an index on prize_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_tournament_prizes_prize_type ON tournament_prizes(prize_type);

-- Add a comment explaining the structure
COMMENT ON COLUMN tournament_prizes.prize_type IS 'Type of prize: monetary (cash) or physical_digital (physical goods, digital codes)';
COMMENT ON COLUMN tournament_prizes.monetary_amount IS 'Cash amount for monetary prizes (e.g., 1000.00)';
COMMENT ON COLUMN tournament_prizes.currency IS 'Currency code for monetary prizes (e.g., EUR, USD, GBP)';
COMMENT ON COLUMN tournament_prizes.redemption_code IS 'Code or link for digital prize redemption';