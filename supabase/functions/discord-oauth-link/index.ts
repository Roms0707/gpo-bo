import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  code: string;
  user_id: string;
  redirect_uri: string;
}

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
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
        JSON.stringify({ success: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { code, user_id, redirect_uri }: RequestPayload = await req.json();

    if (!code || !user_id || !redirect_uri) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters: code, user_id, redirect_uri" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[discord-oauth-link] Processing OAuth link for user ${user_id}`);

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
      console.error("[discord-oauth-link] Error fetching Discord API config:", configError);
      return new Response(
        JSON.stringify({ success: false, error: "Discord API configuration not found" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let discordCredentials: { client_id: string; client_secret: string };
    try {
      discordCredentials = typeof apiConfig.api_key === "string"
        ? JSON.parse(apiConfig.api_key)
        : apiConfig.api_key;
    } catch {
      console.error("[discord-oauth-link] Failed to parse Discord credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid Discord API configuration format" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!discordCredentials.client_id || !discordCredentials.client_secret) {
      console.error("[discord-oauth-link] Missing client_id or client_secret in Discord config");
      return new Response(
        JSON.stringify({ success: false, error: "Incomplete Discord API configuration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[discord-oauth-link] Exchanging authorization code for access token...");

    const tokenParams = new URLSearchParams({
      client_id: discordCredentials.client_id,
      client_secret: discordCredentials.client_secret,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirect_uri,
    });

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[discord-oauth-link] Token exchange failed:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to exchange authorization code",
          details: errorText
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenData: DiscordTokenResponse = await tokenResponse.json();
    console.log("[discord-oauth-link] Token exchange successful");

    console.log("[discord-oauth-link] Fetching Discord user info...");

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("[discord-oauth-link] Failed to fetch user info:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to fetch Discord user info",
          details: errorText
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const discordUser: DiscordUser = await userResponse.json();
    console.log(`[discord-oauth-link] Got Discord user: ${discordUser.username} (${discordUser.id})`);

    const discordHandle = discordUser.global_name || discordUser.username;

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        discord_user_id: discordUser.id,
        discord_handle: discordHandle,
      })
      .eq("id", user_id);

    if (updateError) {
      console.error("[discord-oauth-link] Error updating user:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update user profile" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[discord-oauth-link] Successfully linked Discord ${discordUser.id} to user ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        discord_user: {
          id: discordUser.id,
          username: discordUser.username,
          global_name: discordUser.global_name,
          avatar: discordUser.avatar,
          handle: discordHandle,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[discord-oauth-link] Unexpected error:", error);
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
