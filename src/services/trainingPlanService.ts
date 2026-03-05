import { supabase } from '../lib/supabase';
import type {
  TrainingPlan,
  GenerateTrainingPlanRequest,
} from '../types/grindZoneProgress';

export const generateTrainingPlan = async (
  request: GenerateTrainingPlanRequest
): Promise<{ data: TrainingPlan | null; error: Error | null }> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-training-plan`;

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
      throw new Error(
        errorBody.error || `Training plan generation failed (${response.status})`
      );
    }

    const result: TrainingPlan = await response.json();
    return { data: result, error: null };
  } catch (error) {
    console.error('Error generating training plan:', error);
    return { data: null, error: error as Error };
  }
};
