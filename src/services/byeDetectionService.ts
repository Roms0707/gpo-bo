import { Match } from '../components/bracket/types';

export interface ByeDetectionResult {
  hasByes: boolean;
  totalByes: number;
  byesByRound: Map<number, Match[]>;
  problematicByes: Match[];
  round1Byes: Match[];
  affectedRounds: number[];
  canEnableEditing: boolean;
}

export const detectByes = (matches: Match[], totalRounds: number): ByeDetectionResult => {
  const byesByRound = new Map<number, Match[]>();
  const problematicByes: Match[] = [];
  const round1Byes: Match[] = [];

  matches.forEach(match => {
    const hasPlayer1 = match.player1_id !== null && match.player1_id !== undefined;
    const hasPlayer2 = match.player2_id !== null && match.player2_id !== undefined;

    // A BYE is when exactly one player is present (not zero, not two)
    const isBye = (hasPlayer1 && !hasPlayer2) || (!hasPlayer1 && hasPlayer2);

    if (isBye) {
      if (!byesByRound.has(match.round)) {
        byesByRound.set(match.round, []);
      }
      byesByRound.get(match.round)!.push(match);

      if (match.round === 1) {
        round1Byes.push(match);
      } else {
        // BYEs in later rounds are expected in odd-participant scenarios
        // Only mark as problematic if the match has no winner assigned
        if (!match.winner_id) {
          problematicByes.push(match);
        }
      }
    }
  });

  const totalByes = Array.from(byesByRound.values()).reduce((acc, matches) => acc + matches.length, 0);
  const affectedRounds = Array.from(byesByRound.keys()).sort((a, b) => a - b);
  const canEnableEditing = problematicByes.length > 0;

  return {
    hasByes: totalByes > 0,
    totalByes,
    byesByRound,
    problematicByes,
    round1Byes,
    affectedRounds,
    canEnableEditing
  };
};

export const hasProblematicByes = (matches: Match[]): boolean => {
  return matches.some(match => {
    const hasPlayer1 = match.player1_id !== null && match.player1_id !== undefined;
    const hasPlayer2 = match.player2_id !== null && match.player2_id !== undefined;
    // A BYE is when exactly one player is present
    const isBye = (hasPlayer1 && !hasPlayer2) || (!hasPlayer1 && hasPlayer2);

    // Problematic if it's a BYE after round 1 and has no winner
    return isBye && match.round > 1 && !match.winner_id;
  });
};

export const getByeMatchesForRound = (matches: Match[], round: number): Match[] => {
  return matches.filter(match => {
    const hasPlayer1 = match.player1_id !== null && match.player1_id !== undefined;
    const hasPlayer2 = match.player2_id !== null && match.player2_id !== undefined;
    // A BYE is when exactly one player is present
    const isBye = (hasPlayer1 && !hasPlayer2) || (!hasPlayer1 && hasPlayer2);

    return isBye && match.round === round;
  });
};

export const getEmptySlot = (match: Match): 'player1' | 'player2' | null => {
  const hasPlayer1 = match.player1_id !== null && match.player1_id !== undefined;
  const hasPlayer2 = match.player2_id !== null && match.player2_id !== undefined;

  if (!hasPlayer1 && !hasPlayer2) {
    return 'player1';
  }
  if (!hasPlayer1) {
    return 'player1';
  }
  if (!hasPlayer2) {
    return 'player2';
  }
  return null;
};

export const canMatchBeEdited = (match: Match): boolean => {
  return match.winner_id === null || match.winner_id === undefined;
};

export const getAvailableRounds = (matches: Match[]): number[] => {
  const rounds = new Set<number>();
  matches.forEach(match => rounds.add(match.round));
  return Array.from(rounds).sort((a, b) => a - b);
};

export const countByesInRound = (matches: Match[], round: number): number => {
  return getByeMatchesForRound(matches, round).length;
};

export const shouldAutoEnableEditing = (matches: Match[]): boolean => {
  return hasProblematicByes(matches);
};
