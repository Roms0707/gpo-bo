import { supabase } from '../lib/supabase';

/**
 * Calculate new ELO ratings for two players based on match result
 * 
 * @param winnerElo Current ELO rating of the winner
 * @param loserElo Current ELO rating of the loser
 * @param isDraw Whether the match was a draw
 * @param kFactor K-factor determines how much ratings change (default: 32)
 * @returns Object containing new ELO ratings and the change amount
 */
export const calculateEloChange = (
  winnerElo: number,
  loserElo: number,
  isDraw: boolean = false,
  kFactor: number = 32
): { newWinnerElo: number; newLoserElo: number; eloChange: number } => {
  // Calculate expected scores (probability of winning)
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
  
  // Actual scores
  const winnerScore = isDraw ? 0.5 : 1;
  const loserScore = isDraw ? 0.5 : 0;
  
  // Calculate ELO changes
  const winnerChange = Math.round(kFactor * (winnerScore - expectedWinner));
  const loserChange = Math.round(kFactor * (loserScore - expectedLoser));
  
  // Calculate new ELO ratings
  const newWinnerElo = winnerElo + winnerChange;
  const newLoserElo = loserElo + loserChange;
  
  return {
    newWinnerElo,
    newLoserElo,
    eloChange: Math.abs(winnerChange) // Return absolute value of change
  };
};

/**
 * Update player rankings in the database after a match
 * 
 * @param winnerId ID of the winning player
 * @param loserId ID of the losing player
 * @param gameId ID of the game
 * @param isDraw Whether the match was a draw
 * @param tournamentId Optional tournament ID if the match is part of a tournament
 * @param scoreWinner Optional score for the winner
 * @param scoreLoser Optional score for the loser
 * @returns Promise resolving to true if successful
 */
export const updatePlayerRankings = async (
  winnerId: string | null,
  loserId: string | null,
  gameId: string,
  isDraw: boolean = false,
  tournamentId: string | null = null,
  scoreWinner: number | null = null,
  scoreLoser: number | null = null
): Promise<boolean> => {
  try {
    // Validate inputs - both IDs must be present
    if (!winnerId || !loserId) {
      console.error('Error updating player rankings: Missing player IDs', { winnerId, loserId });
      return false;
    }

    // Verify that both users exist in the users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .in('id', [winnerId, loserId]);
    
    if (usersError) throw usersError;
    
    // Create a set of valid user IDs for quick lookup
    const validUserIds = new Set(users.map(user => user.id));
    
    // Check if both users exist
    if (!validUserIds.has(winnerId) || !validUserIds.has(loserId)) {
      console.error('Error updating player rankings: Invalid user IDs', { 
        winnerId, 
        loserId, 
        winnerExists: validUserIds.has(winnerId),
        loserExists: validUserIds.has(loserId)
      });
      return false;
    }
    
    // Fetch current rankings for both players
    const { data: rankings, error: rankingsError } = await supabase
      .from('player_rankings')
      .select('*')
      .in('user_id', [winnerId, loserId])
      .eq('game_id', gameId);
    
    if (rankingsError) throw rankingsError;
    
    // Find winner and loser rankings
    const winnerRanking = rankings.find(r => r.user_id === winnerId);
    const loserRanking = rankings.find(r => r.user_id === loserId);
    
    // Default ELO if no ranking exists
    const defaultElo = 1000;
    
    // Get current ELO ratings
    const currentWinnerElo = winnerRanking?.elo_rating || defaultElo;
    const currentLoserElo = loserRanking?.elo_rating || defaultElo;
    
    // Calculate new ELO ratings
    const { newWinnerElo, newLoserElo, eloChange } = calculateEloChange(
      currentWinnerElo,
      currentLoserElo,
      isDraw
    );
    
    // Prepare updates for both players
    const updates = [];
    
    // Winner update
    if (winnerRanking) {
      updates.push({
        id: winnerRanking.id,
        user_id: winnerId, // Include user_id in the update
        game_id: gameId, // Include game_id in the update
        elo_rating: newWinnerElo,
        wins: isDraw ? winnerRanking.wins : winnerRanking.wins + 1,
        losses: winnerRanking.losses,
        rank_tier: determineRankTier(newWinnerElo),
        last_updated: new Date().toISOString()
      });
    } else {
      // Create new ranking for winner
      const { data: newWinnerRanking, error: newWinnerError } = await supabase
        .from('player_rankings')
        .insert({
          user_id: winnerId,
          game_id: gameId,
          elo_rating: newWinnerElo,
          wins: isDraw ? 0 : 1,
          losses: 0,
          rank_tier: determineRankTier(newWinnerElo),
          last_updated: new Date().toISOString()
        })
        .select()
        .single();
      
      if (newWinnerError) {
        console.error('Error creating new winner ranking:', newWinnerError, { winnerId, gameId });
        throw newWinnerError;
      }
    }
    
    // Loser update
    if (loserRanking) {
      updates.push({
        id: loserRanking.id,
        user_id: loserId, // Include user_id in the update
        game_id: gameId, // Include game_id in the update
        elo_rating: newLoserElo,
        wins: loserRanking.wins,
        losses: isDraw ? loserRanking.losses : loserRanking.losses + 1,
        rank_tier: determineRankTier(newLoserElo),
        last_updated: new Date().toISOString()
      });
    } else {
      // Create new ranking for loser
      const { data: newLoserRanking, error: newLoserError } = await supabase
        .from('player_rankings')
        .insert({
          user_id: loserId,
          game_id: gameId,
          elo_rating: newLoserElo,
          wins: 0,
          losses: isDraw ? 0 : 1,
          rank_tier: determineRankTier(newLoserElo),
          last_updated: new Date().toISOString()
        })
        .select()
        .single();
      
      if (newLoserError) {
        console.error('Error creating new loser ranking:', newLoserError, { loserId, gameId });
        throw newLoserError;
      }
    }
    
    // Update existing rankings
    if (updates.length > 0) {
      const { error: updateError } = await supabase
        .from('player_rankings')
        .upsert(updates);
      
      if (updateError) throw updateError;
    }
    
    // Record the match result
    const { error: matchResultError } = await supabase
      .from('match_results')
      .insert({
        tournament_id: tournamentId,
        game_id: gameId,
        match_date: new Date().toISOString(),
        is_team_match: false,
        winner_player_id: isDraw ? null : winnerId,
        loser_player_id: isDraw ? null : loserId,
        score_winner: scoreWinner,
        score_loser: scoreLoser,
        elo_change: eloChange
      });
    
    if (matchResultError) throw matchResultError;
    
    return true;
  } catch (error) {
    console.error('Error updating player rankings:', error);
    return false;
  }
};

/**
 * Update team rankings in the database after a match
 * 
 * @param winnerTeamId ID of the winning team
 * @param loserTeamId ID of the losing team
 * @param gameId ID of the game
 * @param isDraw Whether the match was a draw
 * @param tournamentId Optional tournament ID if the match is part of a tournament
 * @param scoreWinner Optional score for the winner
 * @param scoreLoser Optional score for the loser
 * @returns Promise resolving to true if successful
 */
export const updateTeamRankings = async (
  winnerTeamId: string | null,
  loserTeamId: string | null,
  gameId: string,
  isDraw: boolean = false,
  tournamentId: string | null = null,
  scoreWinner: number | null = null,
  scoreLoser: number | null = null
): Promise<boolean> => {
  try {
    // Validate inputs - both IDs must be present
    if (!winnerTeamId || !loserTeamId) {
      console.error('Error updating team rankings: Missing team IDs', { winnerTeamId, loserTeamId });
      return false;
    }

    // Verify that both teams exist in the teams table
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id')
      .in('id', [winnerTeamId, loserTeamId]);
    
    if (teamsError) throw teamsError;
    
    // Create a set of valid team IDs for quick lookup
    const validTeamIds = new Set(teams.map(team => team.id));
    
    // Check if both teams exist
    if (!validTeamIds.has(winnerTeamId) || !validTeamIds.has(loserTeamId)) {
      console.error('Error updating team rankings: Invalid team IDs', { 
        winnerTeamId, 
        loserTeamId, 
        winnerExists: validTeamIds.has(winnerTeamId),
        loserExists: validTeamIds.has(loserTeamId)
      });
      return false;
    }
    
    // Fetch current rankings for both teams
    const { data: rankings, error: rankingsError } = await supabase
      .from('team_rankings')
      .select('*')
      .in('team_id', [winnerTeamId, loserTeamId])
      .eq('game_id', gameId);
    
    if (rankingsError) throw rankingsError;
    
    // Find winner and loser rankings
    const winnerRanking = rankings.find(r => r.team_id === winnerTeamId);
    const loserRanking = rankings.find(r => r.team_id === loserTeamId);
    
    // Default ELO if no ranking exists
    const defaultElo = 1000;
    
    // Get current ELO ratings
    const currentWinnerElo = winnerRanking?.elo_rating || defaultElo;
    const currentLoserElo = loserRanking?.elo_rating || defaultElo;
    
    // Calculate new ELO ratings
    const { newWinnerElo, newLoserElo, eloChange } = calculateEloChange(
      currentWinnerElo,
      currentLoserElo,
      isDraw
    );
    
    // Prepare updates for both teams
    const updates = [];
    
    // Winner update
    if (winnerRanking) {
      updates.push({
        id: winnerRanking.id,
        team_id: winnerTeamId, // Include team_id in the update
        game_id: gameId, // Include game_id in the update
        elo_rating: newWinnerElo,
        wins: isDraw ? winnerRanking.wins : winnerRanking.wins + 1,
        losses: winnerRanking.losses,
        rank_tier: determineRankTier(newWinnerElo),
        last_updated: new Date().toISOString()
      });
    } else {
      // Create new ranking for winner
      const { data: newWinnerRanking, error: newWinnerError } = await supabase
        .from('team_rankings')
        .insert({
          team_id: winnerTeamId,
          game_id: gameId,
          elo_rating: newWinnerElo,
          wins: isDraw ? 0 : 1,
          losses: 0,
          rank_tier: determineRankTier(newWinnerElo),
          last_updated: new Date().toISOString()
        })
        .select()
        .single();
      
      if (newWinnerError) {
        console.error('Error creating new winner team ranking:', newWinnerError, { winnerTeamId, gameId });
        throw newWinnerError;
      }
    }
    
    // Loser update
    if (loserRanking) {
      updates.push({
        id: loserRanking.id,
        team_id: loserTeamId, // Include team_id in the update
        game_id: gameId, // Include game_id in the update
        elo_rating: newLoserElo,
        wins: loserRanking.wins,
        losses: isDraw ? loserRanking.losses : loserRanking.losses + 1,
        rank_tier: determineRankTier(newLoserElo),
        last_updated: new Date().toISOString()
      });
    } else {
      // Create new ranking for loser
      const { data: newLoserRanking, error: newLoserError } = await supabase
        .from('team_rankings')
        .insert({
          team_id: loserTeamId,
          game_id: gameId,
          elo_rating: newLoserElo,
          wins: 0,
          losses: isDraw ? 0 : 1,
          rank_tier: determineRankTier(newLoserElo),
          last_updated: new Date().toISOString()
        })
        .select()
        .single();
      
      if (newLoserError) {
        console.error('Error creating new loser team ranking:', newLoserError, { loserTeamId, gameId });
        throw newLoserError;
      }
    }
    
    // Update existing rankings
    if (updates.length > 0) {
      const { error: updateError } = await supabase
        .from('team_rankings')
        .upsert(updates);
      
      if (updateError) throw updateError;
    }
    
    // Record the match result
    const { error: matchResultError } = await supabase
      .from('match_results')
      .insert({
        tournament_id: tournamentId,
        game_id: gameId,
        match_date: new Date().toISOString(),
        is_team_match: true,
        winner_team_id: isDraw ? null : winnerTeamId,
        loser_team_id: isDraw ? null : loserTeamId,
        score_winner: scoreWinner,
        score_loser: scoreLoser,
        elo_change: eloChange
      });
    
    if (matchResultError) throw matchResultError;
    
    return true;
  } catch (error) {
    console.error('Error updating team rankings:', error);
    return false;
  }
};

/**
 * Determine rank tier based on ELO rating
 * 
 * @param elo ELO rating
 * @returns Rank tier string
 */
export const determineRankTier = (elo: number): string => {
  if (elo < 800) return 'IRON';
  if (elo < 1000) return 'BRONZE';
  if (elo < 1200) return 'SILVER';
  if (elo < 1400) return 'GOLD';
  if (elo < 1600) return 'PLATINUM';
  if (elo < 1800) return 'DIAMOND';
  if (elo < 2000) return 'MASTER';
  if (elo < 2200) return 'GRANDMASTER';
  return 'CHALLENGER';
};