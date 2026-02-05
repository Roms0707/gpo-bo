import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface SteamProfileRequest {
  steamId64: string;
  includeBans?: boolean;
  includeGames?: boolean;
  includeLevel?: boolean;
  includeGameStats?: boolean;
  gameAppIds?: number[]; // Array of Steam app IDs to get stats for
}

interface SteamProfileResponse {
  success: boolean;
  profile?: any;
  bans?: any;
  games?: any;
  level?: number;
  gameStats?: any[];
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
    const { 
      steamId64, 
      includeBans = false, 
      includeGames = false,
      includeLevel = false,
      includeGameStats = false,
      gameAppIds = []
    } = await req.json() as SteamProfileRequest;
    console.log(`[Steam API] Request received for Steam ID: ${steamId64}, includeBans: ${includeBans}, includeGames: ${includeGames}, includeLevel: ${includeLevel}, includeGameStats: ${includeGameStats}`);

    // Validate input
    if (!steamId64) {
      console.error("[Steam API] Missing Steam ID");
      return new Response(
        JSON.stringify({ success: false, error: "Steam ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate Steam ID format (should be 17 digits)
    if (!/^\d{17}$/.test(steamId64)) {
      console.error("[Steam API] Invalid Steam ID format");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid Steam ID format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch the Steam API key from the database
    const { data: gameApiIntegration, error: dbError } = await supabase
      .from('game_api_integrations')
      .select('api_key')
      .eq('api_name', 'Steam Web API')
      .eq('is_active', true)
      .single();

    if (dbError || !gameApiIntegration || !gameApiIntegration.api_key) {
      console.error("[Steam API] Failed to fetch Steam API key from database:", dbError?.message || "API key not found");
      return new Response(
        JSON.stringify({ success: false, error: "Steam API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const STEAM_API_KEY = gameApiIntegration.api_key;
    console.log("[Steam API] API key fetched successfully");

    let profileData = null;
    let bansData = null;
    let gamesData = null;
    let levelData = null;
    let gameStatsData = null;

    // 1. Fetch player profile summary
    const profileUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId64}`;
    console.log(`[Steam API] Fetching profile data`);

    const profileResponse = await fetch(profileUrl);

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error(`[Steam API] Profile API error: Status ${profileResponse.status}, Body: ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch Steam profile: ${profileResponse.status}` }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const profileResponseData = await profileResponse.json();
    
    if (profileResponseData.response && profileResponseData.response.players && profileResponseData.response.players.length > 0) {
      profileData = profileResponseData.response.players[0];
      console.log(`[Steam API] Profile data obtained for: ${profileData.personaname}`);
    } else {
      console.error("[Steam API] No player found with the provided Steam ID");
      return new Response(
        JSON.stringify({ success: false, error: "Steam profile not found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Fetch player bans if requested
    if (includeBans) {
      const bansUrl = `https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${STEAM_API_KEY}&steamids=${steamId64}`;
      console.log(`[Steam API] Fetching bans data`);

      try {
        const bansResponse = await fetch(bansUrl);
        
        if (bansResponse.ok) {
          const bansResponseData = await bansResponse.json();
          if (bansResponseData.players && bansResponseData.players.length > 0) {
            bansData = bansResponseData.players[0];
            console.log("[Steam API] Bans data obtained");
          }
        } else {
          console.warn(`[Steam API] Failed to fetch bans data: ${bansResponse.status}`);
        }
      } catch (error) {
        console.warn("[Steam API] Error fetching bans data:", error);
      }
    }

    // 3. Fetch owned games if requested
    if (includeGames) {
      const gamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId64}&format=json&include_appinfo=true&include_played_free_games=true`;
      console.log(`[Steam API] Fetching games data`);

      try {
        const gamesResponse = await fetch(gamesUrl);
        
        if (gamesResponse.ok) {
          const gamesResponseData = await gamesResponse.json();
          if (gamesResponseData.response && gamesResponseData.response.games) {
            // Sort games by playtime and get top 10
            const sortedGames = gamesResponseData.response.games
              .sort((a: any, b: any) => (b.playtime_forever || 0) - (a.playtime_forever || 0))
              .slice(0, 10);
            
            gamesData = {
              game_count: gamesResponseData.response.game_count,
              games: sortedGames
            };
            console.log(`[Steam API] Games data obtained: ${gamesData.game_count} total games, showing top 10 by playtime`);
          }
        } else {
          console.warn(`[Steam API] Failed to fetch games data: ${gamesResponse.status}`);
        }
      } catch (error) {
        console.warn("[Steam API] Error fetching games data:", error);
      }
    }

    // 4. Fetch Steam level if requested
    if (includeLevel) {
      const levelUrl = `https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${STEAM_API_KEY}&steamid=${steamId64}`;
      console.log(`[Steam API] Fetching Steam level`);

      try {
        const levelResponse = await fetch(levelUrl);
        
        if (levelResponse.ok) {
          const levelResponseData = await levelResponse.json();
          if (levelResponseData.response && typeof levelResponseData.response.player_level === 'number') {
            levelData = levelResponseData.response.player_level;
            console.log(`[Steam API] Steam level obtained: ${levelData}`);
          }
        } else {
          console.warn(`[Steam API] Failed to fetch Steam level: ${levelResponse.status}`);
        }
      } catch (error) {
        console.warn("[Steam API] Error fetching Steam level:", error);
      }
    }

    // 5. Fetch game stats if requested and app IDs provided
    if (includeGameStats && gameAppIds.length > 0) {
      console.log(`[Steam API] Fetching game stats for ${gameAppIds.length} games`);
      gameStatsData = [];

      for (const appId of gameAppIds.slice(0, 5)) { // Limit to 5 games to avoid too many API calls
        try {
          const gameStatsUrl = `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=${appId}&key=${STEAM_API_KEY}&steamid=${steamId64}`;
          console.log(`[Steam API] Fetching stats for app ID: ${appId}`);
          
          const gameStatsResponse = await fetch(gameStatsUrl);
          
          if (gameStatsResponse.ok) {
            const gameStatsResponseData = await gameStatsResponse.json();
            if (gameStatsResponseData.playerstats) {
              gameStatsData.push({
                appId: appId,
                gameName: gameStatsResponseData.playerstats.gameName,
                stats: gameStatsResponseData.playerstats.stats || [],
                achievements: gameStatsResponseData.playerstats.achievements || []
              });
              console.log(`[Steam API] Game stats obtained for ${gameStatsResponseData.playerstats.gameName}`);
            }
          } else {
            console.warn(`[Steam API] Failed to fetch game stats for app ${appId}: ${gameStatsResponse.status}`);
          }
        } catch (error) {
          console.warn(`[Steam API] Error fetching game stats for app ${appId}:`, error);
        }
      }
    }

    // 6. Structure the response
    const responseData: any = {
      profile: {
        steamid: profileData.steamid,
        personaname: profileData.personaname,
        profileurl: profileData.profileurl,
        avatar: profileData.avatar,
        avatarmedium: profileData.avatarmedium,
        avatarfull: profileData.avatarfull,
        profilestate: profileData.profilestate,
        communityvisibilitystate: profileData.communityvisibilitystate,
        lastlogoff: profileData.lastlogoff,
        timecreated: profileData.timecreated,
        loccountrycode: profileData.loccountrycode,
        locstatecode: profileData.locstatecode,
        loccityid: profileData.loccityid
      }
    };

    if (bansData) {
      responseData.bans = {
        communityBanned: bansData.CommunityBanned,
        vacBanned: bansData.VACBanned,
        numberOfVACBans: bansData.NumberOfVACBans,
        daysSinceLastBan: bansData.DaysSinceLastBan,
        numberOfGameBans: bansData.NumberOfGameBans,
        economyBan: bansData.EconomyBan
      };
    }

    if (gamesData) {
      responseData.games = gamesData;
    }

    if (levelData !== null) {
      responseData.level = levelData;
    }

    if (gameStatsData && gameStatsData.length > 0) {
      responseData.gameStats = gameStatsData;
    }

    console.log("[Steam API] Successfully processed Steam profile data");

    return new Response(
      JSON.stringify({ success: true, ...responseData }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error("[Steam API] Error in fetch-steam-profile function:", error);
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