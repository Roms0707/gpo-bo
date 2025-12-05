import { supabase } from '../lib/supabase';
import { validateDomainFormat, normalizeDomain } from '../utils/domainValidation';

export interface ProjectConfiguration {
  id: string;
  config_id: string;
  config_name: string;
  is_active: boolean;
  brand_name: string;
  logo_path: string;
  favicon_path: string;
  logo_alt_text: string;
  primary_color: string;
  secondary_color: string;
  product_id: string | null;
  campaign_id: string | null;
  domain: string | null;
  is_default: boolean;
  extra_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectConfigData {
  config_id: string;
  config_name: string;
  is_active: boolean;
  brand_name: string;
  logo_path: string;
  favicon_path: string;
  logo_alt_text: string;
  primary_color: string;
  secondary_color: string;
  product_id?: string | null;
  campaign_id?: string | null;
  domain?: string | null;
  is_default?: boolean;
  extra_metadata?: Record<string, any>;
}

export interface UpdateProjectConfigData extends Partial<CreateProjectConfigData> {
  id: string;
}

export const validateHexColor = (color: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
};

export const validateConfigId = (configId: string): boolean => {
  return /^[a-z0-9-]{3,50}$/.test(configId);
};

export const uploadFile = async (
  file: File,
  path: string
): Promise<{ path: string; error: Error | null }> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('project-config-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('project-config-assets')
      .getPublicUrl(filePath);

    return { path: publicUrl, error: null };
  } catch (error) {
    console.error('File upload error:', error);
    return { path: '', error: error as Error };
  }
};

export const checkDomainAvailability = async (
  domain: string,
  excludeId?: string
): Promise<{ available: boolean; error: Error | null }> => {
  try {
    const normalizedDomain = normalizeDomain(domain);

    let query = supabase
      .from('project_configurations')
      .select('id')
      .eq('domain', normalizedDomain);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    return { available: !data, error: null };
  } catch (error) {
    console.error('Error checking domain availability:', error);
    return { available: false, error: error as Error };
  }
};

export const fetchConfigurationByDomain = async (
  domain: string
): Promise<{ data: ProjectConfiguration | null; error: Error | null }> => {
  try {
    const normalizedDomain = normalizeDomain(domain);

    const { data, error } = await supabase
      .from('project_configurations')
      .select('*')
      .eq('domain', normalizedDomain)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;

    return { data: data as ProjectConfiguration | null, error: null };
  } catch (error) {
    console.error('Error fetching configuration by domain:', error);
    return { data: null, error: error as Error };
  }
};

export const fetchDefaultConfiguration = async (): Promise<{
  data: ProjectConfiguration | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('project_configurations')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;

    return { data: data as ProjectConfiguration | null, error: null };
  } catch (error) {
    console.error('Error fetching default configuration:', error);
    return { data: null, error: error as Error };
  }
};

export const deleteFile = async (filePath: string): Promise<{ error: Error | null }> => {
  try {
    const urlPath = filePath.split('/project-config-assets/').pop();
    if (!urlPath) {
      return { error: null };
    }

    const { error } = await supabase.storage
      .from('project-config-assets')
      .remove([urlPath]);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error) {
    console.error('File deletion error:', error);
    return { error: error as Error };
  }
};

export const fetchProjectConfigurations = async (filters?: {
  searchQuery?: string;
  isActive?: boolean | null;
}): Promise<{ data: ProjectConfiguration[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('project_configurations')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.isActive !== undefined && filters.isActive !== null) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;

    if (error) throw error;

    let filteredData = data as ProjectConfiguration[];

    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      filteredData = filteredData.filter(
        (config) =>
          config.config_id.toLowerCase().includes(searchLower) ||
          config.config_name.toLowerCase().includes(searchLower) ||
          config.brand_name.toLowerCase().includes(searchLower)
      );
    }

    return { data: filteredData, error: null };
  } catch (error) {
    console.error('Error fetching project configurations:', error);
    return { data: null, error: error as Error };
  }
};

export const fetchProjectConfigurationById = async (
  id: string
): Promise<{ data: ProjectConfiguration | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('project_configurations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return { data: data as ProjectConfiguration, error: null };
  } catch (error) {
    console.error('Error fetching project configuration:', error);
    return { data: null, error: error as Error };
  }
};

export const fetchProjectConfigurationByConfigId = async (
  configId: string
): Promise<{ data: ProjectConfiguration | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('project_configurations')
      .select('*')
      .eq('config_id', configId)
      .maybeSingle();

    if (error) throw error;

    return { data: data as ProjectConfiguration | null, error: null };
  } catch (error) {
    console.error('Error fetching project configuration by config_id:', error);
    return { data: null, error: error as Error };
  }
};

export const createProjectConfiguration = async (
  configData: CreateProjectConfigData
): Promise<{ data: ProjectConfiguration | null; error: Error | null }> => {
  try {
    if (!validateConfigId(configData.config_id)) {
      throw new Error('Invalid config_id format. Use lowercase alphanumeric with hyphens (3-50 chars)');
    }

    if (!validateHexColor(configData.primary_color)) {
      throw new Error('Invalid primary_color format. Use #RRGGBB format');
    }

    if (!validateHexColor(configData.secondary_color)) {
      throw new Error('Invalid secondary_color format. Use #RRGGBB format');
    }

    if (configData.domain && configData.is_default) {
      throw new Error('Configuration cannot have both a domain and be set as default');
    }

    if (configData.domain) {
      const normalizedDomain = normalizeDomain(configData.domain);
      const validation = validateDomainFormat(normalizedDomain);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const availability = await checkDomainAvailability(normalizedDomain);
      if (!availability.available) {
        throw new Error(`Domain "${normalizedDomain}" is already in use`);
      }

      configData.domain = normalizedDomain;
    }

    const existingConfig = await fetchProjectConfigurationByConfigId(configData.config_id);
    if (existingConfig.data) {
      throw new Error(`Configuration with config_id "${configData.config_id}" already exists`);
    }

    const { data, error } = await supabase
      .from('project_configurations')
      .insert([{
        ...configData,
        extra_metadata: configData.extra_metadata || {},
        domain: configData.domain || null,
        is_default: configData.is_default || false,
      }])
      .select()
      .single();

    if (error) throw error;

    return { data: data as ProjectConfiguration, error: null };
  } catch (error) {
    console.error('Error creating project configuration:', error);
    return { data: null, error: error as Error };
  }
};

export const updateProjectConfiguration = async (
  configData: UpdateProjectConfigData
): Promise<{ data: ProjectConfiguration | null; error: Error | null }> => {
  try {
    if (configData.config_id && !validateConfigId(configData.config_id)) {
      throw new Error('Invalid config_id format. Use lowercase alphanumeric with hyphens (3-50 chars)');
    }

    if (configData.primary_color && !validateHexColor(configData.primary_color)) {
      throw new Error('Invalid primary_color format. Use #RRGGBB format');
    }

    if (configData.secondary_color && !validateHexColor(configData.secondary_color)) {
      throw new Error('Invalid secondary_color format. Use #RRGGBB format');
    }

    if (configData.domain !== undefined && configData.is_default) {
      throw new Error('Configuration cannot have both a domain and be set as default');
    }

    if (configData.domain !== undefined && configData.domain !== null) {
      const normalizedDomain = normalizeDomain(configData.domain);
      const validation = validateDomainFormat(normalizedDomain);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const availability = await checkDomainAvailability(normalizedDomain, configData.id);
      if (!availability.available) {
        throw new Error(`Domain "${normalizedDomain}" is already in use`);
      }

      configData.domain = normalizedDomain;
    }

    const { id, ...updateData } = configData;

    const { data, error } = await supabase
      .from('project_configurations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { data: data as ProjectConfiguration, error: null };
  } catch (error) {
    console.error('Error updating project configuration:', error);
    return { data: null, error: error as Error };
  }
};

export const deleteProjectConfiguration = async (
  id: string
): Promise<{ error: Error | null }> => {
  try {
    const configResult = await fetchProjectConfigurationById(id);
    if (configResult.error || !configResult.data) {
      throw new Error('Configuration not found');
    }

    const config = configResult.data;

    await deleteFile(config.logo_path);
    await deleteFile(config.favicon_path);

    const { error } = await supabase
      .from('project_configurations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting project configuration:', error);
    return { error: error as Error };
  }
};

export const toggleProjectConfigurationActive = async (
  id: string,
  isActive: boolean
): Promise<{ data: ProjectConfiguration | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('project_configurations')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { data: data as ProjectConfiguration, error: null };
  } catch (error) {
    console.error('Error toggling project configuration active status:', error);
    return { data: null, error: error as Error };
  }
};
