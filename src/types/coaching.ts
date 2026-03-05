export interface CoachingQuestion {
  id: string;
  session_id: string;
  user_id: string | null;
  game_id: string | null;
  question_text: string;
  response_text: string | null;
  detected_topics: string[];
  category: string | null;
  created_at: string;
}

export interface CoachingConfig {
  id: string;
  game_id: string;
  config_key: string;
  config_value: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TopicStats {
  topic: string;
  count: number;
  percentage: number;
}

export interface QuestionGroup {
  normalizedText: string;
  count: number;
  examples: CoachingQuestion[];
}

export interface DateRangeFilter {
  startDate: string;
  endDate: string;
}

export interface AnalyticsFilters {
  dateRange: DateRangeFilter;
  gameId: string | null;
  topic: string | null;
}

export interface DailyQuestionCount {
  date: string;
  count: number;
}

export interface AnalyticsSummary {
  totalQuestions: number;
  questionsThisWeek: number;
  uniqueTopics: number;
  avgQuestionsPerSession: number;
}

export interface TrendingTopic {
  topic: string;
  currentCount: number;
  previousCount: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
}

export type ConfigKeyType =
  | 'custom_prompt_section'
  | 'emphasis_areas'
  | 'topic_priority'
  | 'behavior_toggle';

export type CoachingContentCategory = 'tips' | 'masterclass' | 'grind_zone' | 'article';

export interface CoachingTopicContentLink {
  id: string;
  coaching_config_id: string;
  game_id: string | null;
  rubric_id: string;
  rubric_name: string | null;
  content_category: CoachingContentCategory;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCoachingContentLinkData {
  coaching_config_id: string;
  game_id: string | null;
  rubric_id: string;
  rubric_name?: string | null;
  content_category?: CoachingContentCategory;
  display_order?: number;
}

export interface RecommendedContent {
  topic: string;
  rubric_id: string;
  rubric_name: string | null;
  content_category: string;
}
