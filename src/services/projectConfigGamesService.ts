import { supabase } from '../lib/supabase';
import { Game } from '../types/galaxyRubricMapping';
import toast from 'react-hot-toast';

export interface LinkedGameEntry {
  id: string;
  game_id: string;
  sort_order: number;
}

export interface LinkedGame {
  linkId: string;
  sortOrder: number;
  mappingCount: number;
  game: Game;
}

export const fetchAllGames = async (): Promise<{
  data: Game[] | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('id, name, publisher, image_url')
      .order('sort_priority', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: data as Game[], error: null };
  } catch (error) {
    console.error('Error fetching all games:', error);
    return { data: null, error: error as Error };
  }
};

export const fetchLinkedGameEntries = async (
  projectConfigId: string
): Promise<{ data: LinkedGameEntry[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('project_config_games')
      .select('id, game_id, sort_order')
      .eq('project_config_id', projectConfigId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return { data: data as LinkedGameEntry[], error: null };
  } catch (error) {
    console.error('Error fetching linked games:', error);
    return { data: null, error: error as Error };
  }
};

export const linkGame = async (
  projectConfigId: string,
  gameId: string
): Promise<{ error: Error | null }> => {
  try {
    const { data: existing } = await supabase
      .from('project_config_games')
      .select('sort_order')
      .eq('project_config_id', projectConfigId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder =
      existing && existing.length > 0 ? (existing[0].sort_order || 0) + 1 : 0;

    const { error } = await supabase.from('project_config_games').insert({
      project_config_id: projectConfigId,
      game_id: gameId,
      sort_order: nextOrder,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error linking game:', error);
    toast.error('Failed to link game');
    return { error: error as Error };
  }
};

export const unlinkGame = async (
  linkId: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('project_config_games')
      .delete()
      .eq('id', linkId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error unlinking game:', error);
    toast.error('Failed to unlink game');
    return { error: error as Error };
  }
};

export const updateSortOrders = async (
  updates: { id: string; sort_order: number }[]
): Promise<{ error: Error | null }> => {
  try {
    const results = await Promise.all(
      updates.map((update) =>
        supabase
          .from('project_config_games')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
          .select('id')
      )
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;

    const unaffected = results.filter((r) => !r.data || r.data.length === 0);
    if (unaffected.length > 0) {
      throw new Error(
        `Sort order update failed: ${unaffected.length} of ${updates.length} rows were not updated (possible RLS policy issue)`
      );
    }

    return { error: null };
  } catch (error) {
    console.error('Error updating sort orders:', error);
    return { error: error as Error };
  }
};
