import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  autoScale?: boolean;
  containerWidth?: number;
  containerHeight?: number;
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
  onPlayerInfoClick,
  autoScale = false,
  containerWidth,
  containerHeight
}) => {
  const firstMatchRef = useRef<string | null>(null);
  const bracketRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const calculateScale = useCallback(() => {
    if (!autoScale || !bracketRef.current || !containerWidth) return;

    const bracketWidth = bracketRef.current.scrollWidth;
    const bracketHeight = bracketRef.current.scrollHeight;

    const MATCH_WIDTH = 180;
    const ROUND_GAP = 64;
    const PADDING = 64;

    const roundsSet = new Set(matches.map(m => m.round));
    const numRounds = roundsSet.size;
    const estimatedWidth = numRounds * MATCH_WIDTH + (numRounds - 1) * ROUND_GAP + PADDING * 2;

    const widthToUse = Math.max(bracketWidth, estimatedWidth);

    let newScale = 1;

    if (containerWidth && widthToUse > containerWidth) {
      newScale = containerWidth / widthToUse;
    }

    if (containerHeight && bracketHeight > 0) {
      const heightScale = containerHeight / bracketHeight;
      newScale = Math.min(newScale, heightScale);
    }

    const MIN_SCALE = 0.4;
    const MAX_SCALE = 1;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    setScale(newScale);
  }, [autoScale, containerWidth, containerHeight, matches]);

  useEffect(() => {
    calculateScale();
  }, [calculateScale]);

  useEffect(() => {
    if (!autoScale || !bracketRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      calculateScale();
    });

    resizeObserver.observe(bracketRef.current);

    return () => resizeObserver.disconnect();
  }, [autoScale, calculateScale]);

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

  const scaleStyle = autoScale ? {
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    width: scale < 1 ? `${100 / scale}%` : '100%'
  } : {};

  return (
    <div className="flex-1 flex flex-col">
      <div className="bracket-container flex-1">
        <div
          ref={bracketRef}
          className="flex gap-16 p-8 min-h-full transition-transform duration-300 ease-out"
          style={scaleStyle}
        >
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
