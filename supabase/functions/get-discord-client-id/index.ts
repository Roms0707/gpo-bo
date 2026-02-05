import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: apiConfig, error: configError } = await supabaseAdmin
      .from("platform_api_integrations")
      .select("api_key")
      .eq("api_name", "Discord API")
      .maybeSingle();

    if (configError || !apiConfig) {
      console.error("[get-discord-client-id] Error fetching Discord API config:", configError);
      return new Response(
        JSON.stringify({ success: false, error: "Discord API configuration not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let discordCredentials: { client_id: string };
    try {
      discordCredentials = typeof apiConfig.api_key === "string"
        ? JSON.parse(apiConfig.api_key)
        : apiConfig.api_key;
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid Discord API configuration format" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!discordCredentials.client_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Discord client_id not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        client_id: discordCredentials.client_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[get-discord-client-id] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});