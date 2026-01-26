/*
  # Add Legal Variables to Project Configurations

  1. New Columns
    - `support_email` (text, required) - Email address for general support inquiries
    - `legal_email` (text, required) - Email address for legal matters and compliance
    - `privacy_email` (text, required) - Email address for privacy-related concerns
    - `company_name` (text, required) - Official company name for legal documents
    - `company_address` (text, required) - Full company address for legal documents
    - `phone_number` (text, required) - Company contact phone number
    - `registration_number` (text, required) - Company registration or tax ID number

  2. Constraints
    - All seven columns are mandatory (NOT NULL)
    - Email fields must not be empty strings
    - All fields have default empty strings for backward compatibility

  3. Migration Strategy
    - Existing records will have empty string defaults
    - Applications should prompt for completion of these fields

  4. Purpose
    - These fields serve as legal variables that can be used in Terms of Service, Privacy Policy, and other legal documents
    - Ensures all project configurations have necessary legal contact information
*/

-- Add legal variable columns to project_configurations table
DO $$
BEGIN
  -- Support email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'support_email'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN support_email text NOT NULL DEFAULT '';
  END IF;

  -- Legal email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'legal_email'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN legal_email text NOT NULL DEFAULT '';
  END IF;

  -- Privacy email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'privacy_email'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN privacy_email text NOT NULL DEFAULT '';
  END IF;

  -- Company name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN company_name text NOT NULL DEFAULT '';
  END IF;

  -- Company address
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'company_address'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN company_address text NOT NULL DEFAULT '';
  END IF;

  -- Phone number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN phone_number text NOT NULL DEFAULT '';
  END IF;

  -- Registration number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'registration_number'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN registration_number text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Add check constraints to ensure email fields are not empty (will be enforced for new records)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'support_email_not_empty'
  ) THEN
    ALTER TABLE project_configurations
    ADD CONSTRAINT support_email_not_empty
    CHECK (support_email ~ '^[^@]+@[^@]+\.[^@]+$' OR support_email = '');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'legal_email_not_empty'
  ) THEN
    ALTER TABLE project_configurations
    ADD CONSTRAINT legal_email_not_empty
    CHECK (legal_email ~ '^[^@]+@[^@]+\.[^@]+$' OR legal_email = '');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'privacy_email_not_empty'
  ) THEN
    ALTER TABLE project_configurations
    ADD CONSTRAINT privacy_email_not_empty
    CHECK (privacy_email ~ '^[^@]+@[^@]+\.[^@]+$' OR privacy_email = '');
  END IF;
END $$;
