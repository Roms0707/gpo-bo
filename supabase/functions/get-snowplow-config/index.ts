import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SnowplowConfigResponse {
  success: boolean;
  enabled: boolean;
  collector_url?: string;
  app_id?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[get-snowplow-config] Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ success: false, enabled: false, error: "Server configuration error" } as SnowplowConfigResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let configId: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      configId = url.searchParams.get("config_id");
    } else if (req.method === "POST") {
      const body = await req.json();
      configId = body.config_id ?? null;
    }

    if (!configId) {
      console.warn("[get-snowplow-config] Missing config_id parameter");
      return new Response(
        JSON.stringify({ success: false, enabled: false, error: "Missing config_id parameter" } as SnowplowConfigResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[get-snowplow-config] Fetching Snowplow config for config_id: ${configId}`);

    const { data: projectConfig, error: configError } = await supabase
      .from("project_configurations")
      .select("snowplow_enabled, snowplow_app_id")
      .eq("config_id", configId)
      .eq("is_active", true)
      .maybeSingle();

    if (configError) {
      console.error("[get-snowplow-config] Error fetching project config:", configError);
      return new Response(
        JSON.stringify({ success: false, enabled: false, error: "Failed to fetch project configuration" } as SnowplowConfigResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!projectConfig || !projectConfig.snowplow_enabled) {
      console.log(`[get-snowplow-config] Snowplow disabled for config_id: ${configId}`);
      return new Response(
        JSON.stringify({ success: true, enabled: false } as SnowplowConfigResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!projectConfig.snowplow_app_id) {
      console.warn(`[get-snowplow-config] Snowplow enabled but no app_id set for config_id: ${configId}`);
      return new Response(
        JSON.stringify({ success: true, enabled: false } as SnowplowConfigResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: snowplowIntegration, error: integrationError } = await supabase
      .from("platform_api_integrations")
      .select("api_url, is_active")
      .eq("api_name", "snowplow")
      .maybeSingle();

    if (integrationError) {
      console.error("[get-snowplow-config] Error fetching Snowplow integration:", integrationError);
      return new Response(
        JSON.stringify({ success: false, enabled: false, error: "Failed to fetch Snowplow integration" } as SnowplowConfigResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!snowplowIntegration || !snowplowIntegration.is_active) {
      console.warn("[get-snowplow-config] Snowplow integration not found or inactive");
      return new Response(
        JSON.stringify({ success: true, enabled: false } as SnowplowConfigResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!snowplowIntegration.api_url) {
      console.warn("[get-snowplow-config] Snowplow collector URL not configured");
      return new Response(
        JSON.stringify({ success: true, enabled: false } as SnowplowConfigResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[get-snowplow-config] Returning enabled config for config_id: ${configId}, app_id: ${projectConfig.snowplow_app_id}`);

    const response: SnowplowConfigResponse = {
      success: true,
      enabled: true,
      collector_url: snowplowIntegration.api_url,
      app_id: projectConfig.snowplow_app_id,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[get-snowplow-config] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        enabled: false,
        error: (error as Error).message || "An unexpected error occurred",
      } as SnowplowConfigResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
