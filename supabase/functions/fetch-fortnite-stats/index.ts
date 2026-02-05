import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface FortniteStatsRequest {
  playerIdentifier: string;
  platform?: string; // e.g., epic, psn, xbl
}

interface FortniteStatsResponse {
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
    const { playerIdentifier, platform = 'epic' } = await req.json() as FortniteStatsRequest;
    console.log(`Fortnite API: Request received for player: ${playerIdentifier}, platform: ${platform}`);

    // Validate input
    if (!playerIdentifier) {
      console.error("Fortnite API: Missing player identifier");
      return new Response(
        JSON.stringify({ success: false, error: "Player identifier is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch the Fortnite API configuration from the database
    const { data: gameApiIntegration, error: dbError } = await supabase
      .from('game_api_integrations')
      .select('api_key, api_url')
      .eq('api_name', 'Fortnite API')
      .eq('is_active', true)
      .single();

    if (dbError || !gameApiIntegration) {
      console.error("Fortnite API: Failed to fetch API configuration from database:", dbError?.message || "Configuration not found");
      return new Response(
        JSON.stringify({ success: false, error: "Fortnite stats coming soon! This feature is currently being developed." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!gameApiIntegration.api_key || !gameApiIntegration.api_url) {
      console.error("Fortnite API: Missing API key or URL in configuration");
      return new Response(
        JSON.stringify({ success: false, error: "Fortnite stats coming soon! This feature is currently being developed." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse the JSON string stored in api_key to get the actual API key
    let apiKeys;
    try {
      apiKeys = JSON.parse(gameApiIntegration.api_key);
    } catch (parseError) {
      console.error("Fortnite API: Error parsing API key JSON:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid API key format in database configuration" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { api_key } = apiKeys;

    if (!api_key) {
      console.error("Fortnite API: API key missing from parsed configuration");
      return new Response(
        JSON.stringify({ success: false, error: "API key missing from database configuration" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const baseApiUrl = gameApiIntegration.api_url;

    // Construct the API endpoint for Fortnite stats
    const encodedPlayerIdentifier = encodeURIComponent(playerIdentifier);
    const fullApiUrl = `${baseApiUrl}/v2/stats/br/v2/${encodedPlayerIdentifier}?platform=${platform}`;
    console.log(`Fortnite API: Full API URL: ${fullApiUrl}`);

    // Make the request to Fortnite API
    const fortniteResponse = await fetch(fullApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': api_key,
        'Content-Type': 'application/json',
        'User-Agent': 'E-Sport-Zone/1.0'
      }
    });

    console.log(`Fortnite API: API response status: ${fortniteResponse.status}`);

    if (!fortniteResponse.ok) {
      const errorText = await fortniteResponse.text();
      console.error(`Fortnite API: API error: Status ${fortniteResponse.status}, Body: ${errorText}`);
      
      let errorMessage = `API Error: ${fortniteResponse.status}`;
      
      switch (fortniteResponse.status) {
        case 401:
          errorMessage = "Invalid API key or authentication failed";
          break;
        case 403:
          errorMessage = "Access forbidden - check API key permissions";
          break;
        case 404:
          errorMessage = "Player not found. Please verify the player identifier and platform.";
          break;
        case 429:
          errorMessage = "Rate limit exceeded - try again later";
          break;
        case 500:
          errorMessage = "Fortnite API server error";
          break;
        default:
          errorMessage = `Fortnite API error: ${fortniteResponse.status}`;
      }
      
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const fortniteData = await fortniteResponse.json();
    console.log("Fortnite API: Successfully fetched player data");

    return new Response(
      JSON.stringify({ success: true, data: fortniteData }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error("Fortnite API: Error in fetch-fortnite-stats function:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error. Please try again later." }),
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