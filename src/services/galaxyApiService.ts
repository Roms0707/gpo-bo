import { GalaxyRubric } from '../types/galaxyRubricMapping';
import { getGalaxyApiCredentials } from './platformApiService';
import { logGalaxyApiCall } from './galaxyApiLoggingService';

const GALAXY_API_BASE_URL = 'https://galaxy-api.galaxydve.com';

interface CachedRubrics {
  campaignId: string;
  rubrics: GalaxyRubric[];
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000;
let rubricCache: CachedRubrics | null = null;

export const fetchCampaignRubrics = async (
  campaignId: string,
  projectConfigId?: string
): Promise<{ data: GalaxyRubric[] | null; error: Error | null }> => {
  const startTime = Date.now();

  try {
    if (!campaignId || campaignId.trim() === '') {
      throw new Error('Campaign ID is required to fetch rubrics');
    }

    if (
      rubricCache &&
      rubricCache.campaignId === campaignId &&
      Date.now() - rubricCache.timestamp < CACHE_DURATION
    ) {
      console.log('[Galaxy API] Using cached rubrics for campaign:', campaignId);
      return { data: rubricCache.rubrics, error: null };
    }

    const credentials = await getGalaxyApiCredentials();

    // Step 1: Fetch rubric by label to get the rubric_id
    const labelUrl = new URL(`${GALAXY_API_BASE_URL}/publishing-rubric-list`);
    labelUrl.searchParams.append('api_key', credentials.api_key);
    labelUrl.searchParams.append('api_secret_key', credentials.api_secret_key);
    labelUrl.searchParams.append('campaign_id', campaignId);
    labelUrl.searchParams.append('rubric_label', 'Tips & Tricks');

    if (credentials.country_code) {
      labelUrl.searchParams.append('country_code', credentials.country_code);
    }

    if (credentials.language_code) {
      labelUrl.searchParams.append('language_code', credentials.language_code);
    }

    console.log('[Galaxy API] Step 1: Fetching rubric by label to get rubric_id');

    const labelResponse = await fetch(labelUrl.toString(), {
      method: 'GET',
    });

    if (!labelResponse.ok) {
      throw new Error(`Failed to fetch rubric by label: ${labelResponse.status} ${labelResponse.statusText}`);
    }

    const labelResponseText = await labelResponse.text();
    let labelData;
    try {
      labelData = JSON.parse(labelResponseText);
    } catch (e) {
      throw new Error('Invalid JSON response when fetching rubric by label');
    }

    // Extract rubric_id from the response
    let rubricId: string | null = null;
    if (Array.isArray(labelData.data?.data) && labelData.data.data.length > 0) {
      rubricId = labelData.data.data[0].rubric_id || labelData.data.data[0].id;
    } else if (Array.isArray(labelData.data) && labelData.data.length > 0) {
      rubricId = labelData.data[0].rubric_id || labelData.data[0].id;
    }

    if (!rubricId) {
      throw new Error('Could not find rubric_id for "Tips & Tricks" label');
    }

    console.log('[Galaxy API] Step 2: Fetching rubrics with rubric_id:', rubricId);

    // Step 2: Fetch rubrics using the rubric_id
    const url = new URL(`${GALAXY_API_BASE_URL}/publishing-rubric-list`);
    url.searchParams.append('api_key', credentials.api_key);
    url.searchParams.append('api_secret_key', credentials.api_secret_key);
    url.searchParams.append('campaign_id', campaignId);
    url.searchParams.append('rubric_id', rubricId);

    if (credentials.country_code) {
      url.searchParams.append('country_code', credentials.country_code);
    }

    if (credentials.language_code) {
      url.searchParams.append('language_code', credentials.language_code);
    }

    console.log('[Galaxy API] Fetching rubrics for campaign:', campaignId);

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    const responseText = await response.text();
    const duration = Date.now() - startTime;

    if (!response.ok) {
      let errorMessage = `Galaxy API error: ${response.status} ${response.statusText}`;

      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message || errorData.error) {
          errorMessage += ` - ${errorData.message || errorData.error}`;
        }
      } catch (e) {
        if (responseText) {
          errorMessage += ` - ${responseText.substring(0, 200)}`;
        }
      }

      console.error('[Galaxy API] Error Details:', {
        status: response.status,
        statusText: response.statusText,
        url: url.toString().replace(/api_key=([^&]+)/, 'api_key=***').replace(/api_secret_key=([^&]+)/, 'api_secret_key=***'),
        response: responseText.substring(0, 500),
      });

      await logGalaxyApiCall({
        endpoint: '/publishing-rubric-list',
        method: 'GET',
        request_params: {
          campaign_id: campaignId,
          country_code: credentials.country_code,
          language_code: credentials.language_code,
        },
        response_status: response.status,
        response_body: responseText.substring(0, 5000),
        error_message: errorMessage,
        duration_ms: duration,
        campaign_id: campaignId,
        project_config_id: projectConfigId,
        success: false,
      });

      if (response.status === 404) {
        throw new Error(`Campaign "${campaignId}" not found in Galaxy API`);
      } else if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please check Galaxy API credentials in platform_api_integrations table');
      } else {
        throw new Error(errorMessage);
      }
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('[Galaxy API] Failed to parse response:', responseText.substring(0, 500));

      await logGalaxyApiCall({
        endpoint: '/publishing-rubric-list',
        method: 'GET',
        request_params: {
          campaign_id: campaignId,
          country_code: credentials.country_code,
          language_code: credentials.language_code,
        },
        response_status: response.status,
        response_body: responseText.substring(0, 5000),
        error_message: 'Invalid JSON response from Galaxy API',
        duration_ms: duration,
        campaign_id: campaignId,
        project_config_id: projectConfigId,
        success: false,
      });

      throw new Error('Invalid JSON response from Galaxy API');
    }

    console.log('[Galaxy API] Raw response data:', JSON.stringify(responseData, null, 2));

    if (responseData.error !== 0 && responseData.code !== 200) {
      const errorMsg = responseData.message || 'Failed to fetch rubrics from Galaxy API';

      await logGalaxyApiCall({
        endpoint: '/publishing-rubric-list',
        method: 'GET',
        request_params: {
          campaign_id: campaignId,
          country_code: credentials.country_code,
          language_code: credentials.language_code,
        },
        response_status: response.status,
        response_body: responseData,
        error_message: errorMsg,
        duration_ms: duration,
        campaign_id: campaignId,
        project_config_id: projectConfigId,
        success: false,
      });

      throw new Error(errorMsg);
    }

    console.log('[Galaxy API] Response structure:', {
      hasData: !!responseData.data,
      dataType: typeof responseData.data,
      dataKeys: responseData.data ? Object.keys(responseData.data) : [],
      hasNestedData: responseData.data?.data !== undefined,
      nestedDataType: typeof responseData.data?.data,
      isArray: Array.isArray(responseData.data?.data),
      firstItem: responseData.data?.data?.[0],
    });

    let rubrics: GalaxyRubric[] = [];

    if (Array.isArray(responseData.data?.data)) {
      rubrics = responseData.data.data;
    } else if (Array.isArray(responseData.data)) {
      rubrics = responseData.data;
    } else if (responseData.rubrics && Array.isArray(responseData.rubrics)) {
      rubrics = responseData.rubrics;
    } else {
      console.warn('[Galaxy API] Unexpected response structure, rubrics array not found');
      rubrics = [];
    }

    rubrics = rubrics.map((apiRubric: any) => ({
      id: String(apiRubric.rubric_id || apiRubric.id || ''),
      name: apiRubric.rubric_label || apiRubric.name || '',
      description: apiRubric.description || apiRubric.rubric_description || '',
    }));

    console.log('[Galaxy API] Extracted rubrics:', rubrics.length, rubrics.slice(0, 3));

    await logGalaxyApiCall({
      endpoint: '/publishing-rubric-list',
      method: 'GET',
      request_params: {
        campaign_id: campaignId,
        country_code: credentials.country_code,
        language_code: credentials.language_code,
      },
      response_status: response.status,
      response_body: {
        rubric_count: rubrics.length,
        sample: rubrics.slice(0, 2),
      },
      duration_ms: duration,
      campaign_id: campaignId,
      project_config_id: projectConfigId,
      success: true,
    });

    rubricCache = {
      campaignId,
      rubrics,
      timestamp: Date.now(),
    };

    return { data: rubrics, error: null };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Galaxy API] Error fetching campaign rubrics:', error);

    await logGalaxyApiCall({
      endpoint: '/publishing-rubric-list',
      method: 'GET',
      request_params: {
        campaign_id: campaignId,
      },
      error_message: error instanceof Error ? error.message : String(error),
      duration_ms: duration,
      campaign_id: campaignId,
      project_config_id: projectConfigId,
      success: false,
    });

    return { data: null, error: error as Error };
  }
};

export const clearRubricCache = (): void => {
  rubricCache = null;
};

export const validateGalaxyApiConnection = async (
  campaignId: string
): Promise<{ valid: boolean; error: Error | null }> => {
  try {
    const result = await fetchCampaignRubrics(campaignId);

    if (result.error) {
      return { valid: false, error: result.error };
    }

    return { valid: true, error: null };
  } catch (error) {
    console.error('Error validating Galaxy API connection:', error);
    return { valid: false, error: error as Error };
  }
};
