import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface HealthcheckRequest {
  discord_server_id: string;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

interface HealthcheckResponse {
  success: boolean;
  message: string;
  errorCode?: string;
  guildName?: string;
}

interface DiscordCredentials {
  bot_token: string;
  client_id?: string;
  client_secret?: string;
  redirect_uri?: string;
  scopes?: string[];
}

async function getDiscordBotToken(): Promise<{ token: string | null; error: string | null; errorCode: string | null }> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return { token: null, error: "Supabase configuration missing", errorCode: "SUPABASE_CONFIG_MISSING" };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from("platform_api_integrations")
      .select("api_key, is_active")
      .eq("api_name", "Discord API")
      .maybeSingle();

    if (error) {
      console.error("Database error fetching Discord credentials:", error);
      return { token: null, error: "Failed to fetch Discord configuration from database", errorCode: "DATABASE_ERROR" };
    }

    if (!data) {
      return { token: null, error: "Discord API integration not found. Please configure Discord credentials in the admin panel.", errorCode: "DISCORD_NOT_CONFIGURED" };
    }

    if (!data.is_active) {
      return { token: null, error: "Discord API integration is disabled", errorCode: "DISCORD_INTEGRATION_DISABLED" };
    }

    let credentials: DiscordCredentials;
    try {
      credentials = typeof data.api_key === "string" ? JSON.parse(data.api_key) : data.api_key;
    } catch {
      return { token: null, error: "Invalid Discord credentials format in database", errorCode: "INVALID_CREDENTIALS_FORMAT" };
    }

    if (!credentials.bot_token) {
      return { token: null, error: "Discord bot token not found in credentials", errorCode: "BOT_TOKEN_MISSING" };
    }

    return { token: credentials.bot_token, error: null, errorCode: null };
  } catch (err) {
    console.error("Unexpected error fetching Discord bot token:", err);
    return { token: null, error: "Unexpected error fetching Discord configuration", errorCode: "UNEXPECTED_ERROR" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Method not allowed",
          errorCode: "METHOD_NOT_ALLOWED",
        } as HealthcheckResponse),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { token: botToken, error: tokenError, errorCode: tokenErrorCode } = await getDiscordBotToken();

    if (!botToken) {
      console.error("Discord bot token retrieval failed:", tokenError);
      return new Response(
        JSON.stringify({
          success: false,
          message: tokenError || "Discord bot token is not configured. Please contact support.",
          errorCode: tokenErrorCode || "BOT_TOKEN_NOT_CONFIGURED",
        } as HealthcheckResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: HealthcheckRequest = await req.json();
    const { discord_server_id } = body;

    if (!discord_server_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Discord Server ID is required",
          errorCode: "MISSING_SERVER_ID",
        } as HealthcheckResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!/^\d{17,20}$/.test(discord_server_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid Discord Server ID format. It should be a 17-20 digit number.",
          errorCode: "INVALID_SERVER_ID_FORMAT",
        } as HealthcheckResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const discordApiUrl = `https://discord.com/api/v10/guilds/${discord_server_id}`;

    const discordResponse = await fetch(discordApiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
    });

    if (discordResponse.ok) {
      const guild: DiscordGuild = await discordResponse.json();
      return new Response(
        JSON.stringify({
          success: true,
          message: `Bot has access to server: ${guild.name}`,
          guildName: guild.name,
        } as HealthcheckResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const errorStatus = discordResponse.status;
    let errorMessage: string;
    let errorCode: string;

    switch (errorStatus) {
      case 401:
        errorMessage = "Invalid bot token. Please check your Discord credentials.";
        errorCode = "INVALID_BOT_TOKEN";
        break;
      case 403:
        errorMessage = "Bot lacks permissions or required intents to access this server.";
        errorCode = "INSUFFICIENT_PERMISSIONS";
        break;
      case 404:
        errorMessage = "Server not found. Either the Server ID is invalid or the bot is not a member of this server.";
        errorCode = "SERVER_NOT_FOUND";
        break;
      case 429:
        errorMessage = "Rate limited by Discord. Please try again in a few seconds.";
        errorCode = "RATE_LIMITED";
        break;
      default:
        errorMessage = `Discord API error (${errorStatus}). Please try again later.`;
        errorCode = "DISCORD_API_ERROR";
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
        errorCode: errorCode,
      } as HealthcheckResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Discord healthcheck error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "An unexpected error occurred while checking Discord configuration.",
        errorCode: "UNEXPECTED_ERROR",
      } as HealthcheckResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});