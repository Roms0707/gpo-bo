import { supabase } from '../lib/supabase';
import type {
  CoachingTopicContentLink,
  CreateCoachingContentLinkData,
} from '../types/coaching';

export const fetchContentLinksForConfig = async (
  coachingConfigId: string
): Promise<{ data: CoachingTopicContentLink[]; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('coaching_topic_content_links')
      .select('*')
      .eq('coaching_config_id', coachingConfigId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { data: (data as CoachingTopicContentLink[]) || [], error: null };
  } catch (error) {
    console.error('Error fetching content links for config:', error);
    return { data: [], error: error as Error };
  }
};

export const fetchContentLinksForGame = async (
  gameId: string
): Promise<{ data: CoachingTopicContentLink[]; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('coaching_topic_content_links')
      .select('*')
      .eq('game_id', gameId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { data: (data as CoachingTopicContentLink[]) || [], error: null };
  } catch (error) {
    console.error('Error fetching content links for game:', error);
    return { data: [], error: error as Error };
  }
};

export const fetchAllContentLinksForGame = async (
  gameId: string
): Promise<{ data: CoachingTopicContentLink[]; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('coaching_topic_content_links')
      .select('*')
      .eq('game_id', gameId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { data: (data as CoachingTopicContentLink[]) || [], error: null };
  } catch (error) {
    console.error('Error fetching all content links for game:', error);
    return { data: [], error: error as Error };
  }
};

export const createContentLink = async (
  linkData: CreateCoachingContentLinkData
): Promise<{ data: CoachingTopicContentLink | null; error: Error | null }> => {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('coaching_topic_content_links')
      .select('display_order')
      .eq('coaching_config_id', linkData.coaching_config_id)
      .order('display_order', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    const nextOrder =
      linkData.display_order ??
      (existing && existing.length > 0 ? existing[0].display_order + 1 : 0);

    const { data, error } = await supabase
      .from('coaching_topic_content_links')
      .insert([
        {
          coaching_config_id: linkData.coaching_config_id,
          game_id: linkData.game_id,
          rubric_id: linkData.rubric_id,
          rubric_name: linkData.rubric_name || null,
          content_category: linkData.content_category || 'tips',
          display_order: nextOrder,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { data: data as CoachingTopicContentLink, error: null };
  } catch (error) {
    console.error('Error creating content link:', error);
    return { data: null, error: error as Error };
  }
};

export const deleteContentLink = async (
  id: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('coaching_topic_content_links')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting content link:', error);
    return { error: error as Error };
  }
};

export const toggleContentLinkActive = async (
  id: string,
  isActive: boolean
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('coaching_topic_content_links')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error toggling content link active:', error);
    return { error: error as Error };
  }
};

export const getContentLinkCountsByConfig = async (
  gameId: string
): Promise<{ data: Record<string, number>; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('coaching_topic_content_links')
      .select('coaching_config_id')
      .eq('game_id', gameId);

    if (error) throw error;

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      counts[row.coaching_config_id] = (counts[row.coaching_config_id] || 0) + 1;
    }

    return { data: counts, error: null };
  } catch (error) {
    console.error('Error fetching content link counts:', error);
    return { data: {}, error: error as Error };
  }
};
