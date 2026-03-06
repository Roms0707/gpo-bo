/*
  # Add legal mode toggle and external legal page URLs

  1. Modified Tables
    - `project_configurations`
      - `legal_mode` (text, default 'variables') - Toggle between 'url' (external URLs embedded via iframe) and 'variables' (template variable system)
      - `tos_url` (text, nullable) - External Terms of Service URL
      - `privacy_policy_url` (text, nullable) - External Privacy Policy URL
      - `legal_notice_url` (text, nullable) - External Legal Notice URL
      - `contact_url` (text, nullable) - External Contact page URL

  2. Constraints
    - CHECK on legal_mode to only allow 'url' or 'variables'
    - CHECK on each URL column to enforce HTTPS format when non-null/non-empty

  3. Notes
    - When legal_mode is 'url', the four URL fields are used and template variables are optional
    - When legal_mode is 'variables', the existing template variable system is used and URLs are ignored
    - Existing rows default to 'variables' preserving current behavior
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'legal_mode'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN legal_mode text NOT NULL DEFAULT 'variables';

    ALTER TABLE project_configurations ADD CONSTRAINT project_configurations_legal_mode_check
      CHECK (legal_mode IN ('url', 'variables'));

  END IF;


  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'tos_url'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN tos_url text;

    ALTER TABLE project_configurations ADD CONSTRAINT project_configurations_tos_url_check
      CHECK (tos_url IS NULL OR tos_url = '' OR tos_url LIKE 'https://%');

  END IF;


  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'privacy_policy_url'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN privacy_policy_url text;

    ALTER TABLE project_configurations ADD CONSTRAINT project_configurations_privacy_policy_url_check
      CHECK (privacy_policy_url IS NULL OR privacy_policy_url = '' OR privacy_policy_url LIKE 'https://%');

  END IF;


  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'legal_notice_url'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN legal_notice_url text;

    ALTER TABLE project_configurations ADD CONSTRAINT project_configurations_legal_notice_url_check
      CHECK (legal_notice_url IS NULL OR legal_notice_url = '' OR legal_notice_url LIKE 'https://%');

  END IF;


  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_configurations' AND column_name = 'contact_url'
  ) THEN
    ALTER TABLE project_configurations ADD COLUMN contact_url text;

    ALTER TABLE project_configurations ADD CONSTRAINT project_configurations_contact_url_check
      CHECK (contact_url IS NULL OR contact_url = '' OR contact_url LIKE 'https://%');

  END IF;

END $$;
;
