import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

interface FetchStatsRequest {
  url: string;
  platform: string;
  game_id: string;
}

interface ParsedStats {
  rank?: string;
  winRate?: number;
  kd?: number;
  level?: number;
  gamesPlayed?: number;
  additionalStats?: Record<string, any>;
  platform: string;
  fetchedAt: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLATFORM_PATTERNS: Record<string, RegExp> = {
  'tracker.gg': /tracker\.gg\/(valorant|apex|rocket-league|overwatch|cs2|fortnite|fc)\/(profile|player)/i,
  'op.gg': /op\.gg\/summoners?\//i,
  'u.gg': /u\.gg\/lol\/profile\//i,
  'leetify': /leetify\.com\/(app\/)?profile\//i,
  'dotabuff': /dotabuff\.com\/players\//i,
  'opendota': /opendota\.com\/players\//i,
  'fortnitetracker': /fortnitetracker\.com\/profile\//i,
  'overbuff': /overbuff\.com\/players\//i,
};

const RATE_LIMIT_HOURS = 1;

const validateUrlFormat = (url: string, platform: string): { valid: boolean; error?: string } => {
  try {
    new URL(url);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  const pattern = PLATFORM_PATTERNS[platform];
  if (pattern && !pattern.test(url)) {
    return { valid: false, error: `URL does not match expected ${platform} format` };
  }

  return { valid: true };
};

const checkRateLimit = async (
  supabase: any,
  userId: string,
  gameId: string
): Promise<{ allowed: boolean; retryAfter?: number }> => {
  const { data: profile } = await supabase
    .from('user_game_manual_profiles')
    .select('external_stats_last_fetched')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .maybeSingle();

  if (!profile?.external_stats_last_fetched) {
    return { allowed: true };
  }

  const lastFetched = new Date(profile.external_stats_last_fetched);
  const now = new Date();
  const hoursSinceLastFetch = (now.getTime() - lastFetched.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastFetch < RATE_LIMIT_HOURS) {
    const retryAfterMinutes = Math.ceil((RATE_LIMIT_HOURS - hoursSinceLastFetch) * 60);
    return { allowed: false, retryAfter: retryAfterMinutes };
  }

  return { allowed: true };
};

const fetchAndValidateUrl = async (url: string): Promise<{ accessible: boolean; error?: string }> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return { accessible: false, error: 'Profile not found' };
    }

    if (response.status === 403) {
      return { accessible: false, error: 'Profile is private or access denied' };
    }

    if (!response.ok && response.status !== 405) {
      return { accessible: false, error: `Unable to access profile (status: ${response.status})` };
    }

    return { accessible: true };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { accessible: false, error: 'Request timed out' };
    }
    return { accessible: false, error: 'Unable to reach stats platform' };
  }
};

const createValidatedStats = (platform: string): ParsedStats => {
  return {
    platform,
    fetchedAt: new Date().toISOString(),
    additionalStats: {
      note: 'URL validated successfully. Full stats parsing requires platform API access.',
      validatedUrl: true,
    },
  };
};

Deno.serve(async (req: Request) => {
  console.log('[Fetch External Stats] Request received');

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('[Fetch External Stats] Missing environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url, platform, game_id }: FetchStatsRequest = await req.json();
    console.log(`[Fetch External Stats] User: ${user.id}, Platform: ${platform}, Game: ${game_id}`);

    if (!url || !platform || !game_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL, platform, and game_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const urlValidation = validateUrlFormat(url, platform);
    if (!urlValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: urlValidation.error, errorType: 'invalid_format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rateLimit = await checkRateLimit(supabase, user.id, game_id);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Rate limited. Try again in ${rateLimit.retryAfter} minutes.`,
          errorType: 'rate_limited',
          retryAfter: rateLimit.retryAfter,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Fetch External Stats] Validating URL accessibility...');
    const accessCheck = await fetchAndValidateUrl(url);

    if (!accessCheck.accessible) {
      return new Response(
        JSON.stringify({
          success: false,
          error: accessCheck.error,
          errorType: 'not_accessible',
          troubleshooting: [
            'Make sure the profile URL is correct',
            'Check if the profile is set to public',
            'Try copying the URL directly from the stats website',
          ],
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Fetch External Stats] URL is accessible, creating validated stats');
    const parsedStats = createValidatedStats(platform);

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('user_game_manual_profiles')
      .update({
        external_stats_validated: true,
        external_stats_validated_at: now,
        external_stats_cached_data: parsedStats,
        external_stats_last_fetched: now,
        updated_at: now,
      })
      .eq('user_id', user.id)
      .eq('game_id', game_id);

    if (updateError) {
      console.error('[Fetch External Stats] Error updating profile:', updateError.message);
    }

    console.log('[Fetch External Stats] Successfully validated and cached stats');

    return new Response(
      JSON.stringify({
        success: true,
        validated: true,
        stats: parsedStats,
        message: 'Profile URL validated successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[Fetch External Stats] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
