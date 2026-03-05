/*
  # Create XP Reward Triggers for Grind Zone Activity

  Automatic XP rewards when users complete Grind Zone quizzes, earn weekly bonuses,
  or finish entire video playlists.

  1. New Functions
    - `handle_grind_zone_quiz_xp()` — Awards 50 XP when a quiz submission is completed with a passing score (>= 50%)
    - `handle_grind_zone_first_weekly_quiz_bonus()` — Awards 10 bonus XP for the first completed quiz of the current ISO week
    - `handle_grind_zone_playlist_completion_xp()` — Awards 25 XP when all videos in a rubric are completed

  2. New Triggers
    - `trg_grind_zone_quiz_xp` on grind_zone_quiz_submissions AFTER UPDATE
    - `trg_grind_zone_weekly_quiz_bonus` on grind_zone_quiz_submissions AFTER UPDATE
    - `trg_grind_zone_playlist_xp` on grind_zone_video_progress AFTER UPDATE

  3. XP Award Summary
    - Quiz pass: +50 XP (source: grind_zone_quiz)
    - First quiz of the week: +10 XP bonus (source: grind_zone_weekly_bonus)
    - Playlist complete (all rubric videos): +25 XP (source: grind_zone_playlist_complete)
*/

-- 1. Quiz Completion XP (50 XP for passing score >= 50%)
CREATE OR REPLACE FUNCTION handle_grind_zone_quiz_xp()
RETURNS trigger AS $$
DECLARE
  v_project_config_id uuid;
  v_quiz_title text;
BEGIN
  IF OLD.is_completed = true THEN
    RETURN NEW;
  END IF;

  IF NEW.is_completed = false THEN
    RETURN NEW;
  END IF;

  IF NEW.total_questions = 0 OR (NEW.score::float / NEW.total_questions::float) < 0.5 THEN
    RETURN NEW;
  END IF;

  SELECT q.project_config_id, q.title
  INTO v_project_config_id, v_quiz_title
  FROM grind_zone_quizzes q
  WHERE q.id = NEW.quiz_id;

  IF v_project_config_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.award_xp_and_check_level(NEW.user_id, 50);

  INSERT INTO xp_events (user_id, amount, source, source_id, source_details, metadata, project_config_id)
  VALUES (
    NEW.user_id,
    50,
    'grind_zone_quiz',
    NEW.quiz_id,
    'Completed quiz: ' || COALESCE(v_quiz_title, 'Unknown'),
    jsonb_build_object('score', NEW.score, 'total_questions', NEW.total_questions),
    v_project_config_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_grind_zone_quiz_xp ON grind_zone_quiz_submissions;
CREATE TRIGGER trg_grind_zone_quiz_xp
  AFTER UPDATE ON grind_zone_quiz_submissions
  FOR EACH ROW
  WHEN (OLD.is_completed = false AND NEW.is_completed = true)
  EXECUTE FUNCTION handle_grind_zone_quiz_xp();


-- 2. First Weekly Quiz Bonus (10 XP for first completed quiz of the ISO week)
CREATE OR REPLACE FUNCTION handle_grind_zone_first_weekly_quiz_bonus()
RETURNS trigger AS $$
DECLARE
  v_existing_count integer;
  v_project_config_id uuid;
BEGIN
  IF OLD.is_completed = true THEN
    RETURN NEW;
  END IF;

  IF NEW.is_completed = false THEN
    RETURN NEW;
  END IF;

  SELECT q.project_config_id
  INTO v_project_config_id
  FROM grind_zone_quizzes q
  WHERE q.id = NEW.quiz_id;

  IF v_project_config_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_existing_count
  FROM xp_events
  WHERE user_id = NEW.user_id
    AND source = 'grind_zone_quiz'
    AND project_config_id = v_project_config_id
    AND created_at >= date_trunc('week', now());

  IF v_existing_count > 0 THEN
    RETURN NEW;
  END IF;

  PERFORM public.award_xp_and_check_level(NEW.user_id, 10);

  INSERT INTO xp_events (user_id, amount, source, source_id, source_details, metadata, project_config_id)
  VALUES (
    NEW.user_id,
    10,
    'grind_zone_weekly_bonus',
    NEW.quiz_id,
    'First Grind Zone quiz of the week',
    jsonb_build_object('week', to_char(now(), 'IYYY-IW')),
    v_project_config_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_grind_zone_weekly_quiz_bonus ON grind_zone_quiz_submissions;
CREATE TRIGGER trg_grind_zone_weekly_quiz_bonus
  AFTER UPDATE ON grind_zone_quiz_submissions
  FOR EACH ROW
  WHEN (OLD.is_completed = false AND NEW.is_completed = true)
  EXECUTE FUNCTION handle_grind_zone_first_weekly_quiz_bonus();


-- 3. Playlist (Rubric) Completion XP (25 XP when all videos in a rubric are completed)
CREATE OR REPLACE FUNCTION handle_grind_zone_playlist_completion_xp()
RETURNS trigger AS $$
DECLARE
  v_total_videos integer;
  v_completed_videos integer;
  v_already_awarded boolean;
BEGIN
  IF OLD.is_completed = true THEN
    RETURN NEW;
  END IF;

  IF NEW.is_completed = false THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_total_videos
  FROM grind_zone_video_progress
  WHERE user_id = NEW.user_id
    AND project_config_id = NEW.project_config_id
    AND rubric_id = NEW.rubric_id;

  SELECT COUNT(*) INTO v_completed_videos
  FROM grind_zone_video_progress
  WHERE user_id = NEW.user_id
    AND project_config_id = NEW.project_config_id
    AND rubric_id = NEW.rubric_id
    AND is_completed = true;

  IF v_total_videos < 1 OR v_completed_videos < v_total_videos THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM xp_events
    WHERE user_id = NEW.user_id
      AND source = 'grind_zone_playlist_complete'
      AND project_config_id = NEW.project_config_id
      AND metadata->>'rubric_id' = NEW.rubric_id
  ) INTO v_already_awarded;

  IF v_already_awarded THEN
    RETURN NEW;
  END IF;

  PERFORM public.award_xp_and_check_level(NEW.user_id, 25);

  INSERT INTO xp_events (user_id, amount, source, source_details, metadata, project_config_id)
  VALUES (
    NEW.user_id,
    25,
    'grind_zone_playlist_complete',
    'Completed all videos in rubric: ' || NEW.rubric_id,
    jsonb_build_object('rubric_id', NEW.rubric_id, 'videos_completed', v_total_videos),
    NEW.project_config_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_grind_zone_playlist_xp ON grind_zone_video_progress;
CREATE TRIGGER trg_grind_zone_playlist_xp
  AFTER UPDATE ON grind_zone_video_progress
  FOR EACH ROW
  WHEN (OLD.is_completed = false AND NEW.is_completed = true)
  EXECUTE FUNCTION handle_grind_zone_playlist_completion_xp();
