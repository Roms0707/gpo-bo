import React from 'react';
import { X } from 'lucide-react';
import { Match } from './types';

interface FullScreenMiniMapProps {
  matches: Match[];
  tournament: any;
  onClose: () => void;
}

const FullScreenMiniMap: React.FC<FullScreenMiniMapProps> = ({
  matches,
  tournament,
  onClose
}) => {
  if (matches.length === 0) return null;

  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);
  const maxMatchesInRound = Math.max(...rounds.map(round =>
    matches.filter(m => m.round === round).length
  ));

  const miniMapWidth = 240;
  const miniMapHeight = 160;
  const roundWidth = miniMapWidth / rounds.length;
  const matchHeight = miniMapHeight / maxMatchesInRound;

  return (
    <div className="fixed bottom-4 right-4 z-20 bg-dark-300 border-2 border-gray-600 rounded-lg shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-dark-400 border-b border-gray-600">
        <span className="text-xs font-semibold text-white">Mini Map</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="relative" style={{ width: miniMapWidth, height: miniMapHeight }}>
        <svg width={miniMapWidth} height={miniMapHeight} className="bg-dark-200">
          {rounds.map((round, roundIndex) => {
            const roundMatches = matches.filter(m => m.round === round).sort((a, b) => a.position - b.position);
            const roundX = roundIndex * roundWidth;

            return (
              <g key={round}>
                {roundMatches.map((match, matchIndex) => {
                  const matchY = (matchIndex * miniMapHeight) / roundMatches.length;
                  const matchHeightAdjusted = miniMapHeight / roundMatches.length;

                  const hasWinner = match.winner_id !== null;
                  const isBye = (match.player1_id && !match.player2_id) || (!match.player1_id && match.player2_id);

                  let fillColor = '#374151';
                  if (hasWinner) {
                    fillColor = '#10b981';
                  } else if (isBye) {
                    fillColor = '#f59e0b';
                  } else if (match.player1_id && match.player2_id) {
                    fillColor = '#3b82f6';
                  }

                  return (
                    <rect
                      key={match.id}
                      x={roundX + 2}
                      y={matchY + 2}
                      width={roundWidth - 4}
                      height={matchHeightAdjusted - 4}
                      fill={fillColor}
                      rx={2}
                      opacity={0.8}
                    />
                  );
                })}

                {roundIndex < rounds.length - 1 && roundMatches.map((match, matchIndex) => {
                  const nextRound = rounds[roundIndex + 1];
                  const nextPosition = Math.ceil(match.position / 2);
                  const nextMatch = matches.find(m => m.round === nextRound && m.position === nextPosition);

                  if (nextMatch) {
                    const nextRoundMatches = matches.filter(m => m.round === nextRound).sort((a, b) => a.position - b.position);
                    const nextMatchIndex = nextRoundMatches.findIndex(m => m.id === nextMatch.id);

                    const startY = (matchIndex * miniMapHeight) / roundMatches.length + (miniMapHeight / roundMatches.length) / 2;
                    const endY = (nextMatchIndex * miniMapHeight) / nextRoundMatches.length + (miniMapHeight / nextRoundMatches.length) / 2;

                    return (
                      <line
                        key={`line-${match.id}`}
                        x1={roundX + roundWidth - 2}
                        y1={startY}
                        x2={roundX + roundWidth + 2}
                        y2={endY}
                        stroke="#4b5563"
                        strokeWidth={1}
                        opacity={0.5}
                      />
                    );
                  }
                  return null;
                })}
              </g>
            );
          })}
        </svg>

        <div className="absolute inset-0 pointer-events-none border-2 border-primary-500/50 rounded" />
      </div>

      <div className="px-3 py-2 bg-dark-400 border-t border-gray-600">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-gray-700"></div>
              <span className="text-gray-400">Empty</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-400">Ready</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-400">Done</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-gray-400">BYE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullScreenMiniMap;
