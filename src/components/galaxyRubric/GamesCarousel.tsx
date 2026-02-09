import React, { useState, useRef } from 'react';
import { Search, Plus, ChevronLeft, ChevronRight, Gamepad2 } from 'lucide-react';
import { Game } from '../../types/galaxyRubricMapping';

interface GamesCarouselProps {
  allGames: Game[];
  linkedGameIds: Set<string>;
  onLinkGame: (gameId: string) => void;
  isLinking: boolean;
}

const GamesCarousel: React.FC<GamesCarouselProps> = ({
  allGames,
  linkedGameIds,
  onLinkGame,
  isLinking,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const unlinkedGames = allGames.filter(
    (game) =>
      !linkedGameIds.has(game.id) &&
      (game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (game.publisher &&
          game.publisher.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth',
      });
    }
  };

  if (allGames.length > 0 && allGames.length === linkedGameIds.size && !searchQuery) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        All available games have been linked
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search available games..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-1.5 bg-dark-400 border border-dark-200 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {unlinkedGames.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          {searchQuery ? 'No games match your search' : 'All games have been linked'}
        </div>
      ) : (
        <div className="relative group/carousel">
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-dark-300/90 border border-dark-100 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-dark-200 transition-all opacity-0 group-hover/carousel:opacity-100"
          >
            <ChevronLeft size={16} />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-1 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {unlinkedGames.map((game) => (
              <button
                key={game.id}
                onClick={() => onLinkGame(game.id)}
                disabled={isLinking}
                className="group/card flex-shrink-0 w-32 bg-dark-400 border border-dark-200 rounded-lg overflow-hidden hover:border-primary-500/50 hover:bg-dark-300 transition-all relative disabled:opacity-50"
              >
                <div className="w-32 h-20 bg-dark-200 flex items-center justify-center overflow-hidden">
                  {game.image_url ? (
                    <img
                      src={game.image_url}
                      alt={game.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Gamepad2 className="h-8 w-8 text-gray-600" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-white truncate">{game.name}</p>
                  {game.publisher && (
                    <p className="text-[10px] text-gray-500 truncate">{game.publisher}</p>
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all bg-black/30">
                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
                    <Plus size={16} className="text-white" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-dark-300/90 border border-dark-100 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-dark-200 transition-all opacity-0 group-hover/carousel:opacity-100"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default GamesCarousel;
