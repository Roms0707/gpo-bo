import { supabase } from '../lib/supabase';

export interface GalaxyApiCredentials {
  api_key: string;
  api_secret_key: string;
  campaign_id?: string;
  service_id?: string;
  country_code?: string;
  language_code?: string;
}

interface PlatformApiIntegration {
  id: string;
  api_name: string;
  api_url: string | null;
  api_key: string;
  is_active: boolean;
}

let galaxyCredentialsCache: GalaxyApiCredentials | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export async function getGalaxyApiCredentials(): Promise<GalaxyApiCredentials> {
  const now = Date.now();

  if (galaxyCredentialsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return galaxyCredentialsCache;
  }

  try {
    const { data, error } = await supabase
      .from('platform_api_integrations')
      .select('api_name, api_key, is_active')
      .eq('api_name', 'Galaxy API')
      .eq('is_active', true)
      .single();

    if (error) {
      throw new Error('Failed to fetch Galaxy API credentials from database');
    }

    if (!data) {
      throw new Error('Galaxy API credentials not found in database');
    }

    let credentials: GalaxyApiCredentials;

    try {
      credentials = JSON.parse(data.api_key);
    } catch (parseError) {
      throw new Error('Invalid Galaxy API credentials format in database');
    }

    if (!credentials.api_key || !credentials.api_secret_key) {
      throw new Error('Galaxy API credentials are incomplete (missing api_key or api_secret_key)');
    }

    galaxyCredentialsCache = credentials;
    cacheTimestamp = now;

    return credentials;
  } catch (error) {
    console.error('Error fetching Galaxy API credentials:', error);
    throw error;
  }
}

export function clearGalaxyCredentialsCache(): void {
  galaxyCredentialsCache = null;
  cacheTimestamp = 0;
}
