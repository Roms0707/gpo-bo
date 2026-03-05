import React, { useRef } from 'react';
import { Game, GalaxyRubricMapping, ContentCategory } from '../../types/galaxyRubricMapping';
import { LinkedGame } from '../../services/projectConfigGamesService';
import LinkedGamesPanel from './LinkedGamesPanel';
import GameLinkPopover from './GameLinkPopover';
import RubricBrowser from './RubricBrowser';
import { Gamepad2, Plus, Link2 } from 'lucide-react';

interface GameMappingsTabProps {
  projectConfigId: string;
  campaignId: string;
  countryCode?: string | null;
  languageCode?: string | null;
  contentCategory: ContentCategory;
  allGames: Game[];
  linkedGames: LinkedGame[];
  allMappings: GalaxyRubricMapping[];
  linkedGameIds: Set<string>;
  isLinking: boolean;
  showLinkPopover: boolean;
  setShowLinkPopover: (show: boolean) => void;
  onLinkGame: (gameId: string) => Promise<void>;
  onUnlinkGame: (linkId: string, gameId: string, mappingCount: number) => Promise<void>;
  onReorder: (reorderedGames: LinkedGame[]) => void;
  onMappingsChange: () => Promise<void>;
  selectedGame: Game | null;
  onSelectGame: (game: Game | null) => void;
}

const GameMappingsTab: React.FC<GameMappingsTabProps> = ({
  projectConfigId,
  campaignId,
  countryCode,
  languageCode,
  contentCategory,
  allGames,
  linkedGames,
  allMappings,
  linkedGameIds,
  isLinking,
  showLinkPopover,
  setShowLinkPopover,
  onLinkGame,
  onUnlinkGame,
  onReorder,
  onMappingsChange,
  selectedGame,
  onSelectGame,
}) => {
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const gameMappings = allMappings.filter((m) => m.scope === 'game');

  const handleSelectGame = (game: Game) => {
    onSelectGame(game);
  };

  const handleUnlinkGame = async (linkId: string, gameId: string, mappingCount: number) => {
    if (selectedGame?.id === gameId) {
      onSelectGame(null);
    }
    await onUnlinkGame(linkId, gameId, mappingCount);
  };

  return (
    <div className="flex gap-0 h-[600px] bg-dark-400 rounded-lg border border-dark-200 overflow-hidden">
      <div className="w-64 flex-shrink-0 bg-dark-300 border-r border-dark-200 flex flex-col">
        <div className="border-b border-dark-200">
          <div className="relative px-4 py-2.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Linked Games</span>
            <button
              ref={addButtonRef}
              onClick={() => setShowLinkPopover(!showLinkPopover)}
              className="p-1 rounded text-gray-500 hover:text-primary-400 hover:bg-dark-200 transition-colors"
              title="Link a game"
            >
              <Plus size={14} />
            </button>
            <GameLinkPopover
              allGames={allGames}
              linkedGameIds={linkedGameIds}
              onLinkGame={onLinkGame}
              isLinking={isLinking}
              isOpen={showLinkPopover}
              onClose={() => setShowLinkPopover(false)}
              anchorRef={addButtonRef}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <LinkedGamesPanel
            linkedGames={linkedGames}
            selectedGameId={selectedGame?.id ?? null}
            onSelectGame={handleSelectGame}
            onUnlinkGame={handleUnlinkGame}
            onReorder={onReorder}
          />
        </div>

        <div className="px-4 py-2.5 border-t border-dark-200 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 text-gray-500">
              <Gamepad2 size={10} /> Games
            </span>
            <span className="text-gray-400 font-medium">{linkedGames.length}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 text-gray-500">
              <Link2 size={10} /> Mappings
            </span>
            <span className="text-gray-400 font-medium">{gameMappings.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {selectedGame ? (
          <>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-dark-200 bg-dark-300/50">
              <div className="w-9 h-9 rounded-md bg-dark-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                {selectedGame.image_url ? (
                  <img
                    src={selectedGame.image_url}
                    alt={selectedGame.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <Gamepad2 size={18} className="text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">{selectedGame.name}</h3>
                {selectedGame.publisher && (
                  <p className="text-xs text-gray-500 truncate">{selectedGame.publisher}</p>
                )}
              </div>
            </div>

            <div className="flex-1 p-4 overflow-hidden">
              <RubricBrowser
                key={`game-${selectedGame.id}-${contentCategory}`}
                projectConfigId={projectConfigId}
                campaignId={campaignId}
                countryCode={countryCode}
                languageCode={languageCode}
                scope="game"
                gameId={selectedGame.id}
                contentCategory={contentCategory}
                mappings={allMappings}
                onMappingsChange={onMappingsChange}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Gamepad2 className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Select a Game</h3>
            <p className="text-gray-400 text-sm max-w-xs">
              Choose a linked game from the sidebar to browse and map rubrics, or use the + button to link a new game.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameMappingsTab;
