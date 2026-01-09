import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MembershipRequest {
  user_id: string;
  discord_server_id: string;
}

interface DiscordMember {
  user: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    global_name: string | null;
  };
  nick: string | null;
  roles: string[];
  joined_at: string;
  premium_since: string | null;
  deaf: boolean;
  mute: boolean;
}

interface MembershipResponse {
  success: boolean;
  is_member: boolean;
  message: string;
  errorCode?: string;
  member?: {
    discord_user_id: string;
    username: string;
    nickname: string | null;
    roles: string[];
    joined_at: string;
  };
}

interface DiscordCredentials {
  bot_token: string;
  client_id?: string;
  client_secret?: string;
  redirect_uri?: string;
  scopes?: string[];
}

async function getDiscordBotToken(supabase: ReturnType<typeof createClient>): Promise<{ token: string | null; error: string | null; errorCode: string | null }> {
  try {
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

async function getUserDiscordId(supabase: ReturnType<typeof createClient>, userId: string): Promise<{ discordUserId: string | null; error: string | null; errorCode: string | null }> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("discord_user_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Database error fetching user:", error);
      return { discordUserId: null, error: "Failed to fetch user from database", errorCode: "DATABASE_ERROR" };
    }

    if (!data) {
      return { discordUserId: null, error: "User not found", errorCode: "USER_NOT_FOUND" };
    }

    if (!data.discord_user_id) {
      return { discordUserId: null, error: "User does not have a Discord account linked", errorCode: "DISCORD_NOT_LINKED" };
    }

    return { discordUserId: data.discord_user_id, error: null, errorCode: null };
  } catch (err) {
    console.error("Unexpected error fetching user Discord ID:", err);
    return { discordUserId: null, error: "Unexpected error fetching user data", errorCode: "UNEXPECTED_ERROR" };
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
          is_member: false,
          message: "Method not allowed",
          errorCode: "METHOD_NOT_ALLOWED",
        } as MembershipResponse),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          is_member: false,
          message: "Supabase configuration missing",
          errorCode: "SUPABASE_CONFIG_MISSING",
        } as MembershipResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: MembershipRequest = await req.json();
    const { user_id, discord_server_id } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          is_member: false,
          message: "User ID is required",
          errorCode: "MISSING_USER_ID",
        } as MembershipResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!discord_server_id) {
      return new Response(
        JSON.stringify({
          success: false,
          is_member: false,
          message: "Discord Server ID is required",
          errorCode: "MISSING_SERVER_ID",
        } as MembershipResponse),
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
          is_member: false,
          message: "Invalid Discord Server ID format. It should be a 17-20 digit number.",
          errorCode: "INVALID_SERVER_ID_FORMAT",
        } as MembershipResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { discordUserId, error: userError, errorCode: userErrorCode } = await getUserDiscordId(supabase, user_id);

    if (!discordUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          is_member: false,
          message: userError || "Failed to get user's Discord ID",
          errorCode: userErrorCode || "USER_LOOKUP_FAILED",
        } as MembershipResponse),
        {
          status: userErrorCode === "USER_NOT_FOUND" ? 404 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!/^\d{17,20}$/.test(discordUserId)) {
      return new Response(
        JSON.stringify({
          success: false,
          is_member: false,
          message: "Invalid Discord User ID format stored in database",
          errorCode: "INVALID_DISCORD_USER_ID",
        } as MembershipResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { token: botToken, error: tokenError, errorCode: tokenErrorCode } = await getDiscordBotToken(supabase);

    if (!botToken) {
      console.error("Discord bot token retrieval failed:", tokenError);
      return new Response(
        JSON.stringify({
          success: false,
          is_member: false,
          message: tokenError || "Discord bot token is not configured",
          errorCode: tokenErrorCode || "BOT_TOKEN_NOT_CONFIGURED",
        } as MembershipResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const discordApiUrl = `https://discord.com/api/v10/guilds/${discord_server_id}/members/${discordUserId}`;

    const discordResponse = await fetch(discordApiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
    });

    if (discordResponse.ok) {
      const member: DiscordMember = await discordResponse.json();
      return new Response(
        JSON.stringify({
          success: true,
          is_member: true,
          message: "User is a member of the Discord server",
          member: {
            discord_user_id: member.user.id,
            username: member.user.global_name || member.user.username,
            nickname: member.nick,
            roles: member.roles,
            joined_at: member.joined_at,
          },
        } as MembershipResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const errorStatus = discordResponse.status;
    let errorMessage: string;
    let errorCode: string;
    let isMember = false;

    switch (errorStatus) {
      case 401:
        errorMessage = "Invalid bot token. Please check your Discord credentials.";
        errorCode = "INVALID_BOT_TOKEN";
        break;
      case 403:
        errorMessage = "Bot lacks permissions to check server membership. The bot needs the 'Server Members Intent' enabled.";
        errorCode = "INSUFFICIENT_PERMISSIONS";
        break;
      case 404:
        errorMessage = "User is not a member of this Discord server";
        errorCode = "NOT_A_MEMBER";
        isMember = false;
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
        success: errorStatus === 404,
        is_member: isMember,
        message: errorMessage,
        errorCode: errorCode,
      } as MembershipResponse),
      {
        status: errorStatus === 404 ? 200 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Discord membership verification error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        is_member: false,
        message: "An unexpected error occurred while verifying Discord membership.",
        errorCode: "UNEXPECTED_ERROR",
      } as MembershipResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});