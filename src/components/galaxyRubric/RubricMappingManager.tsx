import React, { useState, useEffect } from 'react';
import { Game, GalaxyRubricMapping } from '../../types/galaxyRubricMapping';
import { fetchMappingsByProject } from '../../services/galaxyRubricMappingService';
import AvailableGamesPanel from './AvailableGamesPanel';
import GameRubricPanel from './GameRubricPanel';
import { Gamepad2, Link2 } from 'lucide-react';

interface RubricMappingManagerProps {
  projectConfigId: string;
  campaignId: string | null;
}

const RubricMappingManager: React.FC<RubricMappingManagerProps> = ({
  projectConfigId,
  campaignId,
}) => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [allMappings, setAllMappings] = useState<GalaxyRubricMapping[]>([]);
  const [isLoadingMappings, setIsLoadingMappings] = useState(true);

  useEffect(() => {
    loadAllMappings();
  }, [projectConfigId]);

  const loadAllMappings = async () => {
    try {
      setIsLoadingMappings(true);
      const { data, error } = await fetchMappingsByProject(projectConfigId);

      if (error) throw error;

      setAllMappings(data || []);
    } catch (error) {
      console.error('Error loading mappings:', error);
    } finally {
      setIsLoadingMappings(false);
    }
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
  };

  const handleMappingsChange = async () => {
    await loadAllMappings();
  };

  const getUniqueGamesWithMappings = (): number => {
    const uniqueGameIds = new Set(allMappings.map((m) => m.game_id));
    return uniqueGameIds.size;
  };

  if (isLoadingMappings) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const gamesWithMappings = getUniqueGamesWithMappings();
  const totalMappings = allMappings.length;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 p-3 bg-dark-300 rounded-lg border border-dark-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Gamepad2 size={16} className="text-gray-400" />
              <span className="text-sm text-gray-400">Games Configured:</span>
              <span className="text-sm font-semibold text-white">{gamesWithMappings}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link2 size={16} className="text-gray-400" />
              <span className="text-sm text-gray-400">Total Mappings:</span>
              <span className="text-sm font-semibold text-primary-500">{totalMappings}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col min-h-0 bg-dark-300 rounded-lg border border-dark-200 p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Games
          </h3>
          <div className="flex-1 min-h-0 overflow-hidden">
            <AvailableGamesPanel
              selectedGameId={selectedGame?.id || null}
              mappings={allMappings}
              onGameSelect={handleGameSelect}
            />
          </div>
        </div>

        <div className="flex flex-col min-h-0 bg-dark-300 rounded-lg border border-dark-200 p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Rubric Configuration
          </h3>
          <div className="flex-1 min-h-0 overflow-hidden">
            <GameRubricPanel
              projectConfigId={projectConfigId}
              campaignId={campaignId}
              selectedGame={selectedGame}
              mappings={allMappings}
              onMappingsChange={handleMappingsChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RubricMappingManager;
