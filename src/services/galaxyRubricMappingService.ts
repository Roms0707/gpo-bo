import { supabase } from '../lib/supabase';
import {
  GalaxyRubricMapping,
  CreateGalaxyRubricMappingData,
  ContentCategory,
} from '../types/galaxyRubricMapping';
import toast from 'react-hot-toast';

export const fetchMappingsByProject = async (
  projectConfigId: string
): Promise<{ data: GalaxyRubricMapping[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('galaxy_rubric_mappings')
      .select('*')
      .eq('project_config_id', projectConfigId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: data as GalaxyRubricMapping[], error: null };
  } catch (error) {
    console.error('Error fetching rubric mappings by project:', error);
    return { data: null, error: error as Error };
  }
};

export const fetchProjectLevelMappings = async (
  projectConfigId: string
): Promise<{ data: GalaxyRubricMapping[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('galaxy_rubric_mappings')
      .select('*')
      .eq('project_config_id', projectConfigId)
      .eq('scope', 'project')
      .is('game_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: data as GalaxyRubricMapping[], error: null };
  } catch (error) {
    console.error('Error fetching project-level rubric mappings:', error);
    return { data: null, error: error as Error };
  }
};

export const fetchMappingsByGame = async (
  projectConfigId: string,
  gameId: string
): Promise<{ data: GalaxyRubricMapping[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('galaxy_rubric_mappings')
      .select('*')
      .eq('project_config_id', projectConfigId)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: data as GalaxyRubricMapping[], error: null };
  } catch (error) {
    console.error('Error fetching rubric mappings by game:', error);
    return { data: null, error: error as Error };
  }
};

export const checkMappingExists = async (
  projectConfigId: string,
  gameId: string | null,
  rubricId: string,
  contentCategory: ContentCategory = 'tips'
): Promise<{ exists: boolean; error: Error | null }> => {
  try {
    let query = supabase
      .from('galaxy_rubric_mappings')
      .select('id')
      .eq('project_config_id', projectConfigId)
      .eq('rubric_id', rubricId)
      .eq('content_category', contentCategory);

    if (gameId) {
      query = query.eq('game_id', gameId);
    } else {
      query = query.is('game_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    return { exists: !!data, error: null };
  } catch (error) {
    console.error('Error checking if mapping exists:', error);
    return { exists: false, error: error as Error };
  }
};

export const createRubricMapping = async (
  mappingData: CreateGalaxyRubricMappingData
): Promise<{ data: GalaxyRubricMapping | null; error: Error | null }> => {
  try {
    const existsCheck = await checkMappingExists(
      mappingData.project_config_id,
      mappingData.game_id || null,
      mappingData.rubric_id,
      mappingData.content_category
    );

    if (existsCheck.error) {
      throw existsCheck.error;
    }

    if (existsCheck.exists) {
      const target = mappingData.scope === 'project' ? 'this project' : 'this game';
      throw new Error(`This rubric is already mapped to ${target}`);
    }

    const insertData = {
      project_config_id: mappingData.project_config_id,
      game_id: mappingData.game_id || null,
      rubric_id: mappingData.rubric_id,
      rubric_name: mappingData.rubric_name || null,
      scope: mappingData.scope,
      content_category: mappingData.content_category,
      display_on_frontend: mappingData.display_on_frontend ?? true,
    };

    const { data, error } = await supabase
      .from('galaxy_rubric_mappings')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    return { data: data as GalaxyRubricMapping, error: null };
  } catch (error) {
    console.error('Error creating rubric mapping:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to create rubric mapping');
    return { data: null, error: error as Error };
  }
};

export const deleteRubricMapping = async (
  id: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('galaxy_rubric_mappings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting rubric mapping:', error);
    toast.error('Failed to delete rubric mapping');
    return { error: error as Error };
  }
};

export const toggleDisplayOnFrontend = async (
  id: string,
  displayOnFrontend: boolean
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('galaxy_rubric_mappings')
      .update({ display_on_frontend: displayOnFrontend })
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error toggling display_on_frontend:', error);
    toast.error('Failed to update frontend visibility');
    return { error: error as Error };
  }
};

export const bulkDeleteMappingsByGame = async (
  projectConfigId: string,
  gameId: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('galaxy_rubric_mappings')
      .delete()
      .eq('project_config_id', projectConfigId)
      .eq('game_id', gameId);

    if (error) throw error;

    toast.success('All rubric mappings for this game deleted successfully');
    return { error: null };
  } catch (error) {
    console.error('Error bulk deleting rubric mappings:', error);
    toast.error('Failed to delete rubric mappings');
    return { error: error as Error };
  }
};

export const bulkDeleteProjectMappings = async (
  projectConfigId: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('galaxy_rubric_mappings')
      .delete()
      .eq('project_config_id', projectConfigId)
      .eq('scope', 'project')
      .is('game_id', null);

    if (error) throw error;

    toast.success('All project-level rubric mappings deleted successfully');
    return { error: null };
  } catch (error) {
    console.error('Error bulk deleting project rubric mappings:', error);
    toast.error('Failed to delete rubric mappings');
    return { error: error as Error };
  }
};

export const getMappingCountByProject = async (
  projectConfigId: string
): Promise<{ count: number; gameCount: number; projectCount: number; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('galaxy_rubric_mappings')
      .select('scope')
      .eq('project_config_id', projectConfigId);

    if (error) throw error;

    const all = data || [];
    const gameCount = all.filter((m) => m.scope === 'game').length;
    const projectCount = all.filter((m) => m.scope === 'project').length;

    return { count: all.length, gameCount, projectCount, error: null };
  } catch (error) {
    console.error('Error getting mapping count:', error);
    return { count: 0, gameCount: 0, projectCount: 0, error: error as Error };
  }
};

export const bulkUpdateRubricNames = async (
  updates: { id: string; rubric_name: string }[]
): Promise<{ updatedCount: number; error: Error | null }> => {
  try {
    if (updates.length === 0) {
      return { updatedCount: 0, error: null };
    }

    let updatedCount = 0;
    for (const update of updates) {
      const { error } = await supabase
        .from('galaxy_rubric_mappings')
        .update({ rubric_name: update.rubric_name })
        .eq('id', update.id);

      if (error) throw error;
      updatedCount++;
    }

    return { updatedCount, error: null };
  } catch (error) {
    console.error('Error bulk updating rubric names:', error);
    return { updatedCount: 0, error: error as Error };
  }
};
