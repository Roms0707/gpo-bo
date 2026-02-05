import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
serve(async (req)=>{
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  // Initialize Supabase client
  const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  try {
    const { user_id } = await req.json();
    console.log(`[Tournament Feedback Check] Request received for user: ${user_id}`);
    // Validate input
    if (!user_id) {
      console.error("[Tournament Feedback Check] Missing user ID");
      return new Response(JSON.stringify({
        success: false,
        error: "User ID is required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Find tournaments that:
    // 1. User is registered for
    // 2. Tournament has ended (end_date < now)
    // 3. User hasn't provided feedback yet
    // 4. Tournament ended within the last 7 days (to avoid showing old tournaments)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: eligibleTournaments, error: tournamentsError } = await supabase.from('tournament_registrations').select(`
        tournament_id,
        tournaments:tournament_id (
          id,
          title,
          end_date,
          game_id,
          games:game_id (
            name
          )
        )
      `).eq('user_id', user_id).in('status', [
      'approved',
      'pending'
    ]) // Include both approved and pending registrations
    .lt('tournaments.end_date', new Date().toISOString()) // Tournament has ended
    .gte('tournaments.end_date', sevenDaysAgo.toISOString()); // Tournament ended within last 7 days
    if (tournamentsError) {
      console.error("[Tournament Feedback Check] Error fetching tournaments:", tournamentsError.message);
      return new Response(JSON.stringify({
        success: false,
        error: "Error fetching tournaments"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    if (!eligibleTournaments || eligibleTournaments.length === 0) {
      console.log("[Tournament Feedback Check] No eligible tournaments found for user");
      return new Response(JSON.stringify({
        success: true,
        data: null
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Check which tournaments the user hasn't provided feedback for yet
    const tournamentIds = eligibleTournaments.map((reg)=>reg.tournament_id);
    const { data: existingFeedback, error: feedbackError } = await supabase.from('tournament_feedback').select('tournament_id').eq('user_id', user_id).in('tournament_id', tournamentIds);
    if (feedbackError) {
      console.error("[Tournament Feedback Check] Error checking existing feedback:", feedbackError.message);
      return new Response(JSON.stringify({
        success: false,
        error: "Error checking existing feedback"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Filter out tournaments that already have feedback
    const feedbackProvidedTournamentIds = new Set((existingFeedback || []).map((feedback)=>feedback.tournament_id));
    const tournamentsNeedingFeedback = eligibleTournaments.filter((reg)=>!feedbackProvidedTournamentIds.has(reg.tournament_id));
    if (tournamentsNeedingFeedback.length === 0) {
      console.log("[Tournament Feedback Check] User has already provided feedback for all eligible tournaments");
      return new Response(JSON.stringify({
        success: true,
        data: null
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Return the first tournament that needs feedback (most recently ended)
    const tournamentNeedingFeedback = tournamentsNeedingFeedback[0];
    const tournament = tournamentNeedingFeedback.tournaments;
    if (!tournament) {
      console.log("[Tournament Feedback Check] Tournament data not found");
      return new Response(JSON.stringify({
        success: true,
        data: null
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const responseData = {
      tournament_id: tournament.id,
      tournament_title: tournament.title,
      tournament_end_date: tournament.end_date,
      game_name: tournament.games?.name || 'Unknown Game'
    };
    console.log(`[Tournament Feedback Check] Found tournament needing feedback: ${tournament.title}`);
    return new Response(JSON.stringify({
      success: true,
      data: responseData
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("[Tournament Feedback Check] Error in check-tournament-feedback function:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
