export type AuthMethod = 'email' | 'discord' | 'kliento';
export type KlientoAuthType = 'password' | 'otp';

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
  default_phone_country_iso: string | null;
  default_phone_country_code: string | null;
  country_code: string | null;
  language_code: string | null;
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
  accent_color?: string | null;
  product_id?: string | null;
  campaign_id?: string | null;
  domain?: string | null;
  is_default?: boolean;
  auth_method?: AuthMethod;
  kliento_auth_type?: KlientoAuthType | null;
  default_phone_country_iso?: string | null;
  default_phone_country_code?: string | null;
  country_code?: string | null;
  language_code?: string | null;
  extra_metadata?: Record<string, any>;
}

export interface UpdateProjectConfigData extends Partial<CreateProjectConfigData> {
  id: string;
}

export interface ProjectConfigContextValue {
  config: ProjectConfiguration | null;
  loading: boolean;
  error: Error | null;
  refreshConfig: () => Promise<void>;
}

export interface DomainValidationResult {
  valid: boolean;
  error?: string;
}
