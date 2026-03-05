import { supabase } from '../lib/supabase';
import type {
  GrindZoneQuizSubmission,
  QuizAnswerEntry,
  AdminQuizSubmissionView,
} from '../types/grindZoneQuiz';

export const startQuizAttempt = async (
  userId: string,
  quizId: string,
  totalQuestions: number
): Promise<{ data: GrindZoneQuizSubmission | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('grind_zone_quiz_submissions')
      .upsert(
        {
          user_id: userId,
          quiz_id: quizId,
          total_questions: totalQuestions,
          score: 0,
          is_completed: false,
          answers: [],
          started_at: new Date().toISOString(),
          completed_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,quiz_id', ignoreDuplicates: true }
      )
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data: data as GrindZoneQuizSubmission | null, error: null };
  } catch (error) {
    console.error('Error starting quiz attempt:', error);
    return { data: null, error: error as Error };
  }
};

export const savePartialProgress = async (
  userId: string,
  quizId: string,
  answers: QuizAnswerEntry[]
): Promise<{ error: Error | null }> => {
  try {
    const score = answers.filter(
      (a) => a.question_type !== 'open_ended' && a.is_correct
    ).length;

    const { error } = await supabase
      .from('grind_zone_quiz_submissions')
      .update({
        answers,
        score,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('quiz_id', quizId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error saving partial progress:', error);
    return { error: error as Error };
  }
};

export const completeQuiz = async (
  userId: string,
  quizId: string,
  answers: QuizAnswerEntry[]
): Promise<{ data: GrindZoneQuizSubmission | null; error: Error | null }> => {
  try {
    const score = answers.filter(
      (a) => a.question_type !== 'open_ended' && a.is_correct
    ).length;

    const { data, error } = await supabase
      .from('grind_zone_quiz_submissions')
      .update({
        answers,
        score,
        is_completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data: data as GrindZoneQuizSubmission | null, error: null };
  } catch (error) {
    console.error('Error completing quiz:', error);
    return { data: null, error: error as Error };
  }
};

export const fetchUserSubmission = async (
  userId: string,
  quizId: string
): Promise<{ data: GrindZoneQuizSubmission | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('grind_zone_quiz_submissions')
      .select('*')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .maybeSingle();

    if (error) throw error;
    return { data: data as GrindZoneQuizSubmission | null, error: null };
  } catch (error) {
    console.error('Error fetching user submission:', error);
    return { data: null, error: error as Error };
  }
};

export const fetchUserSubmissions = async (
  userId: string,
  quizIds?: string[]
): Promise<{ data: GrindZoneQuizSubmission[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('grind_zone_quiz_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (quizIds && quizIds.length > 0) {
      query = query.in('quiz_id', quizIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data as GrindZoneQuizSubmission[], error: null };
  } catch (error) {
    console.error('Error fetching user submissions:', error);
    return { data: null, error: error as Error };
  }
};

export const hasCompletedQuiz = async (
  userId: string,
  quizId: string
): Promise<{ completed: boolean; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('grind_zone_quiz_submissions')
      .select('is_completed')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .eq('is_completed', true)
      .maybeSingle();

    if (error) throw error;
    return { completed: !!data, error: null };
  } catch (error) {
    console.error('Error checking quiz completion:', error);
    return { completed: false, error: error as Error };
  }
};

export const fetchAdminSubmissions = async (
  projectConfigId: string
): Promise<{ data: AdminQuizSubmissionView[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('grind_zone_quiz_submissions')
      .select(`
        *,
        user:user_id(id, email, username, avatar_url, country),
        quiz:quiz_id!inner(id, title, rubric_name, language, project_config_id)
      `)
      .eq('quiz.project_config_id', projectConfigId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return { data: data as AdminQuizSubmissionView[], error: null };
  } catch (error) {
    console.error('Error fetching admin submissions:', error);
    return { data: null, error: error as Error };
  }
};
