import React, { useState } from 'react';
import { Trash2, Gamepad2, ChevronDown, ChevronUp } from 'lucide-react';
import { Game, GalaxyRubricMapping } from '../../types/galaxyRubricMapping';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ConfirmationModal from '../ui/ConfirmationModal';

interface SelectedGamesPanelProps {
  selectedGames: Game[];
  selectedGameIds: Set<string>;
  mappings: GalaxyRubricMapping[];
  onGameDrop: (game: Game) => void;
  onGameRemove: (gameId: string) => void;
  onGameToggle: (gameId: string) => void;
}

const SelectedGamesPanel: React.FC<SelectedGamesPanelProps> = ({
  selectedGames,
  selectedGameIds,
  mappings,
  onGameDrop,
  onGameRemove,
  onGameToggle,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [gameToRemove, setGameToRemove] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const gameData = e.dataTransfer.getData('application/json');
      if (gameData) {
        const game: Game = JSON.parse(gameData);
        onGameDrop(game);
      }
    } catch (error) {
      console.error('Error parsing dropped game data:', error);
    }
  };

  const getMappingCountForGame = (gameId: string): number => {
    return mappings.filter((m) => m.game_id === gameId).length;
  };

  const handleRemoveClick = (gameId: string) => {
    const mappingCount = getMappingCountForGame(gameId);
    if (mappingCount > 0) {
      setGameToRemove(gameId);
    } else {
      onGameRemove(gameId);
    }
  };

  const confirmRemove = () => {
    if (gameToRemove) {
      onGameRemove(gameToRemove);
      setGameToRemove(null);
    }
  };

  const handleCardClick = (gameId: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onGameToggle(gameId);
  };

  const handleKeyDown = (gameId: string, e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onGameToggle(gameId);
    }
  };

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Selected for Assignment: {selectedGameIds.size}/{selectedGames.length}
          </span>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 border-2 border-dashed rounded-lg transition-all ${
            isDragOver
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-dark-200 bg-dark-400/30'
          }`}
        >
          {selectedGames.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <Gamepad2 className="h-16 w-16 text-gray-400 mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No Games Selected
              </h3>
              <p className="text-gray-400 text-sm max-w-md">
                Drag and drop games from the left panel to add them to your project configuration
              </p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4 space-y-2">
              {selectedGames.map((game) => {
                const isSelected = selectedGameIds.has(game.id);
                const mappingCount = getMappingCountForGame(game.id);

                return (
                  <div
                    key={game.id}
                    onClick={(e) => handleCardClick(game.id, e)}
                    onKeyDown={(e) => handleKeyDown(game.id, e)}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20'
                        : 'border-dark-200 bg-dark-300 hover:border-dark-100 hover:bg-dark-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-12 h-12 bg-dark-200 rounded-lg overflow-hidden flex items-center justify-center">
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
                          <Gamepad2 className="h-6 w-6 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">
                          {game.name}
                        </h3>
                        {game.publisher && (
                          <p className="text-sm text-gray-400 truncate">
                            {game.publisher}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          {mappingCount > 0 && (
                            <Badge variant="success" size="sm">
                              {mappingCount} rubric{mappingCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          {isSelected && (
                            <Badge variant="primary" size="sm">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveClick(game.id)}
                        className="flex-shrink-0 p-2 text-error-500 hover:text-error-600 hover:bg-error-500/10 rounded transition-colors"
                        title="Remove game"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {gameToRemove && (
        <ConfirmationModal
          isOpen={true}
          title="Remove Game with Mappings"
          message={`This game has ${getMappingCountForGame(gameToRemove)} rubric mapping(s). Removing it will delete all associated mappings. Are you sure you want to continue?`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          onConfirm={confirmRemove}
          onCancel={() => setGameToRemove(null)}
          variant="danger"
        />
      )}
    </>
  );
};

export default SelectedGamesPanel;
