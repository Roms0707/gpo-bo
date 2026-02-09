import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface TrackerGGRequest {
  gameId: string;
  playerIdentifier: string;
  platform: string;
}

interface TrackerGGResponse {
  success: boolean;
  data?: any;
  error?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { gameId, playerIdentifier, platform } = await req.json() as TrackerGGRequest;
    console.log(`[Tracker.gg] Request received for game: ${gameId}, player: ${playerIdentifier}, platform: ${platform}`);

    // Validate input
    if (!gameId || !playerIdentifier || !platform) {
      console.error("[Tracker.gg] Missing required parameters");
      return new Response(
        JSON.stringify({ success: false, error: "Game ID, player identifier, and platform are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch the Tracker.gg API configuration from the database
    const { data: gameApiIntegration, error: dbError } = await supabase
      .from('game_api_integrations')
      .select('api_key, api_url')
      .eq('game_id', gameId)
      .eq('api_name', 'Tracker.gg API')
      .eq('is_active', true)
      .single();

    if (dbError || !gameApiIntegration) {
      console.error("[Tracker.gg] Failed to fetch API configuration from database:", dbError?.message || "Configuration not found");
      return new Response(
        JSON.stringify({ success: false, error: "Tracker.gg API configuration not found" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!gameApiIntegration.api_key || !gameApiIntegration.api_url) {
      console.error("[Tracker.gg] Missing API key or URL in configuration");
      return new Response(
        JSON.stringify({ success: false, error: "Tracker.gg API key or URL not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { api_key, api_url } = gameApiIntegration;
    console.log(`[Tracker.gg] Using API URL: ${api_url}`);

    // Construct the full API endpoint
    const encodedPlayerIdentifier = encodeURIComponent(playerIdentifier);
    const fullApiUrl = `${api_url}${encodedPlayerIdentifier}`;
    console.log(`[Tracker.gg] Full API URL: ${fullApiUrl}`);

    // Make the request to Tracker.gg API
    const trackerResponse = await fetch(fullApiUrl, {
      method: 'GET',
      headers: {
        'TRN-Api-Key': api_key,
        'Content-Type': 'application/json',
        'User-Agent': 'E-Sport-Zone/1.0'
      }
    });

    console.log(`[Tracker.gg] API response status: ${trackerResponse.status}`);

    if (!trackerResponse.ok) {
      const errorText = await trackerResponse.text();
      console.error(`[Tracker.gg] API error: Status ${trackerResponse.status}, Body: ${errorText}`);

      let errorMessage = `API Error: ${trackerResponse.status}`;

      switch (trackerResponse.status) {
        case 401:
          errorMessage = "Invalid API key";
          break;
        case 403:
          errorMessage = "Access forbidden - check API key permissions";
          break;
        case 404:
          errorMessage = "Player not found";
          break;
        case 429:
          errorMessage = "Rate limit exceeded - try again later";
          break;
        case 500:
          errorMessage = "Tracker.gg server error";
          break;
        default:
          errorMessage = `Tracker.gg API error: ${trackerResponse.status}`;
      }

      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const trackerData = await trackerResponse.json();
    console.log("[Tracker.gg] Successfully fetched player data");

    return new Response(
      JSON.stringify({ success: true, data: trackerData }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error("[Tracker.gg] Error in fetch-tracker-gg-profile function:", error);
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
