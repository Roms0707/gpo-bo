import React from 'react';
import { Check, Gamepad2 } from 'lucide-react';

interface Game {
  id: string;
  name: string;
  image_url?: string | null;
}

interface GameSelectorGridProps {
  games: Game[];
  selectedGameId: string;
  onSelect: (gameId: string) => void;
  maxDisplay?: number;
  onViewAll?: () => void;
  className?: string;
  compact?: boolean;
}

const GameSelectorGrid: React.FC<GameSelectorGridProps> = ({
  games,
  selectedGameId,
  onSelect,
  maxDisplay = 6,
  onViewAll,
  className = '',
  compact = true
}) => {
  const displayedGames = maxDisplay ? games.slice(0, maxDisplay) : games;
  const hasMore = games.length > maxDisplay;

  return (
    <div className={className}>
      <div className={`grid gap-3 ${compact ? 'grid-cols-3 md:grid-cols-6' : 'grid-cols-2 md:grid-cols-4 gap-4'}`}>
        {displayedGames.map((game) => {
          const isSelected = selectedGameId === game.id;
          return (
            <button
              key={game.id}
              type="button"
              onClick={() => onSelect(game.id)}
              className={`
                relative group rounded-lg overflow-hidden transition-all duration-200
                ${isSelected
                  ? 'ring-2 ring-primary-500 ring-offset-1 ring-offset-dark-300 scale-[1.02]'
                  : 'hover:ring-1 hover:ring-gray-500 hover:ring-offset-1 hover:ring-offset-dark-300 hover:scale-[1.01]'
                }
              `}
            >
              <div className={`${compact ? 'aspect-square' : 'aspect-[4/3]'} bg-dark-200 relative`}>
                {game.image_url ? (
                  <img
                    src={game.image_url}
                    alt={game.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-200 to-dark-300">
                    <Gamepad2 className={`${compact ? 'w-6 h-6' : 'w-12 h-12'} text-gray-600`} />
                  </div>
                )}

                <div className={`
                  absolute inset-0 transition-opacity duration-200
                  ${isSelected ? 'bg-primary-500/20' : 'bg-black/0 group-hover:bg-black/20'}
                `} />

                {isSelected && (
                  <div className={`absolute ${compact ? 'top-1 right-1' : 'top-2 right-2'} bg-primary-500 rounded-full ${compact ? 'p-1' : 'p-1.5'} shadow-lg`}>
                    <Check className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-white`} />
                  </div>
                )}
              </div>

              <div className={`
                ${compact ? 'p-2' : 'p-3'} bg-dark-200 border-t transition-colors duration-200
                ${isSelected ? 'border-primary-500/50 bg-primary-500/10' : 'border-dark-300'}
              `}>
                <p className={`
                  ${compact ? 'text-xs' : 'text-sm'} font-medium truncate transition-colors duration-200
                  ${isSelected ? 'text-primary-300' : 'text-white group-hover:text-gray-200'}
                `}>
                  {game.name}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {hasMore && onViewAll && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
          >
            <span>View All ({games.length})</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default GameSelectorGrid;
