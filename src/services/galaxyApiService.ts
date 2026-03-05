import { GalaxyRubric, RubricPageResult } from '../types/galaxyRubricMapping';
import { getGalaxyApiCredentials } from './platformApiService';
import { logGalaxyApiCall } from './galaxyApiLoggingService';

const GALAXY_API_BASE_URL = 'https://galaxy-api.galaxydve.com';
const ITEMS_PER_PAGE = 50;

export interface RubricFetchParams {
  campaignId: string;
  countryCode?: string | null;
  languageCode?: string | null;
  projectConfigId?: string;
  parentRubricId?: string | null;
  search?: string;
  page?: number;
}

interface CachedRubrics {
  result: RubricPageResult;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000;
const rubricCacheMap = new Map<string, CachedRubrics>();

function buildCacheKey(params: RubricFetchParams): string {
  return [
    params.campaignId,
    params.countryCode || '',
    params.languageCode || '',
    params.parentRubricId || '',
    params.search || '',
    String(params.page || 1),
  ].join(':');
}

export const fetchCampaignRubrics = async (
  params: RubricFetchParams
): Promise<{ data: RubricPageResult | null; error: Error | null }> => {
  const startTime = Date.now();
  const { campaignId, countryCode, languageCode, projectConfigId, parentRubricId, search, page = 1 } = params;

  try {
    if (!campaignId || campaignId.trim() === '') {
      throw new Error('Campaign ID is required to fetch rubrics');
    }

    const cacheKey = buildCacheKey(params);
    const cached = rubricCacheMap.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return { data: cached.result, error: null };
    }

    const credentials = await getGalaxyApiCredentials();

    const url = new URL(`${GALAXY_API_BASE_URL}/publishing-rubric-list`);
    url.searchParams.append('api_key', credentials.api_key);
    url.searchParams.append('api_secret_key', credentials.api_secret_key);
    url.searchParams.append('campaign_id', campaignId);
    url.searchParams.append('empty_rubric', 'true');
    url.searchParams.append('asset', 'true');
    url.searchParams.append('itemsPerPage', String(ITEMS_PER_PAGE));
    url.searchParams.append('page', String(page));

    if (countryCode) {
      url.searchParams.append('country_code', countryCode);
    }

    if (languageCode) {
      url.searchParams.append('language_code', languageCode);
    }

    if (parentRubricId) {
      url.searchParams.append('parent_rubric_id', parentRubricId);
    }

    if (search && search.trim()) {
      url.searchParams.append('rubric_label', search.trim());
    }

    const response = await fetch(url.toString(), { method: 'GET' });
    const responseText = await response.text();
    const duration = Date.now() - startTime;

    const logParams = {
      campaign_id: campaignId,
      country_code: countryCode || undefined,
      language_code: languageCode || undefined,
      empty_rubric: true,
      asset: true,
      page,
      itemsPerPage: ITEMS_PER_PAGE,
      parent_rubric_id: parentRubricId || undefined,
      rubric_label: search || undefined,
    };

    if (!response.ok) {
      let errorMessage = `Galaxy API error: ${response.status} ${response.statusText}`;

      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message || errorData.error) {
          errorMessage += ` - ${errorData.message || errorData.error}`;
        }
      } catch {
        if (responseText) {
          errorMessage += ` - ${responseText.substring(0, 200)}`;
        }
      }

      await logGalaxyApiCall({
        endpoint: '/publishing-rubric-list',
        method: 'GET',
        request_params: logParams,
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
    } catch {
      await logGalaxyApiCall({
        endpoint: '/publishing-rubric-list',
        method: 'GET',
        request_params: logParams,
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

    if (responseData.error !== 0 && responseData.code !== 200) {
      const errorMsg = responseData.message || 'Failed to fetch rubrics from Galaxy API';

      await logGalaxyApiCall({
        endpoint: '/publishing-rubric-list',
        method: 'GET',
        request_params: logParams,
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

    let rubrics: GalaxyRubric[] = [];

    if (Array.isArray(responseData.data?.data)) {
      rubrics = responseData.data.data;
    } else if (Array.isArray(responseData.data)) {
      rubrics = responseData.data;
    } else if (responseData.rubrics && Array.isArray(responseData.rubrics)) {
      rubrics = responseData.rubrics;
    }

    rubrics = rubrics.map((apiRubric: any) => ({
      id: String(apiRubric.rubric_id || apiRubric.id || ''),
      name: apiRubric.rubric_label || apiRubric.name || '',
      description: apiRubric.description || apiRubric.rubric_description || '',
      parent_rubric_id: apiRubric.parent_rubric_id ? String(apiRubric.parent_rubric_id) : null,
      has_children: Boolean(apiRubric.has_children || apiRubric.children_count > 0),
    }));

    const hasMore = rubrics.length >= ITEMS_PER_PAGE;

    await logGalaxyApiCall({
      endpoint: '/publishing-rubric-list',
      method: 'GET',
      request_params: logParams,
      response_status: response.status,
      response_body: {
        rubric_count: rubrics.length,
        page,
        hasMore,
        sample: rubrics.slice(0, 2),
      },
      duration_ms: duration,
      campaign_id: campaignId,
      project_config_id: projectConfigId,
      success: true,
    });

    const result: RubricPageResult = { rubrics, currentPage: page, hasMore };

    rubricCacheMap.set(cacheKey, { result, timestamp: Date.now() });

    if (rubricCacheMap.size > 100) {
      const oldest = [...rubricCacheMap.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, 20);
      for (const [key] of oldest) {
        rubricCacheMap.delete(key);
      }
    }

    return { data: result, error: null };
  } catch (error) {
    const duration = Date.now() - startTime;

    await logGalaxyApiCall({
      endpoint: '/publishing-rubric-list',
      method: 'GET',
      request_params: { campaign_id: campaignId },
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
  rubricCacheMap.clear();
};

export const validateGalaxyApiConnection = async (
  params: RubricFetchParams
): Promise<{ valid: boolean; error: Error | null }> => {
  try {
    const result = await fetchCampaignRubrics(params);

    if (result.error) {
      return { valid: false, error: result.error };
    }

    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error as Error };
  }
};
