// Existing imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
serve(async (req)=>{
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  // Initialize Supabase client for database access within the Edge Function
  const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  try {
    const { gameName, tagline, region = 'euw1' } = await req.json();
    console.log(`[Riot API] Request received for: ${gameName}#${tagline} in region: ${region}`); // ADDED LOG
    // Validate input
    if (!gameName || !tagline) {
      console.error("[Riot API] Missing gameName or tagline"); // ADDED LOG
      return new Response(JSON.stringify({
        valid: false,
        error: "Game name and tagline are required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    // Fetch the Riot API key from the database
    const { data: gameApiIntegration, error: dbError } = await supabase.from('game_api_integrations').select('api_key').eq('api_name', 'Riot Games API').eq('is_active', true).single();
    if (dbError || !gameApiIntegration || !gameApiIntegration.api_key) {
      console.error("[Riot API] Failed to fetch Riot API key from database:", dbError?.message || "API key not found");
      return new Response(JSON.stringify({
        valid: false,
        error: "Riot API key not configured"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    const RIOT_API_KEY = gameApiIntegration.api_key;
    console.log("[Riot API] API key fetched successfully."); // ADDED LOG
    // Validate region format
    const validRegions = [
      'euw1',
      'eun1',
      'na1',
      'kr',
      'jp1',
      'br1',
      'la1',
      'la2',
      'oc1',
      'tr1',
      'ru'
    ];
    const selectedRegion = validRegions.includes(region) ? region : 'euw1';
    console.log(`[Riot API] Using selected region: ${selectedRegion}`); // ADDED LOG
    // 1. Call Riot Account-V1 API to get PUUID (existing logic)
    const accountApiUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagline)}`;
    console.log(`[Riot API] Calling Account API: ${accountApiUrl}`); // ADDED LOG
    const accountResponse = await fetch(accountApiUrl, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY
      }
    });
    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      console.error(`[Riot API] Account API error: Status ${accountResponse.status}, Body: ${errorText}`); // IMPROVED LOG
      if (accountResponse.status === 404) {
        return new Response(JSON.stringify({
          valid: false,
          error: "Riot ID not found"
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
      return new Response(JSON.stringify({
        valid: false,
        error: `Validation failed: ${accountResponse.status} - ${errorText}`
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    const accountData = await accountResponse.json();
    const puuid = accountData.puuid;
    console.log(`[Riot API] PUUID obtained: ${puuid}`); // ADDED LOG
    let summonerInfo = null;
    let rankedStats = null;
    // 2. Call League of Legends Summoner-V4 API to get summonerId
    const summonerApiUrl = `https://${selectedRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    console.log(`[Riot API] Calling Summoner API: ${summonerApiUrl}`); // ADDED LOG
    const summonerResponse = await fetch(summonerApiUrl, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY
      }
    });
    if (summonerResponse.ok) {
      summonerInfo = await summonerResponse.json();
      const summonerId = summonerInfo.id; // Encrypted summoner ID
      console.log(`[Riot API] Summoner Info obtained. Summoner ID: ${summonerId}`); // ADDED LOG
      // 3. Call League of Legends League-V4 API to get ranked stats
      const leagueApiUrl = `https://${selectedRegion}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
      console.log(`[Riot API] Calling League API: ${leagueApiUrl}`); // ADDED LOG
      const leagueResponse = await fetch(leagueApiUrl, {
        headers: {
          "X-Riot-Token": RIOT_API_KEY
        }
      });
      if (leagueResponse.ok) {
        rankedStats = await leagueResponse.json();
        console.log("[Riot API] Ranked Stats obtained."); // ADDED LOG
      } else {
        const errorText = await leagueResponse.text();
        console.warn(`[Riot API] Riot League API error: Status ${leagueResponse.status}, Body: ${errorText}`); // IMPROVED LOG
      }
    } else {
      const errorText = await summonerResponse.text();
      console.warn(`[Riot API] Riot Summoner API error: Status ${summonerResponse.status}, Body: ${errorText}`); // IMPROVED LOG
    }
    // 4. Return combined data
    const finalResponse = {
      valid: true,
      puuid: puuid,
      summonerInfo: summonerInfo,
      rankedStats: rankedStats,
      region: selectedRegion // ADDED region to response
    };
    console.log("[Riot API] Sending final response:", JSON.stringify(finalResponse)); // ADDED LOG
    return new Response(JSON.stringify(finalResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error("[Riot API] Error in validate-riot-id function:", error); // IMPROVED LOG
    return new Response(JSON.stringify({
      valid: false,
      error: "Internal server error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
});
