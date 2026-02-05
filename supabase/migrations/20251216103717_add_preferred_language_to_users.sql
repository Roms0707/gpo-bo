/*
  # Add Preferred Language to Users Table

  1. Changes
    - Adds `preferred_language` column to the `users` table
    - Default value is 'en' (English)
    - Supports 'en' (English) and 'fr' (French) values
    - Includes check constraint to validate allowed values

  2. Purpose
    - Stores user's language preference for persistence across devices
    - Allows authenticated users to have their language choice saved
    - Auto-detected browser language can be overridden by saved preference
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'en';
    
    ALTER TABLE users ADD CONSTRAINT users_preferred_language_check
      CHECK (preferred_language IN ('en', 'fr'));
  END IF;
END $$;
