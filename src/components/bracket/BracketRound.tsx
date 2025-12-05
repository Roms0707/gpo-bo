import React, { createRef } from 'react';
import BracketMatch from './BracketMatch';
import { Match, Player, Team } from './types';

interface BracketRoundProps {
  round: number;
  matches: Match[];
  totalRounds: number;
  tournament: any;
  players: Player[];
  teams: Team[];
  onWinnerSelected: (matchId: string, winnerId: string) => void;
  isEditable?: boolean;
  onMatchUpdate?: (matchId: string) => void;
  canModifyResult?: boolean;
  onResetMatch?: (matchId: string) => Promise<boolean>;
  onChangeWinner?: (matchId: string, newWinnerId: string) => Promise<boolean>;
  matchNumberMap?: Map<string, number>;
  highlightedMatchIds?: Set<string>;
  firstHighlightedMatchId?: string | null;
  searchQuery?: string;
  onPlayerInfoClick?: (participantId: string) => void;
}

const BracketRound: React.FC<BracketRoundProps> = ({
  round,
  matches,
  totalRounds,
  tournament,
  players,
  teams,
  onWinnerSelected,
  isEditable = false,
  onMatchUpdate,
  canModifyResult = false,
  onResetMatch,
  onChangeWinner,
  matchNumberMap = new Map(),
  highlightedMatchIds = new Set(),
  firstHighlightedMatchId = null,
  searchQuery = '',
  onPlayerInfoClick
}) => {
  const roundMatches = matches.filter(match => match.round === round);

  const getRoundName = () => {
    if (round === 1) return 'R1';
    if (round === totalRounds) return 'Final';
    if (round === totalRounds - 1) return 'Semi';
    if (round === totalRounds - 2) return 'Quarter';
    return `R${round}`;
  };

  const canModifyMatch = (match: Match): boolean => {
    if (!canModifyResult || !match.winner_id) return false;

    const nextRound = round + 1;
    const nextPosition = Math.ceil(match.position / 2);
    const nextMatch = matches.find(m => m.round === nextRound && m.position === nextPosition);

    if (!nextMatch) return true;

    return nextMatch.winner_id === null;
  };

  return (
    <div className="flex flex-col min-w-[200px]">
      <h3 className="text-sm font-semibold text-white mb-6 text-center">
        {getRoundName()}
      </h3>

      <div className="flex flex-col justify-center items-center space-y-6 flex-1 h-full">
        {roundMatches.map((match) => {
          const matchRef = match.id === firstHighlightedMatchId ? createRef<HTMLDivElement>() : null;
          return (
            <div key={match.id} className="w-[180px]">
              <BracketMatch
                ref={matchRef}
                match={match}
                tournament={tournament}
                players={players}
                teams={teams}
                onWinnerSelected={onWinnerSelected}
                isEditable={isEditable}
                onMatchUpdate={onMatchUpdate}
                canModifyResult={canModifyMatch(match)}
                onResetMatch={onResetMatch}
                onChangeWinner={onChangeWinner}
                matchNumber={matchNumberMap.get(match.id)}
                isHighlighted={highlightedMatchIds.has(match.id)}
                searchQuery={searchQuery}
                onPlayerInfoClick={onPlayerInfoClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BracketRound;