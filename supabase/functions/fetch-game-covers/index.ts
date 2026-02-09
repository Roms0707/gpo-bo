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

interface TwitchGamesResponse {
  data: TwitchGame[];
}

interface TwitchSearchResponse {
  data: TwitchGame[];
  pagination?: {
    cursor?: string;
  };
}

interface GameRecord {
  id: string;
  name: string;
  twitch_cover_url: string | null;
  twitch_game_id: string | null;
  cover_last_updated: string | null;
  twitch_search_name: string | null;
}

const TWITCH_GAME_NAME_MAPPINGS: Record<string, string[]> = {
  "counter strike 2": ["Counter-Strike 2"],
  "counter-strike 2": ["Counter-Strike 2"],
  "cs2": ["Counter-Strike 2"],
  "csgo": ["Counter-Strike 2", "Counter-Strike: Global Offensive"],
  "cs": ["Counter-Strike 2"],
  "fc26": ["EA Sports FC 25"],
  "ea sports fc 26": ["EA Sports FC 25"],
  "fc25": ["EA Sports FC 25"],
  "ea sports fc 25": ["EA Sports FC 25"],
  "fc24": ["EA Sports FC 24"],
  "ea sports fc 24": ["EA Sports FC 24"],
  "lol": ["League of Legends"],
  "league": ["League of Legends"],
  "valorant": ["VALORANT"],
  "val": ["VALORANT"],
  "apex": ["Apex Legends"],
  "apex legends": ["Apex Legends"],
  "fortnite": ["Fortnite"],
  "fn": ["Fortnite"],
  "dota": ["Dota 2"],
  "dota2": ["Dota 2"],
  "dota 2": ["Dota 2"],
  "overwatch": ["Overwatch 2"],
  "ow": ["Overwatch 2"],
  "ow2": ["Overwatch 2"],
  "overwatch 2": ["Overwatch 2"],
  "rocket league": ["Rocket League"],
  "rl": ["Rocket League"],
  "rainbow six": ["Tom Clancy's Rainbow Six Siege"],
  "rainbow six siege": ["Tom Clancy's Rainbow Six Siege"],
  "r6": ["Tom Clancy's Rainbow Six Siege"],
  "r6s": ["Tom Clancy's Rainbow Six Siege"],
  "pubg": ["PUBG: BATTLEGROUNDS"],
  "pubg mobile": ["PUBG MOBILE"],
  "cod": ["Call of Duty"],
  "warzone": ["Call of Duty: Warzone"],
  "mw3": ["Call of Duty: Modern Warfare III"],
  "mw2": ["Call of Duty: Modern Warfare II"],
  "tekken": ["TEKKEN 8", "Tekken 7"],
  "tekken 8": ["TEKKEN 8"],
  "street fighter": ["Street Fighter 6", "Street Fighter V"],
  "sf6": ["Street Fighter 6"],
  "mortal kombat": ["Mortal Kombat 1"],
  "mk1": ["Mortal Kombat 1"],
  "tft": ["Teamfight Tactics"],
  "teamfight tactics": ["Teamfight Tactics"],
  "hearthstone": ["Hearthstone"],
  "hs": ["Hearthstone"],
  "wow": ["World of Warcraft"],
  "world of warcraft": ["World of Warcraft"],
  "gta": ["Grand Theft Auto V"],
  "gta5": ["Grand Theft Auto V"],
  "gta v": ["Grand Theft Auto V"],
  "minecraft": ["Minecraft"],
  "mc": ["Minecraft"],
  "nba 2k": ["NBA 2K25", "NBA 2K24"],
  "nba2k": ["NBA 2K25", "NBA 2K24"],
  "nba 2k25": ["NBA 2K25"],
  "nba 2k24": ["NBA 2K24"],
  "fifa": ["EA Sports FC 25"],
  "fifa 24": ["EA Sports FC 25"],
  "fifa 23": ["FIFA 23"],
};

const normalizeGameName = (name: string): string => {
  return name.toLowerCase().trim();
};

const getSearchVariants = (game: GameRecord): string[] => {
  const variants: string[] = [];

  if (game.twitch_search_name) {
    variants.push(game.twitch_search_name);
  }

  const normalizedName = normalizeGameName(game.name);
  const mappedNames = TWITCH_GAME_NAME_MAPPINGS[normalizedName];
  if (mappedNames) {
    variants.push(...mappedNames);
  }

  if (!variants.includes(game.name)) {
    variants.push(game.name);
  }

  return variants;
};

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

const getTwitchAccessToken = async (clientId: string, clientSecret: string): Promise<string> => {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    console.log("[Twitch Games] Using cached access token");
    return cachedAccessToken;
  }

  console.log("[Twitch Games] Requesting new access token");
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
    const errorText = await tokenResponse.text();
    console.error(`[Twitch Games] Token request failed: ${tokenResponse.status} - ${errorText}`);
    throw new Error(`Failed to get Twitch access token: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error("No access token received from Twitch");
  }

  cachedAccessToken = tokenData.access_token;
  tokenExpiresAt = Date.now() + (tokenData.expires_in - 300) * 1000;
  console.log("[Twitch Games] New access token obtained and cached");
  return cachedAccessToken;
};

const fetchSingleGameCover = async (
  searchName: string,
  clientId: string,
  accessToken: string
): Promise<{ twitchId: string; coverUrl: string; matchedName: string } | null> => {
  const searchUrl = `https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(searchName)}&first=5`;

  const response = await fetch(searchUrl, {
    headers: {
      "Client-ID": clientId,
      "Authorization": `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    console.error(`[Twitch Games] Search API error for "${searchName}": ${response.status}`);
    return null;
  }

  const data: TwitchSearchResponse = await response.json();

  if (data.data && data.data.length > 0) {
    const searchLower = searchName.toLowerCase().replace(/[-:]/g, " ").replace(/\s+/g, " ").trim();

    let bestMatch = data.data[0];
    for (const game of data.data) {
      const gameLower = game.name.toLowerCase().replace(/[-:]/g, " ").replace(/\s+/g, " ").trim();
      if (gameLower === searchLower) {
        bestMatch = game;
        break;
      }
      if (gameLower.includes(searchLower) || searchLower.includes(gameLower)) {
        bestMatch = game;
        break;
      }
    }

    console.log(`[Twitch Games] Search for "${searchName}" found: ${data.data.map(g => g.name).join(", ")} -> selected "${bestMatch.name}"`);

    const coverUrl = bestMatch.box_art_url
      .replace("{width}", "1920")
      .replace("{height}", "2560");

    return {
      twitchId: bestMatch.id,
      coverUrl: coverUrl,
      matchedName: bestMatch.name
    };
  }

  console.log(`[Twitch Games] Search for "${searchName}" returned no results`);
  return null;
};

const fetchGameCoverWithFallback = async (
  game: GameRecord,
  clientId: string,
  accessToken: string
): Promise<{ twitchId: string; coverUrl: string; matchedName: string } | null> => {
  const variants = getSearchVariants(game);
  console.log(`[Twitch Games] Trying ${variants.length} variants for "${game.name}": ${variants.join(", ")}`);

  for (const variant of variants) {
    const result = await fetchSingleGameCover(variant, clientId, accessToken);
    if (result) {
      console.log(`[Twitch Games] Found match for "${game.name}" using variant "${variant}" -> "${result.matchedName}"`);
      return result;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return null;
};

const fetchGameCovers = async (
  gameNames: string[],
  clientId: string,
  accessToken: string
): Promise<Map<string, { twitchId: string; coverUrl: string }>> => {
  const coverMap = new Map<string, { twitchId: string; coverUrl: string }>();

  const chunks: string[][] = [];
  for (let i = 0; i < gameNames.length; i += 100) {
    chunks.push(gameNames.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const queryParams = chunk.map(name => `name=${encodeURIComponent(name)}`).join("&");
    const gamesUrl = `https://api.twitch.tv/helix/games?${queryParams}`;

    console.log(`[Twitch Games] Fetching covers for ${chunk.length} games`);

    const response = await fetch(gamesUrl, {
      headers: {
        "Client-ID": clientId,
        "Authorization": `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      console.error(`[Twitch Games] API error: ${response.status}`);
      continue;
    }

    const data: TwitchGamesResponse = await response.json();

    for (const game of data.data) {
      const coverUrl = game.box_art_url
        .replace("{width}", "1920")
        .replace("{height}", "2560");

      coverMap.set(game.name.toLowerCase(), {
        twitchId: game.id,
        coverUrl: coverUrl
      });
    }
  }

  return coverMap;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[Twitch Games] Starting game cover sync");

    const { data: twitchApiConfig, error: configError } = await supabase
      .from("platform_api_integrations")
      .select("api_key, api_url")
      .eq("api_name", "Twitch API")
      .eq("is_active", true)
      .single();

    if (configError || !twitchApiConfig) {
      console.error("[Twitch Games] Twitch API configuration not found:", configError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Twitch API configuration not found" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let twitchCredentials;
    try {
      twitchCredentials = JSON.parse(twitchApiConfig.api_key);
    } catch (parseError) {
      console.error("[Twitch Games] Error parsing Twitch API credentials:", parseError);
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

    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id, name, twitch_cover_url, twitch_game_id, cover_last_updated, twitch_search_name")
      .neq("is_collection", true);

    if (gamesError) {
      console.error("[Twitch Games] Error fetching games:", gamesError.message);
      return new Response(
        JSON.stringify({ success: false, error: "Error fetching games" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!games || games.length === 0) {
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: "No games found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const gamesToUpdate: GameRecord[] = games.filter(game => {
      if (!game.twitch_cover_url) return true;
      if (!game.cover_last_updated) return true;
      return new Date(game.cover_last_updated) < sevenDaysAgo;
    });

    if (gamesToUpdate.length === 0) {
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: "All game covers are up to date" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[Twitch Games] Updating covers for ${gamesToUpdate.length} games`);

    const gameNames = gamesToUpdate.map(g => g.name);
    const coverMap = await fetchGameCovers(gameNames, client_id, accessToken);

    let updatedCount = 0;
    const unmatchedGames: GameRecord[] = [];

    for (const game of gamesToUpdate) {
      const coverData = coverMap.get(game.name.toLowerCase());
      if (coverData) {
        const { error: updateError } = await supabase
          .from("games")
          .update({
            twitch_cover_url: coverData.coverUrl,
            twitch_game_id: coverData.twitchId,
            cover_last_updated: new Date().toISOString()
          })
          .eq("id", game.id);

        if (updateError) {
          console.error(`[Twitch Games] Error updating game ${game.name}:`, updateError);
        } else {
          updatedCount++;
          console.log(`[Twitch Games] Updated cover for ${game.name}`);
        }
      } else {
        unmatchedGames.push(game);
      }
    }

    if (unmatchedGames.length > 0) {
      console.log(`[Twitch Games] Attempting fallback search for ${unmatchedGames.length} unmatched games`);

      for (const game of unmatchedGames) {
        const fallbackResult = await fetchGameCoverWithFallback(game, client_id, accessToken);

        if (fallbackResult) {
          const { error: updateError } = await supabase
            .from("games")
            .update({
              twitch_cover_url: fallbackResult.coverUrl,
              twitch_game_id: fallbackResult.twitchId,
              cover_last_updated: new Date().toISOString()
            })
            .eq("id", game.id);

          if (updateError) {
            console.error(`[Twitch Games] Error updating game ${game.name}:`, updateError);
          } else {
            updatedCount++;
            console.log(`[Twitch Games] Updated cover for ${game.name} via fallback`);
          }
        } else {
          console.log(`[Twitch Games] No Twitch match found for ${game.name} (all variants tried)`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedCount,
        total: gamesToUpdate.length,
        message: `Updated ${updatedCount} of ${gamesToUpdate.length} game covers`
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
    console.error("[Twitch Games] Error in fetch-game-covers function:", error);
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
