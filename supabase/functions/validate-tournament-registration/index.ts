import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface TournamentRegistrationRequest {
  tournament_id: string;
  user_id: string;
  team_id?: string;
  is_whitelisted?: boolean;
}

interface ValidationResponse {
  success: boolean;
  error?: string;
  details?: any;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, apikey, x-client-info",
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
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { tournament_id, user_id, team_id, is_whitelisted = false } = await req.json() as TournamentRegistrationRequest;
    console.log(`[Tournament Registration Validation] Request for tournament: ${tournament_id}, user: ${user_id}, team: ${team_id}, whitelisted: ${is_whitelisted}`);

    // Validate input
    if (!tournament_id || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Tournament ID and User ID are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1. Get tournament details
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select(`
        id,
        title,
        type,
        max_nb_players,
        max_players_per_team,
        eligible_countries,
        minimum_age,
        start_date,
        end_date,
        registration_start_date,
        registration_end_date
      `)
      .eq('id', tournament_id)
      .single();

    if (tournamentError || !tournament) {
      return new Response(
        JSON.stringify({ success: false, error: "Tournament not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        country,
        date_of_birth,
        has_parental_consent,
        parental_consent_url
      `)
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Check if user is already registered
    const { data: existingRegistration, error: regCheckError } = await supabase
      .from('tournament_registrations')
      .select('id')
      .eq('tournament_id', tournament_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (regCheckError) {
      return new Response(
        JSON.stringify({ success: false, error: "Error checking existing registration" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (existingRegistration) {
      return new Response(
        JSON.stringify({ success: false, error: "User is already registered for this tournament" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Check registration dates
    const now = new Date();

    if (tournament.registration_start_date) {
      const regStartDate = new Date(tournament.registration_start_date);
      if (now < regStartDate) {
        return new Response(
          JSON.stringify({ success: false, error: "Registration has not started yet" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    if (tournament.registration_end_date) {
      const regEndDate = new Date(tournament.registration_end_date);
      if (now > regEndDate) {
        return new Response(
          JSON.stringify({ success: false, error: "Registration has ended" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // 5. Check tournament capacity
    const isTeamTournament = tournament.type?.toLowerCase().includes('team');

    if (isTeamTournament && tournament.max_players_per_team) {
      // For team tournaments, check team capacity if team_id is provided
      if (team_id) {
        const { count: teamMemberCount, error: teamCountError } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team_id)
          .eq('status', 'accepted');

        if (teamCountError) {
          return new Response(
            JSON.stringify({ success: false, error: "Error checking team capacity" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        if (teamMemberCount && teamMemberCount >= tournament.max_players_per_team) {
          return new Response(
            JSON.stringify({ success: false, error: "Team is already full" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }
    }

    // Check overall tournament capacity
    if (tournament.max_nb_players) {
      let currentParticipants = 0;

      if (isTeamTournament) {
        // Count unique teams
        const { count: teamCount, error: teamCountError } = await supabase
          .from('tournament_registrations')
          .select('team_id', { count: 'exact', head: true })
          .eq('tournament_id', tournament_id)
          .not('team_id', 'is', null)
          .in('status', ['pending', 'approved']);

        if (teamCountError) {
          return new Response(
            JSON.stringify({ success: false, error: "Error checking tournament capacity" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        currentParticipants = teamCount || 0;
      } else {
        // Count individual participants
        const { count: participantCount, error: participantCountError } = await supabase
          .from('tournament_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournament_id)
          .in('status', ['pending', 'approved']);

        if (participantCountError) {
          return new Response(
            JSON.stringify({ success: false, error: "Error checking tournament capacity" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        currentParticipants = participantCount || 0;
      }

      if (currentParticipants >= tournament.max_nb_players) {
        return new Response(
          JSON.stringify({ success: false, error: "Tournament is full" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // 6. Check country eligibility (skip for whitelisted users)
    if (!is_whitelisted && tournament.eligible_countries && user.country) {
      console.log(`[Tournament Registration Validation] Checking country eligibility for ${user.country} (not whitelisted)`);
      const eligibleCountries = tournament.eligible_countries.split(',').map(c => c.trim());
      if (!eligibleCountries.includes(user.country)) {
        return new Response(
          JSON.stringify({ success: false, error: "Your country is not eligible for this tournament" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else if (is_whitelisted) {
      console.log(`[Tournament Registration Validation] User is whitelisted - bypassing country eligibility check`);
    }

    // 7. Check age eligibility
    if (tournament.minimum_age && user.date_of_birth) {
      const birthDate = new Date(user.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < tournament.minimum_age) {
        return new Response(
          JSON.stringify({ success: false, error: `You must be at least ${tournament.minimum_age} years old to participate` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // 8. Check parental consent for minors
      if (age < 18) {
        if (user.has_parental_consent === false || !user.parental_consent_url) {
          return new Response(
            JSON.stringify({ success: false, error: "Parental consent is required for users under 18" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }
    }

    // All validations passed
    return new Response(
      JSON.stringify({
        success: true,
        details: {
          tournament_title: tournament.title,
          user_eligible: true,
          max_participants: tournament.max_nb_players || null
        }
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
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error during validation" }),
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
