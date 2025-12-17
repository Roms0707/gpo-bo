import { supabase } from '../lib/supabase';
import { validateDomainFormat, normalizeDomain } from '../utils/domainValidation';

export type AuthMethod = 'email' | 'discord' | 'kliento';
export type KlientoAuthType = 'password' | 'otp';

export const AUTH_METHODS: AuthMethod[] = ['email', 'discord', 'kliento'];
export const KLIENTO_AUTH_TYPES: KlientoAuthType[] = ['password', 'otp'];
export const DEFAULT_OTP_SMS_TEMPLATE = '{{BRAND_NAME}}: Your OTP is {{OTP_CODE}}';
export const OTP_SMS_TEMPLATE_MAX_LENGTH = 160;

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
  accent_color: string | null;
  product_id: string | null;
  campaign_id: string | null;
  domain: string | null;
  is_default: boolean;
  auth_method: AuthMethod;
  kliento_auth_type: KlientoAuthType | null;
  kliento_otp_sms_template: string | null;
  default_phone_country_iso: string | null;
  default_phone_country_code: string | null;
  subscription_redirect_url: string | null;
  default_trailer_url: string | null;
  typewriter_phrase_1: string | null;
  typewriter_phrase_2: string | null;
  extra_metadata: Record<string, any>;
  support_email: string;
  legal_email: string;
  privacy_email: string;
  company_name: string;
  company_address: string;
  phone_number: string;
  registration_number: string;
  discord_url: string | null;
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
  accent_color?: string | null;
  product_id?: string | null;
  campaign_id?: string | null;
  domain?: string | null;
  is_default?: boolean;
  auth_method?: AuthMethod;
  kliento_auth_type?: KlientoAuthType | null;
  kliento_otp_sms_template?: string | null;
  default_phone_country_iso?: string | null;
  default_phone_country_code?: string | null;
  subscription_redirect_url?: string | null;
  default_trailer_url?: string | null;
  typewriter_phrase_1?: string | null;
  typewriter_phrase_2?: string | null;
  extra_metadata?: Record<string, any>;
  support_email: string;
  legal_email: string;
  privacy_email: string;
  company_name: string;
  company_address: string;
  phone_number: string;
  registration_number: string;
  discord_url?: string | null;
}

export interface UpdateProjectConfigData extends Partial<CreateProjectConfigData> {
  id: string;
}

export const validateHexColor = (color: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

export const getColorDistance = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return Infinity;

  const rDiff = rgb1.r - rgb2.r;
  const gDiff = rgb1.g - rgb2.g;
  const bDiff = rgb1.b - rgb2.b;

  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
};

export const areColorsSimilar = (color1: string, color2: string, threshold: number = 50): boolean => {
  return getColorDistance(color1, color2) < threshold;
};

export const validateConfigId = (configId: string): boolean => {
  return /^[a-z0-9-]{3,50}$/.test(configId);
};

export const validateEmail = (email: string): boolean => {
  return /^[^@]+@[^@]+\.[^@]+$/.test(email);
};

export const validateLegalFields = (data: CreateProjectConfigData | UpdateProjectConfigData): { valid: boolean; error?: string } => {
  const legalFields = [
    { key: 'support_email', label: 'Support Email', isEmail: true },
    { key: 'legal_email', label: 'Legal Email', isEmail: true },
    { key: 'privacy_email', label: 'Privacy Email', isEmail: true },
    { key: 'company_name', label: 'Company Name', isEmail: false },
    { key: 'company_address', label: 'Company Address', isEmail: false },
    { key: 'phone_number', label: 'Phone Number', isEmail: false },
    { key: 'registration_number', label: 'Registration Number', isEmail: false },
  ];

  for (const field of legalFields) {
    const value = (data as any)[field.key];

    if (value === undefined) continue;

    if (!value || value.trim() === '') {
      return { valid: false, error: `${field.label} is required` };
    }

    if (field.isEmail && !validateEmail(value)) {
      return { valid: false, error: `${field.label} must be a valid email address` };
    }
  }

  return { valid: true };
};

export type LegalVariablePlaceholders = {
  SUPPORT_EMAIL: string;
  LEGAL_EMAIL: string;
  PRIVACY_EMAIL: string;
  COMPANY_NAME: string;
  COMPANY_ADDRESS: string;
  PHONE_NUMBER: string;
  REGISTRATION_NUMBER: string;
  DISCORD_URL: string;
};

export const validateDiscordUrl = (url: string): boolean => {
  if (!url || !url.trim()) return true;
  return /^https:\/\/discord\.gg\/[a-zA-Z0-9]+$/.test(url.trim());
};

export const validateOtpSmsTemplate = (template: string): { valid: boolean; error?: string } => {
  if (!template || !template.trim()) {
    return { valid: false, error: 'SMS template is required' };
  }
  if (!template.includes('{{OTP_CODE}}')) {
    return { valid: false, error: 'SMS template must contain {{OTP_CODE}} placeholder' };
  }
  return { valid: true };
};

export const replaceLegalVariables = (text: string, config: ProjectConfiguration | CreateProjectConfigData): string => {
  const placeholders: LegalVariablePlaceholders = {
    SUPPORT_EMAIL: config.support_email || '[SUPPORT EMAIL]',
    LEGAL_EMAIL: config.legal_email || '[LEGAL EMAIL]',
    PRIVACY_EMAIL: config.privacy_email || '[PRIVACY EMAIL]',
    COMPANY_NAME: config.company_name || '[COMPANY NAME]',
    COMPANY_ADDRESS: config.company_address || '[COMPANY ADDRESS]',
    PHONE_NUMBER: config.phone_number || '[PHONE NUMBER]',
    REGISTRATION_NUMBER: config.registration_number || '[REGISTRATION NUMBER]',
    DISCORD_URL: config.discord_url || '[DISCORD URL]',
  };

  let result = text;
  Object.entries(placeholders).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  return result;
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

export const validateAuthMethod = (authMethod: string | undefined): authMethod is AuthMethod => {
  if (!authMethod) return true;
  return AUTH_METHODS.includes(authMethod as AuthMethod);
};

export const validateKlientoAuthType = (klientoAuthType: string | undefined | null): klientoAuthType is KlientoAuthType => {
  if (!klientoAuthType) return true;
  return KLIENTO_AUTH_TYPES.includes(klientoAuthType as KlientoAuthType);
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

    if (configData.accent_color && !validateHexColor(configData.accent_color)) {
      throw new Error('Invalid accent_color format. Use #RRGGBB format');
    }

    if (configData.auth_method && !validateAuthMethod(configData.auth_method)) {
      throw new Error('Invalid auth_method. Must be one of: email, discord, kliento');
    }

    if (configData.auth_method === 'kliento' && !configData.product_id?.trim()) {
      throw new Error('Kliento authentication requires a Product ID');
    }

    if (configData.kliento_auth_type && !validateKlientoAuthType(configData.kliento_auth_type)) {
      throw new Error('Invalid kliento_auth_type. Must be one of: password, otp');
    }

    if (configData.auth_method === 'kliento' && configData.kliento_auth_type === 'otp') {
      const template = configData.kliento_otp_sms_template || DEFAULT_OTP_SMS_TEMPLATE;
      const templateValidation = validateOtpSmsTemplate(template);
      if (!templateValidation.valid) {
        throw new Error(templateValidation.error);
      }
      if (!configData.default_phone_country_iso?.trim()) {
        throw new Error('Default phone country (ISO code) is required for Kliento OTP authentication');
      }
    }

    const legalValidation = validateLegalFields(configData);
    if (!legalValidation.valid) {
      throw new Error(legalValidation.error);
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

    const isKlientoOtp = configData.auth_method === 'kliento' && configData.kliento_auth_type === 'otp';

    const { data, error } = await supabase
      .from('project_configurations')
      .insert([{
        ...configData,
        extra_metadata: configData.extra_metadata || {},
        domain: configData.domain || null,
        is_default: configData.is_default || false,
        auth_method: configData.auth_method || 'email',
        kliento_auth_type: configData.auth_method === 'kliento' ? (configData.kliento_auth_type || 'password') : null,
        kliento_otp_sms_template: isKlientoOtp ? (configData.kliento_otp_sms_template || DEFAULT_OTP_SMS_TEMPLATE) : null,
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

    if (configData.accent_color && !validateHexColor(configData.accent_color)) {
      throw new Error('Invalid accent_color format. Use #RRGGBB format');
    }

    if (configData.auth_method && !validateAuthMethod(configData.auth_method)) {
      throw new Error('Invalid auth_method. Must be one of: email, discord, kliento');
    }

    if (configData.auth_method === 'kliento' && !configData.product_id?.trim()) {
      throw new Error('Kliento authentication requires a Product ID');
    }

    if (configData.kliento_auth_type && !validateKlientoAuthType(configData.kliento_auth_type)) {
      throw new Error('Invalid kliento_auth_type. Must be one of: password, otp');
    }

    if (configData.auth_method === 'kliento' && configData.kliento_auth_type === 'otp') {
      const template = configData.kliento_otp_sms_template || DEFAULT_OTP_SMS_TEMPLATE;
      const templateValidation = validateOtpSmsTemplate(template);
      if (!templateValidation.valid) {
        throw new Error(templateValidation.error);
      }
      if (!configData.default_phone_country_iso?.trim()) {
        throw new Error('Default phone country (ISO code) is required for Kliento OTP authentication');
      }
    }

    const legalValidation = validateLegalFields(configData);
    if (!legalValidation.valid) {
      throw new Error(legalValidation.error);
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
    const isKlientoOtp = configData.auth_method === 'kliento' && configData.kliento_auth_type === 'otp';
    if (!isKlientoOtp && updateData.kliento_otp_sms_template !== undefined) {
      updateData.kliento_otp_sms_template = null;
    }

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

export const duplicateProjectConfiguration = async (
  sourceConfig: ProjectConfiguration,
  newConfigId: string
): Promise<{ data: ProjectConfiguration | null; error: Error | null }> => {
  try {
    if (!validateConfigId(newConfigId)) {
      throw new Error('Invalid config_id format. Use lowercase alphanumeric with hyphens (3-50 chars)');
    }

    const existingConfig = await fetchProjectConfigurationByConfigId(newConfigId);
    if (existingConfig.data) {
      throw new Error(`Configuration with config_id "${newConfigId}" already exists`);
    }

    const duplicateData: CreateProjectConfigData = {
      config_id: newConfigId,
      config_name: `${sourceConfig.config_name} (Copy)`,
      brand_name: sourceConfig.brand_name,
      logo_path: sourceConfig.logo_path,
      favicon_path: sourceConfig.favicon_path,
      logo_alt_text: sourceConfig.logo_alt_text,
      primary_color: sourceConfig.primary_color,
      secondary_color: sourceConfig.secondary_color,
      accent_color: sourceConfig.accent_color,
      product_id: sourceConfig.product_id,
      campaign_id: sourceConfig.campaign_id,
      subscription_redirect_url: sourceConfig.subscription_redirect_url,
      default_trailer_url: sourceConfig.default_trailer_url,
      typewriter_phrase_1: sourceConfig.typewriter_phrase_1,
      typewriter_phrase_2: sourceConfig.typewriter_phrase_2,
      domain: null,
      is_default: false,
      is_active: false,
      auth_method: sourceConfig.auth_method || 'email',
      kliento_auth_type: sourceConfig.kliento_auth_type,
      kliento_otp_sms_template: sourceConfig.kliento_otp_sms_template,
      default_phone_country_iso: sourceConfig.default_phone_country_iso,
      default_phone_country_code: sourceConfig.default_phone_country_code,
      extra_metadata: sourceConfig.extra_metadata || {},
      support_email: sourceConfig.support_email,
      legal_email: sourceConfig.legal_email,
      privacy_email: sourceConfig.privacy_email,
      company_name: sourceConfig.company_name,
      company_address: sourceConfig.company_address,
      phone_number: sourceConfig.phone_number,
      registration_number: sourceConfig.registration_number,
      discord_url: sourceConfig.discord_url,
    };

    const { data, error } = await supabase
      .from('project_configurations')
      .insert([duplicateData])
      .select()
      .single();

    if (error) throw error;

    return { data: data as ProjectConfiguration, error: null };
  } catch (error) {
    console.error('Error duplicating project configuration:', error);
    return { data: null, error: error as Error };
  }
};
