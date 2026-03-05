import { supabase } from '../lib/supabase';
import { calculateBracketStructure } from '../utils/tournamentValidation';

export interface BracketPreparationResult {
  success: boolean;
  tournament: any;
  approvedCount: number;
  alreadyPrepared: boolean;
}

export const prepareTournamentForBracket = async (
  tournamentId: string,
  useWaitingList: boolean = false
): Promise<BracketPreparationResult> => {
  const { data: tournamentData, error: fetchError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (fetchError || !tournamentData) {
    throw new Error(fetchError?.message || 'Tournament not found');
  }

  if (tournamentData.bracket_launched_at) {
    return {
      success: true,
      tournament: tournamentData,
      approvedCount: tournamentData.actual_participants || 0,
      alreadyPrepared: true,
    };
  }

  const { count, error: countError } = await supabase
    .from('tournament_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('status', 'approved');

  if (countError) throw countError;

  const approvedCount = count || 0;
  const configuredMax = tournamentData.max_nb_players;

  const effectiveCount = useWaitingList && configuredMax && approvedCount > configuredMax
    ? configuredMax
    : approvedCount;

  const bracketStructure = calculateBracketStructure(
    effectiveCount,
    tournamentData.tournament_format,
    useWaitingList ? configuredMax : null
  );

  const { data: updatedTournament, error: updateError } = await supabase
    .from('tournaments')
    .update({
      initial_max_players: configuredMax || approvedCount,
      actual_participants: effectiveCount,
      max_nb_players: effectiveCount,
      registration_locked: true,
      bracket_launched_at: new Date().toISOString(),
      bracket_size: bracketStructure.bracketSize,
      bracket_byes_count: bracketStructure.byes,
      uses_lucky_loser: true,
    })
    .eq('id', tournamentId)
    .select()
    .single();

  if (updateError) throw updateError;

  return {
    success: true,
    tournament: updatedTournament,
    approvedCount: effectiveCount,
    alreadyPrepared: false,
  };
};
