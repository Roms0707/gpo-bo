import React, { useState, useEffect } from 'react';
import { Search, Gamepad2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Game, GalaxyRubricMapping } from '../../types/galaxyRubricMapping';
import Badge from '../ui/Badge';

interface AvailableGamesPanelProps {
  selectedGameId: string | null;
  mappings: GalaxyRubricMapping[];
  onGameSelect: (game: Game) => void;
}

const AvailableGamesPanel: React.FC<AvailableGamesPanelProps> = ({
  selectedGameId,
  mappings,
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
        .select('id, name, publisher, image_url, sort_priority')
        .order('sort_priority', { ascending: true })
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

  const getMappingCountForGame = (gameId: string): number => {
    return mappings.filter((m) => m.game_id === gameId).length;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-dark-400 border border-dark-200 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredGames.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Gamepad2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No games found</p>
          {searchQuery && (
            <p className="text-sm mt-1">Try adjusting your search query</p>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 space-y-1">
          {filteredGames.map((game) => {
            const isSelected = selectedGameId === game.id;
            const mappingCount = getMappingCountForGame(game.id);
            const hasConfig = mappingCount > 0;

            return (
              <button
                key={game.id}
                onClick={() => onGameSelect(game)}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/10'
                    : hasConfig
                    ? 'border-dark-100 bg-dark-300 hover:border-primary-400'
                    : 'border-dark-200 bg-dark-400 hover:border-dark-100 hover:bg-dark-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-dark-200 rounded-lg overflow-hidden flex items-center justify-center">
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
                      <Gamepad2 className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white text-sm truncate">
                      {game.name}
                    </h3>
                    {game.publisher && (
                      <p className="text-xs text-gray-400 truncate">
                        {game.publisher}
                      </p>
                    )}
                  </div>
                  {hasConfig ? (
                    <Badge variant="success" size="sm">
                      {mappingCount}
                    </Badge>
                  ) : (
                    <span className="text-xs text-gray-500">-</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AvailableGamesPanel;
