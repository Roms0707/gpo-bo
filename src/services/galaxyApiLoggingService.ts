import { supabase } from '../lib/supabase';

export interface GalaxyApiLogEntry {
  id?: string;
  endpoint: string;
  method: string;
  request_params: Record<string, any>;
  response_status?: number;
  response_body?: any;
  response_headers?: Record<string, string>;
  error_message?: string;
  duration_ms?: number;
  campaign_id?: string;
  project_config_id?: string;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface GalaxyApiStats {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  avg_duration_ms: number;
  max_duration_ms: number;
  min_duration_ms: number;
  error_rate: number;
}

export interface GalaxyApiError {
  id: string;
  endpoint: string;
  error_message: string;
  response_status: number;
  campaign_id: string;
  log_created_at: string;
  duration_ms: number;
}

const maskSensitiveData = (params: Record<string, any>): Record<string, any> => {
  const masked = { ...params };
  const sensitiveKeys = ['api_key', 'api_secret_key', 'secret', 'password', 'token'];

  sensitiveKeys.forEach((key) => {
    if (masked[key]) {
      masked[key] = '***MASKED***';
    }
  });

  return masked;
};

export const logGalaxyApiCall = async (logEntry: GalaxyApiLogEntry): Promise<void> => {
  try {
    const maskedParams = maskSensitiveData(logEntry.request_params);

    const { error } = await supabase.from('galaxy_api_logs').insert({
      endpoint: logEntry.endpoint,
      method: logEntry.method,
      request_params: maskedParams,
      response_status: logEntry.response_status,
      response_body: logEntry.response_body,
      response_headers: logEntry.response_headers || {},
      error_message: logEntry.error_message,
      duration_ms: logEntry.duration_ms,
      campaign_id: logEntry.campaign_id,
      project_config_id: logEntry.project_config_id,
      success: logEntry.success,
      metadata: logEntry.metadata || {},
    });

    if (error) {
      console.error('Failed to log Galaxy API call:', error);
    }
  } catch (error) {
    console.error('Error logging Galaxy API call:', error);
  }
};

export const fetchGalaxyApiLogs = async (
  filters?: {
    campaignId?: string;
    projectConfigId?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<{ data: GalaxyApiLogEntry[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('galaxy_api_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.campaignId) {
      query = query.eq('campaign_id', filters.campaignId);
    }

    if (filters?.projectConfigId) {
      query = query.eq('project_config_id', filters.projectConfigId);
    }

    if (filters?.success !== undefined) {
      query = query.eq('success', filters.success);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching Galaxy API logs:', error);
    return { data: null, error: error as Error };
  }
};

export const getGalaxyApiStats = async (
  campaignId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ data: GalaxyApiStats | null; error: Error | null }> => {
  try {
    const params: any[] = [];

    if (campaignId) {
      params.push(campaignId);
    } else {
      params.push(null);
    }

    if (startDate) {
      params.push(startDate.toISOString());
    } else {
      params.push(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    }

    if (endDate) {
      params.push(endDate.toISOString());
    } else {
      params.push(new Date().toISOString());
    }

    const { data, error } = await supabase.rpc('get_galaxy_api_stats', {
      p_campaign_id: params[0],
      p_start_date: params[1],
      p_end_date: params[2],
    });

    if (error) throw error;

    return { data: data?.[0] || null, error: null };
  } catch (error) {
    console.error('Error fetching Galaxy API stats:', error);
    return { data: null, error: error as Error };
  }
};

export const getRecentGalaxyApiErrors = async (
  limit: number = 50,
  campaignId?: string
): Promise<{ data: GalaxyApiError[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.rpc('get_recent_galaxy_api_errors', {
      p_limit: limit,
      p_campaign_id: campaignId || null,
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching recent Galaxy API errors:', error);
    return { data: null, error: error as Error };
  }
};

export const cleanupOldLogs = async (
  retentionDays: number = 90
): Promise<{ deletedCount: number | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.rpc('cleanup_old_galaxy_api_logs', {
      retention_days: retentionDays,
    });

    if (error) throw error;

    return { deletedCount: data, error: null };
  } catch (error) {
    console.error('Error cleaning up old Galaxy API logs:', error);
    return { deletedCount: null, error: error as Error };
  }
};
