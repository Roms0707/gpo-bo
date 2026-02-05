import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface TeamApplicationAcceptanceRequest {
  application_id: string;
  team_id: string;
  user_id: string;
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
    const { application_id, team_id, user_id } = await req.json() as TeamApplicationAcceptanceRequest;

    // Validate input
    if (!application_id || !team_id || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Application ID, Team ID, and User ID are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1. Verify the application exists and is pending
    const { data: application, error: applicationError } = await supabase
      .from('team_applications')
      .select(`
        id,
        status,
        team_id,
        user_id,
        tournament_id
      `)
      .eq('id', application_id)
      .eq('team_id', team_id)
      .eq('user_id', user_id)
      .single();

    if (applicationError || !application) {
      return new Response(
        JSON.stringify({ success: false, error: "Team application not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (application.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: false, error: "Application is not in pending status" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Get team details and tournament info
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        tournament_id,
        tournaments:tournament_id (
          id,
          title,
          type,
          max_players_per_team
        )
      `)
      .eq('id', team_id)
      .single();

    if (teamError || !team) {
      return new Response(
        JSON.stringify({ success: false, error: "Team not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Verify this is a team tournament
    const isTeamTournament = team.tournaments?.type?.toLowerCase().includes('team');
    if (!isTeamTournament) {
      return new Response(
        JSON.stringify({ success: false, error: "This is not a team tournament" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Check if user is already a member of any team for this tournament
    const { data: existingMembership, error: membershipError } = await supabase
      .from('team_members')
      .select(`
        id,
        team_id,
        teams:team_id (
          tournament_id
        )
      `)
      .eq('user_id', user_id)
      .eq('status', 'accepted');

    if (membershipError) {
      return new Response(
        JSON.stringify({ success: false, error: "Error checking user's team membership" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is already in a team for this tournament
    const existingTeamForTournament = existingMembership?.find(
      membership => membership.teams?.tournament_id === team.tournament_id
    );

    if (existingTeamForTournament) {
      return new Response(
        JSON.stringify({ success: false, error: "User is already a member of another team for this tournament" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Check team capacity
    const maxPlayersPerTeam = team.tournaments?.max_players_per_team;
    
    if (maxPlayersPerTeam) {
      const { count: currentMemberCount, error: countError } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team_id)
        .eq('status', 'accepted');

      if (countError) {
        return new Response(
          JSON.stringify({ success: false, error: "Error checking team capacity" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const currentMembers = currentMemberCount || 0;
      
      if (currentMembers >= maxPlayersPerTeam) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Team is full (${currentMembers}/${maxPlayersPerTeam} members)` 
          }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // 6. Verify user meets tournament requirements (country, age, parental consent)
    const tournament_data = team.tournaments;
    
    // Check country eligibility
    if (tournament_data?.eligible_countries && user.country) {
      const eligibleCountries = tournament_data.eligible_countries.split(',').map(c => c.trim());
      if (!eligibleCountries.includes(user.country)) {
        return new Response(
          JSON.stringify({ success: false, error: "User's country is not eligible for this tournament" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Check age eligibility
    if (tournament_data?.minimum_age && user.date_of_birth) {
      const birthDate = new Date(user.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < tournament_data.minimum_age) {
        return new Response(
          JSON.stringify({ success: false, error: `User must be at least ${tournament_data.minimum_age} years old` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check parental consent for minors
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
          team_name: team.name,
          tournament_title: tournament_data?.title,
          user_eligible: true
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