export type QuizStatus = 'draft' | 'published';
export type QuestionType = 'multiple_choice' | 'true_false' | 'open_ended';
export type QuizLanguage = 'en' | 'fr' | 'es';

export const QUIZ_LANGUAGES: { code: QuizLanguage; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' },
];

export interface GrindZoneQuiz {
  id: string;
  rubric_id: string;
  rubric_name: string | null;
  project_config_id: string;
  game_id: string | null;
  title: string;
  status: QuizStatus;
  language: QuizLanguage;
  source_quiz_id: string | null;
  video_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrindZoneQuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[] | null;
  correct_answer_index: number | null;
  correct_answer_text: string | null;
  explanation: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuizWithQuestions extends GrindZoneQuiz {
  questions: GrindZoneQuizQuestion[];
}

export interface GenerateQuizRequest {
  config_id: string;
  rubric_id: string;
  rubric_name?: string;
  game_id?: string;
  language?: QuizLanguage;
}

export interface DuplicateQuizRequest {
  source_quiz_id: string;
  target_config_ids: string[];
}

export interface QuestionUpdate {
  question_text?: string;
  question_type?: QuestionType;
  options?: string[] | null;
  correct_answer_index?: number | null;
  correct_answer_text?: string | null;
  explanation?: string | null;
}

export type BatchItemStatus = 'pending' | 'generating' | 'done' | 'failed';

export interface BatchQueueItem {
  mappingId: string;
  rubricId: string;
  rubricName: string | null;
  gameId: string | null;
  gameName?: string;
  status: BatchItemStatus;
  error?: string;
  quizId?: string;
}

export interface QuizAnswerEntry {
  question_id: string;
  question_type: QuestionType;
  selected_option_index: number | null;
  answer_text: string | null;
  is_correct: boolean;
}

export interface GrindZoneQuizSubmission {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  is_completed: boolean;
  answers: QuizAnswerEntry[];
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionUser {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  country: string | null;
}

export interface SubmissionQuiz {
  id: string;
  title: string;
  rubric_name: string | null;
  language: QuizLanguage;
  project_config_id: string;
}

export interface AdminQuizSubmissionView {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  is_completed: boolean;
  answers: QuizAnswerEntry[];
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  user: SubmissionUser;
  quiz: SubmissionQuiz;
}
