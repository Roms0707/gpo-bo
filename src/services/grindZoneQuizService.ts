import { supabase } from '../lib/supabase';
import type {
  GrindZoneQuiz,
  GrindZoneQuizQuestion,
  QuizWithQuestions,
  GenerateQuizRequest,
  DuplicateQuizRequest,
  QuestionUpdate,
  QuizStatus,
  QuizLanguage,
} from '../types/grindZoneQuiz';

export const generateQuiz = async (
  request: GenerateQuizRequest
): Promise<{ data: QuizWithQuestions | null; error: Error | null }> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-grind-zone-quiz`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `Generation failed (${response.status})`);
    }

    const result = await response.json();
    return { data: result.quiz as QuizWithQuestions, error: null };
  } catch (error) {
    console.error('Error generating quiz:', error);
    return { data: null, error: error as Error };
  }
};

export const fetchQuizzes = async (
  projectConfigId: string,
  filters?: { rubric_id?: string; status?: QuizStatus; game_id?: string }
): Promise<{ data: GrindZoneQuiz[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('grind_zone_quizzes')
      .select('*')
      .eq('project_config_id', projectConfigId)
      .order('created_at', { ascending: false });

    if (filters?.rubric_id) {
      query = query.eq('rubric_id', filters.rubric_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.game_id) {
      query = query.eq('game_id', filters.game_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data: data as GrindZoneQuiz[], error: null };
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return { data: null, error: error as Error };
  }
};

export const fetchQuizWithQuestions = async (
  quizId: string
): Promise<{ data: QuizWithQuestions | null; error: Error | null }> => {
  try {
    const { data: quiz, error: quizError } = await supabase
      .from('grind_zone_quizzes')
      .select('*')
      .eq('id', quizId)
      .maybeSingle();

    if (quizError) throw quizError;
    if (!quiz) throw new Error('Quiz not found');

    const { data: questions, error: questionsError } = await supabase
      .from('grind_zone_quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('display_order', { ascending: true });

    if (questionsError) throw questionsError;

    return {
      data: {
        ...(quiz as GrindZoneQuiz),
        questions: (questions || []) as GrindZoneQuizQuestion[],
      },
      error: null,
    };
  } catch (error) {
    console.error('Error fetching quiz with questions:', error);
    return { data: null, error: error as Error };
  }
};

export const updateQuizStatus = async (
  quizId: string,
  status: QuizStatus
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('grind_zone_quizzes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', quizId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error updating quiz status:', error);
    return { error: error as Error };
  }
};

export const updateQuestion = async (
  questionId: string,
  updates: QuestionUpdate
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('grind_zone_quiz_questions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', questionId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error updating question:', error);
    return { error: error as Error };
  }
};

export const deleteQuiz = async (
  quizId: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('grind_zone_quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return { error: error as Error };
  }
};

export const updateQuizTitle = async (
  quizId: string,
  title: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('grind_zone_quizzes')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', quizId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error updating quiz title:', error);
    return { error: error as Error };
  }
};

export const updateQuizLanguage = async (
  quizId: string,
  language: QuizLanguage
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('grind_zone_quizzes')
      .update({ language, updated_at: new Date().toISOString() })
      .eq('id', quizId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error updating quiz language:', error);
    return { error: error as Error };
  }
};

export const duplicateQuizToConfigs = async (
  request: DuplicateQuizRequest
): Promise<{ data: { duplicated_count: number; duplicated_to: string[] } | null; error: Error | null }> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/duplicate-grind-zone-quiz`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `Duplication failed (${response.status})`);
    }

    const result = await response.json();
    return { data: result, error: null };
  } catch (error) {
    console.error('Error duplicating quiz:', error);
    return { data: null, error: error as Error };
  }
};
