import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ITEMS_PER_PAGE = 50;

function jsonResponse(
  body: Record<string, unknown>,
  status: number
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface GalaxyRubricRaw {
  rubric_id?: string | number;
  id?: string | number;
  rubric_label?: string;
  name?: string;
  description?: string;
  rubric_description?: string;
  parent_rubric_id?: string | number | null;
  has_children?: boolean;
  children_count?: number;
  assets?: {
    cover?: Array<{ url: string; ratio_tech_label?: string }>;
  };
}

interface MappingRow {
  rubric_id: string;
  rubric_name: string | null;
  scope: string;
  content_category: string;
  game_id: string | null;
  display_on_frontend: boolean;
}

function extractThumbnailUrl(rubric: GalaxyRubricRaw): string {
  if (!rubric.assets?.cover || rubric.assets.cover.length === 0) return "";
  const landscape = rubric.assets.cover.find(
    (c) => c.ratio_tech_label === "landscape-16-9"
  );
  return landscape?.url || rubric.assets.cover[0].url;
}

async function fetchAllGalaxyRubrics(
  baseUrl: string,
  params: URLSearchParams
): Promise<GalaxyRubricRaw[]> {
  const allRubrics: GalaxyRubricRaw[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    params.set("page", String(page));
    const url = `${baseUrl}/publishing-rubric-list?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Galaxy API error ${response.status}: ${errorText.substring(0, 200)}`
      );
    }

    const data = await response.json();

    if (data.code !== 200 && data.error !== 0) {
      throw new Error(
        `Galaxy API returned code ${data.code}: ${data.message || "Unknown error"}`
      );
    }

    let rubrics: GalaxyRubricRaw[] = [];
    if (Array.isArray(data.data?.data)) {
      rubrics = data.data.data;
    } else if (Array.isArray(data.data)) {
      rubrics = data.data;
    }

    allRubrics.push(...rubrics);
    hasMore = rubrics.length >= ITEMS_PER_PAGE;
    page++;
  }

  return allRubrics;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    let configId = url.searchParams.get("config_id");

    if (req.method === "POST") {
      const body = await req.json();
      configId = configId || body.config_id;
    }

    if (!configId) {
      return jsonResponse({ error: "config_id is required" }, 400);
    }

    const { data: projectConfig, error: configError } = await supabase
      .from("project_configurations")
      .select(
        "id, config_id, brand_name, campaign_id, country_code, language_code, service_id"
      )
      .eq("config_id", configId)
      .eq("is_active", true)
      .maybeSingle();

    if (configError || !projectConfig) {
      return jsonResponse(
        {
          error:
            configError?.message ||
            `No active project configuration found for config_id: ${configId}`,
        },
        404
      );
    }

    const { data: mappings, error: mappingsError } = await supabase
      .from("galaxy_rubric_mappings")
      .select(
        "rubric_id, rubric_name, scope, content_category, game_id, display_on_frontend"
      )
      .eq("project_config_id", projectConfig.id);

    if (mappingsError) {
      return jsonResponse(
        { error: `Failed to fetch rubric mappings: ${mappingsError.message}` },
        500
      );
    }

    if (!mappings || mappings.length === 0) {
      return jsonResponse(
        { config_id: configId, rubrics: [], total: 0 },
        200
      );
    }

    const { data: galaxyApi, error: apiError } = await supabase
      .from("platform_api_integrations")
      .select("api_key, api_url")
      .eq("api_name", "Galaxy API")
      .eq("is_active", true)
      .maybeSingle();

    if (apiError || !galaxyApi) {
      return jsonResponse(
        { error: apiError?.message || "Galaxy API configuration not found" },
        500
      );
    }

    let galaxyCreds: Record<string, string>;
    try {
      galaxyCreds = JSON.parse(galaxyApi.api_key);
    } catch {
      return jsonResponse(
        { error: "Invalid Galaxy API credentials format" },
        500
      );
    }

    const baseUrl = galaxyApi.api_url;
    const apiKey = galaxyCreds.api_key;
    const apiSecretKey = galaxyCreds.api_secret_key;
    const campaignId = projectConfig.campaign_id || galaxyCreds.campaign_id;
    const countryCode =
      projectConfig.country_code || galaxyCreds.country_code;
    const languageCode =
      projectConfig.language_code || galaxyCreds.language_code;

    if (!campaignId || !apiKey || !apiSecretKey || !baseUrl) {
      return jsonResponse(
        { error: "Incomplete Galaxy API or project configuration" },
        500
      );
    }

    const params = new URLSearchParams();
    params.set("api_key", apiKey);
    params.set("api_secret_key", apiSecretKey);
    params.set("campaign_id", campaignId);
    params.set("empty_rubric", "true");
    params.set("asset", "true");
    params.set("itemsPerPage", String(ITEMS_PER_PAGE));

    if (countryCode) params.set("country_code", countryCode);
    if (languageCode) params.set("language_code", languageCode);
    if (projectConfig.service_id)
      params.set("service_id", projectConfig.service_id);

    const galaxyRubrics = await fetchAllGalaxyRubrics(baseUrl, params);

    const mappingsByRubricId = new Map<string, MappingRow>();
    for (const m of mappings as MappingRow[]) {
      mappingsByRubricId.set(m.rubric_id, m);
    }

    const galaxyById = new Map<string, GalaxyRubricRaw>();
    for (const r of galaxyRubrics) {
      const rid = String(r.rubric_id || r.id || "");
      if (rid) galaxyById.set(rid, r);
    }

    const enrichedRubrics = [];
    for (const [rubricId, mapping] of mappingsByRubricId) {
      const galaxy = galaxyById.get(rubricId);
      enrichedRubrics.push({
        rubric_id: rubricId,
        name: galaxy
          ? galaxy.rubric_label || galaxy.name || mapping.rubric_name || ""
          : mapping.rubric_name || "",
        description: galaxy
          ? galaxy.description || galaxy.rubric_description || ""
          : "",
        thumbnail_url: galaxy ? extractThumbnailUrl(galaxy) : "",
        parent_rubric_id: galaxy?.parent_rubric_id
          ? String(galaxy.parent_rubric_id)
          : null,
        has_children: galaxy
          ? Boolean(
              galaxy.has_children ||
                (galaxy.children_count && galaxy.children_count > 0)
            )
          : false,
        scope: mapping.scope,
        content_category: mapping.content_category,
        game_id: mapping.game_id,
        display_on_frontend: mapping.display_on_frontend,
        found_in_galaxy: !!galaxy,
      });
    }

    return jsonResponse(
      {
        config_id: configId,
        rubrics: enrichedRubrics,
        total: enrichedRubrics.length,
      },
      200
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("Galaxy API error") ? 502 : 500;
    return jsonResponse({ error: message }, status);
  }
});
