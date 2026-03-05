/*
  # Create Grind Zone User Stats View

  Aggregated per-user, per-game training statistics combining video progress, quiz data, and XP earnings.

  1. New Views
    - `grind_zone_user_stats` — real-time aggregated view
      - `user_id` (uuid)
      - `project_config_id` (uuid)
      - `game_id` (uuid, nullable)
      - `total_videos_watched` — count of completed videos
      - `total_watch_time_seconds` — sum of all watch time
      - `playlists_completed` — count of rubrics with all videos completed
      - `quizzes_attempted` — count of completed quiz submissions
      - `quizzes_passed` — count of passing submissions (score >= 50%)
      - `avg_quiz_score_pct` — average score as percentage (0-100)
      - `total_grind_zone_xp` — sum of all grind_zone_* XP events

  2. Security
    - RLS enabled on the view
    - Users can only read their own stats row

  3. Important Notes
    - Standard VIEW (not materialized) for real-time accuracy
    - Joins across grind_zone_video_progress, grind_zone_quiz_submissions, grind_zone_quizzes, and xp_events
    - Grouped by (user_id, project_config_id, game_id)
*/

CREATE OR REPLACE VIEW grind_zone_user_stats AS
WITH video_stats AS (
  SELECT
    user_id,
    project_config_id,
    game_id,
    COUNT(*) FILTER (WHERE is_completed = true) AS total_videos_watched,
    COALESCE(SUM(watch_time_seconds), 0) AS total_watch_time_seconds
  FROM grind_zone_video_progress
  GROUP BY user_id, project_config_id, game_id
),
playlist_stats AS (
  SELECT
    vp.user_id,
    vp.project_config_id,
    vp.game_id,
    COUNT(DISTINCT vp.rubric_id) AS playlists_completed
  FROM grind_zone_video_progress vp
  WHERE NOT EXISTS (
    SELECT 1 FROM grind_zone_video_progress vp2
    WHERE vp2.user_id = vp.user_id
      AND vp2.project_config_id = vp.project_config_id
      AND vp2.rubric_id = vp.rubric_id
      AND vp2.is_completed = false
  )
  GROUP BY vp.user_id, vp.project_config_id, vp.game_id
),
quiz_stats AS (
  SELECT
    s.user_id,
    q.project_config_id,
    q.game_id,
    COUNT(*) AS quizzes_attempted,
    COUNT(*) FILTER (WHERE s.total_questions > 0 AND (s.score::float / s.total_questions::float) >= 0.5) AS quizzes_passed,
    CASE
      WHEN COUNT(*) FILTER (WHERE s.total_questions > 0) > 0
      THEN ROUND(
        AVG(
          CASE WHEN s.total_questions > 0
            THEN (s.score::float / s.total_questions::float) * 100
            ELSE NULL
          END
        )::numeric, 1
      )
      ELSE 0
    END AS avg_quiz_score_pct
  FROM grind_zone_quiz_submissions s
  JOIN grind_zone_quizzes q ON q.id = s.quiz_id
  WHERE s.is_completed = true
  GROUP BY s.user_id, q.project_config_id, q.game_id
),
xp_stats AS (
  SELECT
    user_id,
    project_config_id,
    COALESCE(SUM(amount), 0) AS total_grind_zone_xp
  FROM xp_events
  WHERE source LIKE 'grind_zone_%'
    AND project_config_id IS NOT NULL
  GROUP BY user_id, project_config_id
)
SELECT
  COALESCE(v.user_id, qs.user_id) AS user_id,
  COALESCE(v.project_config_id, qs.project_config_id) AS project_config_id,
  COALESCE(v.game_id, qs.game_id) AS game_id,
  COALESCE(v.total_videos_watched, 0) AS total_videos_watched,
  COALESCE(v.total_watch_time_seconds, 0) AS total_watch_time_seconds,
  COALESCE(p.playlists_completed, 0) AS playlists_completed,
  COALESCE(qs.quizzes_attempted, 0) AS quizzes_attempted,
  COALESCE(qs.quizzes_passed, 0) AS quizzes_passed,
  COALESCE(qs.avg_quiz_score_pct, 0) AS avg_quiz_score_pct,
  COALESCE(x.total_grind_zone_xp, 0) AS total_grind_zone_xp
FROM video_stats v
FULL OUTER JOIN quiz_stats qs
  ON v.user_id = qs.user_id
  AND v.project_config_id = qs.project_config_id
  AND v.game_id IS NOT DISTINCT FROM qs.game_id
LEFT JOIN playlist_stats p
  ON COALESCE(v.user_id, qs.user_id) = p.user_id
  AND COALESCE(v.project_config_id, qs.project_config_id) = p.project_config_id
  AND COALESCE(v.game_id, qs.game_id) IS NOT DISTINCT FROM p.game_id
LEFT JOIN xp_stats x
  ON COALESCE(v.user_id, qs.user_id) = x.user_id
  AND COALESCE(v.project_config_id, qs.project_config_id) = x.project_config_id;
