import React, { useState, useEffect } from 'react';
import { Search, Gamepad2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Badge from '../ui/Badge';
import { GalaxyRubricMapping } from '../../types/galaxyRubricMapping';

interface Game {
  id: string;
  name: string;
  publisher: string | null;
  image_url: string | null;
}

interface GameSelectionGridProps {
  projectConfigId: string;
  selectedGameId: string | null;
  onGameSelect: (gameId: string) => void;
  mappings: GalaxyRubricMapping[];
}

const GameSelectionGrid: React.FC<GameSelectionGridProps> = ({
  projectConfigId,
  selectedGameId,
  onGameSelect,
  mappings,
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

  const getMappingCountForGame = (gameId: string): number => {
    return mappings.filter((m) => m.game_id === gameId).length;
  };

  const filteredGames = games.filter(
    (game) =>
      game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (game.publisher && game.publisher.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {filteredGames.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Gamepad2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No games found</p>
          {searchQuery && (
            <p className="text-sm mt-2">Try adjusting your search query</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
          {filteredGames.map((game) => {
            const mappingCount = getMappingCountForGame(game.id);
            const isSelected = selectedGameId === game.id;

            return (
              <button
                key={game.id}
                onClick={() => onGameSelect(game.id)}
                className={`relative p-4 rounded-lg border-2 transition-all text-left hover:shadow-lg ${
                  isSelected
                    ? 'border-primary-500 bg-primary-500/10 shadow-lg'
                    : 'border-dark-200 bg-dark-300 hover:border-primary-400'
                }`}
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
                    {mappingCount > 0 && (
                      <div className="mt-2">
                        <Badge variant="success" size="sm">
                          {mappingCount} rubric{mappingCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GameSelectionGrid;
