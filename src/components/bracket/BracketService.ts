import { Match, MatchInsert, Player, Team } from './types';
import { supabase } from '../../lib/supabase';
import { updatePlayerRankings, updateTeamRankings } from '../../utils/eloUtils';
import { getNextPowerOfTwo, generateSnakeSeeding } from '../../utils/tournamentValidation';
import {
  completeRoundTimer,
  startRoundTimer,
  getRoundTimer,
  expireRoundTimer
} from '../../services/roundTimerService';
import {
  notifyRoundCompleted,
  notifyRoundStarted,
  getRoundName
} from '../../services/roundNotificationService';
import {
  notifyMatchStarting,
  notifyMatchResult,
  notifyNextOpponent
} from '../../services/playerMatchNotificationService';
import { recordPlayerElimination } from '../../services/eliminationTrackingService';

export const generateProfessionalBracket = (
  participants: Player[] | Team[],
  tournamentId: string,
  tournamentType: 'solo' | 'team',
  validUserIds: Set<string>,
  maxNbPlayers: number | null = null
): MatchInsert[] => {
  const totalParticipants = participants.length;

  console.log(`🎯 BRACKET GENERATION: Starting with ${totalParticipants} participants`);
  console.log(`🎯 BRACKET GENERATION: Max players configured: ${maxNbPlayers || 'not set'}`);
  console.log(`🎯 BRACKET GENERATION: Tournament type: ${tournamentType}`);

  if (totalParticipants < 2) {
    console.log(`🎯 BRACKET GENERATION: Not enough participants (${totalParticipants}), aborting`);
    return [];
  }

  const targetSize = maxNbPlayers || totalParticipants;
  const bracketSize = getNextPowerOfTwo(targetSize);
  const totalRounds = Math.log2(bracketSize);
  const numberOfByes = bracketSize - totalParticipants;

  console.log(`🎯 BRACKET GENERATION: Power-of-2 Structure:`);
  console.log(`   - Bracket Size: ${bracketSize} (2^${totalRounds})`);
  console.log(`   - Total Rounds: ${totalRounds}`);
  console.log(`   - BYEs Required: ${numberOfByes}`);
  console.log(`   - Round 1 Matches: ${bracketSize / 2}`);

  const matches: MatchInsert[] = [];

  const snakeSeeding = generateSnakeSeeding(bracketSize);
  console.log(`🎯 BRACKET GENERATION: Snake seeding order:`, snakeSeeding.slice(0, 20), '...');

  const participantsByRank = [...participants].sort((a, b) => {
    const eloA = a.elo || 1000;
    const eloB = b.elo || 1000;
    return eloB - eloA;
  });

  const seedMap = new Map<number, string | null>();
  for (let i = 0; i < bracketSize; i++) {
    if (i < totalParticipants) {
      const participant = participantsByRank[i];
      const playerId = tournamentType === 'team'
        ? (participant as Team).captain_id
        : participant.id;

      if (playerId && validUserIds.has(playerId)) {
        seedMap.set(snakeSeeding[i], playerId);
      } else {
        seedMap.set(snakeSeeding[i], null);
      }
    } else {
      seedMap.set(snakeSeeding[i], null);
    }
  }

  console.log(`🎯 BRACKET GENERATION: Creating Round 1 with ${bracketSize / 2} matches`);

  for (let matchIndex = 0; matchIndex < bracketSize / 2; matchIndex++) {
    const seed1 = snakeSeeding[matchIndex * 2];
    const seed2 = snakeSeeding[matchIndex * 2 + 1];

    const player1Id = seedMap.get(seed1) || null;
    const player2Id = seedMap.get(seed2) || null;

    const isBye = !player1Id || !player2Id;
    const winnerId = isBye ? (player1Id || player2Id) : null;

    matches.push({
      round: 1,
      position: matchIndex + 1,
      player1_id: player1Id,
      player2_id: player2Id,
      winner_id: winnerId,
      tournament_id: tournamentId,
      is_draw: false,
      is_bye: isBye
    });

    if (isBye) {
      console.log(`   BYE Match ${matchIndex + 1}: Seed ${seed1} vs Seed ${seed2} - Winner: ${winnerId}`);
    }
  }

  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    console.log(`🎯 BRACKET GENERATION: Creating Round ${round} with ${matchesInRound} matches`);

    for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex++) {
      matches.push({
        round: round,
        position: matchIndex + 1,
        player1_id: null,
        player2_id: null,
        winner_id: null,
        tournament_id: tournamentId,
        is_draw: false,
        is_bye: false
      });
    }
  }

  advanceByeWinnersRecursively(matches);

  console.log(`🎯 BRACKET GENERATION: Generated ${matches.length} total matches`);
  console.log(`🎯 BRACKET GENERATION: Expected matches: ${bracketSize - 1} (2^${totalRounds} - 1)`);

  return matches;
};

const advanceByeWinnersRecursively = (matches: MatchInsert[]): void => {
  const maxRound = Math.max(...matches.map(m => m.round));
  console.log(`🔄 BYE Propagation: Processing ${maxRound} rounds with two-phase approach`);

  for (let currentRound = 1; currentRound < maxRound; currentRound++) {
    const nextRound = currentRound + 1;

    const byeMatchesInRound = matches.filter(m =>
      m.round === currentRound &&
      m.winner_id &&
      (!m.player1_id || !m.player2_id)
    );

    if (byeMatchesInRound.length === 0) {
      console.log(`  Round ${currentRound}: No BYE matches to propagate`);
      continue;
    }

    console.log(`  Round ${currentRound}: Propagating ${byeMatchesInRound.length} BYE winner(s) to Round ${nextRound}`);

    byeMatchesInRound.forEach(match => {
      const winnerId = match.winner_id;
      if (!winnerId) return;

      const nextPosition = Math.ceil(match.position / 2);
      const nextMatch = matches.find(m =>
        m.round === nextRound && m.position === nextPosition
      );

      if (nextMatch) {
        const isPlayer1Slot = match.position % 2 !== 0;
        const targetSlot = isPlayer1Slot ? 'player1_id' : 'player2_id';
        const currentValue = isPlayer1Slot ? nextMatch.player1_id : nextMatch.player2_id;

        if (!currentValue) {
          if (isPlayer1Slot) {
            nextMatch.player1_id = winnerId;
          } else {
            nextMatch.player2_id = winnerId;
          }
          console.log(`    ➡️ R${currentRound}:M${match.position} → R${nextRound}:M${nextPosition} (${targetSlot})`);
        }
      }
    });

    const nextRoundMatches = matches.filter(m => m.round === nextRound);
    let newByesCreated = 0;

    nextRoundMatches.forEach(nextMatch => {
      const hasPlayer1 = nextMatch.player1_id !== null;
      const hasPlayer2 = nextMatch.player2_id !== null;

      if (hasPlayer1 && !hasPlayer2 && !nextMatch.winner_id) {
        nextMatch.winner_id = nextMatch.player1_id;
        nextMatch.is_bye = true;
        newByesCreated++;
        console.log(`    ⚡ New BYE detected: R${nextRound}:M${nextMatch.position} - player1 auto-wins`);
      } else if (!hasPlayer1 && hasPlayer2 && !nextMatch.winner_id) {
        nextMatch.winner_id = nextMatch.player2_id;
        nextMatch.is_bye = true;
        newByesCreated++;
        console.log(`    ⚡ New BYE detected: R${nextRound}:M${nextMatch.position} - player2 auto-wins`);
      }
    });

    if (newByesCreated > 0) {
      console.log(`    Created ${newByesCreated} new BYE(s) in Round ${nextRound}`);
    }
  }

  const totalByes = matches.filter(m => m.is_bye).length;
  console.log(`✅ BYE propagation completed. Total BYE matches: ${totalByes}`);

  const finalMatch = matches.find(m => m.round === maxRound);
  if (finalMatch) {
    const hasPlayer1 = finalMatch.player1_id !== null;
    const hasPlayer2 = finalMatch.player2_id !== null;
    console.log(`📊 Finals status: Player1=${hasPlayer1 ? 'filled' : 'empty'}, Player2=${hasPlayer2 ? 'filled' : 'empty'}`);
  }
};

const consolidateOrphanedByes = (matches: MatchInsert[]): void => {
  console.log('🔧 Consolidating orphaned BYE matches...');

  // Find all BYE matches after Round 1 (problematic BYEs)
  const byesAfterRound1 = matches.filter(m =>
    m.round > 1 &&
    ((!m.player1_id && m.player2_id) || (m.player1_id && !m.player2_id))
  );

  if (byesAfterRound1.length === 0) {
    console.log('✅ No orphaned BYEs to consolidate');
    return;
  }

  console.log(`⚠️ Found ${byesAfterRound1.length} orphaned BYE(s) after Round 1`);

  // Group BYEs by round to consolidate them
  const byesByRound = new Map<number, MatchInsert[]>();
  byesAfterRound1.forEach(match => {
    if (!byesByRound.has(match.round)) {
      byesByRound.set(match.round, []);
    }
    byesByRound.get(match.round)!.push(match);
  });

  // Process each round to consolidate pairs of BYEs into normal matches
  byesByRound.forEach((roundByes, round) => {
    console.log(`  🔍 Round ${round}: ${roundByes.length} BYE(s) to consolidate`);

    // Sort BYEs by position
    roundByes.sort((a, b) => a.position - b.position);

    // Try to pair up BYEs
    for (let i = 0; i < roundByes.length - 1; i += 2) {
      const bye1 = roundByes[i];
      const bye2 = roundByes[i + 1];

      if (!bye1 || !bye2) continue;

      const player1 = bye1.player1_id || bye1.player2_id;
      const player2 = bye2.player1_id || bye2.player2_id;

      if (!player1 || !player2) continue;

      // Consolidate: put both players in the first match
      bye1.player1_id = player1;
      bye1.player2_id = player2;
      bye1.winner_id = null; // Clear winner since it's now a real match

      console.log(`    ✅ Consolidated R${round}:M${bye1.position} + R${round}:M${bye2.position} into R${round}:M${bye1.position}`);

      // Mark the second BYE for removal by clearing its players
      bye2.player1_id = null;
      bye2.player2_id = null;
      bye2.winner_id = null;

      console.log(`    🗑️ Cleared R${round}:M${bye2.position} (will be removed)`);
    }

    // Handle odd BYE (if any remains unpaired)
    if (roundByes.length % 2 === 1) {
      const oddBye = roundByes[roundByes.length - 1];
      const participantId = oddBye.player1_id || oddBye.player2_id;

      if (participantId) {
        // This player gets a legitimate BYE and auto-advances
        oddBye.player1_id = participantId;
        oddBye.player2_id = null;
        oddBye.winner_id = participantId;
        console.log(`    ⚡ Solo BYE at R${round}:M${oddBye.position} - auto-advancing participant`);
      }
    }
  });

  // Remove empty matches (matches that were cleared during consolidation)
  const matchesToRemove = matches.filter(m =>
    !m.player1_id && !m.player2_id && !m.winner_id && m.round > 1
  );

  if (matchesToRemove.length > 0) {
    console.log(`  🗑️ Removing ${matchesToRemove.length} empty match(es) after consolidation`);
    matchesToRemove.forEach(match => {
      const index = matches.indexOf(match);
      if (index > -1) {
        matches.splice(index, 1);
      }
    });
  }

  console.log('✅ Consolidation complete');
};

const validateAndCleanupByes = (matches: MatchInsert[]): void => {
  console.log('🔍 Validating power-of-2 bracket structure...');

  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);
  const totalMatches = matches.length;
  const expectedMatches = Math.pow(2, rounds.length) - 1;

  console.log(`   Total matches: ${totalMatches}, Expected: ${expectedMatches}`);

  if (totalMatches !== expectedMatches) {
    console.warn(`⚠️ Match count mismatch: got ${totalMatches}, expected ${expectedMatches}`);
  }

  for (let i = 1; i < rounds.length; i++) {
    const currentRound = rounds[i - 1];
    const nextRound = rounds[i];
    const currentRoundMatches = matches.filter(m => m.round === currentRound).length;
    const nextRoundMatches = matches.filter(m => m.round === nextRound).length;
    const expectedNextRoundMatches = currentRoundMatches / 2;

    if (nextRoundMatches !== expectedNextRoundMatches) {
      console.error(`❌ Round structure error: R${currentRound} has ${currentRoundMatches} matches, but R${nextRound} has ${nextRoundMatches} (expected ${expectedNextRoundMatches})`);
    } else {
      console.log(`✅ R${currentRound} → R${nextRound}: ${currentRoundMatches} → ${nextRoundMatches} matches`);
    }
  }

  const byeCount = matches.filter(m => m.is_bye && m.round === 1).length;
  console.log(`✅ Round 1 BYEs: ${byeCount}`);
  console.log('✅ Bracket validation complete');
};

export const calculateTotalByesInBracket = (totalParticipants: number): number => {
  let currentPlayers = totalParticipants;
  let totalByes = 0;

  while (currentPlayers > 1) {
    const byes = currentPlayers % 2;
    totalByes += byes;
    const matches = Math.floor(currentPlayers / 2);
    currentPlayers = matches + byes;
  }

  return totalByes;
};

export const calculateRoundsNeeded = (totalParticipants: number): number => {
  let currentPlayers = totalParticipants;
  let rounds = 0;

  while (currentPlayers > 1) {
    rounds++;
    const matches = Math.floor(currentPlayers / 2);
    const byes = currentPlayers % 2;
    currentPlayers = matches + byes;
  }

  return rounds;
};

export const saveBracket = async (
  matches: MatchInsert[],
  validUserIds: Set<string>,
  tournamentId?: string,
  bracketStatus?: 'draft' | 'live'
): Promise<Match[] | null> => {
  try {
    // Filter out any matches with invalid user IDs before saving
    const validMatches = matches.map(match => ({
      ...match,
      // Ensure player1_id is either null or a valid user ID
      player1_id: match.player1_id && validUserIds.has(match.player1_id) ? match.player1_id : null,
      // Ensure player2_id is either null or a valid user ID
      player2_id: match.player2_id && validUserIds.has(match.player2_id) ? match.player2_id : null,
      // Ensure winner_id is either null or a valid user ID
      winner_id: match.winner_id && validUserIds.has(match.winner_id) ? match.winner_id : null
    }));

    // Use upsert to handle existing matches gracefully
    const { data, error } = await supabase
      .from('tournament_matches')
      .upsert(validMatches, {
        onConflict: 'tournament_id,round,position'
      })
      .select();

    if (error) throw error;

    // Update the tournament's bracket_status if provided
    if (bracketStatus && tournamentId) {
      const { error: statusError } = await supabase
        .from('tournaments')
        .update({ bracket_status: bracketStatus })
        .eq('id', tournamentId);

      if (statusError) {
        console.error('Error updating bracket status:', statusError);
        // Don't throw - matches were saved successfully
      }
    }

    return data;
  } catch (error) {
    console.error('Error saving bracket:', error);
    return null;
  }
};

export const insertMatches = async (
  matches: MatchInsert[], 
  validUserIds: Set<string>,
  tournamentId?: string,
  bracketStatus?: 'draft' | 'live'
): Promise<Match[] | null> => {
  try {
    // Filter out any matches with invalid user IDs before saving
    const validMatches = matches.map(match => ({
      ...match,
      // Ensure player1_id is either null or a valid user ID
      player1_id: match.player1_id && validUserIds.has(match.player1_id) ? match.player1_id : null,
      // Ensure player2_id is either null or a valid user ID
      player2_id: match.player2_id && validUserIds.has(match.player2_id) ? match.player2_id : null,
      // Ensure winner_id is either null or a valid user ID
      winner_id: match.winner_id && validUserIds.has(match.winner_id) ? match.winner_id : null
    }));
    
    // Insert matches without deleting existing ones
    const { data, error } = await supabase
      .from('tournament_matches')
      .insert(validMatches)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error inserting matches:', error);
    return null;
  }
};

export const updateMatchWinner = async (
  matches: Match[],
  matchId: string,
  winnerId: string
): Promise<Match[]> => {
  try {
    // Update current match
    const currentMatch = matches.find(m => m.id === matchId);
    if (!currentMatch) return matches;

    // Get the loser ID
    const loserId = currentMatch.player1_id === winnerId
      ? currentMatch.player2_id
      : currentMatch.player1_id;

    // Record elimination for the loser
    if (loserId) {
      const { data: playerData } = await supabase
        .from('player_rankings')
        .select('elo_rating')
        .eq('user_id', loserId)
        .eq('game_id', currentMatch.tournament_id)
        .maybeSingle();

      const eloAtElimination = playerData?.elo_rating || null;

      await recordPlayerElimination(
        currentMatch.tournament_id,
        loserId,
        currentMatch.round,
        eloAtElimination
      );
    }

    // Update match with winner
    const updatedMatches = matches.map(match =>
      match.id === matchId ? { ...match, winner_id: winnerId } : match
    );

    // Find next match
    const nextRoundMatch = matches.find(m =>
      m.round === currentMatch.round + 1 &&
      Math.ceil(currentMatch.position / 2) === m.position
    );

    if (nextRoundMatch) {
      // Determine if winner goes to player1 or player2 slot
      const isPlayer1 = currentMatch.position % 2 !== 0;

      updatedMatches.forEach(match => {
        if (match.id === nextRoundMatch.id) {
          if (isPlayer1) {
            match.player1_id = winnerId;
          } else {
            match.player2_id = winnerId;
          }
        }
      });
    }

    // Save changes to database
    const { error } = await supabase
      .from('tournament_matches')
      .upsert(updatedMatches);

    if (error) throw error;

    // Get tournament and game info for ELO updates and notifications
    const { data: tournamentData, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, game_id, type, title')
      .eq('id', currentMatch.tournament_id)
      .single();

    if (tournamentError) {
      console.error('Error fetching tournament data:', tournamentError);
    } else if (tournamentData.game_id && loserId) {
      // Update ELO ratings
      if (tournamentData.type === 'solo') {
        await updatePlayerRankings(
          winnerId,
          loserId,
          tournamentData.game_id,
          false,
          tournamentData.id
        );
      } else if (tournamentData.type === 'team') {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('id, captain_id')
          .in('captain_id', [winnerId, loserId])
          .eq('tournament_id', tournamentData.id);

        if (teamError) {
          console.error('Error fetching team data:', teamError);
        } else if (teamData && teamData.length === 2) {
          const winnerTeam = teamData.find(t => t.captain_id === winnerId);
          const loserTeam = teamData.find(t => t.captain_id === loserId);

          if (winnerTeam && loserTeam) {
            await updateTeamRankings(
              winnerTeam.id,
              loserTeam.id,
              tournamentData.game_id,
              false,
              tournamentData.id
            );
          }
        }
      }

      // Send match result notifications to both players
      const totalRounds = Math.max(...matches.map(m => m.round));
      const roundName = getRoundName(currentMatch.round, totalRounds);

      await notifyMatchResult(
        tournamentData.id,
        tournamentData.title,
        matchId,
        currentMatch.round,
        roundName,
        winnerId,
        loserId,
        false,
        tournamentData.game_id
      );

      // If there's a next opponent, notify the winner
      if (nextRoundMatch) {
        const nextOpponentId = currentMatch.position % 2 !== 0
          ? nextRoundMatch.player2_id
          : nextRoundMatch.player1_id;

        if (nextOpponentId) {
          const nextRoundName = getRoundName(nextRoundMatch.round, totalRounds);
          await notifyNextOpponent(
            tournamentData.id,
            tournamentData.title,
            winnerId,
            nextRoundMatch.id,
            nextRoundMatch.round,
            nextRoundName,
            nextOpponentId,
            tournamentData.game_id
          );
        }
      }
    }

    return updatedMatches;
  } catch (error) {
    console.error('Error updating match:', error);
    return matches;
  }
};

/**
 * Send match notifications for a specific round
 * Useful for initial bracket launch (Round 1) or manual notification triggers
 */
export const sendMatchNotificationsForRound = async (
  tournamentId: string,
  tournamentTitle: string,
  roundNumber: number,
  matches: Match[],
  gameId?: string
): Promise<void> => {
  try {
    const totalRounds = Math.max(...matches.map(m => m.round));
    const roundName = getRoundName(roundNumber, totalRounds);
    const roundMatches = matches.filter(m => m.round === roundNumber);

    console.log(`📢 Sending match notifications for ${roundName} (${roundMatches.length} matches)`);

    for (const match of roundMatches) {
      if (match.player1_id && match.player2_id) {
        await notifyMatchStarting(
          tournamentId,
          tournamentTitle,
          match.id,
          roundNumber,
          roundName,
          match.player1_id,
          match.player2_id,
          gameId
        );
      }
    }

    console.log(`✅ Sent ${roundMatches.filter(m => m.player1_id && m.player2_id).length} match notifications for ${roundName}`);
  } catch (error) {
    console.error('Error sending match notifications for round:', error);
  }
};

/**
 * Initialize and start Round 1 when bracket goes live
 * Starts the timer and sends notifications to all players
 */
export const startRoundOne = async (
  tournamentId: string,
  tournamentTitle: string,
  matches: Match[],
  gameId?: string
): Promise<boolean> => {
  try {
    console.log(`🚀 Starting Round 1 for tournament ${tournamentId}`);

    const totalRounds = Math.max(...matches.map(m => m.round));
    const round1Timer = await getRoundTimer(tournamentId, 1);

    if (!round1Timer) {
      console.error('Timer not found for Round 1');
      return false;
    }

    const startedTimer = await startRoundTimer(tournamentId, 1);

    if (!startedTimer) {
      console.error('Failed to start timer for Round 1');
      return false;
    }

    const roundName = getRoundName(1, totalRounds);
    await notifyRoundStarted(
      tournamentId,
      tournamentTitle,
      1,
      roundName,
      round1Timer.duration_minutes
    );

    await sendMatchNotificationsForRound(
      tournamentId,
      tournamentTitle,
      1,
      matches,
      gameId
    );

    console.log(`✅ Round 1 started successfully with timer and notifications`);
    return true;
  } catch (error) {
    console.error('Error starting Round 1:', error);
    return false;
  }
};

export const canEditFirstRound = (matches: Match[]): boolean => {
  const firstRoundMatches = matches.filter(m => m.round === 1);
  return firstRoundMatches.length > 0 && firstRoundMatches.every(m => m.winner_id === null);
};

export const updateBracketMatchParticipants = async (
  matchId: string,
  newPlayer1Id: string,
  newPlayer2Id: string,
  validUserIds: Set<string>
): Promise<boolean> => {
  try {
    if (!validUserIds.has(newPlayer1Id) || !validUserIds.has(newPlayer2Id)) {
      return false;
    }

    const { error } = await supabase
      .from('tournament_matches')
      .update({
        player1_id: newPlayer1Id,
        player2_id: newPlayer2Id
      })
      .eq('id', matchId);

    if (error) {
      console.error('Error updating bracket match participants:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateBracketMatchParticipants:', error);
    return false;
  }
};

export const canModifyBracketMatch = (match: Match, allMatches: Match[]): boolean => {
  if (!match.winner_id) return false;

  const nextRound = match.round + 1;
  const nextPosition = Math.ceil(match.position / 2);
  const nextMatch = allMatches.find(m => m.round === nextRound && m.position === nextPosition);

  if (!nextMatch) return true;

  return nextMatch.winner_id === null;
};

export const resetBracketMatchWinner = async (
  matchId: string,
  matches: Match[]
): Promise<Match[] | null> => {
  try {
    const match = matches.find(m => m.id === matchId);
    if (!match || !canModifyBracketMatch(match, matches)) {
      return null;
    }

    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);
    const nextMatch = matches.find(m => m.round === nextRound && m.position === nextPosition);

    const updates: any[] = [
      {
        id: matchId,
        winner_id: null
      }
    ];

    if (nextMatch) {
      const isPlayer1Slot = match.position % 2 !== 0;
      updates.push({
        id: nextMatch.id,
        [isPlayer1Slot ? 'player1_id' : 'player2_id']: null
      });
    }

    for (const update of updates) {
      const { error } = await supabase
        .from('tournament_matches')
        .update(update)
        .eq('id', update.id);

      if (error) {
        console.error('Error resetting bracket match:', error);
        return null;
      }
    }

    const updatedMatches = matches.map(m => {
      const update = updates.find(u => u.id === m.id);
      return update ? { ...m, ...update } : m;
    });

    return updatedMatches;
  } catch (error) {
    console.error('Error in resetBracketMatchWinner:', error);
    return null;
  }
};

export const changeBracketMatchWinner = async (
  matchId: string,
  newWinnerId: string,
  matches: Match[],
  validUserIds: Set<string>
): Promise<Match[] | null> => {
  try {
    const match = matches.find(m => m.id === matchId);
    if (!match || !canModifyBracketMatch(match, matches)) {
      return null;
    }

    if (!validUserIds.has(newWinnerId)) {
      return null;
    }

    if (match.player1_id !== newWinnerId && match.player2_id !== newWinnerId) {
      return null;
    }

    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);
    const nextMatch = matches.find(m => m.round === nextRound && m.position === nextPosition);

    const updates: any[] = [
      {
        id: matchId,
        winner_id: newWinnerId
      }
    ];

    if (nextMatch) {
      const isPlayer1Slot = match.position % 2 !== 0;
      updates.push({
        id: nextMatch.id,
        [isPlayer1Slot ? 'player1_id' : 'player2_id']: newWinnerId
      });
    }

    for (const update of updates) {
      const { error } = await supabase
        .from('tournament_matches')
        .update(update)
        .eq('id', update.id);

      if (error) {
        console.error('Error changing bracket match winner:', error);
        return null;
      }
    }

    const updatedMatches = matches.map(m => {
      const update = updates.find(u => u.id === m.id);
      return update ? { ...m, ...update } : m;
    });

    return updatedMatches;
  } catch (error) {
    console.error('Error in changeBracketMatchWinner:', error);
    return null;
  }
};

export const detectByeMatches = (matches: Match[]): Match[] => {
  return matches.filter(match => {
    const hasPlayer1 = match.player1_id !== null && match.player1_id !== undefined;
    const hasPlayer2 = match.player2_id !== null && match.player2_id !== undefined;

    // A BYE match has exactly one player (not zero, not two)
    const isBye = (hasPlayer1 && !hasPlayer2) || (!hasPlayer1 && hasPlayer2);

    return isBye;
  });
};

export const getByesByRound = (matches: Match[]): Map<number, Match[]> => {
  const byeMatches = detectByeMatches(matches);
  const byesByRound = new Map<number, Match[]>();

  byeMatches.forEach(match => {
    const roundMatches = byesByRound.get(match.round) || [];
    roundMatches.push(match);
    byesByRound.set(match.round, roundMatches);
  });

  return byesByRound;
};

export const hasMatchWithBye = (match: Match): boolean => {
  return (!match.player1_id || !match.player2_id) && !match.winner_id;
};

/**
 * Check if there are any BYEs detected after the first round
 * This indicates an imbalanced bracket that needs manual adjustment
 */
export const hasByesAfterFirstRound = (matches: Match[]): boolean => {
  const byesByRound = getByesByRound(matches);
  return Array.from(byesByRound.keys()).some(round => round > 1);
};

/**
 * Check if a specific round has BYEs
 */
export const roundHasByes = (roundNumber: number, matches: Match[]): boolean => {
  const byesByRound = getByesByRound(matches);
  return byesByRound.has(roundNumber);
};

export const canModifyRound = (roundNumber: number, matches: Match[]): boolean => {
  const roundMatches = matches.filter(m => m.round === roundNumber);
  if (roundMatches.length === 0) return false;

  const nextRoundMatches = matches.filter(m => m.round === roundNumber + 1);
  const nextRoundHasWinners = nextRoundMatches.some(m => m.winner_id !== null);

  return !nextRoundHasWinners;
};

export const isMatchBlockedByDescendants = (match: Match, allMatches: Match[]): boolean => {
  const nextRound = match.round + 1;
  const nextPosition = Math.ceil(match.position / 2);
  const nextMatch = allMatches.find(m => m.round === nextRound && m.position === nextPosition);

  if (!nextMatch) return false;

  return nextMatch.winner_id !== null;
};

export const getMatchDependencies = (match: Match, allMatches: Match[]): Match[] => {
  const dependencies: Match[] = [];

  let currentRound = match.round + 1;
  let currentPosition = Math.ceil(match.position / 2);

  const maxRounds = Math.max(...allMatches.map(m => m.round));

  while (currentRound <= maxRounds) {
    const dependentMatch = allMatches.find(
      m => m.round === currentRound && m.position === currentPosition
    );

    if (dependentMatch) {
      dependencies.push(dependentMatch);
      currentPosition = Math.ceil(currentPosition / 2);
    }

    currentRound++;
  }

  return dependencies;
};

export const getEditableMatches = (matches: Match[]): Match[] => {
  return matches.filter(match => {
    if (match.winner_id) {
      return !isMatchBlockedByDescendants(match, matches);
    }
    return canModifyRound(match.round, matches);
  });
};

/**
 * Enhanced version of canEditMatchInRound that allows editing when BYEs are detected
 * Exception: When BYEs are detected after round 1, allow editing to fix the bracket
 */
export const canEditMatchInRound = (match: Match, allMatches: Match[]): boolean => {
  // If the match has a winner and descendants have started, check for BYE exception
  if (match.winner_id && isMatchBlockedByDescendants(match, allMatches)) {
    // Exception: Allow editing if there are BYEs detected after round 1
    // This allows admins to fix imbalanced brackets without full reset
    if (hasByesAfterFirstRound(allMatches)) {
      console.log('BYE exception: Allowing edit despite descendants having started');
      return true;
    }
    return false;
  }

  // Check if the round can be modified (next round hasn't started)
  const canModify = canModifyRound(match.round, allMatches);

  // Exception: If current round has BYEs, allow editing even if next round has started
  if (!canModify && roundHasByes(match.round, allMatches)) {
    console.log(`BYE exception: Allowing edit for round ${match.round} due to BYE detection`);
    return true;
  }

  return canModify;
};

export const advancePlayerToNextRound = async (
  matches: Match[],
  currentMatch: Match,
  participantId: string
): Promise<Match[] | null> => {
  try {
    const nextRound = currentMatch.round + 1;
    const nextPosition = Math.ceil(currentMatch.position / 2);

    const nextMatch = matches.find(m =>
      m.round === nextRound && m.position === nextPosition
    );

    if (!nextMatch) return matches;

    const isPlayer1Slot = currentMatch.position % 2 !== 0;

    const updates: any[] = [
      {
        id: currentMatch.id,
        winner_id: participantId
      },
      {
        id: nextMatch.id,
        [isPlayer1Slot ? 'player1_id' : 'player2_id']: participantId
      }
    ];

    for (const update of updates) {
      const { error } = await supabase
        .from('tournament_matches')
        .update(update)
        .eq('id', update.id);

      if (error) {
        console.error('Error advancing player:', error);
        return null;
      }
    }

    const updatedMatches = matches.map(m => {
      const update = updates.find(u => u.id === m.id);
      return update ? { ...m, ...update } : m;
    });

    return updatedMatches;
  } catch (error) {
    console.error('Error in advancePlayerToNextRound:', error);
    return null;
  }
};

export const resetMatchAndDescendants = async (
  matchId: string,
  matches: Match[]
): Promise<Match[] | null> => {
  try {
    const match = matches.find(m => m.id === matchId);
    if (!match) return null;

    if (isMatchBlockedByDescendants(match, matches)) {
      return null;
    }

    const dependencies = getMatchDependencies(match, matches);
    const updates: any[] = [
      {
        id: matchId,
        winner_id: null
      }
    ];

    dependencies.forEach(depMatch => {
      const isPlayer1Slot = match.position % 2 !== 0;
      updates.push({
        id: depMatch.id,
        [isPlayer1Slot ? 'player1_id' : 'player2_id']: null
      });
    });

    for (const update of updates) {
      const { error } = await supabase
        .from('tournament_matches')
        .update(update)
        .eq('id', update.id);

      if (error) {
        console.error('Error resetting match and descendants:', error);
        return null;
      }
    }

    const updatedMatches = matches.map(m => {
      const update = updates.find(u => u.id === m.id);
      return update ? { ...m, ...update } : m;
    });

    return updatedMatches;
  } catch (error) {
    console.error('Error in resetMatchAndDescendants:', error);
    return null;
  }
};

/**
 * Reset the entire bracket for a tournament
 * This will delete all matches and reset tournament bracket status
 * @param tournamentId - The tournament ID to reset
 * @returns boolean indicating success or failure
 */
export const resetTournamentBracket = async (tournamentId: string): Promise<boolean> => {
  try {
    console.log(`Starting bracket reset for tournament: ${tournamentId}`);

    // Step 1: Delete all matches for this tournament
    const { error: deleteMatchesError } = await supabase
      .from('tournament_matches')
      .delete()
      .eq('tournament_id', tournamentId);

    if (deleteMatchesError) {
      console.error('Error deleting tournament matches:', deleteMatchesError);
      throw deleteMatchesError;
    }

    console.log(`All matches deleted for tournament: ${tournamentId}`);

    // Step 2: Reset tournament bracket-related fields
    const { error: updateTournamentError } = await supabase
      .from('tournaments')
      .update({
        bracket_status: null,
        bracket_launched_at: null,
        actual_participants: null
      })
      .eq('id', tournamentId);

    if (updateTournamentError) {
      console.error('Error resetting tournament bracket status:', updateTournamentError);
      throw updateTournamentError;
    }

    console.log(`Tournament bracket status reset for: ${tournamentId}`);

    return true;
  } catch (error) {
    console.error('Error in resetTournamentBracket:', error);
    return false;
  }
};

/**
 * Check if all matches in a specific round are completed
 */
export const isRoundCompleted = (matches: Match[], roundNumber: number): boolean => {
  const roundMatches = matches.filter(m => m.round === roundNumber);

  if (roundMatches.length === 0) {
    return false;
  }

  // All matches must have a winner
  return roundMatches.every(match => match.winner_id !== null);
};

/**
 * Get incomplete matches for a specific round
 */
export const getIncompleteMatches = (matches: Match[], roundNumber: number): Match[] => {
  return matches.filter(m => m.round === roundNumber && m.winner_id === null);
};

/**
 * Handle automatic round progression after all matches are completed
 * This function is called after a match winner is selected
 */
export const handleRoundProgression = async (
  tournamentId: string,
  tournamentTitle: string,
  matches: Match[],
  currentRound: number,
  totalRounds: number
): Promise<{ shouldShowModal: boolean; incompleteMatches: Match[]; nextRound: number | null }> => {
  try {
    // Check if current round is completed
    const roundCompleted = isRoundCompleted(matches, currentRound);

    if (!roundCompleted) {
      // Round not completed yet, nothing to do
      return {
        shouldShowModal: false,
        incompleteMatches: [],
        nextRound: null
      };
    }

    console.log(`✅ Round ${currentRound} completed, checking for progression...`);

    // Complete the current round timer
    await completeRoundTimer(tournamentId, currentRound);

    // Check if there's a next round
    const nextRound = currentRound + 1;
    const hasNextRound = nextRound <= totalRounds;

    // Get round names for notifications
    const currentRoundName = getRoundName(currentRound, totalRounds);
    const nextRoundName = hasNextRound ? getRoundName(nextRound, totalRounds) : null;

    // Create notification for round completion
    await notifyRoundCompleted(
      tournamentId,
      tournamentTitle,
      currentRound,
      currentRoundName,
      hasNextRound ? nextRound : undefined,
      nextRoundName || undefined
    );

    if (!hasNextRound) {
      // Tournament is finished
      console.log(`🏆 Tournament ${tournamentId} is completed!`);
      return {
        shouldShowModal: false,
        incompleteMatches: [],
        nextRound: null
      };
    }

    // Check if next round has any incomplete matches from previous auto-progression
    const nextRoundIncomplete = getIncompleteMatches(matches, nextRound);

    if (nextRoundIncomplete.length > 0) {
      // Next round has incomplete matches, show modal
      console.log(`⚠️ Next round ${nextRound} has ${nextRoundIncomplete.length} incomplete matches`);
      return {
        shouldShowModal: true,
        incompleteMatches: nextRoundIncomplete,
        nextRound
      };
    }

    // Auto-progress to next round
    await progressToNextRound(tournamentId, tournamentTitle, nextRound, totalRounds);

    return {
      shouldShowModal: false,
      incompleteMatches: [],
      nextRound
    };
  } catch (error) {
    console.error('Error handling round progression:', error);
    return {
      shouldShowModal: false,
      incompleteMatches: [],
      nextRound: null
    };
  }
};

/**
 * Progress to the next round (start its timer and create notification)
 */
export const progressToNextRound = async (
  tournamentId: string,
  tournamentTitle: string,
  nextRound: number,
  totalRounds: number
): Promise<boolean> => {
  try {
    // Complete the previous round's timer (if any)
    if (nextRound > 1) {
      const previousRound = nextRound - 1;
      await completeRoundTimer(tournamentId, previousRound);
      console.log(`✅ Completed timer for previous round ${previousRound}`);
    }

    // Get the timer for the next round
    const timer = await getRoundTimer(tournamentId, nextRound);

    if (!timer) {
      console.error(`Timer not found for round ${nextRound}`);
      return false;
    }

    // Start the next round's timer
    const startedTimer = await startRoundTimer(tournamentId, nextRound);

    if (!startedTimer) {
      console.error(`Failed to start timer for round ${nextRound}`);
      return false;
    }

    // Create notification for round start
    const roundName = getRoundName(nextRound, totalRounds);
    await notifyRoundStarted(
      tournamentId,
      tournamentTitle,
      nextRound,
      roundName,
      timer.duration_minutes
    );

    // Get game_id from tournament
    const { data: tournamentData } = await supabase
      .from('tournaments')
      .select('game_id')
      .eq('id', tournamentId)
      .single();

    // Send match starting notifications to all players in the next round
    const nextRoundMatches = matches.filter(m => m.round === nextRound);

    for (const match of nextRoundMatches) {
      if (match.player1_id && match.player2_id) {
        await notifyMatchStarting(
          tournamentId,
          tournamentTitle,
          match.id,
          nextRound,
          roundName,
          match.player1_id,
          match.player2_id,
          tournamentData?.game_id || undefined
        );
      }
    }

    console.log(`▶️ Progressed to round ${nextRound}, timer started, notifications sent`);
    return true;
  } catch (error) {
    console.error('Error progressing to next round:', error);
    return false;
  }
};

/**
 * Check if a round timer has expired and handle it
 */
export const checkAndHandleExpiredTimer = async (
  tournamentId: string,
  roundNumber: number
): Promise<boolean> => {
  try {
    const timer = await getRoundTimer(tournamentId, roundNumber);

    if (!timer || timer.status !== 'active') {
      return false;
    }

    const now = new Date();
    const endTime = timer.end_time ? new Date(timer.end_time) : null;

    if (!endTime || now < endTime) {
      // Timer hasn't expired yet
      return false;
    }

    // Timer has expired, mark it
    await expireRoundTimer(timer.id);

    console.log(`⏰ Timer expired for round ${roundNumber}`);
    return true;
  } catch (error) {
    console.error('Error checking expired timer:', error);
    return false;
  }
};

/**
 * Handle incomplete matches by marking them as forfeits
 * Both players in incomplete matches are eliminated (double forfeit)
 */
export const handleIncompleteMatchesForfeit = async (
  matches: Match[],
  roundNumber: number
): Promise<Match[]> => {
  try {
    const incompleteMatches = getIncompleteMatches(matches, roundNumber);

    if (incompleteMatches.length === 0) {
      console.log(`✅ No incomplete matches in round ${roundNumber}`);
      return matches;
    }

    console.log(`⚠️ Forfeiting ${incompleteMatches.length} incomplete match(es) in round ${roundNumber}`);

    const updates: any[] = [];

    for (const match of incompleteMatches) {
      const hasPlayer1 = match.player1_id !== null;
      const hasPlayer2 = match.player2_id !== null;
      const isDoubleForfeit = hasPlayer1 && hasPlayer2;

      if (isDoubleForfeit) {
        console.log(`🔍 Double forfeit detected in Match ${match.id} (R${match.round}:M${match.position})`);

        const { selectLuckyLoser, reintegrateLuckyLoser } = await import('../../services/eliminationTrackingService');
        const luckyLoser = await selectLuckyLoser(match.tournament_id, match.round);

        if (luckyLoser) {
          console.log(`✨ Lucky loser found: Player ${luckyLoser.player_id} (ELO: ${luckyLoser.elo_at_elimination})`);

          const replacedPlayerId = match.player1_id;
          updates.push({
            id: match.id,
            player1_id: luckyLoser.player_id,
            winner_id: luckyLoser.player_id,
            is_lucky_loser_match: true,
            lucky_loser_player_id: luckyLoser.player_id,
            replaced_player_id: replacedPlayerId,
            forfeit_reason: 'Double forfeit - Lucky loser auto-win'
          });

          await reintegrateLuckyLoser(luckyLoser.elimination_id, match.round);

          const nextRound = match.round + 1;
          const nextPosition = Math.ceil(match.position / 2);
          const nextMatch = matches.find(m => m.round === nextRound && m.position === nextPosition);

          if (nextMatch && !nextMatch.winner_id) {
            const isPlayer1Slot = match.position % 2 !== 0;
            updates.push({
              id: nextMatch.id,
              [isPlayer1Slot ? 'player1_id' : 'player2_id']: luckyLoser.player_id
            });
          }
        } else {
          console.log(`⚠️ No eligible lucky loser found for double forfeit`);
          updates.push({
            id: match.id,
            winner_id: null,
            forfeit_reason: 'Double forfeit - No eligible lucky loser'
          });
        }
      } else {
        updates.push({
          id: match.id,
          winner_id: null,
          forfeit_reason: 'Match incomplete'
        });

        const nextRound = match.round + 1;
        const nextPosition = Math.ceil(match.position / 2);
        const nextMatch = matches.find(m => m.round === nextRound && m.position === nextPosition);

        if (nextMatch && !nextMatch.winner_id) {
          const isPlayer1Slot = match.position % 2 !== 0;
          const slotToNull = isPlayer1Slot ? 'player1_id' : 'player2_id';

          updates.push({
            id: nextMatch.id,
            [slotToNull]: null
          });
        }
      }
    }

    for (const update of updates) {
      const { error } = await supabase
        .from('tournament_matches')
        .update(update)
        .eq('id', update.id);

      if (error) {
        console.error('Error updating match during forfeit:', error);
        throw error;
      }
    }

    const updatedMatches = matches.map(m => {
      const update = updates.find(u => u.id === m.id);
      return update ? { ...m, ...update } : m;
    });

    console.log(`✅ Forfeited ${incompleteMatches.length} match(es)`);

    return updatedMatches;
  } catch (error) {
    console.error('Error handling incomplete matches forfeit:', error);
    return matches;
  }
};

/**
 * Detect and repair orphaned BYE matches in an existing bracket
 * This function can be called to fix brackets that have BYE issues
 * @param tournamentId - The tournament ID to fix
 * @returns Object with success status and details about the fixes applied
 */
export const detectAndRepairOrphanedByes = async (
  tournamentId: string
): Promise<{
  success: boolean;
  byesFound: number;
  byesFixed: number;
  consolidatedMatches: number;
  message: string;
}> => {
  try {
    console.log(`🔍 Detecting orphaned BYEs in tournament ${tournamentId}...`);

    // Fetch all matches for this tournament
    const { data: matches, error } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round', { ascending: true })
      .order('position', { ascending: true });

    if (error) throw error;

    if (!matches || matches.length === 0) {
      return {
        success: true,
        byesFound: 0,
        byesFixed: 0,
        consolidatedMatches: 0,
        message: 'No matches found for this tournament'
      };
    }

    // Find BYEs after Round 1
    const byesAfterRound1 = matches.filter(m =>
      m.round > 1 &&
      ((!m.player1_id && m.player2_id) || (m.player1_id && !m.player2_id))
    );

    if (byesAfterRound1.length === 0) {
      return {
        success: true,
        byesFound: 0,
        byesFixed: 0,
        consolidatedMatches: 0,
        message: 'No orphaned BYEs detected - bracket is valid'
      };
    }

    console.log(`⚠️ Found ${byesAfterRound1.length} orphaned BYE(s) after Round 1`);

    // Group BYEs by round
    const byesByRound = new Map<number, Match[]>();
    byesAfterRound1.forEach(match => {
      if (!byesByRound.has(match.round)) {
        byesByRound.set(match.round, []);
      }
      byesByRound.get(match.round)!.push(match);
    });

    let consolidatedCount = 0;
    let fixedCount = 0;
    const updates: any[] = [];

    // Process each round
    for (const [round, roundByes] of byesByRound.entries()) {
      console.log(`  📋 Round ${round}: ${roundByes.length} BYE(s)`);

      // Sort by position
      roundByes.sort((a, b) => a.position - b.position);

      // Try to pair BYEs
      for (let i = 0; i < roundByes.length - 1; i += 2) {
        const bye1 = roundByes[i];
        const bye2 = roundByes[i + 1];

        if (!bye1 || !bye2) continue;

        const player1 = bye1.player1_id || bye1.player2_id;
        const player2 = bye2.player1_id || bye2.player2_id;

        if (!player1 || !player2) continue;

        // Consolidate into first match
        updates.push({
          id: bye1.id,
          player1_id: player1,
          player2_id: player2,
          winner_id: null
        });

        // Clear second match
        updates.push({
          id: bye2.id,
          player1_id: null,
          player2_id: null,
          winner_id: null
        });

        consolidatedCount++;
        fixedCount += 2;
        console.log(`    ✅ Consolidating M${bye1.position} + M${bye2.position} into M${bye1.position}`);
      }

      // Handle odd BYE (legitimate BYE that should auto-advance)
      if (roundByes.length % 2 === 1) {
        const oddBye = roundByes[roundByes.length - 1];
        const participantId = oddBye.player1_id || oddBye.player2_id;

        if (participantId && !oddBye.winner_id) {
          updates.push({
            id: oddBye.id,
            player1_id: participantId,
            player2_id: null,
            winner_id: participantId
          });

          // Advance to next round
          const nextRound = oddBye.round + 1;
          const nextPosition = Math.ceil(oddBye.position / 2);
          const nextMatch = matches.find(m =>
            m.round === nextRound && m.position === nextPosition
          );

          if (nextMatch) {
            const isPlayer1Slot = oddBye.position % 2 !== 0;
            updates.push({
              id: nextMatch.id,
              [isPlayer1Slot ? 'player1_id' : 'player2_id']: participantId
            });
          }

          fixedCount++;
          console.log(`    ⚡ Auto-advancing solo BYE at M${oddBye.position}`);
        }
      }
    }

    // Apply all updates to database
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('tournament_matches')
        .update(update)
        .eq('id', update.id);

      if (updateError) {
        console.error('Error updating match:', updateError);
        throw updateError;
      }
    }

    const message = `Successfully fixed ${fixedCount} BYE(s). Consolidated ${consolidatedCount} pair(s) of matches.`;
    console.log(`✅ ${message}`);

    return {
      success: true,
      byesFound: byesAfterRound1.length,
      byesFixed: fixedCount,
      consolidatedMatches: consolidatedCount,
      message
    };
  } catch (error) {
    console.error('Error detecting/repairing orphaned BYEs:', error);
    return {
      success: false,
      byesFound: 0,
      byesFixed: 0,
      consolidatedMatches: 0,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Force progression to the next round, handling incomplete matches as forfeits
 * This is called when admin manually advances round before timer expires
 */
export const forceProgressToNextRound = async (
  tournamentId: string,
  tournamentTitle: string,
  currentMatches: Match[],
  currentRound: number,
  nextRound: number,
  totalRounds: number
): Promise<{ success: boolean; updatedMatches: Match[] }> => {
  try {
    console.log(`🚀 Forcing progression from round ${currentRound} to round ${nextRound}`);

    // Step 1: Handle incomplete matches as forfeits
    const matchesAfterForfeit = await handleIncompleteMatchesForfeit(currentMatches, currentRound);

    // Step 2: Complete the current round timer
    await completeRoundTimer(tournamentId, currentRound);

    // Step 3: Create notification for forced progression
    const currentRoundName = getRoundName(currentRound, totalRounds);
    const nextRoundName = getRoundName(nextRound, totalRounds);

    await notifyRoundCompleted(
      tournamentId,
      tournamentTitle,
      currentRound,
      currentRoundName,
      nextRound,
      nextRoundName
    );

    // Step 4: Progress to next round (start timer and notify)
    const progressSuccess = await progressToNextRound(
      tournamentId,
      tournamentTitle,
      nextRound,
      totalRounds
    );

    if (!progressSuccess) {
      console.error('Failed to progress to next round');
      return { success: false, updatedMatches: currentMatches };
    }

    // Step 5: Recalculate BYEs for next round if needed
    // The BYE system will automatically handle missing participants
    // because we set their slots to null in the next round matches
    console.log(`✅ Forced progression to round ${nextRound} completed successfully`);

    return { success: true, updatedMatches: matchesAfterForfeit };
  } catch (error) {
    console.error('Error forcing progression to next round:', error);
    return { success: false, updatedMatches: currentMatches };
  }
};