import { supabase } from '../lib/supabase';

export interface BracketElimination {
  id: string;
  tournament_id: string;
  player_id: string;
  eliminated_round: number;
  eliminated_at: string;
  elo_at_elimination: number | null;
  reintegrated: boolean;
  reintegrated_at: string | null;
  reintegrated_in_round: number | null;
  notes: string | null;
  created_at: string;
}

export interface LuckyLoserCandidate {
  player_id: string;
  elo_at_elimination: number | null;
  eliminated_at: string;
  eliminated_round: number;
  elimination_id: string;
}

export const recordPlayerElimination = async (
  tournamentId: string,
  playerId: string,
  eliminatedRound: number,
  eloAtElimination: number | null = null
): Promise<string | null> => {
  try {
    console.log(`[Elimination Tracking] Recording elimination: Player ${playerId}, Tournament ${tournamentId}, Round ${eliminatedRound}, ELO: ${eloAtElimination}`);

    const { data, error } = await supabase
      .from('bracket_eliminations')
      .insert({
        tournament_id: tournamentId,
        player_id: playerId,
        eliminated_round: eliminatedRound,
        elo_at_elimination: eloAtElimination,
        reintegrated: false
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Elimination Tracking] Error recording elimination:', error);
      return null;
    }

    console.log(`[Elimination Tracking] Successfully recorded elimination with ID: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('[Elimination Tracking] Unexpected error:', error);
    return null;
  }
};

export const selectLuckyLoser = async (
  tournamentId: string,
  targetRound: number
): Promise<LuckyLoserCandidate | null> => {
  try {
    console.log(`[Lucky Loser Selection] Searching for eligible candidates: Tournament ${tournamentId}, Round ${targetRound}`);

    const { data, error } = await supabase
      .from('bracket_eliminations')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('eliminated_round', targetRound)
      .eq('reintegrated', false)
      .order('elo_at_elimination', { ascending: false, nullsFirst: false })
      .order('eliminated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[Lucky Loser Selection] Error querying candidates:', error);
      return null;
    }

    if (!data) {
      console.log('[Lucky Loser Selection] No eligible candidates found');
      return null;
    }

    const candidate: LuckyLoserCandidate = {
      player_id: data.player_id,
      elo_at_elimination: data.elo_at_elimination,
      eliminated_at: data.eliminated_at,
      eliminated_round: data.eliminated_round,
      elimination_id: data.id
    };

    console.log('[Lucky Loser Selection] Found candidate:', candidate);
    return candidate;
  } catch (error) {
    console.error('[Lucky Loser Selection] Unexpected error:', error);
    return null;
  }
};

export const reintegrateLuckyLoser = async (
  eliminationId: string,
  reintegratedInRound: number
): Promise<boolean> => {
  try {
    console.log(`[Lucky Loser Reintegration] Marking elimination ${eliminationId} as reintegrated in round ${reintegratedInRound}`);

    const { error } = await supabase
      .from('bracket_eliminations')
      .update({
        reintegrated: true,
        reintegrated_at: new Date().toISOString(),
        reintegrated_in_round: reintegratedInRound
      })
      .eq('id', eliminationId)
      .eq('reintegrated', false);

    if (error) {
      console.error('[Lucky Loser Reintegration] Error updating elimination record:', error);
      return false;
    }

    console.log('[Lucky Loser Reintegration] Successfully marked as reintegrated');
    return true;
  } catch (error) {
    console.error('[Lucky Loser Reintegration] Unexpected error:', error);
    return false;
  }
};

export const getEligibleLuckyLosers = async (
  tournamentId: string,
  targetRound: number
): Promise<LuckyLoserCandidate[]> => {
  try {
    console.log(`[Lucky Loser Query] Fetching all eligible candidates: Tournament ${tournamentId}, Round ${targetRound}`);

    const { data, error } = await supabase
      .from('bracket_eliminations')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('eliminated_round', targetRound)
      .eq('reintegrated', false)
      .order('elo_at_elimination', { ascending: false, nullsFirst: false })
      .order('eliminated_at', { ascending: false });

    if (error) {
      console.error('[Lucky Loser Query] Error querying candidates:', error);
      return [];
    }

    const candidates: LuckyLoserCandidate[] = (data || []).map(item => ({
      player_id: item.player_id,
      elo_at_elimination: item.elo_at_elimination,
      eliminated_at: item.eliminated_at,
      eliminated_round: item.eliminated_round,
      elimination_id: item.id
    }));

    console.log(`[Lucky Loser Query] Found ${candidates.length} eligible candidate(s)`);
    return candidates;
  } catch (error) {
    console.error('[Lucky Loser Query] Unexpected error:', error);
    return [];
  }
};

export const getAllEliminationsForTournament = async (
  tournamentId: string
): Promise<BracketElimination[]> => {
  try {
    const { data, error } = await supabase
      .from('bracket_eliminations')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('eliminated_round', { ascending: true })
      .order('eliminated_at', { ascending: true });

    if (error) {
      console.error('[Elimination Query] Error fetching eliminations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[Elimination Query] Unexpected error:', error);
    return [];
  }
};

export const getPlayerEliminationStatus = async (
  tournamentId: string,
  playerId: string
): Promise<BracketElimination | null> => {
  try {
    const { data, error } = await supabase
      .from('bracket_eliminations')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('player_id', playerId)
      .order('eliminated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[Elimination Status Query] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[Elimination Status Query] Unexpected error:', error);
    return null;
  }
};
