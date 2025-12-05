import React, { useState, useEffect } from 'react';
import { Search, Gamepad2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Game } from '../../types/galaxyRubricMapping';

interface AvailableGamesPanelProps {
  selectedGameIds: string[];
  onGameSelect: (game: Game) => void;
}

const AvailableGamesPanel: React.FC<AvailableGamesPanelProps> = ({
  selectedGameIds,
  onGameSelect,
}) => {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('games')
        .select('id, name, publisher, image_url')
        .order('name', { ascending: true });

      if (error) throw error;

      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGames = games.filter(
    (game) =>
      game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (game.publisher && game.publisher.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDragStart = (e: React.DragEvent, game: Game) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(game));
  };

  const isGameSelected = (gameId: string): boolean => {
    return selectedGameIds.includes(gameId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search games by name or publisher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-300 border border-dark-200 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {filteredGames.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Gamepad2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No games found</p>
          {searchQuery && (
            <p className="text-sm mt-2">Try adjusting your search query</p>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {filteredGames.map((game) => {
            const isSelected = isGameSelected(game.id);

            return (
              <div
                key={game.id}
                draggable={!isSelected}
                onDragStart={(e) => handleDragStart(e, game)}
                onClick={() => !isSelected && onGameSelect(game)}
                className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-lg ${
                  isSelected
                    ? 'border-dark-200 bg-dark-400 opacity-60 cursor-not-allowed'
                    : 'border-dark-200 bg-dark-300 hover:border-primary-400 active:opacity-50'
                }`}
                style={{ cursor: isSelected ? 'not-allowed' : 'grab' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-16 h-16 bg-dark-200 rounded-lg overflow-hidden flex items-center justify-center">
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
                      <Gamepad2 className="h-8 w-8 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate mb-1">
                      {game.name}
                    </h3>
                    {game.publisher && (
                      <p className="text-sm text-gray-400 truncate">
                        {game.publisher}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle className="flex-shrink-0 h-5 w-5 text-success-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AvailableGamesPanel;
