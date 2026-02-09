import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface ValorantMatchHistoryRequest {
  puuid: string;
  region?: string;
  count?: number;
}

interface SimplifiedValorantMatch {
  matchId: string;
  gameMode: string;
  mapName: string;
  gameStartMillis: number;
  gameLengthMillis: number;
  isRanked: boolean;
  agent: {
    name: string;
    id: string;
  };
  stats: {
    kills: number;
    deaths: number;
    assists: number;
    score: number;
    roundsPlayed: number;
    won: boolean;
    team: string;
  };
  roundResults: {
    roundNum: number;
    roundResult: string;
    roundCeremony: string;
  }[];
  teammates: {
    puuid: string;
    gameName: string;
    tagLine: string;
    agent: string;
    kills: number;
    deaths: number;
    assists: number;
    score: number;
  }[];
}

interface ValorantMatchHistoryResponse {
  success: boolean;
  matches?: SimplifiedValorantMatch[];
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
    const { puuid, region = 'eu', count = 5 } = await req.json() as ValorantMatchHistoryRequest;
    console.log(`[Valorant Match History] Request received for PUUID: ${puuid} in region: ${region}, count: ${count}`);

    // Validate input
    if (!puuid) {
      console.error("[Valorant Match History] Missing PUUID");
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
      console.error("[Valorant Match History] Failed to fetch Riot API key from database:", dbError?.message || "API key not found");
      return new Response(
        JSON.stringify({ success: false, error: "Riot API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const RIOT_API_KEY = gameApiIntegration.api_key;
    const valorantRegion = getValorantRegion(region);
    console.log(`[Valorant Match History] Using Valorant region: ${valorantRegion}`);

    // 1. Get match IDs from Valorant Match V1 API
    const matchListUrl = `https://${valorantRegion}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${puuid}?size=${count}`;
    console.log(`[Valorant Match History] Fetching match list: ${matchListUrl}`);

    const matchListResponse = await fetch(matchListUrl, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });

    if (!matchListResponse.ok) {
      const errorText = await matchListResponse.text();
      console.error(`[Valorant Match History] Match list API error: Status ${matchListResponse.status}, Body: ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch match list: ${matchListResponse.status}` }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const matchListData = await matchListResponse.json();
    const matchIds = matchListData.history?.map((match: any) => match.matchId) || [];
    console.log(`[Valorant Match History] Found ${matchIds.length} matches`);

    if (matchIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, matches: [] }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 2. Get detailed match data for each match
    const matches: SimplifiedValorantMatch[] = [];

    for (const matchId of matchIds.slice(0, count)) {
      try {
        const matchDetailUrl = `https://${valorantRegion}.api.riotgames.com/val/match/v1/matches/${matchId}`;
        console.log(`[Valorant Match History] Fetching match details: ${matchId}`);

        const matchDetailResponse = await fetch(matchDetailUrl, {
          headers: { "X-Riot-Token": RIOT_API_KEY },
        });

        if (!matchDetailResponse.ok) {
          console.warn(`[Valorant Match History] Failed to fetch match ${matchId}: ${matchDetailResponse.status}`);
          continue;
        }

        const matchData = await matchDetailResponse.json();

        // Find the player data for our PUUID
        const playerData = matchData.players?.find((p: any) => p.puuid === puuid);

        if (!playerData) {
          console.warn(`[Valorant Match History] Player not found in match ${matchId}`);
          continue;
        }

        // Get teammates (same team as the player)
        const teammates = matchData.players
          ?.filter((p: any) => p.puuid !== puuid && p.teamId === playerData.teamId)
          ?.slice(0, 4) // Limit to 4 teammates
          ?.map((p: any) => ({
            puuid: p.puuid,
            gameName: p.gameName || 'Unknown',
            tagLine: p.tagLine || '',
            agent: p.characterId,
            kills: p.stats?.kills || 0,
            deaths: p.stats?.deaths || 0,
            assists: p.stats?.assists || 0,
            score: p.stats?.score || 0
          })) || [];

        // Process round results
        const roundResults = matchData.roundResults?.map((round: any, index: number) => ({
          roundNum: index + 1,
          roundResult: round.roundResult,
          roundCeremony: round.roundCeremony || 'none'
        })) || [];

        // Determine if the player won
        const playerTeam = matchData.teams?.find((team: any) => team.teamId === playerData.teamId);
        const won = playerTeam?.won || false;

        // Simplify the match data
        const simplifiedMatch: SimplifiedValorantMatch = {
          matchId: matchId,
          gameMode: matchData.matchInfo?.gameMode || 'Unknown',
          mapName: matchData.matchInfo?.mapId || 'Unknown',
          gameStartMillis: matchData.matchInfo?.gameStartMillis || 0,
          gameLengthMillis: matchData.matchInfo?.gameLengthMillis || 0,
          isRanked: matchData.matchInfo?.isRanked || false,
          agent: {
            name: playerData.characterId || 'Unknown',
            id: playerData.characterId || 'unknown'
          },
          stats: {
            kills: playerData.stats?.kills || 0,
            deaths: playerData.stats?.deaths || 0,
            assists: playerData.stats?.assists || 0,
            score: playerData.stats?.score || 0,
            roundsPlayed: playerData.stats?.roundsPlayed || 0,
            won: won,
            team: playerData.teamId || 'Unknown'
          },
          roundResults: roundResults,
          teammates: teammates
        };

        matches.push(simplifiedMatch);
        console.log(`[Valorant Match History] Processed match ${matchId} - ${playerData.characterId} ${won ? 'Win' : 'Loss'}`);

      } catch (error) {
        console.error(`[Valorant Match History] Error processing match ${matchId}:`, error);
        continue;
      }
    }

    console.log(`[Valorant Match History] Successfully processed ${matches.length} matches`);

    return new Response(
      JSON.stringify({ success: true, matches }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );

  } catch (error) {
    console.error("[Valorant Match History] Error in fetch-valorant-match-history function:", error);
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
