import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function extractThumbnailUrl(
  content: Record<string, unknown>
): string {
  const assets = content.assets as
    | { cover?: Array<{ url: string; ratio_tech_label?: string }> }
    | undefined;
  if (!assets?.cover || assets.cover.length === 0) return "";

  const landscape = assets.cover.find(
    (c) => c.ratio_tech_label === "landscape-16-9"
  );
  return landscape?.url || assets.cover[0].url;
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
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    let configId = url.searchParams.get("config_id");
    let rubricId = url.searchParams.get("rubric_id");

    if (req.method === "POST") {
      const body = await req.json();
      configId = configId || body.config_id;
      rubricId = rubricId || body.rubric_id;
    }

    if (!configId || !rubricId) {
      return new Response(
        JSON.stringify({ error: "config_id and rubric_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
      return new Response(
        JSON.stringify({
          error:
            configError?.message ||
            `No active project configuration found for config_id: ${configId}`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: galaxyApi, error: apiError } = await supabase
      .from("platform_api_integrations")
      .select("api_key, api_url")
      .eq("api_name", "Galaxy API")
      .eq("is_active", true)
      .maybeSingle();

    if (apiError || !galaxyApi) {
      return new Response(
        JSON.stringify({
          error: apiError?.message || "Galaxy API configuration not found",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let galaxyCreds: Record<string, string>;
    try {
      galaxyCreds = JSON.parse(galaxyApi.api_key);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid Galaxy API credentials format" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const baseUrl = galaxyApi.api_url;
    const apiKey = galaxyCreds.api_key;
    const apiSecretKey = galaxyCreds.api_secret_key;
    const campaignId = projectConfig.campaign_id || galaxyCreds.campaign_id;
    const countryCode = projectConfig.country_code || galaxyCreds.country_code;
    const languageCode =
      projectConfig.language_code || galaxyCreds.language_code;

    if (!campaignId || !apiKey || !apiSecretKey || !baseUrl) {
      return new Response(
        JSON.stringify({
          error: "Incomplete Galaxy API or project configuration",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const params = new URLSearchParams();
    params.set("api_key", apiKey);
    params.set("api_secret_key", apiSecretKey);
    params.set("campaign_id", campaignId);
    params.set("country_code", countryCode);
    params.set("language_code", languageCode);
    params.set("asset", "true");
    params.set("rubric_id", rubricId);
    params.set("itemsPerPage", "50");

    if (projectConfig.service_id) {
      params.set("service_id", projectConfig.service_id);
    }

    const galaxyUrl = `${baseUrl}/publishing-content-list?${params.toString()}`;
    const galaxyResponse = await fetch(galaxyUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!galaxyResponse.ok) {
      const errorText = await galaxyResponse.text();
      return new Response(
        JSON.stringify({
          error: `Galaxy API error: ${galaxyResponse.status}`,
          details: errorText,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const galaxyData = await galaxyResponse.json();

    if (galaxyData.code !== 200) {
      return new Response(
        JSON.stringify({
          error: `Galaxy API returned code ${galaxyData.code}`,
          message: galaxyData.message,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const rawContents = galaxyData.data?.data || [];

    const contents = rawContents.map(
      (item: Record<string, unknown>) => ({
        content_id: String(item.content_id || ""),
        title: item.title || "",
        description: item.description || "",
        duration:
          item.duration ||
          (
            item.deliveries as
              | { mainDelivery?: { duration?: number } }
              | undefined
          )?.mainDelivery?.duration ||
          null,
        theme_label: item.theme_label || null,
        content_type: item.content_type_tech_label || item.content_type || null,
        thumbnail_url: extractThumbnailUrl(item),
      })
    );

    return new Response(
      JSON.stringify({
        config_id: projectConfig.config_id,
        rubric_id: rubricId,
        contents,
        total: contents.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
