import { supabase } from '../lib/supabase';
import type {
  GrindZoneVideoProgress,
  UpsertVideoProgressData,
} from '../types/grindZoneProgress';

export const upsertVideoProgress = async (
  data: UpsertVideoProgressData
): Promise<{ data: GrindZoneVideoProgress | null; error: Error | null }> => {
  try {
    const { data: result, error } = await supabase
      .from('grind_zone_video_progress')
      .upsert(
        {
          user_id: data.user_id,
          project_config_id: data.project_config_id,
          game_id: data.game_id || null,
          rubric_id: data.rubric_id,
          video_id: data.video_id,
          video_title: data.video_title || null,
          watch_time_seconds: data.watch_time_seconds,
          duration_seconds: data.duration_seconds || null,
          is_completed: data.is_completed ?? false,
          last_watched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,project_config_id,rubric_id,video_id',
        }
      )
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data: result as GrindZoneVideoProgress | null, error: null };
  } catch (error) {
    console.error('Error upserting video progress:', error);
    return { data: null, error: error as Error };
  }
};

export const fetchVideoProgressForRubric = async (
  userId: string,
  projectConfigId: string,
  rubricId: string
): Promise<{ data: GrindZoneVideoProgress[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('grind_zone_video_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('project_config_id', projectConfigId)
      .eq('rubric_id', rubricId)
      .order('last_watched_at', { ascending: false });

    if (error) throw error;
    return { data: data as GrindZoneVideoProgress[], error: null };
  } catch (error) {
    console.error('Error fetching video progress for rubric:', error);
    return { data: null, error: error as Error };
  }
};

export const fetchVideoProgressForGame = async (
  userId: string,
  projectConfigId: string,
  gameId: string
): Promise<{ data: GrindZoneVideoProgress[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('grind_zone_video_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('project_config_id', projectConfigId)
      .eq('game_id', gameId)
      .order('last_watched_at', { ascending: false });

    if (error) throw error;
    return { data: data as GrindZoneVideoProgress[], error: null };
  } catch (error) {
    console.error('Error fetching video progress for game:', error);
    return { data: null, error: error as Error };
  }
};

export const markVideoCompleted = async (
  userId: string,
  projectConfigId: string,
  rubricId: string,
  videoId: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('grind_zone_video_progress')
      .update({
        is_completed: true,
        updated_at: new Date().toISOString(),
        last_watched_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('project_config_id', projectConfigId)
      .eq('rubric_id', rubricId)
      .eq('video_id', videoId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error marking video completed:', error);
    return { error: error as Error };
  }
};

export const fetchAllVideoProgress = async (
  userId: string,
  projectConfigId: string
): Promise<{ data: GrindZoneVideoProgress[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('grind_zone_video_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('project_config_id', projectConfigId)
      .order('last_watched_at', { ascending: false });

    if (error) throw error;
    return { data: data as GrindZoneVideoProgress[], error: null };
  } catch (error) {
    console.error('Error fetching all video progress:', error);
    return { data: null, error: error as Error };
  }
};
