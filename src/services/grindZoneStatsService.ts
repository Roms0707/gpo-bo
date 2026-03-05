import { supabase } from '../lib/supabase';
import type { GrindZoneUserStats } from '../types/grindZoneProgress';

export const fetchUserStats = async (
  userId: string,
  projectConfigId: string,
  gameId: string
): Promise<{ data: GrindZoneUserStats | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('grind_zone_user_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('project_config_id', projectConfigId)
      .eq('game_id', gameId)
      .maybeSingle();

    if (error) throw error;
    return { data: data as GrindZoneUserStats | null, error: null };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return { data: null, error: error as Error };
  }
};

export const fetchUserStatsAllGames = async (
  userId: string,
  projectConfigId: string
): Promise<{ data: GrindZoneUserStats[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('grind_zone_user_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('project_config_id', projectConfigId);

    if (error) throw error;
    return { data: data as GrindZoneUserStats[], error: null };
  } catch (error) {
    console.error('Error fetching user stats for all games:', error);
    return { data: null, error: error as Error };
  }
};
