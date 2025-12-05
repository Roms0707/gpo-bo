import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface PlayerMoveRequest {
  playerId: string;
  fromMatchId?: string;
  toMatchId: string;
  targetSlot: 'player1' | 'player2';
  reason?: string;
}

export interface ModificationLog {
  tournament_id: string;
  match_id?: string;
  round: number;
  modification_type: 'player_swap' | 'player_reassign' | 'bye_fill' | 'manual_move' | 'cross_round_move';
  previous_state: any;
  new_state: any;
  reason?: string;
  modified_by?: string;
}

export const logModification = async (log: ModificationLog): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('bracket_modifications_log')
      .insert({
        ...log,
        modified_by: user?.id
      });

    if (error) {
      console.error('Error logging modification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in logModification:', error);
    return false;
  }
};

export const movePlayerToMatch = async (
  request: PlayerMoveRequest,
  validUserIds: Set<string>,
  tournamentId: string
): Promise<boolean> => {
  try {
    if (!validUserIds.has(request.playerId)) {
      toast.error('Invalid player ID');
      return false;
    }

    const { data: targetMatch, error: fetchError } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('id', request.toMatchId)
      .single();

    if (fetchError || !targetMatch) {
      toast.error('Target match not found');
      return false;
    }

    if (targetMatch.winner_id) {
      toast.error('Cannot modify a match that already has a result');
      return false;
    }

    const previousState = {
      player1_id: targetMatch.player1_id,
      player2_id: targetMatch.player2_id
    };

    const updates: any = {
      manual_assignment: true
    };

    if (request.targetSlot === 'player1') {
      if (targetMatch.player1_id && targetMatch.player1_id !== request.playerId) {
        toast.error('Player 1 slot is already occupied. Swap players first.');
        return false;
      }
      updates.player1_id = request.playerId;
    } else {
      if (targetMatch.player2_id && targetMatch.player2_id !== request.playerId) {
        toast.error('Player 2 slot is already occupied. Swap players first.');
        return false;
      }
      updates.player2_id = request.playerId;
    }

    const { error: updateError } = await supabase
      .from('tournament_matches')
      .update(updates)
      .eq('id', request.toMatchId);

    if (updateError) {
      console.error('Error updating match:', updateError);
      toast.error('Failed to move player');
      return false;
    }

    if (request.fromMatchId) {
      const { data: sourceMatch } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', request.fromMatchId)
        .single();

      if (sourceMatch) {
        const sourceUpdates: any = {};

        if (sourceMatch.player1_id === request.playerId) {
          sourceUpdates.player1_id = null;
        }
        if (sourceMatch.player2_id === request.playerId) {
          sourceUpdates.player2_id = null;
        }

        if (Object.keys(sourceUpdates).length > 0) {
          await supabase
            .from('tournament_matches')
            .update(sourceUpdates)
            .eq('id', request.fromMatchId);
        }
      }
    }

    const newState = {
      player1_id: request.targetSlot === 'player1' ? request.playerId : targetMatch.player1_id,
      player2_id: request.targetSlot === 'player2' ? request.playerId : targetMatch.player2_id
    };

    await logModification({
      tournament_id: tournamentId,
      match_id: request.toMatchId,
      round: targetMatch.round,
      modification_type: request.fromMatchId ? 'cross_round_move' : 'bye_fill',
      previous_state: previousState,
      new_state: newState,
      reason: request.reason || (request.fromMatchId ? 'Player moved between rounds' : 'BYE filled')
    });

    toast.success('Player moved successfully');
    return true;
  } catch (error) {
    console.error('Error in movePlayerToMatch:', error);
    toast.error('Failed to move player');
    return false;
  }
};

export const swapPlayersInMatch = async (
  matchId: string,
  tournamentId: string
): Promise<boolean> => {
  try {
    const { data: match, error: fetchError } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (fetchError || !match) {
      toast.error('Match not found');
      return false;
    }

    if (match.winner_id) {
      toast.error('Cannot swap players in a match with results');
      return false;
    }

    const previousState = {
      player1_id: match.player1_id,
      player2_id: match.player2_id
    };

    const { error: updateError } = await supabase
      .from('tournament_matches')
      .update({
        player1_id: match.player2_id,
        player2_id: match.player1_id,
        manual_assignment: true
      })
      .eq('id', matchId);

    if (updateError) {
      console.error('Error swapping players:', updateError);
      toast.error('Failed to swap players');
      return false;
    }

    const newState = {
      player1_id: match.player2_id,
      player2_id: match.player1_id
    };

    await logModification({
      tournament_id: tournamentId,
      match_id: matchId,
      round: match.round,
      modification_type: 'player_swap',
      previous_state: previousState,
      new_state: newState,
      reason: 'Players swapped within match'
    });

    toast.success('Players swapped successfully');
    return true;
  } catch (error) {
    console.error('Error in swapPlayersInMatch:', error);
    toast.error('Failed to swap players');
    return false;
  }
};

export const removePlayerFromMatch = async (
  matchId: string,
  playerSlot: 'player1' | 'player2',
  tournamentId: string,
  round: number
): Promise<boolean> => {
  try {
    const { data: match, error: fetchError } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (fetchError || !match) {
      toast.error('Match not found');
      return false;
    }

    if (match.winner_id) {
      toast.error('Cannot remove player from a match with results');
      return false;
    }

    const previousState = {
      player1_id: match.player1_id,
      player2_id: match.player2_id
    };

    const updates: any = {
      [playerSlot === 'player1' ? 'player1_id' : 'player2_id']: null,
      manual_assignment: true
    };

    const { error: updateError } = await supabase
      .from('tournament_matches')
      .update(updates)
      .eq('id', matchId);

    if (updateError) {
      console.error('Error removing player:', updateError);
      toast.error('Failed to remove player');
      return false;
    }

    const newState = {
      player1_id: playerSlot === 'player1' ? null : match.player1_id,
      player2_id: playerSlot === 'player2' ? null : match.player2_id
    };

    await logModification({
      tournament_id: tournamentId,
      match_id: matchId,
      round,
      modification_type: 'player_reassign',
      previous_state: previousState,
      new_state: newState,
      reason: 'Player removed from match for reassignment'
    });

    toast.success('Player removed from match');
    return true;
  } catch (error) {
    console.error('Error in removePlayerFromMatch:', error);
    toast.error('Failed to remove player');
    return false;
  }
};

export const canPlayerBeMoved = (
  playerId: string,
  targetMatchId: string,
  matches: any[]
): { canMove: boolean; reason?: string } => {
  const targetMatch = matches.find(m => m.id === targetMatchId);

  if (!targetMatch) {
    return { canMove: false, reason: 'Target match not found' };
  }

  if (targetMatch.winner_id) {
    return { canMove: false, reason: 'Cannot modify completed match' };
  }

  const playerCurrentMatches = matches.filter(m =>
    m.round === targetMatch.round &&
    (m.player1_id === playerId || m.player2_id === playerId)
  );

  if (playerCurrentMatches.length > 0 && !playerCurrentMatches.some(m => m.id === targetMatchId)) {
    return { canMove: false, reason: 'Player already has a match in this round' };
  }

  return { canMove: true };
};

export const getModificationHistory = async (
  tournamentId: string
): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('bracket_modifications_log')
      .select(`
        *,
        modified_by_user:modified_by (
          username,
          email
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching modification history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getModificationHistory:', error);
    return [];
  }
};
