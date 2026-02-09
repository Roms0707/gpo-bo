import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

interface VideoRequest {
  game_id: string;
  topic?: string;
  keywords?: string[];
  limit?: number;
  exclude_ids?: string[];
}

interface VideoResult {
  id: string;
  title: string;
  description: string;
  content_url: string;
  playlist_image_url: string;
  duration: number | null;
  theme_label: string | null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TOPIC_KEYWORD_MAP: { [topic: string]: string[] } = {
  'farming': ['farm', 'cs', 'minion', 'last hit', 'gold', 'wave'],
  'vision': ['ward', 'vision', 'map', 'awareness', 'control ward'],
  'teamfight': ['teamfight', 'team fight', 'engage', 'positioning', 'combo'],
  'laning': ['lane', 'trading', 'harass', 'poke', 'matchup'],
  'macro': ['macro', 'rotation', 'objective', 'dragon', 'baron', 'split'],
  'mechanics': ['mechanic', 'combo', 'animation', 'cancel', 'flash'],
  'jungle': ['jungle', 'gank', 'path', 'clear', 'invade'],
  'support': ['support', 'roam', 'peel', 'engage', 'vision'],
  'adc': ['adc', 'attack damage', 'kiting', 'positioning', 'auto'],
  'mid': ['mid', 'roam', 'assassin', 'mage', 'wave clear'],
  'top': ['top', 'split push', 'teleport', 'tank', 'bruiser'],
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

    const requestData: VideoRequest = await req.json();
    const { game_id, topic, keywords = [], limit = 6, exclude_ids = [] } = requestData;

    if (!game_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'game_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Coaching Videos] Fetching videos for game ${game_id}, topic: ${topic}`);

    let searchKeywords: string[] = [...keywords];

    if (topic && TOPIC_KEYWORD_MAP[topic.toLowerCase()]) {
      searchKeywords = [...searchKeywords, ...TOPIC_KEYWORD_MAP[topic.toLowerCase()]];
    }

    let query = supabase
      .from('game_contents')
      .select('id, title, description, content_url, playlist_image_url, duration, theme_label')
      .eq('game_id', game_id)
      .eq('content_type', 'video');

    if (exclude_ids.length > 0) {
      query = query.not('id', 'in', `(${exclude_ids.join(',')})`);
    }

    if (searchKeywords.length > 0) {
      const orConditions = searchKeywords.map(kw =>
        `title.ilike.%${kw}%,description.ilike.%${kw}%`
      ).join(',');
      query = query.or(orConditions);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data: videos, error } = await query;

    if (error) {
      console.error('[Coaching Videos] Database error:', error.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch videos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let results: VideoResult[] = videos || [];

    if (results.length < limit && searchKeywords.length > 0) {
      const existingIds = results.map(v => v.id);
      const allExcludeIds = [...exclude_ids, ...existingIds];

      let fallbackQuery = supabase
        .from('game_contents')
        .select('id, title, description, content_url, playlist_image_url, duration, theme_label')
        .eq('game_id', game_id)
        .eq('content_type', 'video');

      if (allExcludeIds.length > 0) {
        fallbackQuery = fallbackQuery.not('id', 'in', `(${allExcludeIds.join(',')})`);
      }

      fallbackQuery = fallbackQuery
        .order('created_at', { ascending: false })
        .limit(limit - results.length);

      const { data: fallbackVideos } = await fallbackQuery;

      if (fallbackVideos && fallbackVideos.length > 0) {
        results = [...results, ...fallbackVideos];
      }
    }

    console.log(`[Coaching Videos] Returning ${results.length} videos`);

    return new Response(
      JSON.stringify({
        success: true,
        videos: results,
        topic: topic || null,
        keywords_used: searchKeywords
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Coaching Videos] Error:', error.message, error.stack);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
