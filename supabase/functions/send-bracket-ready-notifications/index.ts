import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface BracketReadyRequest {
  tournament_id: string;
}

interface TournamentData {
  id: string;
  title: string;
  startDate: string;
  image?: string;
  header_url?: string;
}

interface BracketMatch {
  id: string;
  round: number;
  player1_id: string | null;
  player2_id: string | null;
  team1_id: string | null;
  team2_id: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tournament_id }: BracketReadyRequest = await req.json();

    if (!tournament_id) {
      return new Response(
        JSON.stringify({ error: 'tournament_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, title, startDate, image, header_url')
      .eq('id', tournament_id)
      .single();

    if (tournamentError || !tournament) {
      return new Response(
        JSON.stringify({ error: 'Tournament not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: registrations, error: registrationsError } = await supabase
      .from('tournament_registrations')
      .select('user_id, team_id')
      .eq('tournament_id', tournament_id)
      .in('status', ['approved', 'validated']);

    if (registrationsError) {
      console.error('Error fetching registrations:', registrationsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch registrations' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!registrations || registrations.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No participants to notify',
          notified_count: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: bracketMatches, error: bracketError } = await supabase
      .from('tournament_brackets')
      .select('id, round, player1_id, player2_id, team1_id, team2_id')
      .eq('tournament_id', tournament_id)
      .eq('round', 1);

    if (bracketError) {
      console.error('Error fetching bracket data:', bracketError);
    }

    const playerOpponentMap = new Map<string, string | null>();

    if (bracketMatches && bracketMatches.length > 0) {
      for (const match of bracketMatches as BracketMatch[]) {
        if (match.player1_id && match.player2_id) {
          playerOpponentMap.set(match.player1_id, match.player2_id);
          playerOpponentMap.set(match.player2_id, match.player1_id);
        } else if (match.player1_id) {
          playerOpponentMap.set(match.player1_id, null);
        } else if (match.player2_id) {
          playerOpponentMap.set(match.player2_id, null);
        }
      }
    }

    const tournamentData = tournament as TournamentData;
    const totalParticipants = registrations.length;
    const tournamentImage = tournamentData.header_url || tournamentData.image;

    const notifications = registrations.map((reg) => {
      const opponentId = playerOpponentMap.get(reg.user_id) || null;

      return {
        user_id: reg.user_id,
        tournament_id: tournament_id,
        round_number: 1,
        notification_type: 'bracket_ready',
        message: 'notif.bracket_ready',
        metadata: {
          tournament_title: tournamentData.title,
          total_participants: totalParticipants,
          tournament_start_time: tournamentData.startDate,
          tournament_image: tournamentImage,
        },
        opponent_id: opponentId,
        team_id: reg.team_id || null,
        is_read: false,
      };
    });

    const { error: insertError } = await supabase
      .from('player_match_notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error inserting notifications:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create notifications' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notifications sent to ${totalParticipants} participants`,
        notified_count: totalParticipants,
        tournament_title: tournamentData.title,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
