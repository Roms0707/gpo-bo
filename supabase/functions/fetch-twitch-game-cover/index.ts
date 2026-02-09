import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TwitchGame {
  id: string;
  name: string;
  box_art_url: string;
}

interface TwitchSearchResponse {
  data: TwitchGame[];
}

const getTwitchAccessToken = async (clientId: string, clientSecret: string): Promise<string> => {
  const tokenUrl = "https://id.twitch.tv/oauth2/token";
  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials"
  });

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString()
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get Twitch access token: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error("No access token received from Twitch");
  }

  return tokenData.access_token;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const gameName = url.searchParams.get("game");

    if (!gameName) {
      return new Response(
        JSON.stringify({ success: false, error: "Game name is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: twitchApiConfig, error: configError } = await supabase
      .from("platform_api_integrations")
      .select("api_key")
      .eq("api_name", "Twitch API")
      .eq("is_active", true)
      .single();

    if (configError || !twitchApiConfig) {
      return new Response(
        JSON.stringify({ success: false, error: "Twitch API configuration not found" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let twitchCredentials;
    try {
      twitchCredentials = JSON.parse(twitchApiConfig.api_key);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid Twitch API credentials format" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { client_id, client_secret } = twitchCredentials;

    if (!client_id || !client_secret) {
      return new Response(
        JSON.stringify({ success: false, error: "Twitch client ID or secret not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const accessToken = await getTwitchAccessToken(client_id, client_secret);

    const searchUrl = `https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(gameName)}&first=5`;

    const response = await fetch(searchUrl, {
      headers: {
        "Client-ID": client_id,
        "Authorization": `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to search Twitch" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data: TwitchSearchResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Game not found on Twitch" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const searchLower = gameName.toLowerCase().replace(/[-:]/g, " ").replace(/\\s+/g, " ").trim();
    let bestMatch = data.data[0];

    for (const game of data.data) {
      const gameLower = game.name.toLowerCase().replace(/[-:]/g, " ").replace(/\\s+/g, " ").trim();
      if (gameLower === searchLower) {
        bestMatch = game;
        break;
      }
      if (gameLower.includes(searchLower) || searchLower.includes(gameLower)) {
        bestMatch = game;
        break;
      }
    }

    const coverUrl = bestMatch.box_art_url
      .replace("{width}", "1920")
      .replace("{height}", "1080");

    return new Response(
      JSON.stringify({
        success: true,
        coverUrl,
        gameName: bestMatch.name,
        twitchId: bestMatch.id
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error("[Twitch Game Cover] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});
