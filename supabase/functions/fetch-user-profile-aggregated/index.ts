import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface UserProfileRequest {
  user_id: string;
}

interface UserProfileResponse {
  success: boolean;
  data?: any;
  error?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
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
    const { user_id } = await req.json() as UserProfileRequest;
    console.log(`[User Profile Aggregated] Request received for user: ${user_id}`);

    // Validate input
    if (!user_id) {
      console.error("[User Profile Aggregated] Missing user ID");
      return new Response(
        JSON.stringify({ success: false, error: "User ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1. Get user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (userError || !userData) {
      console.error("[User Profile Aggregated] User not found:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Get gaming accounts with game publisher info
    const { data: gamingAccounts, error: gamingAccountsError } = await supabase
      .from('game_publisher_id_for_users')
      .select(`
        id,
        value,
        is_validated,
        validation_data,
        validation_date,
        validation_source,
        game_publisher_ids:game_publisher_id (
          id,
          label,
          id_name,
          games:game_id (
            id,
            name,
            publisher
          )
        )
      `)
      .eq('user_id', user_id);

    if (gamingAccountsError) {
      console.error("[User Profile Aggregated] Error fetching gaming accounts:", gamingAccountsError.message);
    }

    // 3. Get player rankings
    const { data: playerRankings, error: playerRankingsError } = await supabase
      .from('player_rankings')
      .select(`
        id,
        elo_rating,
        wins,
        losses,
        rank_tier,
        last_updated,
        games:game_id (
          id,
          name,
          publisher
        )
      `)
      .eq('user_id', user_id);

    if (playerRankingsError) {
      console.error("[User Profile Aggregated] Error fetching player rankings:", playerRankingsError.message);
    }

    // 4. Get team rankings (for teams where user is a member)
    const { data: teamRankings, error: teamRankingsError } = await supabase
      .from('team_rankings')
      .select(`
        id,
        elo_rating,
        wins,
        losses,
        rank_tier,
        last_updated,
        teams:team_id (
          id,
          name,
          captain_id
        ),
        games:game_id (
          id,
          name,
          publisher
        )
      `)
      .in('team_id', await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user_id)
        .then(({ data }) => data?.map(tm => tm.team_id) || [])
      );

    if (teamRankingsError) {
      console.error("[User Profile Aggregated] Error fetching team rankings:", teamRankingsError.message);
    }

    // 5. Get tournament registrations
    const { data: tournamentRegistrations, error: tournamentRegistrationsError } = await supabase
      .from('tournament_registrations')
      .select(`
        id,
        status,
        created_at,
        tournaments:tournament_id (
          id,
          title,
          start_date,
          end_date,
          status
        )
      `)
      .eq('user_id', user_id);

    if (tournamentRegistrationsError) {
      console.error("[User Profile Aggregated] Error fetching tournament registrations:", tournamentRegistrationsError.message);
    }

    // 6. Get aim trainer scores
    const { data: aimTrainerScores, error: aimTrainerError } = await supabase
      .from('aim_trainer_scores')
      .select('id, score, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (aimTrainerError) {
      console.error("[User Profile Aggregated] Error fetching aim trainer scores:", aimTrainerError.message);
    }

    // 7. Calculate tournament stats
    const now = new Date();
    let tournamentStats = {
      total: 0,
      upcoming: 0,
      ongoing: 0,
      completed: 0
    };

    if (tournamentRegistrations && tournamentRegistrations.length > 0) {
      tournamentStats.total = tournamentRegistrations.length;
      
      for (const registration of tournamentRegistrations) {
        if (registration.tournaments) {
          const tournament = registration.tournaments;
          const startDate = new Date(tournament.start_date);
          const endDate = new Date(tournament.end_date);
          
          if (now > endDate) {
            tournamentStats.completed++;
          } else if (now >= startDate && now <= endDate) {
            tournamentStats.ongoing++;
          } else {
            tournamentStats.upcoming++;
          }
        }
      }
    }

    // 8. Process game rankings (combine player and team rankings)
    const gameRankings = [];
    
    // Add player rankings
    if (playerRankings && playerRankings.length > 0) {
      for (const ranking of playerRankings) {
        const totalMatches = ranking.wins + ranking.losses;
        const winRate = totalMatches > 0 ? Math.round((ranking.wins / totalMatches) * 100) : 0;
        
        gameRankings.push({
          game_name: ranking.games?.name || 'Unknown Game',
          rank: 1, // This would need to be calculated based on actual ranking logic
          tier: ranking.rank_tier,
          elo_rating: ranking.elo_rating,
          wins: ranking.wins,
          losses: ranking.losses,
          win_rate: winRate,
          type: 'player'
        });
      }
    }

    // Add team rankings
    if (teamRankings && teamRankings.length > 0) {
      for (const ranking of teamRankings) {
        const totalMatches = ranking.wins + ranking.losses;
        const winRate = totalMatches > 0 ? Math.round((ranking.wins / totalMatches) * 100) : 0;
        
        gameRankings.push({
          game_name: ranking.games?.name || 'Unknown Game',
          rank: 1, // This would need to be calculated based on actual ranking logic
          tier: ranking.rank_tier,
          elo_rating: ranking.elo_rating,
          wins: ranking.wins,
          losses: ranking.losses,
          win_rate: winRate,
          type: 'team',
          team_name: ranking.teams?.name,
          is_captain: ranking.teams?.captain_id === user_id
        });
      }
    }

    // 9. Aggregate response data
    const aggregatedData = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      type: userData.type,
      country: userData.country,
      bio: userData.bio,
      avatar_url: userData.avatar_url,
      discord_handle: userData.discord_handle,
      twitter_handle: userData.twitter_handle,
      is_profile_public: userData.is_profile_public,
      fortnite_epic_id: userData.fortnite_epic_id,
      is_fortnite_validated: userData.is_fortnite_validated,
      fortnite_validation_data: userData.fortnite_validation_data,
      created_at: userData.created_at,
      
      // Aggregated data
      gaming_accounts: gamingAccounts || [],
      game_rankings: gameRankings,
      tournament_stats: tournamentStats,
      tournament_registrations: tournamentRegistrations || [],
      aim_trainer_scores: aimTrainerScores || []
    };

    console.log(`[User Profile Aggregated] Successfully aggregated profile data for user: ${user_id}`);

    return new Response(
      JSON.stringify({ success: true, data: aggregatedData }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error("[User Profile Aggregated] Error in fetch-user-profile-aggregated function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
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