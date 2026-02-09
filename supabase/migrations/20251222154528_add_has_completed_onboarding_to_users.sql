/*
  # Add onboarding completion tracking

  1. Changes
    - Add `has_completed_onboarding` boolean column to `users` table
    - Default value is `false` for new users
    - Existing users will have `false` value to show them the walkthrough

  2. Purpose
    - Track whether a user has completed the first-time guided walkthrough
    - Used to show personalized onboarding experience for new users
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'has_completed_onboarding'
  ) THEN
    ALTER TABLE users ADD COLUMN has_completed_onboarding boolean DEFAULT false;
  END IF;
END $$;
