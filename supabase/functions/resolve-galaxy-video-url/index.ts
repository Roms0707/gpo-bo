import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function extractBestDeliveryUrl(content: Record<string, unknown>): string {
  const deliveries = content.deliveries as Record<string, unknown> | undefined;
  if (!deliveries) {
    console.log("[DELIVERY] No 'deliveries' key found in content. Keys:", Object.keys(content));
    return "";
  }

  const isHlsUrl = (url: string): boolean =>
    url.toLowerCase().includes(".m3u8") ||
    url.toLowerCase().includes("manifest");

  const isDirectVideoUrl = (url: string): boolean =>
    [".mp4", ".webm", ".ogg", ".mov"].some((ext) =>
      url.toLowerCase().includes(ext)
    );

  const candidates: Array<{ url: string; priority: number; source: string }> = [];

  const mainDelivery = deliveries.mainDelivery as
    | { url?: string }
    | undefined;
  if (mainDelivery?.url) {
    let priority = 2;
    if (isHlsUrl(mainDelivery.url)) priority = 0;
    else if (isDirectVideoUrl(mainDelivery.url)) priority = 1;
    candidates.push({ url: mainDelivery.url, priority, source: "mainDelivery" });
  }

  const stream = deliveries.stream as
    | Record<string, Array<{ url?: string }>>
    | undefined;
  if (stream) {
    const qualityOrder = ["VHD (1080p)", "HD (720p)", "SD (480p)"];
    for (const quality of qualityOrder) {
      const streams = stream[quality];
      if (Array.isArray(streams)) {
        for (const s of streams) {
          if (s?.url) {
            let priority = 3;
            if (isHlsUrl(s.url)) priority = 0;
            else if (isDirectVideoUrl(s.url)) priority = 1;
            candidates.push({ url: s.url, priority, source: `stream[${quality}]` });
          }
        }
      }
    }
  }

  const additional = deliveries.additionalDeliveries as
    | Array<{ url?: string }>
    | undefined;
  if (Array.isArray(additional)) {
    for (const d of additional) {
      if (d?.url) {
        let priority = 4;
        if (isHlsUrl(d.url)) priority = 0;
        else if (isDirectVideoUrl(d.url)) priority = 1;
        candidates.push({ url: d.url, priority, source: "additionalDeliveries" });
      }
    }
  }

  console.log("[DELIVERY] Candidates found:", candidates.length);
  if (candidates.length > 0) {
    candidates.sort((a, b) => a.priority - b.priority);
    console.log("[DELIVERY] Best candidate:", { source: candidates[0].source, priority: candidates[0].priority, url: candidates[0].url.substring(0, 120) });
  } else {
    console.log("[DELIVERY] Delivery keys present:", Object.keys(deliveries));
    console.log("[DELIVERY] mainDelivery:", JSON.stringify(deliveries.mainDelivery)?.substring(0, 200));
    console.log("[DELIVERY] stream keys:", deliveries.stream ? Object.keys(deliveries.stream as Record<string, unknown>) : "none");
    console.log("[DELIVERY] additionalDeliveries count:", Array.isArray(deliveries.additionalDeliveries) ? (deliveries.additionalDeliveries as unknown[]).length : "not an array");
  }

  if (candidates.length === 0) return "";
  return candidates[0].url;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.log("[RESOLVE-VIDEO] Function invoked, method:", req.method);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    console.log("[AUTH] Authorization header present:", !!authHeader, "length:", authHeader?.length ?? 0);

    if (!authHeader) {
      console.log("[AUTH] EXIT: Missing Authorization header");
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

    console.log("[AUTH] getUser result - user:", user?.id ?? "null", "error:", authError?.message ?? "none");

    if (authError || !user) {
      console.log("[AUTH] EXIT: Unauthorized -", authError?.message ?? "user is null");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { config_id, rubric_id, content_id } = await req.json();
    console.log("[INPUT] config_id:", config_id, "rubric_id:", rubric_id, "content_id:", content_id);

    if (!config_id || !rubric_id || !content_id) {
      console.log("[INPUT] EXIT: Missing params - config_id:", !!config_id, "rubric_id:", !!rubric_id, "content_id:", !!content_id);
      return new Response(
        JSON.stringify({
          error: "config_id, rubric_id, and content_id are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: projectConfig, error: configError } = await supabase
      .from("project_configurations")
      .select(
        "id, config_id, campaign_id, country_code, language_code, service_id"
      )
      .eq("config_id", config_id)
      .eq("is_active", true)
      .maybeSingle();

    console.log("[CONFIG] Query for config_id:", config_id, "- found:", !!projectConfig, "error:", configError?.message ?? "none");
    if (projectConfig) {
      console.log("[CONFIG] Project config details - id:", projectConfig.id, "campaign_id:", projectConfig.campaign_id, "country_code:", projectConfig.country_code, "language_code:", projectConfig.language_code, "service_id:", projectConfig.service_id);
    }

    if (configError || !projectConfig) {
      console.log("[CONFIG] EXIT 404: No active project config for config_id:", config_id, "- error:", configError?.message ?? "no matching row");
      return new Response(
        JSON.stringify({
          error:
            configError?.message ||
            `No active project configuration found for config_id: ${config_id}`,
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

    console.log("[GALAXY-CONFIG] Galaxy API found:", !!galaxyApi, "api_url:", galaxyApi?.api_url ?? "null", "error:", apiError?.message ?? "none");

    if (apiError || !galaxyApi) {
      console.log("[GALAXY-CONFIG] EXIT 500: Galaxy API not found -", apiError?.message ?? "no matching row");
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
      console.log("[GALAXY-CONFIG] Credentials parsed, keys present:", Object.keys(galaxyCreds).filter(k => !k.includes("secret") && !k.includes("key")));
    } catch {
      console.log("[GALAXY-CONFIG] EXIT 500: Failed to parse api_key JSON");
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

    console.log("[GALAXY-PARAMS] baseUrl:", baseUrl, "campaignId:", campaignId, "countryCode:", countryCode, "languageCode:", languageCode, "apiKey present:", !!apiKey, "apiSecretKey present:", !!apiSecretKey);

    if (!campaignId || !apiKey || !apiSecretKey || !baseUrl) {
      console.log("[GALAXY-PARAMS] EXIT 500: Incomplete config - baseUrl:", !!baseUrl, "apiKey:", !!apiKey, "apiSecretKey:", !!apiSecretKey, "campaignId:", !!campaignId);
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
    params.set("delivery", "true");
    params.set("rubric_id", rubric_id);
    params.set("content_id", content_id);

    if (projectConfig.service_id) {
      params.set("service_id", projectConfig.service_id);
    }

    const galaxyUrl = `${baseUrl}/publishing-content-detail?${params.toString()}`;
    const redactedUrl = galaxyUrl.replace(/api_key=[^&]+/, "api_key=[REDACTED]").replace(/api_secret_key=[^&]+/, "api_secret_key=[REDACTED]");
    console.log("[GALAXY-FETCH] Calling:", redactedUrl);

    const galaxyResponse = await fetch(galaxyUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    console.log("[GALAXY-FETCH] Response status:", galaxyResponse.status, "ok:", galaxyResponse.ok);

    if (!galaxyResponse.ok) {
      const errorText = await galaxyResponse.text();
      console.log("[GALAXY-FETCH] EXIT 502: Galaxy API error - status:", galaxyResponse.status, "body:", errorText.substring(0, 500));
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
    console.log("[GALAXY-RAW-RESPONSE] Full API answer:", JSON.stringify(galaxyData, null, 2).substring(0, 5000));
    console.log("[GALAXY-DATA] Response code:", galaxyData.code, "message:", galaxyData.message, "has data:", !!galaxyData.data);

    if (galaxyData.code !== 200) {
      console.log("[GALAXY-DATA] EXIT 502: Galaxy returned non-200 code:", galaxyData.code, "message:", galaxyData.message);
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

    const responseData = galaxyData.data;
    if (!responseData) {
      console.log("[GALAXY-DATA] EXIT 404: galaxyData.data is null/undefined. Full response keys:", Object.keys(galaxyData));
      return new Response(
        JSON.stringify({ error: "Content not found in Galaxy" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const items = responseData.data;
    const contentData = Array.isArray(items) && items.length > 0 ? items[0] : null;

    if (!contentData) {
      console.log("[GALAXY-DATA] EXIT 404: No content items in response. Response data keys:", Object.keys(responseData), "items:", items);
      return new Response(
        JSON.stringify({ error: "Content not found in Galaxy" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[GALAXY-DATA] Content data keys:", Object.keys(contentData));

    const deliveryUrl = extractBestDeliveryUrl(contentData);

    if (!deliveryUrl) {
      console.log("[RESOLVE-VIDEO] EXIT 404: No delivery URL extracted from content");
      return new Response(
        JSON.stringify({ error: "No delivery URL available for this content" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[RESOLVE-VIDEO] SUCCESS: Returning delivery URL for content_id:", content_id, "url:", deliveryUrl.substring(0, 120));

    return new Response(
      JSON.stringify({
        content_id,
        delivery_url: deliveryUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.log("[RESOLVE-VIDEO] UNCAUGHT ERROR:", error instanceof Error ? error.stack : String(error));
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
