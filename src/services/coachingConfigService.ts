import { supabase } from '../lib/supabase';
import type { CoachingConfig, ConfigKeyType } from '../types/coaching';

export const fetchCoachingConfigs = async (
  gameId: string
): Promise<{ data: CoachingConfig[]; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('coaching_ai_config')
      .select('*')
      .eq('game_id', gameId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { data: (data as CoachingConfig[]) || [], error: null };
  } catch (error) {
    console.error('Error fetching coaching configs:', error);
    return { data: [], error: error as Error };
  }
};

export const fetchCoachingConfigsByKey = async (
  gameId: string,
  configKey: ConfigKeyType
): Promise<{ data: CoachingConfig[]; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('coaching_ai_config')
      .select('*')
      .eq('game_id', gameId)
      .eq('config_key', configKey)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { data: (data as CoachingConfig[]) || [], error: null };
  } catch (error) {
    console.error('Error fetching coaching configs by key:', error);
    return { data: [], error: error as Error };
  }
};

export interface CreateCoachingConfigData {
  game_id: string;
  config_key: ConfigKeyType;
  config_value: string;
  is_active?: boolean;
  display_order?: number;
}

export const createCoachingConfig = async (
  configData: CreateCoachingConfigData
): Promise<{ data: CoachingConfig | null; error: Error | null }> => {
  try {
    const { data: existingConfigs, error: fetchError } = await supabase
      .from('coaching_ai_config')
      .select('display_order')
      .eq('game_id', configData.game_id)
      .eq('config_key', configData.config_key)
      .order('display_order', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    const nextOrder =
      configData.display_order ??
      (existingConfigs && existingConfigs.length > 0
        ? existingConfigs[0].display_order + 1
        : 0);

    const { data, error } = await supabase
      .from('coaching_ai_config')
      .insert([
        {
          game_id: configData.game_id,
          config_key: configData.config_key,
          config_value: configData.config_value,
          is_active: configData.is_active ?? true,
          display_order: nextOrder,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { data: data as CoachingConfig, error: null };
  } catch (error) {
    console.error('Error creating coaching config:', error);
    return { data: null, error: error as Error };
  }
};

export interface UpdateCoachingConfigData {
  id: string;
  config_value?: string;
  is_active?: boolean;
  display_order?: number;
}

export const updateCoachingConfig = async (
  configData: UpdateCoachingConfigData
): Promise<{ data: CoachingConfig | null; error: Error | null }> => {
  try {
    const updatePayload: Record<string, unknown> = {};

    if (configData.config_value !== undefined) {
      updatePayload.config_value = configData.config_value;
    }
    if (configData.is_active !== undefined) {
      updatePayload.is_active = configData.is_active;
    }
    if (configData.display_order !== undefined) {
      updatePayload.display_order = configData.display_order;
    }

    const { data, error } = await supabase
      .from('coaching_ai_config')
      .update(updatePayload)
      .eq('id', configData.id)
      .select()
      .single();

    if (error) throw error;

    return { data: data as CoachingConfig, error: null };
  } catch (error) {
    console.error('Error updating coaching config:', error);
    return { data: null, error: error as Error };
  }
};

export const deleteCoachingConfig = async (
  id: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('coaching_ai_config')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting coaching config:', error);
    return { error: error as Error };
  }
};

export const updateTopicPriorityOrder = async (
  gameId: string,
  orderedIds: string[]
): Promise<{ error: Error | null }> => {
  try {
    const updates = orderedIds.map((id, index) => ({
      id,
      display_order: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('coaching_ai_config')
        .update({ display_order: update.display_order })
        .eq('id', update.id)
        .eq('game_id', gameId);

      if (error) throw error;
    }

    return { error: null };
  } catch (error) {
    console.error('Error updating topic priority order:', error);
    return { error: error as Error };
  }
};

export const toggleCoachingConfigActive = async (
  id: string,
  isActive: boolean
): Promise<{ data: CoachingConfig | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('coaching_ai_config')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { data: data as CoachingConfig, error: null };
  } catch (error) {
    console.error('Error toggling coaching config active status:', error);
    return { data: null, error: error as Error };
  }
};

export const assembleSystemPromptPreview = (
  configs: CoachingConfig[],
  contentLinkCounts?: Record<string, number>
): string => {
  const activeConfigs = configs.filter((c) => c.is_active);

  const promptSections = activeConfigs
    .filter((c) => c.config_key === 'custom_prompt_section')
    .map((c) => c.config_value);

  const emphasisAreas = activeConfigs
    .filter((c) => c.config_key === 'emphasis_areas')
    .map((c) => c.config_value);

  const topicPriorityConfigs = activeConfigs
    .filter((c) => c.config_key === 'topic_priority')
    .sort((a, b) => a.display_order - b.display_order);

  const behaviorToggleConfigs = activeConfigs
    .filter((c) => c.config_key === 'behavior_toggle');

  let preview = '# AI Coach Configuration Preview\n\n';

  if (promptSections.length > 0) {
    preview += '## Custom Instructions\n';
    promptSections.forEach((section) => {
      preview += `${section}\n\n`;
    });
  }

  if (emphasisAreas.length > 0) {
    preview += '## Emphasis Areas\n';
    preview += 'Focus on the following areas when coaching:\n';
    emphasisAreas.forEach((area) => {
      preview += `- ${area}\n`;
    });
    preview += '\n';
  }

  if (topicPriorityConfigs.length > 0) {
    preview += '## Topic Priorities (in order)\n';
    topicPriorityConfigs.forEach((config, index) => {
      const count = contentLinkCounts?.[config.id] || 0;
      if (count > 0) {
        preview += `${index + 1}. ${config.config_value} [${count} video${count !== 1 ? 's' : ''} linked]\n`;
      } else {
        preview += `${index + 1}. ${config.config_value}\n`;
      }
    });
    preview += '\n';
  }

  if (behaviorToggleConfigs.length > 0) {
    preview += '## Active Behaviors\n';
    behaviorToggleConfigs.forEach((config) => {
      const count = contentLinkCounts?.[config.id] || 0;
      if (count > 0) {
        preview += `- ${config.config_value} [${count} video${count !== 1 ? 's' : ''} linked]\n`;
      } else {
        preview += `- ${config.config_value}\n`;
      }
    });
    preview += '\n';
  }

  return preview;
};
