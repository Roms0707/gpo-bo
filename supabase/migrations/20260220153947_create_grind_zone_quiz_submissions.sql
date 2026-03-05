/*
  # Create Grind Zone Quiz Submissions Table

  Adds persistence for user quiz answers and scores so the frontend can
  track who completed which quiz, resume partial attempts, and display results.

  1. New Tables
    - grind_zone_quiz_submissions
      - id (uuid, primary key)
      - user_id (uuid, FK to auth.users) - the user who took the quiz
      - quiz_id (uuid, FK to grind_zone_quizzes) - which quiz was taken
      - score (integer, default 0) - number of correct auto-gradable answers
      - total_questions (integer, default 0) - total questions in the quiz
      - is_completed (boolean, default false) - true once all questions answered
      - answers (jsonb, default '[]') - array of answer objects:
          { question_id, question_type, selected_option_index, answer_text, is_correct }
      - started_at (timestamptz) - when the user opened the quiz modal
      - completed_at (timestamptz, nullable) - when the user finished
      - created_at / updated_at timestamps

  2. Constraints
    - UNIQUE on (user_id, quiz_id) so each user has one submission per quiz

  3. Security
    - Enable RLS on grind_zone_quiz_submissions
    - Authenticated users can SELECT their own submissions
    - Authenticated users can INSERT their own submissions
    - Authenticated users can UPDATE their own submissions
    - No DELETE policy (submissions are permanent records)

  4. Indexes
    - Composite index on (user_id, quiz_id) for fast lookups
    - Index on quiz_id for admin aggregation queries
*/

CREATE TABLE IF NOT EXISTS grind_zone_quiz_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES grind_zone_quizzes(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_quiz UNIQUE (user_id, quiz_id)
);

ALTER TABLE grind_zone_quiz_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quiz submissions"
  ON grind_zone_quiz_submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz submissions"
  ON grind_zone_quiz_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz submissions"
  ON grind_zone_quiz_submissions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_user_quiz
  ON grind_zone_quiz_submissions(user_id, quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id
  ON grind_zone_quiz_submissions(quiz_id);