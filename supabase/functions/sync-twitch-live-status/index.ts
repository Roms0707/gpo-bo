import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface TwitchStreamResponse {
  data: Array<{
    id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    game_id: string;
    game_name: string;
    type: string;
    title: string;
    viewer_count: number;
    started_at: string;
    language: string;
    thumbnail_url: string;
  }>;
}

interface SyncResponse {
  success: boolean;
  stats?: {
    total_checked: number;
    live_channels: number;
    offline_channels: number;
    errors: number;
  };
  error?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper function to extract Twitch channel name from URL
const extractTwitchChannelName = (twitchUrl: string): string | null => {
  try {
    const url = new URL(twitchUrl);
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);

    if (pathParts.length > 0) {
      return pathParts[pathParts.length - 1];
    }

    return null;
  } catch (error) {
    console.error('Error extracting Twitch channel name:', error);
    return null;
  }
};

// Helper function to get Twitch OAuth token
const getTwitchAccessToken = async (clientId: string, clientSecret: string): Promise<string | null> => {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      })
    });

    if (!response.ok) {
      console.error('Failed to get Twitch access token:', response.status);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Twitch access token:', error);
    return null;
  }
};

// Helper function to check if channels are live
const checkChannelsLiveStatus = async (
  channelNames: string[],
  clientId: string,
  accessToken: string
): Promise<Map<string, boolean>> => {
  const statusMap = new Map<string, boolean>();

  try {
    // Twitch API allows checking up to 100 channels at once
    const chunks = [];
    for (let i = 0; i < channelNames.length; i += 100) {
      chunks.push(channelNames.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      const userLogins = chunk.join('&user_login=');
      const streamsUrl = `https://api.twitch.tv/helix/streams?user_login=${userLogins}`;

      const response = await fetch(streamsUrl, {
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) {
        console.error(`Failed to check streams for chunk: ${response.status}`);
        // Mark all channels in this chunk as offline if API call fails
        chunk.forEach(channel => statusMap.set(channel, false));
        continue;
      }

      const streamData: TwitchStreamResponse = await response.json();

      // Mark all channels in chunk as offline first
      chunk.forEach(channel => statusMap.set(channel, false));

      // Then mark live channels as true
      streamData.data.forEach(stream => {
        statusMap.set(stream.user_login.toLowerCase(), true);
      });
    }
  } catch (error) {
    console.error('Error checking channels live status:', error);
    // Mark all channels as offline if there's an error
    channelNames.forEach(channel => statusMap.set(channel, false));
  }

  return statusMap;
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
    console.log("[Twitch Sync] Starting Twitch live status synchronization");

    // Get Twitch API configuration from database
    const { data: twitchApiConfig, error: configError } = await supabase
      .from('platform_api_integrations')
      .select('api_key, api_url')
      .eq('api_name', 'Twitch API')
      .eq('is_active', true)
      .single();

    if (configError || !twitchApiConfig) {
      console.error("[Twitch Sync] Twitch API configuration not found:", configError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Twitch API configuration not found" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse Twitch API credentials
    let twitchCredentials;
    try {
      twitchCredentials = JSON.parse(twitchApiConfig.api_key);
    } catch (parseError) {
      console.error("[Twitch Sync] Error parsing Twitch API credentials:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid Twitch API credentials format" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { client_id, client_secret } = twitchCredentials;

    if (!client_id || !client_secret) {
      console.error("[Twitch Sync] Missing Twitch client ID or secret");
      return new Response(
        JSON.stringify({ success: false, error: "Twitch client ID or secret not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get Twitch access token
    const accessToken = await getTwitchAccessToken(client_id, client_secret);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to get Twitch access token" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all tournaments with Twitch URLs
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('id, title, twitch_url, start_date, end_date, status')
      .not('twitch_url', 'is', null)
      .neq('twitch_url', '');

    if (tournamentsError) {
      console.error("[Twitch Sync] Error fetching tournaments:", tournamentsError.message);
      return new Response(
        JSON.stringify({ success: false, error: "Error fetching tournaments" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!tournaments || tournaments.length === 0) {
      console.log("[Twitch Sync] No tournaments with Twitch URLs found");
      return new Response(
        JSON.stringify({
          success: true,
          stats: { total_checked: 0, live_channels: 0, offline_channels: 0, errors: 0 }
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[Twitch Sync] Found ${tournaments.length} tournaments with Twitch URLs`);

    // Extract channel names and filter for ongoing tournaments only
    const now = new Date();
    const ongoingTournaments = tournaments.filter(tournament => {
      const startDate = new Date(tournament.start_date);
      const endDate = new Date(tournament.end_date);
      return now >= startDate && now <= endDate;
    });

    console.log(`[Twitch Sync] ${ongoingTournaments.length} tournaments are currently ongoing`);

    const channelMap = new Map<string, string[]>(); // channel -> tournament IDs
    const allChannelNames: string[] = [];

    ongoingTournaments.forEach(tournament => {
      const channelName = extractTwitchChannelName(tournament.twitch_url);
      if (channelName) {
        const lowerChannelName = channelName.toLowerCase();
        if (!channelMap.has(lowerChannelName)) {
          channelMap.set(lowerChannelName, []);
          allChannelNames.push(lowerChannelName);
        }
        channelMap.get(lowerChannelName)!.push(tournament.id);
      }
    });

    console.log(`[Twitch Sync] Checking ${allChannelNames.length} unique channels`);

    // Check live status for all channels
    const liveStatusMap = await checkChannelsLiveStatus(allChannelNames, client_id, accessToken);

    let totalChecked = 0;
    let liveChannels = 0;
    let offlineChannels = 0;
    let errors = 0;

    // Update database with live status
    for (const [channelName, tournamentIds] of channelMap.entries()) {
      const isLive = liveStatusMap.get(channelName) || false;

      try {
        // Update all tournaments for this channel
        const { error: updateError } = await supabase
          .from('tournaments')
          .update({
            is_twitch_live: isLive,
            twitch_last_checked: new Date().toISOString()
          })
          .in('id', tournamentIds);

        if (updateError) {
          console.error(`[Twitch Sync] Error updating tournaments for channel ${channelName}:`, updateError);
          errors++;
        } else {
          totalChecked += tournamentIds.length;
          if (isLive) {
            liveChannels++;
            console.log(`[Twitch Sync] Channel ${channelName} is LIVE (${tournamentIds.length} tournaments)`);
          } else {
            offlineChannels++;
            console.log(`[Twitch Sync] Channel ${channelName} is OFFLINE (${tournamentIds.length} tournaments)`);
          }
        }
      } catch (error) {
        console.error(`[Twitch Sync] Error updating channel ${channelName}:`, error);
        errors++;
      }
    }

    // Also update tournaments that are not ongoing to be offline
    const nonOngoingTournaments = tournaments.filter(tournament => {
      const startDate = new Date(tournament.start_date);
      const endDate = new Date(tournament.end_date);
      return now < startDate || now > endDate;
    });

    if (nonOngoingTournaments.length > 0) {
      const { error: offlineUpdateError } = await supabase
        .from('tournaments')
        .update({
          is_twitch_live: false,
          twitch_last_checked: new Date().toISOString()
        })
        .in('id', nonOngoingTournaments.map(t => t.id));

      if (offlineUpdateError) {
        console.error("[Twitch Sync] Error updating non-ongoing tournaments:", offlineUpdateError);
        errors++;
      } else {
        console.log(`[Twitch Sync] Set ${nonOngoingTournaments.length} non-ongoing tournaments to offline`);
      }
    }

    const stats = {
      total_checked: totalChecked,
      live_channels: liveChannels,
      offline_channels: offlineChannels,
      errors: errors
    };

    console.log(`[Twitch Sync] Synchronization completed:`, stats);

    return new Response(
      JSON.stringify({ success: true, stats }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error("[Twitch Sync] Error in sync-twitch-live-status function:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error during Twitch sync" }),
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
