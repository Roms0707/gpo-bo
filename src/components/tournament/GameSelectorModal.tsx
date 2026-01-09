import React, { useState, useMemo } from 'react';
import { X, Search, Check, Gamepad2 } from 'lucide-react';

interface Game {
  id: string;
  name: string;
  image_url?: string | null;
}

interface GameSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  selectedGameId: string;
  onSelect: (gameId: string) => void;
  title?: string;
}

const GameSelectorModal: React.FC<GameSelectorModalProps> = ({
  isOpen,
  onClose,
  games,
  selectedGameId,
  onSelect,
  title = 'Select a Game'
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) return games;
    const query = searchQuery.toLowerCase();
    return games.filter(game => game.name.toLowerCase().includes(query));
  }, [games, searchQuery]);

  const handleSelect = (gameId: string) => {
    onSelect(gameId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="relative w-full max-w-4xl bg-dark-300 rounded-2xl shadow-2xl overflow-hidden transform transition-all">
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-200">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-dark-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-4 border-b border-dark-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games..."
                className="w-full pl-10 pr-4 py-3 bg-dark-200 border border-dark-100 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {filteredGames.length === 0 ? (
              <div className="text-center py-12">
                <Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No games found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredGames.map((game) => {
                  const isSelected = selectedGameId === game.id;
                  return (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => handleSelect(game.id)}
                      className={`
                        relative group rounded-xl overflow-hidden transition-all duration-200
                        ${isSelected
                          ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-dark-300 scale-[1.02]'
                          : 'hover:ring-2 hover:ring-gray-500 hover:ring-offset-2 hover:ring-offset-dark-300 hover:scale-[1.01]'
                        }
                      `}
                    >
                      <div className="aspect-[4/3] bg-dark-200 relative">
                        {game.image_url ? (
                          <img
                            src={game.image_url}
                            alt={game.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-200 to-dark-300">
                            <Gamepad2 className="w-10 h-10 text-gray-600" />
                          </div>
                        )}

                        <div className={`
                          absolute inset-0 transition-opacity duration-200
                          ${isSelected ? 'bg-primary-500/20' : 'bg-black/0 group-hover:bg-black/20'}
                        `} />

                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary-500 rounded-full p-1.5 shadow-lg">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>

                      <div className={`
                        p-2.5 bg-dark-200 border-t transition-colors duration-200
                        ${isSelected ? 'border-primary-500/50 bg-primary-500/10' : 'border-dark-300'}
                      `}>
                        <p className={`
                          text-sm font-medium truncate transition-colors duration-200
                          ${isSelected ? 'text-primary-300' : 'text-white group-hover:text-gray-200'}
                        `}>
                          {game.name}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-dark-200 bg-dark-300/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''} available
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSelectorModal;
