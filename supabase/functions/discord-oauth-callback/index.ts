import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

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

interface StatePayload {
  user_id: string;
  timestamp: number;
  origin_url: string;
}

function generateRedirectUrl(originUrl: string, success: boolean, data?: { id: string; username: string; handle: string }, error?: string): string {
  const baseUrl = `${originUrl}/discord-oauth-popup-callback`;
  const params = new URLSearchParams();

  params.set('success', success ? 'true' : 'false');

  if (success && data) {
    params.set('discord_id', data.id);
    params.set('discord_handle', data.handle);
  } else if (error) {
    params.set('error', error);
  }

  return `${baseUrl}?${params.toString()}`;
}

function generateFallbackHtmlResponse(success: boolean, data?: { id: string; username: string; handle: string }, error?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Discord Authorization</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
    }
    .container { text-align: center; padding: 2rem; }
    .status { font-size: 1.25rem; margin-bottom: 1rem; }
    .success { color: #4ade80; }
    .error { color: #f87171; }
    .info { color: #94a3b8; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="status ${success ? 'success' : 'error'}">
      ${success ? 'Discord account linked successfully!' : 'Authorization failed'}
    </div>
    <div class="info">${error || 'You can close this window now.'}</div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);

    if (req.method !== "GET") {
      return new Response(generateFallbackHtmlResponse(false, undefined, "Method not allowed"), {
        status: 405,
        headers: { "Content-Type": "text/html" },
      });
    }

    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");

    let state: StatePayload | null = null;
    if (stateParam) {
      try {
        state = JSON.parse(decodeURIComponent(stateParam));
      } catch {
        console.error("[discord-oauth-callback] Failed to parse state parameter");
      }
    }

    const originUrl = state?.origin_url || "";

    if (errorParam) {
      const errorDescription = url.searchParams.get("error_description") || errorParam;
      console.error("[discord-oauth-callback] Discord returned error:", errorDescription);
      if (originUrl) {
        return new Response(null, {
          status: 302,
          headers: { "Location": generateRedirectUrl(originUrl, false, undefined, errorDescription) },
        });
      }
      return new Response(generateFallbackHtmlResponse(false, undefined, errorDescription), {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !stateParam) {
      console.error("[discord-oauth-callback] Missing code or state parameter");
      if (originUrl) {
        return new Response(null, {
          status: 302,
          headers: { "Location": generateRedirectUrl(originUrl, false, undefined, "Missing authorization code or state") },
        });
      }
      return new Response(generateFallbackHtmlResponse(false, undefined, "Missing authorization code or state"), {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!state || !state.user_id) {
      console.error("[discord-oauth-callback] Missing user_id in state");
      return new Response(generateFallbackHtmlResponse(false, undefined, "Invalid state: missing user_id"), {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }

    const stateAge = Date.now() - state.timestamp;
    if (stateAge > 600000) {
      console.error("[discord-oauth-callback] State expired:", stateAge, "ms old");
      return new Response(null, {
        status: 302,
        headers: { "Location": generateRedirectUrl(originUrl, false, undefined, "Authorization expired. Please try again.") },
      });
    }

    console.log(`[discord-oauth-callback] Processing OAuth callback for user ${state.user_id}`);

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
      console.error("[discord-oauth-callback] Error fetching Discord API config:", configError);
      return new Response(null, {
        status: 302,
        headers: { "Location": generateRedirectUrl(originUrl, false, undefined, "Discord API configuration not found") },
      });
    }

    let discordCredentials: { client_id: string; client_secret: string };
    try {
      discordCredentials = typeof apiConfig.api_key === "string"
        ? JSON.parse(apiConfig.api_key)
        : apiConfig.api_key;
    } catch {
      console.error("[discord-oauth-callback] Failed to parse Discord credentials");
      return new Response(null, {
        status: 302,
        headers: { "Location": generateRedirectUrl(originUrl, false, undefined, "Invalid Discord API configuration") },
      });
    }

    if (!discordCredentials.client_id || !discordCredentials.client_secret) {
      console.error("[discord-oauth-callback] Missing client_id or client_secret");
      return new Response(null, {
        status: 302,
        headers: { "Location": generateRedirectUrl(originUrl, false, undefined, "Incomplete Discord API configuration") },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const redirectUri = `${supabaseUrl}/functions/v1/discord-oauth-callback`;

    console.log("[discord-oauth-callback] Exchanging authorization code for access token...");

    const tokenParams = new URLSearchParams({
      client_id: discordCredentials.client_id,
      client_secret: discordCredentials.client_secret,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
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
      console.error("[discord-oauth-callback] Token exchange failed:", errorText);
      return new Response(null, {
        status: 302,
        headers: { "Location": generateRedirectUrl(originUrl, false, undefined, "Failed to exchange authorization code") },
      });
    }

    const tokenData: DiscordTokenResponse = await tokenResponse.json();
    console.log("[discord-oauth-callback] Token exchange successful");

    console.log("[discord-oauth-callback] Fetching Discord user info...");

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("[discord-oauth-callback] Failed to fetch user info:", errorText);
      return new Response(null, {
        status: 302,
        headers: { "Location": generateRedirectUrl(originUrl, false, undefined, "Failed to fetch Discord user info") },
      });
    }

    const discordUser: DiscordUser = await userResponse.json();
    console.log(`[discord-oauth-callback] Got Discord user: ${discordUser.username} (${discordUser.id})`);

    const discordHandle = discordUser.global_name || discordUser.username;

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        discord_user_id: discordUser.id,
        discord_handle: discordHandle,
      })
      .eq("id", state.user_id);

    if (updateError) {
      console.error("[discord-oauth-callback] Error updating user:", updateError);
      return new Response(null, {
        status: 302,
        headers: { "Location": generateRedirectUrl(originUrl, false, undefined, "Failed to update user profile") },
      });
    }

    console.log(`[discord-oauth-callback] Successfully linked Discord ${discordUser.id} to user ${state.user_id}`);

    return new Response(null, {
      status: 302,
      headers: {
        "Location": generateRedirectUrl(originUrl, true, {
          id: discordUser.id,
          username: discordUser.username,
          handle: discordHandle,
        }),
      },
    });
  } catch (error) {
    console.error("[discord-oauth-callback] Unexpected error:", error);
    return new Response(
      generateFallbackHtmlResponse(false, undefined, (error as Error).message || "An unexpected error occurred"),
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
});
