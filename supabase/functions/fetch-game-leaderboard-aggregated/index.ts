import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface GameLeaderboardRequest {
  game_id: string;
  leaderboard_type?: 'solo' | 'team' | 'both';
  search_query?: string;
  rank_tier?: string;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface GameLeaderboardResponse {
  success: boolean;
  data?: {
    game: any;
    solo_leaderboard: any[];
    team_leaderboard: any[];
    recent_matches: any[];
    has_solo_data: boolean;
    has_team_data: boolean;
  };
  error?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
    const {
      game_id,
      leaderboard_type = 'both',
      search_query = '',
      rank_tier = 'All Ranks',
      sort_field = 'elo_rating',
      sort_direction = 'desc',
      limit = 50,
      offset = 0
    } = await req.json() as GameLeaderboardRequest;

    console.log(`[Game Leaderboard Aggregated] Request received for game: ${game_id}, type: ${leaderboard_type}`);

    // Validate input
    if (!game_id) {
      console.error("[Game Leaderboard Aggregated] Missing game ID");
      return new Response(
        JSON.stringify({ success: false, error: "Game ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1. Get game details
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('id, name, publisher, image_url')
      .eq('id', game_id)
      .single();

    if (gameError || !gameData) {
      console.error("[Game Leaderboard Aggregated] Game not found:", gameError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Game not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let soloLeaderboard = [];
    let teamLeaderboard = [];
    let hasSoloData = false;
    let hasTeamData = false;

    // 2. Get solo leaderboard if requested
    if (leaderboard_type === 'solo' || leaderboard_type === 'both') {
      let soloQuery = supabase
        .from('player_rankings')
        .select(`
          id,
          user_id,
          elo_rating,
          wins,
          losses,
          rank_tier,
          last_updated,
          users:user_id (
            id,
            username,
            country,
            avatar_url
          )
        `)
        .eq('game_id', game_id);

      // Apply search filter
      if (search_query) {
        soloQuery = soloQuery.ilike('users.username', `%${search_query}%`);
      }

      // Apply rank tier filter
      if (rank_tier !== 'All Ranks') {
        soloQuery = soloQuery.eq('rank_tier', rank_tier);
      }

      // Apply sorting
      const ascending = sort_direction === 'asc';
      soloQuery = soloQuery.order(sort_field, { ascending });

      // Apply pagination
      soloQuery = soloQuery.range(offset, offset + limit - 1);

      const { data: soloData, error: soloError } = await soloQuery;

      if (soloError) {
        console.error("[Game Leaderboard Aggregated] Error fetching solo leaderboard:", soloError.message);
      } else if (soloData && soloData.length > 0) {
        hasSoloData = true;
        soloLeaderboard = soloData.map((ranking, index) => {
          const matches = ranking.wins + ranking.losses;
          const winRate = matches > 0 ? Math.round((ranking.wins / matches) * 100) : 0;

          return {
            rank: offset + index + 1,
            user_id: ranking.user_id,
            username: ranking.users?.username || 'Unknown',
            country: ranking.users?.country || 'Unknown',
            avatar_url: ranking.users?.avatar_url,
            total_points: ranking.elo_rating,
            elo: ranking.elo_rating,
            tournaments_played: Math.floor(matches / 3), // Estimate
            wins: ranking.wins,
            losses: ranking.losses,
            matches: matches,
            top_5: Math.floor(ranking.wins * 0.6), // Estimate
            win_rate: winRate,
            rank_tier: ranking.rank_tier || 'BRONZE'
          };
        });
      }
    }

    // 3. Get team leaderboard if requested
    if (leaderboard_type === 'team' || leaderboard_type === 'both') {
      let teamQuery = supabase
        .from('team_rankings')
        .select(`
          id,
          team_id,
          elo_rating,
          wins,
          losses,
          rank_tier,
          last_updated,
          teams:team_id (
            id,
            name,
            captain_id,
            users:captain_id (
              username
            )
          )
        `)
        .eq('game_id', game_id);

      // Apply search filter
      if (search_query) {
        teamQuery = teamQuery.ilike('teams.name', `%${search_query}%`);
      }

      // Apply rank tier filter
      if (rank_tier !== 'All Ranks') {
        teamQuery = teamQuery.eq('rank_tier', rank_tier);
      }

      // Apply sorting
      const ascending = sort_direction === 'asc';
      teamQuery = teamQuery.order(sort_field, { ascending });

      // Apply pagination
      teamQuery = teamQuery.range(offset, offset + limit - 1);

      const { data: teamData, error: teamError } = await teamQuery;

      if (teamError) {
        console.error("[Game Leaderboard Aggregated] Error fetching team leaderboard:", teamError.message);
      } else if (teamData && teamData.length > 0) {
        hasTeamData = true;
        teamLeaderboard = teamData.map((ranking, index) => {
          const matches = ranking.wins + ranking.losses;
          const winRate = matches > 0 ? Math.round((ranking.wins / matches) * 100) : 0;

          return {
            rank: offset + index + 1,
            team_id: ranking.team_id,
            team_name: ranking.teams?.name || 'Unknown Team',
            captain_name: ranking.teams?.users?.username || 'Unknown',
            total_points: ranking.elo_rating,
            elo: ranking.elo_rating,
            tournaments_played: Math.floor(matches / 3), // Estimate
            wins: ranking.wins,
            losses: ranking.losses,
            matches: matches,
            top_5: Math.floor(ranking.wins * 0.6), // Estimate
            win_rate: winRate,
            rank_tier: ranking.rank_tier || 'BRONZE'
          };
        });
      }
    }

    // 4. Get recent matches
    const { data: matchResults, error: matchError } = await supabase
      .from('match_results')
      .select(`
        id,
        match_date,
        is_team_match,
        winner_player_id,
        loser_player_id,
        winner_team_id,
        loser_team_id,
        score_winner,
        score_loser,
        elo_change,
        tournament_id
      `)
      .eq('game_id', game_id)
      .order('match_date', { ascending: false })
      .limit(5);

    let recentMatches = [];
    if (!matchError && matchResults && matchResults.length > 0) {
      // Process match results to get player/team names
      recentMatches = await Promise.all(
        matchResults.map(async (match) => {
          let player1Name = 'Unknown Player';
          let player2Name = 'Unknown Player';
          let player1Id = '';
          let player2Id = '';

          if (match.is_team_match) {
            // Get team names
            if (match.winner_team_id) {
              const { data: winnerTeam } = await supabase
                .from('teams')
                .select('name')
                .eq('id', match.winner_team_id)
                .single();
              if (winnerTeam) {
                player1Name = winnerTeam.name;
                player1Id = match.winner_team_id;
              }
            }

            if (match.loser_team_id) {
              const { data: loserTeam } = await supabase
                .from('teams')
                .select('name')
                .eq('id', match.loser_team_id)
                .single();
              if (loserTeam) {
                player2Name = loserTeam.name;
                player2Id = match.loser_team_id;
              }
            }
          } else {
            // Get player names
            if (match.winner_player_id) {
              const { data: winnerUser } = await supabase
                .from('users')
                .select('username')
                .eq('id', match.winner_player_id)
                .single();
              if (winnerUser) {
                player1Name = winnerUser.username;
                player1Id = match.winner_player_id;
              }
            }

            if (match.loser_player_id) {
              const { data: loserUser } = await supabase
                .from('users')
                .select('username')
                .eq('id', match.loser_player_id)
                .single();
              if (loserUser) {
                player2Name = loserUser.username;
                player2Id = match.loser_player_id;
              }
            }
          }

          return {
            id: match.id,
            date: match.match_date,
            type: match.is_team_match ? 'Team' : 'Solo',
            player1: player1Name,
            player1_id: player1Id,
            player2: player2Name,
            player2_id: player2Id,
            score: `${match.score_winner || 0}-${match.score_loser || 0}`,
            elo_change: match.elo_change,
            is_tournament: !!match.tournament_id
          };
        })
      );
    }

    const responseData = {
      game: gameData,
      solo_leaderboard: soloLeaderboard,
      team_leaderboard: teamLeaderboard,
      recent_matches: recentMatches,
      has_solo_data: hasSoloData,
      has_team_data: hasTeamData
    };

    console.log(`[Game Leaderboard Aggregated] Successfully processed leaderboard data for game: ${game_id}`);

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error("[Game Leaderboard Aggregated] Error in fetch-game-leaderboard-aggregated function:", error);
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
