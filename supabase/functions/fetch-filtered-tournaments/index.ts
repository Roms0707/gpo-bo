import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface FilteredTournamentsRequest {
  status?: string;
  game_id?: string;
  user_country?: string;
  is_whitelisted?: boolean;
  limit?: number;
  offset?: number;
}

interface FilteredTournamentsResponse {
  success: boolean;
  data?: any[];
  total_count?: number;
  error?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Filtered Tournaments] Missing Supabase environment variables");
    return new Response(
      JSON.stringify({ success: false, error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const {
      status = 'all',
      game_id,
      user_country,
      is_whitelisted = false,
      limit = 50,
      offset = 0
    } = await req.json() as FilteredTournamentsRequest;

    console.log(`[Filtered Tournaments] Request received - Status: ${status}, Game ID: ${game_id}, Country: ${user_country}, Whitelisted: ${is_whitelisted}, Limit: ${limit}, Offset: ${offset}`);

    let query = supabase
      .from('tournaments')
      .select(`
        id,
        title,
        description,
        type,
        start_date,
        end_date,
        registration_start_date,
        registration_end_date,
        status,
        main_prize,
        full_prize,
        header_url,
        icon_url,
        announcement_url,
        twitch_url,
        is_twitch_live,
        twitch_last_checked,
        compatible_devices,
        discord_url,
        tournament_format,
        location_type,
        location_name,
        eligible_countries,
        minimum_age,
        required_documents_under_18,
        max_players_per_team,
        max_nb_players,
        allow_backups,
        max_backup_players,
        rules,
        private_server_code,
        game_id,
        games:game_id (
          id,
          name,
          publisher,
          image_url
        ),
        tournament_prizes (
          id,
          tournament_id,
          position,
          title,
          prize_name,
          image_url,
          created_at,
          prize_type,
          monetary_amount,
          currency,
          redemption_code
        )
      `, { count: 'exact' });

    if (game_id) {
      query = query.eq('game_id', game_id);
    }

    // Only apply country filter if user is NOT whitelisted
    // Whitelisted users (e.g., from France) can see ALL tournaments
    if (user_country && !is_whitelisted) {
      console.log(`[Filtered Tournaments] Applying country filter for ${user_country} (not whitelisted)`);
      query = query.or(`eligible_countries.is.null,eligible_countries.ilike.%${user_country}%`);
    } else if (is_whitelisted) {
      console.log(`[Filtered Tournaments] User is whitelisted - showing ALL tournaments regardless of country eligibility`);
    }

    const now = new Date().toISOString();
    
    if (status === 'ongoing') {
      query = query
        .lte('start_date', now)
        .gte('end_date', now)
        .eq('is_twitch_live', true);
    } else if (status === 'upcoming') {
      query = query.gt('start_date', now);
    } else if (status === 'completed') {
      query = query.lt('end_date', now);
    }

    query = query
      .range(offset, offset + limit - 1)
      .order('start_date', { ascending: false });

    const { data: tournaments, error: tournamentsError, count } = await query;

    if (tournamentsError) {
      console.error("[Filtered Tournaments] Error fetching tournaments:", {
        message: tournamentsError.message,
        details: tournamentsError.details,
        hint: tournamentsError.hint,
        code: tournamentsError.code
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error fetching tournaments",
          details: tournamentsError.message,
          code: tournamentsError.code
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const processedTournaments = (tournaments || []).map(tournament => {
      const now = new Date();
      const startDate = new Date(tournament.start_date);
      const endDate = new Date(tournament.end_date);
      const regStartDate = tournament.registration_start_date ? new Date(tournament.registration_start_date) : null;
      const regEndDate = tournament.registration_end_date ? new Date(tournament.registration_end_date) : null;

      let calculatedStatus = 'upcoming';
      if (now > endDate) {
        calculatedStatus = 'completed';
      } else if (now >= startDate && now <= endDate) {
        calculatedStatus = 'ongoing';
      }

      let registrationStatus = 'closed';
      if (regStartDate && now < regStartDate) {
        registrationStatus = 'not_started';
      } else if ((!regStartDate || now >= regStartDate) && (!regEndDate || now <= regEndDate)) {
        registrationStatus = 'open';
      }

      return {
        ...tournament,
        calculatedStatus,
        registrationStatus,
        game: tournament.games?.name || 'Unknown Game',
        startDate: tournament.start_date,
        endDate: tournament.end_date,
        registrationStartDate: tournament.registration_start_date,
        registrationEndDate: tournament.registration_end_date,
        mode: tournament.type,
        format: tournament.tournament_format,
        maxParticipants: tournament.max_nb_players,
        cashPrize: 0,
        currency: 'EUR',
        image: tournament.header_url,
        streamLink: tournament.twitch_url,
        locationType: tournament.location_type,
        locationName: tournament.location_name,
        is_twitch_live: tournament.is_twitch_live,
        twitch_last_checked: tournament.twitch_last_checked,
        prizes: tournament.tournament_prizes || [],
        allow_backups: tournament.allow_backups,
        max_backup_players: tournament.max_backup_players
      };
    });

    console.log(`[Filtered Tournaments] Successfully fetched ${processedTournaments.length} tournaments`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: processedTournaments,
        total_count: count || 0
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
    console.error("[Filtered Tournaments] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: errorMessage
      }),
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