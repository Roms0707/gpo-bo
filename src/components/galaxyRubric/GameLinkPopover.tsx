import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Gamepad2, X, Loader2 } from 'lucide-react';
import { Game } from '../../types/galaxyRubricMapping';

interface GameLinkPopoverProps {
  allGames: Game[];
  linkedGameIds: Set<string>;
  onLinkGame: (gameId: string) => void;
  isLinking: boolean;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

const GameLinkPopover: React.FC<GameLinkPopoverProps> = ({
  allGames,
  linkedGameIds,
  onLinkGame,
  isLinking,
  isOpen,
  onClose,
  anchorRef,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const unlinkedGames = allGames.filter(
    (game) =>
      !linkedGameIds.has(game.id) &&
      (game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (game.publisher &&
          game.publisher.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const allLinked = allGames.length > 0 && allGames.length === linkedGameIds.size;

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 top-full mt-1 z-50 w-72 bg-dark-300 border border-dark-100 rounded-lg shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-dark-200">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Link a Game</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-dark-400 border border-dark-200 rounded text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto px-2 pb-2">
        {allLinked && !searchQuery ? (
          <div className="text-center py-6 text-gray-500 text-xs">
            All games have been linked
          </div>
        ) : unlinkedGames.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-xs">
            {searchQuery ? 'No games match your search' : 'No games available'}
          </div>
        ) : (
          <div className="space-y-1">
            {unlinkedGames.map((game) => (
              <button
                key={game.id}
                onClick={() => onLinkGame(game.id)}
                disabled={isLinking}
                className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-dark-200 transition-colors group disabled:opacity-50"
              >
                <div className="w-8 h-8 flex-shrink-0 bg-dark-400 rounded overflow-hidden flex items-center justify-center">
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
                    <Gamepad2 className="h-4 w-4 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium text-white truncate">{game.name}</p>
                  {game.publisher && (
                    <p className="text-[10px] text-gray-500 truncate">{game.publisher}</p>
                  )}
                </div>
                {isLinking ? (
                  <Loader2 size={14} className="text-gray-500 animate-spin flex-shrink-0" />
                ) : (
                  <Plus
                    size={14}
                    className="text-gray-500 group-hover:text-primary-400 transition-colors flex-shrink-0"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameLinkPopover;
