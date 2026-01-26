import React, { useState, useEffect } from 'react';
import { Check, Gamepad2, RefreshCw, AlertCircle, CheckSquare, Square } from 'lucide-react';
import Button from '../ui/Button';
import { Game, GalaxyRubric, GalaxyRubricMapping } from '../../types/galaxyRubricMapping';
import { fetchCampaignRubrics } from '../../services/galaxyApiService';
import {
  createRubricMapping,
  deleteRubricMapping,
  bulkUpdateRubricNames,
} from '../../services/galaxyRubricMappingService';
import toast from 'react-hot-toast';

interface GameRubricPanelProps {
  projectConfigId: string;
  campaignId: string | null;
  selectedGame: Game | null;
  mappings: GalaxyRubricMapping[];
  onMappingsChange: () => void;
}

const GameRubricPanel: React.FC<GameRubricPanelProps> = ({
  projectConfigId,
  campaignId,
  selectedGame,
  mappings,
  onMappingsChange,
}) => {
  const [availableRubrics, setAvailableRubrics] = useState<GalaxyRubric[]>([]);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState(false);
  const [rubricError, setRubricError] = useState<string | null>(null);
  const [togglingRubrics, setTogglingRubrics] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (campaignId) {
      loadAvailableRubrics();
    }
  }, [campaignId]);

  const loadAvailableRubrics = async () => {
    if (!campaignId) {
      setRubricError('No campaign ID configured for this project');
      return;
    }

    try {
      setIsLoadingRubrics(true);
      setRubricError(null);
      const { data, error } = await fetchCampaignRubrics(campaignId);

      if (error) throw error;

      const fetchedRubrics = data || [];
      setAvailableRubrics(fetchedRubrics);

      if (fetchedRubrics.length > 0 && mappings.length > 0) {
        await syncRubricNames(fetchedRubrics);
      }
    } catch (error) {
      console.error('Error loading available rubrics:', error);
      setRubricError(error instanceof Error ? error.message : 'Failed to load rubrics');
    } finally {
      setIsLoadingRubrics(false);
    }
  };

  const syncRubricNames = async (rubrics: GalaxyRubric[]) => {
    const rubricMap = new Map(rubrics.map((r) => [String(r.id), r.name]));

    const updates: { id: string; rubric_name: string }[] = [];

    for (const mapping of mappings) {
      const apiName = rubricMap.get(String(mapping.rubric_id));
      if (apiName && apiName !== mapping.rubric_name) {
        updates.push({ id: mapping.id, rubric_name: apiName });
      }
    }

    if (updates.length > 0) {
      const { updatedCount, error } = await bulkUpdateRubricNames(updates);
      if (!error && updatedCount > 0) {
        onMappingsChange();
      }
    }
  };

  const getGameMappings = (): GalaxyRubricMapping[] => {
    if (!selectedGame) return [];
    return mappings.filter((m) => m.game_id === selectedGame.id);
  };

  const isRubricMapped = (rubricId: string): boolean => {
    const gameMappings = getGameMappings();
    return gameMappings.some((m) => String(m.rubric_id) === String(rubricId));
  };

  const getMappingForRubric = (rubricId: string): GalaxyRubricMapping | undefined => {
    const gameMappings = getGameMappings();
    return gameMappings.find((m) => String(m.rubric_id) === String(rubricId));
  };

  const handleRubricToggle = async (rubric: GalaxyRubric) => {
    if (!selectedGame) return;

    const rubricIdStr = String(rubric.id);
    setTogglingRubrics((prev) => new Set(prev).add(rubricIdStr));

    try {
      const existingMapping = getMappingForRubric(rubricIdStr);

      if (existingMapping) {
        const { error } = await deleteRubricMapping(existingMapping.id);
        if (error) throw error;
      } else {
        const { error } = await createRubricMapping({
          project_config_id: projectConfigId,
          game_id: selectedGame.id,
          rubric_id: rubricIdStr,
          rubric_name: rubric.name,
        });
        if (error) throw error;
      }

      onMappingsChange();
    } catch (error) {
      console.error('Error toggling rubric:', error);
    } finally {
      setTogglingRubrics((prev) => {
        const next = new Set(prev);
        next.delete(rubricIdStr);
        return next;
      });
    }
  };

  const handleSelectAll = async () => {
    if (!selectedGame) return;

    const unassignedRubrics = availableRubrics.filter((r) => !isRubricMapped(String(r.id)));

    if (unassignedRubrics.length === 0) {
      toast.success('All rubrics are already assigned');
      return;
    }

    const allIds = unassignedRubrics.map((r) => String(r.id));
    setTogglingRubrics(new Set(allIds));

    try {
      for (const rubric of unassignedRubrics) {
        await createRubricMapping({
          project_config_id: projectConfigId,
          game_id: selectedGame.id,
          rubric_id: String(rubric.id),
          rubric_name: rubric.name,
        });
      }
      onMappingsChange();
      toast.success(`Assigned ${unassignedRubrics.length} rubric(s)`);
    } catch (error) {
      console.error('Error selecting all rubrics:', error);
      toast.error('Failed to assign some rubrics');
    } finally {
      setTogglingRubrics(new Set());
    }
  };

  const handleClearAll = async () => {
    if (!selectedGame) return;

    const gameMappings = getGameMappings();

    if (gameMappings.length === 0) {
      toast.success('No rubrics to clear');
      return;
    }

    const allIds = gameMappings.map((m) => String(m.rubric_id));
    setTogglingRubrics(new Set(allIds));

    try {
      for (const mapping of gameMappings) {
        await deleteRubricMapping(mapping.id);
      }
      onMappingsChange();
      toast.success(`Cleared ${gameMappings.length} rubric(s)`);
    } catch (error) {
      console.error('Error clearing all rubrics:', error);
      toast.error('Failed to clear some rubrics');
    } finally {
      setTogglingRubrics(new Set());
    }
  };

  if (!campaignId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <AlertCircle className="h-12 w-12 text-warning-500 mb-3" />
        <h3 className="text-lg font-semibold text-white mb-2">Campaign ID Required</h3>
        <p className="text-gray-400 text-sm">
          Configure a campaign ID in project settings to manage rubric mappings.
        </p>
      </div>
    );
  }

  if (!selectedGame) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <Gamepad2 className="h-16 w-16 text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Select a Game</h3>
        <p className="text-gray-400 text-sm">
          Choose a game from the list to configure its rubric mappings.
        </p>
      </div>
    );
  }

  const gameMappings = getGameMappings();
  const assignedCount = gameMappings.length;
  const totalRubrics = availableRubrics.length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-dark-200">
        <div className="flex-shrink-0 w-12 h-12 bg-dark-200 rounded-lg overflow-hidden flex items-center justify-center">
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
            <Gamepad2 className="h-6 w-6 text-gray-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{selectedGame.name}</h3>
          {selectedGame.publisher && (
            <p className="text-sm text-gray-400 truncate">{selectedGame.publisher}</p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={loadAvailableRubrics}
          isLoading={isLoadingRubrics}
          leftIcon={<RefreshCw size={14} />}
        >
          Refresh
        </Button>
      </div>

      {rubricError ? (
        <div className="bg-error-500/10 border border-error-500 rounded-lg p-4 text-error-500">
          <div className="flex items-start gap-2">
            <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-medium">Failed to load rubrics</p>
              <p className="text-sm mt-1">{rubricError}</p>
            </div>
          </div>
        </div>
      ) : isLoadingRubrics ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
        </div>
      ) : availableRubrics.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <AlertCircle className="h-12 w-12 text-gray-600 mb-3" />
          <p className="text-gray-400">No rubrics available for this campaign</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-400">
              {assignedCount} of {totalRubrics} rubrics assigned
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSelectAll}
                disabled={assignedCount === totalRubrics || togglingRubrics.size > 0}
                leftIcon={<CheckSquare size={14} />}
              >
                All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearAll}
                disabled={assignedCount === 0 || togglingRubrics.size > 0}
                leftIcon={<Square size={14} />}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1">
            {availableRubrics.map((rubric) => {
              const rubricIdStr = String(rubric.id);
              const isMapped = isRubricMapped(rubricIdStr);
              const isToggling = togglingRubrics.has(rubricIdStr);

              return (
                <button
                  key={rubric.id}
                  onClick={() => handleRubricToggle(rubric)}
                  disabled={isToggling}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                    isMapped
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-200 bg-dark-400 hover:border-dark-100 hover:bg-dark-300'
                  } ${isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                >
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      isMapped
                        ? 'bg-primary-500 border-primary-500'
                        : 'bg-transparent border-gray-500'
                    }`}
                  >
                    {isMapped && <Check size={12} className="text-white" />}
                    {isToggling && (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{rubric.name}</p>
                    <p className="text-xs text-gray-500 font-mono truncate">{rubric.id}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default GameRubricPanel;
