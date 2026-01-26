/*
  # Add Onboarding Progress JSONB Column

  1. New Columns
    - `onboarding_progress` (jsonb) - Tracks per-page onboarding completion status
      - Structure: { "home": boolean, "gameHub": boolean, "tournament": boolean, "gamingStats": boolean }
      - Defaults to all pages set to false (not completed)

  2. Changes
    - Adds the column with a default value for new users
    - Existing users with has_completed_onboarding = true will be migrated to have all pages marked as completed

  3. Notes
    - The has_completed_onboarding column is kept for backward compatibility
    - New onboarding system will use onboarding_progress for granular tracking
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'onboarding_progress'
  ) THEN
    ALTER TABLE users ADD COLUMN onboarding_progress jsonb DEFAULT '{"home": false, "gameHub": false, "tournament": false, "gamingStats": false}'::jsonb;
  END IF;
END $$;

UPDATE users
SET onboarding_progress = '{"home": true, "gameHub": true, "tournament": true, "gamingStats": true}'::jsonb
WHERE has_completed_onboarding = true
  AND (onboarding_progress IS NULL OR onboarding_progress = '{"home": false, "gameHub": false, "tournament": false, "gamingStats": false}'::jsonb);
