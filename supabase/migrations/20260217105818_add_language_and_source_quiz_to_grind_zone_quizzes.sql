/*
  # Add Language and Source Quiz Tracking to Grind Zone Quizzes

  1. Modified Tables
    - `grind_zone_quizzes`
      - `language` (text, not null, default 'en') - quiz content language (en, fr, es)
      - `source_quiz_id` (uuid, nullable) - self-referencing FK to track duplicated quizzes

  2. Security
    - Add RLS policies for authenticated users to INSERT, UPDATE, DELETE quizzes and questions
      (needed for client-side operations like status changes, question edits, quiz deletion)

  3. Indexes
    - Index on grind_zone_quizzes(source_quiz_id) for finding duplicates
    - Index on grind_zone_quizzes(language) for filtering by language

  4. Notes
    - language CHECK constraint limits values to 'en', 'fr', 'es'
    - source_quiz_id uses ON DELETE SET NULL so deleting the original does not cascade to duplicates
    - Authenticated user write policies enable admin operations from the frontend client
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grind_zone_quizzes' AND column_name = 'language'
  ) THEN
    ALTER TABLE grind_zone_quizzes
      ADD COLUMN language text NOT NULL DEFAULT 'en';

  END IF;

END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grind_zone_quizzes' AND column_name = 'source_quiz_id'
  ) THEN
    ALTER TABLE grind_zone_quizzes
      ADD COLUMN source_quiz_id uuid REFERENCES grind_zone_quizzes(id) ON DELETE SET NULL;

  END IF;

END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'grind_zone_quizzes_language_check'
  ) THEN
    ALTER TABLE grind_zone_quizzes
      ADD CONSTRAINT grind_zone_quizzes_language_check
      CHECK (language IN ('en', 'fr', 'es'));

  END IF;

END $$;


CREATE INDEX IF NOT EXISTS idx_grind_zone_quizzes_source
  ON grind_zone_quizzes(source_quiz_id);


CREATE INDEX IF NOT EXISTS idx_grind_zone_quizzes_language
  ON grind_zone_quizzes(language);


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'grind_zone_quizzes' AND policyname = 'Authenticated users can insert quizzes'
  ) THEN
    CREATE POLICY "Authenticated users can insert quizzes"
      ON grind_zone_quizzes
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);

  END IF;

END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'grind_zone_quizzes' AND policyname = 'Authenticated users can update quizzes'
  ) THEN
    CREATE POLICY "Authenticated users can update quizzes"
      ON grind_zone_quizzes
      FOR UPDATE
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);

  END IF;

END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'grind_zone_quizzes' AND policyname = 'Authenticated users can delete quizzes'
  ) THEN
    CREATE POLICY "Authenticated users can delete quizzes"
      ON grind_zone_quizzes
      FOR DELETE
      TO authenticated
      USING (auth.uid() IS NOT NULL);

  END IF;

END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'grind_zone_quiz_questions' AND policyname = 'Authenticated users can insert quiz questions'
  ) THEN
    CREATE POLICY "Authenticated users can insert quiz questions"
      ON grind_zone_quiz_questions
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);

  END IF;

END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'grind_zone_quiz_questions' AND policyname = 'Authenticated users can update quiz questions'
  ) THEN
    CREATE POLICY "Authenticated users can update quiz questions"
      ON grind_zone_quiz_questions
      FOR UPDATE
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);

  END IF;

END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'grind_zone_quiz_questions' AND policyname = 'Authenticated users can delete quiz questions'
  ) THEN
    CREATE POLICY "Authenticated users can delete quiz questions"
      ON grind_zone_quiz_questions
      FOR DELETE
      TO authenticated
      USING (auth.uid() IS NOT NULL);

  END IF;

END $$;
;
