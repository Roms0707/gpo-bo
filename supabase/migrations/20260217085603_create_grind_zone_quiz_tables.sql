/*
  # Create Grind Zone Quiz Tables

  1. New Tables
    - `grind_zone_quizzes`
      - `id` (uuid, primary key)
      - `rubric_id` (text, not null) - Galaxy rubric whose videos the quiz covers
      - `rubric_name` (text) - cached rubric display name
      - `project_config_id` (uuid, references project_configurations) - ties quiz to a project
      - `game_id` (uuid, references games) - optional game association
      - `title` (text, not null) - quiz title
      - `status` (text, default 'draft') - draft or published
      - `video_count` (integer, default 0) - how many videos were analyzed
      - `created_by` (uuid, references auth.users) - admin who triggered generation
      - `created_at` / `updated_at` timestamps

    - `grind_zone_quiz_questions`
      - `id` (uuid, primary key)
      - `quiz_id` (uuid, references grind_zone_quizzes, cascade delete)
      - `question_text` (text, not null)
      - `question_type` (text, not null) - multiple_choice, true_false, or open_ended
      - `options` (jsonb) - array of option strings for MC/TF
      - `correct_answer_index` (integer) - index into options for MC/TF
      - `correct_answer_text` (text) - expected answer for open_ended
      - `explanation` (text) - why the answer is correct
      - `display_order` (integer, not null) - ordering within quiz
      - `created_at` / `updated_at` timestamps

  2. Security
    - Enable RLS on both tables
    - Authenticated users can SELECT (read quizzes)
    - Only service role can INSERT/UPDATE/DELETE (via edge functions)

  3. Indexes
    - Index on grind_zone_quizzes(rubric_id, project_config_id)
    - Index on grind_zone_quiz_questions(quiz_id)
*/

CREATE TABLE IF NOT EXISTS grind_zone_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id text NOT NULL,
  rubric_name text,
  project_config_id uuid NOT NULL REFERENCES project_configurations(id),
  game_id uuid REFERENCES games(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  video_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE grind_zone_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read quizzes"
  ON grind_zone_quizzes
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can insert quizzes"
  ON grind_zone_quizzes
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update quizzes"
  ON grind_zone_quizzes
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete quizzes"
  ON grind_zone_quizzes
  FOR DELETE
  TO service_role
  USING (true);

CREATE TABLE IF NOT EXISTS grind_zone_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES grind_zone_quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL,
  options jsonb,
  correct_answer_index integer,
  correct_answer_text text,
  explanation text,
  display_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE grind_zone_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read quiz questions"
  ON grind_zone_quiz_questions
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can insert quiz questions"
  ON grind_zone_quiz_questions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update quiz questions"
  ON grind_zone_quiz_questions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete quiz questions"
  ON grind_zone_quiz_questions
  FOR DELETE
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS idx_grind_zone_quizzes_rubric_project
  ON grind_zone_quizzes(rubric_id, project_config_id);

CREATE INDEX IF NOT EXISTS idx_grind_zone_quiz_questions_quiz_id
  ON grind_zone_quiz_questions(quiz_id);