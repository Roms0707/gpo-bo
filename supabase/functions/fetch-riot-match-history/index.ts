import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface MatchHistoryRequest {
  puuid: string;
  region?: string;
  count?: number;
  start?: number;
}

interface SimplifiedMatch {
  matchId: string;
  gameMode: string;
  gameDuration: number;
  gameCreation: number;
  champion: {
    name: string;
    id: number;
  };
  stats: {
    kills: number;
    deaths: number;
    assists: number;
    win: boolean;
    totalDamageDealt: number;
    goldEarned: number;
    creepScore: number;
    champLevel: number;
  };
  items: number[];
  summoners: number[];
  otherParticipants: {
    championName: string;
    summonerName: string;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
  }[];
}

interface MatchHistoryResponse {
  success: boolean;
  matches?: SimplifiedMatch[];
  error?: string;
}

// Map platform regions to routing regions for Match V5 API
const getRoutingRegion = (platformRegion: string): string => {
  const routingMap: { [key: string]: string } = {
    'br1': 'americas',
    'la1': 'americas',
    'la2': 'americas',
    'na1': 'americas',
    'oc1': 'sea',
    'jp1': 'asia',
    'kr': 'asia',
    'eun1': 'europe',
    'euw1': 'europe',
    'tr1': 'europe',
    'ru': 'europe'
  };

  return routingMap[platformRegion] || 'europe';
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
    const { puuid, region = 'euw1', count = 5, start = 0 } = await req.json() as MatchHistoryRequest;
    console.log(`[Match History] Request received for PUUID: ${puuid} in region: ${region}, count: ${count}, start: ${start}`);

    // Validate input
    if (!puuid) {
      console.error("[Match History] Missing PUUID");
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
      console.error("[Match History] Failed to fetch Riot API key from database:", dbError?.message || "API key not found");
      return new Response(
        JSON.stringify({ success: false, error: "Riot API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const RIOT_API_KEY = gameApiIntegration.api_key;
    const routingRegion = getRoutingRegion(region);
    console.log(`[Match History] Using routing region: ${routingRegion} for platform: ${region}`);

    // 1. Get match IDs from Match V5 API
    const matchListUrl = `https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`;
    console.log(`[Match History] Fetching match list: ${matchListUrl}`);

    const matchListResponse = await fetch(matchListUrl, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });

    if (!matchListResponse.ok) {
      const errorText = await matchListResponse.text();
      console.error(`[Match History] Match list API error: Status ${matchListResponse.status}, Body: ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch match list: ${matchListResponse.status}` }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const matchIds: string[] = await matchListResponse.json();
    console.log(`[Match History] Found ${matchIds.length} matches`);

    if (matchIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, matches: [] }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 2. Get detailed match data for each match
    const matches: SimplifiedMatch[] = [];

    for (const matchId of matchIds) {
      try {
        const matchDetailUrl = `https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
        console.log(`[Match History] Fetching match details: ${matchId}`);

        const matchDetailResponse = await fetch(matchDetailUrl, {
          headers: { "X-Riot-Token": RIOT_API_KEY },
        });

        if (!matchDetailResponse.ok) {
          console.warn(`[Match History] Failed to fetch match ${matchId}: ${matchDetailResponse.status}`);
          continue;
        }

        const matchData = await matchDetailResponse.json();

        // Find the participant data for our PUUID
        const participant = matchData.info.participants.find((p: any) => p.puuid === puuid);

        if (!participant) {
          console.warn(`[Match History] Participant not found in match ${matchId}`);
          continue;
        }

        // Get other participants in the match (excluding the queried user)
        const otherParticipants = matchData.info.participants
          .filter((p: any) => p.puuid !== puuid)
          .slice(0, 9) // Limit to 9 other participants to avoid too much data
          .map((p: any) => ({
            championName: p.championName,
            summonerName: p.summonerName || p.riotIdGameName || 'Unknown',
            win: p.win,
            kills: p.kills,
            deaths: p.deaths,
            assists: p.assists
          }));

        // Simplify the match data
        const simplifiedMatch: SimplifiedMatch = {
          matchId: matchId,
          gameMode: matchData.info.gameMode,
          gameDuration: matchData.info.gameDuration,
          gameCreation: matchData.info.gameCreation,
          champion: {
            name: participant.championName,
            id: participant.championId
          },
          stats: {
            kills: participant.kills,
            deaths: participant.deaths,
            assists: participant.assists,
            win: participant.win,
            totalDamageDealt: participant.totalDamageDealtToChampions,
            goldEarned: participant.goldEarned,
            creepScore: participant.totalMinionsKilled + participant.neutralMinionsKilled,
            champLevel: participant.champLevel
          },
          items: [
            participant.item0,
            participant.item1,
            participant.item2,
            participant.item3,
            participant.item4,
            participant.item5,
            participant.item6
          ].filter(item => item > 0),
          summoners: [participant.summoner1Id, participant.summoner2Id],
          otherParticipants: otherParticipants
        };

        matches.push(simplifiedMatch);
        console.log(`[Match History] Processed match ${matchId} - ${participant.championName} ${participant.win ? 'Win' : 'Loss'}`);

      } catch (error) {
        console.error(`[Match History] Error processing match ${matchId}:`, error);
        continue;
      }
    }

    console.log(`[Match History] Successfully processed ${matches.length} matches`);

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
    console.error("[Match History] Error in fetch-riot-match-history function:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
