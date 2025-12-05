import React, { useState, useEffect } from 'react';
import { Game, GalaxyRubricMapping } from '../../types/galaxyRubricMapping';
import {
  fetchMappingsByProject,
  bulkDeleteMappingsByGame,
} from '../../services/galaxyRubricMappingService';
import AvailableGamesPanel from './AvailableGamesPanel';
import SelectedGamesPanel from './SelectedGamesPanel';
import RubricAssignmentPanel from './RubricAssignmentPanel';
import toast from 'react-hot-toast';
import { List, CheckSquare, Settings } from 'lucide-react';

interface RubricMappingManagerProps {
  projectConfigId: string;
  campaignId: string | null;
}

const RubricMappingManager: React.FC<RubricMappingManagerProps> = ({
  projectConfigId,
  campaignId,
}) => {
  const [selectedGames, setSelectedGames] = useState<Game[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [allMappings, setAllMappings] = useState<GalaxyRubricMapping[]>([]);
  const [isLoadingMappings, setIsLoadingMappings] = useState(true);
  const [mobileTab, setMobileTab] = useState<'available' | 'selected' | 'assign'>('available');

  useEffect(() => {
    loadAllMappings();
    loadSelectedGames();
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

  const loadSelectedGames = async () => {
    try {
      const { data: mappingsData, error: mappingsError } = await fetchMappingsByProject(projectConfigId);

      if (mappingsError) throw mappingsError;

      const uniqueGameIds = [...new Set((mappingsData || []).map(m => m.game_id))];

      if (uniqueGameIds.length === 0) {
        setSelectedGames([]);
        return;
      }

      const { supabase } = await import('../../lib/supabase');
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('id, name, publisher, image_url')
        .in('id', uniqueGameIds);

      if (gamesError) throw gamesError;

      setSelectedGames(gamesData || []);
    } catch (error) {
      console.error('Error loading selected games:', error);
    }
  };

  const handleGameSelect = (game: Game) => {
    if (selectedGames.some(g => g.id === game.id)) {
      toast.error('Game is already added');
      return;
    }

    setSelectedGames(prev => [...prev, game]);
  };

  const handleGameRemove = async (gameId: string) => {
    try {
      const { error } = await bulkDeleteMappingsByGame(projectConfigId, gameId);

      if (error) throw error;

      setSelectedGames(prev => prev.filter(g => g.id !== gameId));
      setSelectedGameIds(prev => {
        const next = new Set(prev);
        next.delete(gameId);
        return next;
      });

      await loadAllMappings();
    } catch (error) {
      console.error('Error removing game:', error);
      toast.error('Failed to remove game');
    }
  };

  const handleGameToggle = (gameId: string) => {
    setSelectedGameIds(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  const handleMappingsChange = async () => {
    await loadAllMappings();
    await loadSelectedGames();
  };

  if (isLoadingMappings) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const totalGames = selectedGames.length;
  const totalMappings = allMappings.length;

  return (
    <div className="flex flex-col h-full">
      {/* Stats Section */}
      <div className="mb-4 p-3 md:p-4 bg-dark-300 rounded-lg border border-dark-200">
        <div className="grid grid-cols-3 gap-2 md:gap-6">
          <div className="text-center md:text-left">
            <p className="text-xs md:text-sm text-gray-400">Selected Games</p>
            <p className="text-lg md:text-2xl font-bold text-white">{totalGames}</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-xs md:text-sm text-gray-400">Total Mappings</p>
            <p className="text-lg md:text-2xl font-bold text-primary-500">{totalMappings}</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-xs md:text-sm text-gray-400">For Assignment</p>
            <p className="text-lg md:text-2xl font-bold text-success-500">{selectedGameIds.size}</p>
          </div>
        </div>
      </div>

      {/* Mobile Tabs (shown on small screens only) */}
      <div className="flex lg:hidden mb-4 gap-2 border-b border-dark-200">
        <button
          onClick={() => setMobileTab('available')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
            mobileTab === 'available'
              ? 'text-primary-500 border-b-2 border-primary-500'
              : 'text-gray-400'
          }`}
        >
          <List size={16} />
          <span className="hidden sm:inline">Available</span>
        </button>
        <button
          onClick={() => setMobileTab('selected')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
            mobileTab === 'selected'
              ? 'text-primary-500 border-b-2 border-primary-500'
              : 'text-gray-400'
          }`}
        >
          <CheckSquare size={16} />
          <span className="hidden sm:inline">Selected ({totalGames})</span>
          <span className="sm:hidden">({totalGames})</span>
        </button>
        <button
          onClick={() => setMobileTab('assign')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
            mobileTab === 'assign'
              ? 'text-primary-500 border-b-2 border-primary-500'
              : 'text-gray-400'
          }`}
        >
          <Settings size={16} />
          <span className="hidden sm:inline">Assign</span>
        </button>
      </div>

      {/* Desktop: 3 Column Layout, Mobile: Single Panel */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Desktop Layout (3 columns) */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-4 xl:gap-6 h-full">
          <div className="flex flex-col min-h-0">
            <h3 className="text-base xl:text-lg font-semibold text-white mb-3">Available Games</h3>
            <div className="flex-1 min-h-0 bg-dark-300 rounded-lg border border-dark-200 p-3 xl:p-4">
              <AvailableGamesPanel
                selectedGameIds={selectedGames.map(g => g.id)}
                onGameSelect={handleGameSelect}
              />
            </div>
          </div>

          <div className="flex flex-col min-h-0">
            <h3 className="text-base xl:text-lg font-semibold text-white mb-3">Selected Games</h3>
            <div className="flex-1 min-h-0 bg-dark-300 rounded-lg border border-dark-200 p-3 xl:p-4">
              <SelectedGamesPanel
                selectedGames={selectedGames}
                selectedGameIds={selectedGameIds}
                mappings={allMappings}
                onGameDrop={handleGameSelect}
                onGameRemove={handleGameRemove}
                onGameToggle={handleGameToggle}
              />
            </div>
          </div>

          <div className="flex flex-col min-h-0">
            <h3 className="text-base xl:text-lg font-semibold text-white mb-3">Assign Rubrics</h3>
            <div className="flex-1 min-h-0 bg-dark-300 rounded-lg border border-dark-200 p-3 xl:p-4">
              <RubricAssignmentPanel
                projectConfigId={projectConfigId}
                campaignId={campaignId}
                selectedGames={selectedGames}
                selectedGameIds={selectedGameIds}
                mappings={allMappings}
                onMappingsChange={handleMappingsChange}
              />
            </div>
          </div>
        </div>

        {/* Mobile Layout (Single Panel with Tabs) */}
        <div className="lg:hidden h-full flex flex-col">
          {mobileTab === 'available' && (
            <div className="flex-1 min-h-0 bg-dark-300 rounded-lg border border-dark-200 p-3">
              <h3 className="text-base font-semibold text-white mb-3">Available Games</h3>
              <div className="h-[calc(100%-2rem)] overflow-auto">
                <AvailableGamesPanel
                  selectedGameIds={selectedGames.map(g => g.id)}
                  onGameSelect={handleGameSelect}
                />
              </div>
            </div>
          )}

          {mobileTab === 'selected' && (
            <div className="flex-1 min-h-0 bg-dark-300 rounded-lg border border-dark-200 p-3">
              <h3 className="text-base font-semibold text-white mb-3">Selected Games</h3>
              <div className="h-[calc(100%-2rem)] overflow-auto">
                <SelectedGamesPanel
                  selectedGames={selectedGames}
                  selectedGameIds={selectedGameIds}
                  mappings={allMappings}
                  onGameDrop={handleGameSelect}
                  onGameRemove={handleGameRemove}
                  onGameToggle={handleGameToggle}
                />
              </div>
            </div>
          )}

          {mobileTab === 'assign' && (
            <div className="flex-1 min-h-0 bg-dark-300 rounded-lg border border-dark-200 p-3">
              <h3 className="text-base font-semibold text-white mb-3">Assign Rubrics</h3>
              <div className="h-[calc(100%-2rem)] overflow-auto">
                <RubricAssignmentPanel
                  projectConfigId={projectConfigId}
                  campaignId={campaignId}
                  selectedGames={selectedGames}
                  selectedGameIds={selectedGameIds}
                  mappings={allMappings}
                  onMappingsChange={handleMappingsChange}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RubricMappingManager;
