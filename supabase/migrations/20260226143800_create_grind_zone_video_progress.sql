/*
  # Create Grind Zone Video Progress Table

  Persistent tracking of per-user, per-video watch progress within the Grind Zone Training Hub.

  1. New Tables
    - `grind_zone_video_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `project_config_id` (uuid, FK to project_configurations) — tenant isolation
      - `game_id` (uuid, FK to games, nullable)
      - `rubric_id` (text) — Galaxy API rubric identifier
      - `video_id` (text) — Galaxy API video/content identifier
      - `video_title` (text, nullable) — cached display title
      - `watch_time_seconds` (integer, default 0)
      - `duration_seconds` (integer, nullable) — total video length
      - `is_completed` (boolean, default false) — true when >= 90% watched
      - `last_watched_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Constraints
    - Unique on (user_id, project_config_id, rubric_id, video_id)

  3. Indexes
    - (project_config_id, user_id) — primary tenant + user lookup
    - (user_id, rubric_id) — user progress within a rubric
    - (project_config_id, game_id, user_id) — game-scoped queries

  4. Security
    - RLS enabled
    - Users can SELECT, INSERT, UPDATE their own rows
    - No user DELETE (progress is permanent)
    - Auto-updated `updated_at` trigger
*/

CREATE TABLE IF NOT EXISTS grind_zone_video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_config_id uuid NOT NULL REFERENCES project_configurations(id) ON DELETE CASCADE,
  game_id uuid REFERENCES games(id) ON DELETE SET NULL,
  rubric_id text NOT NULL,
  video_id text NOT NULL,
  video_title text,
  watch_time_seconds integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  is_completed boolean NOT NULL DEFAULT false,
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grind_zone_video_progress_unique UNIQUE (user_id, project_config_id, rubric_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_gz_video_progress_config_user
  ON grind_zone_video_progress (project_config_id, user_id);

CREATE INDEX IF NOT EXISTS idx_gz_video_progress_user_rubric
  ON grind_zone_video_progress (user_id, rubric_id);

CREATE INDEX IF NOT EXISTS idx_gz_video_progress_config_game_user
  ON grind_zone_video_progress (project_config_id, game_id, user_id);

CREATE OR REPLACE FUNCTION update_grind_zone_video_progress_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grind_zone_video_progress_updated_at ON grind_zone_video_progress;
CREATE TRIGGER trg_grind_zone_video_progress_updated_at
  BEFORE UPDATE ON grind_zone_video_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_grind_zone_video_progress_updated_at();

ALTER TABLE grind_zone_video_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own video progress"
  ON grind_zone_video_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video progress"
  ON grind_zone_video_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own video progress"
  ON grind_zone_video_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
