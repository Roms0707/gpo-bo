export interface GrindZoneVideoProgress {
  id: string;
  user_id: string;
  project_config_id: string;
  game_id: string | null;
  rubric_id: string;
  video_id: string;
  video_title: string | null;
  watch_time_seconds: number;
  duration_seconds: number | null;
  is_completed: boolean;
  last_watched_at: string;
  created_at: string;
  updated_at: string;
}

export interface UpsertVideoProgressData {
  user_id: string;
  project_config_id: string;
  game_id?: string | null;
  rubric_id: string;
  video_id: string;
  video_title?: string | null;
  watch_time_seconds: number;
  duration_seconds?: number | null;
  is_completed?: boolean;
}

export interface GrindZoneUserStats {
  user_id: string;
  project_config_id: string;
  game_id: string | null;
  total_videos_watched: number;
  total_watch_time_seconds: number;
  playlists_completed: number;
  quizzes_attempted: number;
  quizzes_passed: number;
  avg_quiz_score_pct: number;
  total_grind_zone_xp: number;
}

export type TrainingActivityType = 'watch_video' | 'take_quiz' | 'practice_focus';

export interface TrainingActivity {
  activity_type: TrainingActivityType;
  rubric_id: string | null;
  rubric_name: string | null;
  video_id: string | null;
  quiz_id: string | null;
  title: string;
  description: string;
  estimated_minutes: number;
}

export interface TrainingDay {
  day: number;
  theme: string;
  activities: TrainingActivity[];
}

export interface TrainingPlan {
  plan: TrainingDay[];
  context: {
    user_id: string;
    game_id: string;
    config_id: string;
    videos_watched: number;
    videos_total: number;
    quizzes_completed: number;
    rubrics_available: number;
    generated_at: string;
  };
}

export interface GenerateTrainingPlanRequest {
  config_id: string;
  game_id: string;
  language?: string;
}
