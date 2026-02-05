import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
// Cache for access tokens to avoid requesting a new one every time
let cachedAccessToken = null;
let tokenExpiresAt = 0;
const getTwitchAccessToken = async (clientId, clientSecret)=>{
  // Check if we have a valid cached token
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    console.log("[Twitch API] Using cached access token");
    return cachedAccessToken;
  }
  console.log("[Twitch API] Requesting new access token");
  const tokenUrl = "https://id.twitch.tv/oauth2/token";
  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials"
  });
  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: tokenParams.toString()
  });
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error(`[Twitch API] Token request failed: ${tokenResponse.status} - ${errorText}`);
    throw new Error(`Failed to get Twitch access token: ${tokenResponse.status}`);
  }
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    console.error("[Twitch API] No access token in response:", tokenData);
    throw new Error("No access token received from Twitch");
  }
  // Cache the token (expires in 1 hour, we'll refresh 5 minutes early)
  cachedAccessToken = tokenData.access_token;
  tokenExpiresAt = Date.now() + (tokenData.expires_in - 300) * 1000; // 5 minutes early
  console.log("[Twitch API] New access token obtained and cached");
  return cachedAccessToken;
};
serve(async (req)=>{
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    const { channelName } = await req.json();
    console.log(`[Twitch API] Checking live status for channel: ${channelName}`);
    // Validate input
    if (!channelName || typeof channelName !== 'string' || channelName.trim() === '') {
      console.error("[Twitch API] Invalid or missing channel name");
      return new Response(JSON.stringify({
        success: false,
        error: "Valid channel name is required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Get Twitch API credentials from environment
    const twitchClientId = Deno.env.get("TWITCH_CLIENT_ID");
    const twitchClientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");
    if (!twitchClientId || !twitchClientSecret) {
      console.error("[Twitch API] Missing Twitch API credentials in environment");
      console.log("[Twitch API] Available env vars:", Object.keys(Deno.env.toObject()));
      return new Response(JSON.stringify({
        success: false,
        error: "Twitch API credentials not configured"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Get access token
    let accessToken;
    try {
      accessToken = await getTwitchAccessToken(twitchClientId, twitchClientSecret);
    } catch (error) {
      console.error("[Twitch API] Failed to get access token:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to authenticate with Twitch API"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Call Twitch Helix API to check if the channel is live
    const helixUrl = `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channelName.toLowerCase())}`;
    console.log(`[Twitch API] Calling Helix API: ${helixUrl}`);
    const helixResponse = await fetch(helixUrl, {
      headers: {
        "Client-ID": twitchClientId,
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });
    if (!helixResponse.ok) {
      const errorText = await helixResponse.text();
      console.error(`[Twitch API] Helix API error: Status ${helixResponse.status}, Body: ${errorText}`);
      // If token is invalid, clear cache and retry once
      if (helixResponse.status === 401) {
        console.log("[Twitch API] Access token invalid, clearing cache and retrying");
        cachedAccessToken = null;
        tokenExpiresAt = 0;
        try {
          accessToken = await getTwitchAccessToken(twitchClientId, twitchClientSecret);
          const retryResponse = await fetch(helixUrl, {
            headers: {
              "Client-ID": twitchClientId,
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            }
          });
          if (!retryResponse.ok) {
            throw new Error(`Retry failed: ${retryResponse.status}`);
          }
          const retryData = await retryResponse.json();
          const isLive = retryData.data && retryData.data.length > 0;
          console.log(`[Twitch API] Retry successful - Channel ${channelName} is ${isLive ? 'LIVE' : 'OFFLINE'}`);
          return new Response(JSON.stringify({
            success: true,
            isLive: isLive,
            streamData: isLive ? retryData.data[0] : null
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });
        } catch (retryError) {
          console.error("[Twitch API] Retry failed:", retryError);
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to authenticate with Twitch API after retry"
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });
        }
      }
      return new Response(JSON.stringify({
        success: false,
        error: `Twitch API error: ${helixResponse.status}`
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const streamData = await helixResponse.json();
    // Check if the channel is live
    const isLive = streamData.data && streamData.data.length > 0;
    console.log(`[Twitch API] Channel ${channelName} is ${isLive ? 'LIVE' : 'OFFLINE'}`);
    if (isLive) {
      console.log(`[Twitch API] Stream details:`, {
        title: streamData.data[0].title,
        game_name: streamData.data[0].game_name,
        viewer_count: streamData.data[0].viewer_count,
        started_at: streamData.data[0].started_at
      });
    }
    return new Response(JSON.stringify({
      success: true,
      isLive: isLive,
      streamData: isLive ? streamData.data[0] : null
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("[Twitch API] Error in check-twitch-live-status function:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
