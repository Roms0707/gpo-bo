import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface ValorantRankedRequest {
  puuid: string;
  region?: string;
}

interface ValorantRankedResponse {
  success: boolean;
  rankedData?: any;
  error?: string;
}

// Map platform regions to Valorant API regions
const getValorantRegion = (region: string): string => {
  const regionMap: { [key: string]: string } = {
    'euw1': 'eu',
    'eun1': 'eu',
    'na1': 'na',
    'kr': 'kr',
    'jp1': 'ap',
    'br1': 'latam',
    'la1': 'latam',
    'la2': 'latam',
    'oc1': 'ap',
    'tr1': 'eu',
    'ru': 'eu'
  };
  
  return regionMap[region] || 'eu';
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { puuid, region = 'eu' } = await req.json() as ValorantRankedRequest;
    console.log(`[Valorant Ranked] Request received for PUUID: ${puuid} in region: ${region}`);

    // Validate input
    if (!puuid) {
      console.error("[Valorant Ranked] Missing PUUID");
      return new Response(
        JSON.stringify({ success: false, error: "PUUID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Fetch the Riot API key from the database
    const { data: gameApiIntegration, error: dbError } = await supabase
      .from('game_api_integrations')
      .select('api_key')
      .eq('api_name', 'Riot Games API')
      .eq('is_active', true)
      .single();

    if (dbError || !gameApiIntegration || !gameApiIntegration.api_key) {
      console.error("[Valorant Ranked] Failed to fetch Riot API key from database:", dbError?.message || "API key not found");
      return new Response(
        JSON.stringify({ success: false, error: "Riot API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const RIOT_API_KEY = gameApiIntegration.api_key;
    const valorantRegion = getValorantRegion(region);
    console.log(`[Valorant Ranked] Using Valorant region: ${valorantRegion}`);

    // Get current competitive season/act ID
    // For now, we'll use a recent act ID - in production, you might want to fetch this dynamically
    const currentActId = "3f61c772-4560-cd3f-5d3f-a7ab5abda6b3"; // Example act ID - replace with current

    // Fetch player's competitive updates (ranked stats)
    const competitiveUrl = `https://${valorantRegion}.api.riotgames.com/val/ranked/v1/leaderboards/by-act/${currentActId}?size=1&startIndex=0&query=${puuid}`;
    console.log(`[Valorant Ranked] Calling Competitive API: ${competitiveUrl}`);
    
    const competitiveResponse = await fetch(competitiveUrl, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });

    let rankedData = null;

    if (competitiveResponse.ok) {
      const competitiveDataRaw = await competitiveResponse.json();
      
      // Process the competitive data
      if (competitiveDataRaw.players && competitiveDataRaw.players.length > 0) {
        const playerData = competitiveDataRaw.players;
        
        rankedData = {
          puuid: playerData.puuid,
          gameName: playerData.gameName,
          tagLine: playerData.tagLine,
          leaderboardRank: playerData.leaderboardRank,
          rankedRating: playerData.rankedRating,
          numberOfWins: playerData.numberOfWins,
          competitiveTier: playerData.competitiveTier,
          actId: currentActId
        };
        
        console.log("[Valorant Ranked] Ranked data obtained successfully");
      } else {
        console.log("[Valorant Ranked] Player not found in leaderboard");
        
        // If player is not in leaderboard, try to get basic competitive info
        // This would require a different endpoint or approach
        rankedData = {
          puuid: puuid,
          message: "Player not found in current competitive leaderboard",
          competitiveTier: 0,
          rankedRating: 0,
          numberOfWins: 0,
          actId: currentActId
        };
      }
    } else {
      const errorText = await competitiveResponse.text();
      console.warn(`[Valorant Ranked] Competitive API error: Status ${competitiveResponse.status}, Body: ${errorText}`);
      
      // Return basic structure even if API call fails
      rankedData = {
        puuid: puuid,
        error: `API Error: ${competitiveResponse.status}`,
        competitiveTier: 0,
        rankedRating: 0,
        numberOfWins: 0,
        actId: currentActId
      };
    }

    const finalResponse = {
      success: true,
      rankedData: rankedData,
      region: valorantRegion
    };

    console.log("[Valorant Ranked] Sending final response");
    return new Response(
      JSON.stringify(finalResponse),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );

  } catch (error) {
    console.error("[Valorant Ranked] Error in fetch-valorant-ranked-stats function:", error);
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