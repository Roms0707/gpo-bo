import { supabase } from '../lib/supabase';
import {
  GalaxyRubricMapping,
  CreateGalaxyRubricMappingData,
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
  gameId: string,
  rubricId: string
): Promise<{ exists: boolean; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('galaxy_rubric_mappings')
      .select('id')
      .eq('project_config_id', projectConfigId)
      .eq('game_id', gameId)
      .eq('rubric_id', rubricId)
      .maybeSingle();

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
      mappingData.game_id,
      mappingData.rubric_id
    );

    if (existsCheck.error) {
      throw existsCheck.error;
    }

    if (existsCheck.exists) {
      throw new Error('This rubric is already mapped to this game');
    }

    const { data, error } = await supabase
      .from('galaxy_rubric_mappings')
      .insert([mappingData])
      .select()
      .single();

    if (error) throw error;

    toast.success('Rubric mapping created successfully');
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

    toast.success('Rubric mapping deleted successfully');
    return { error: null };
  } catch (error) {
    console.error('Error deleting rubric mapping:', error);
    toast.error('Failed to delete rubric mapping');
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

export const bulkCreateRubricMappings = async (
  mappings: CreateGalaxyRubricMappingData[]
): Promise<{ data: GalaxyRubricMapping[] | null; error: Error | null }> => {
  try {
    if (mappings.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('galaxy_rubric_mappings')
      .insert(mappings)
      .select();

    if (error) throw error;

    toast.success(`${mappings.length} rubric mapping(s) created successfully`);
    return { data: data as GalaxyRubricMapping[], error: null };
  } catch (error) {
    console.error('Error bulk creating rubric mappings:', error);
    toast.error('Failed to create rubric mappings');
    return { data: null, error: error as Error };
  }
};

export const getMappingCountByProject = async (
  projectConfigId: string
): Promise<{ count: number; error: Error | null }> => {
  try {
    const { count, error } = await supabase
      .from('galaxy_rubric_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('project_config_id', projectConfigId);

    if (error) throw error;

    return { count: count || 0, error: null };
  } catch (error) {
    console.error('Error getting mapping count:', error);
    return { count: 0, error: error as Error };
  }
};
