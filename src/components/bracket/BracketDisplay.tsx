import React, { useEffect, useRef } from 'react';
import { Trophy } from 'lucide-react';
import BracketRound from './BracketRound';
import { Match, Player, Team } from './types';

interface BracketDisplayProps {
  matches: Match[];
  tournament: any;
  players: Player[];
  teams: Team[];
  onWinnerSelected: (matchId: string, winnerId: string) => void;
  isEditable?: boolean;
  onMatchUpdate?: (matchId: string) => void;
  canModifyResult?: boolean;
  onResetMatch?: (matchId: string) => Promise<boolean>;
  onChangeWinner?: (matchId: string, newWinnerId: string) => Promise<boolean>;
  searchQuery?: string;
  highlightedMatchIds?: Set<string>;
  onPlayerInfoClick?: (participantId: string) => void;
}

const BracketDisplay: React.FC<BracketDisplayProps> = ({
  matches,
  tournament,
  players,
  teams,
  onWinnerSelected,
  isEditable = false,
  onMatchUpdate,
  canModifyResult = false,
  onResetMatch,
  onChangeWinner,
  searchQuery = '',
  highlightedMatchIds = new Set(),
  onPlayerInfoClick
}) => {
  const firstMatchRef = useRef<string | null>(null);

  useEffect(() => {
    if (searchQuery && highlightedMatchIds.size > 0) {
      const firstHighlightedId = sortedMatches.find(m => highlightedMatchIds.has(m.id))?.id;
      if (firstHighlightedId) {
        firstMatchRef.current = firstHighlightedId;
        setTimeout(() => {
          const matchElement = document.querySelector(`[data-match-id="${firstHighlightedId}"]`);
          if (matchElement) {
            matchElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }, 100);
      }
    } else {
      firstMatchRef.current = null;
    }
  }, [searchQuery, highlightedMatchIds.size]);
  if (matches.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white mb-2">Generating Bracket...</h3>
        <p className="text-gray-400 text-sm">
          Setting up single elimination matches for {tournament?.type === 'team' ? teams.length : players.length} approved {tournament?.type === 'team' ? 'teams' : 'players'}.
        </p>
      </div>
    );
  }

  const roundsSet = new Set(matches.map(m => m.round));
  const rounds = Array.from(roundsSet).sort((a, b) => a - b);
  const totalRounds = Math.max(...rounds);

  const sortedMatches = [...matches].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.position - b.position;
  });

  const matchNumberMap = new Map<string, number>();
  sortedMatches.forEach((match, index) => {
    matchNumberMap.set(match.id, index + 1);
  });

  return (
    <div className="flex-1 flex flex-col">
      <div className="bracket-container flex-1">
        <div className="flex gap-16 p-8 min-h-full">
          {rounds.map(round => (
            <BracketRound
              key={round}
              round={round}
              matches={matches}
              totalRounds={totalRounds}
              tournament={tournament}
              players={players}
              teams={teams}
              onWinnerSelected={onWinnerSelected}
              isEditable={isEditable}
              onMatchUpdate={onMatchUpdate}
              canModifyResult={canModifyResult}
              onResetMatch={onResetMatch}
              onChangeWinner={onChangeWinner}
              matchNumberMap={matchNumberMap}
              highlightedMatchIds={highlightedMatchIds}
              firstHighlightedMatchId={firstMatchRef.current}
              searchQuery={searchQuery}
              onPlayerInfoClick={onPlayerInfoClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BracketDisplay;