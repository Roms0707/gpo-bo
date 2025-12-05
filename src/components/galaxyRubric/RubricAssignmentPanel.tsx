import React, { useState, useEffect } from 'react';
import { Trash2, Plus, AlertCircle, RefreshCw, Gamepad2 } from 'lucide-react';
import Button from '../ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { Game, GalaxyRubric, GalaxyRubricMapping } from '../../types/galaxyRubricMapping';
import { fetchCampaignRubrics } from '../../services/galaxyApiService';
import {
  createRubricMapping,
  deleteRubricMapping,
  bulkCreateRubricMappings,
} from '../../services/galaxyRubricMappingService';
import toast from 'react-hot-toast';

interface RubricAssignmentPanelProps {
  projectConfigId: string;
  campaignId: string | null;
  selectedGames: Game[];
  selectedGameIds: Set<string>;
  mappings: GalaxyRubricMapping[];
  onMappingsChange: () => void;
}

const RubricAssignmentPanel: React.FC<RubricAssignmentPanelProps> = ({
  projectConfigId,
  campaignId,
  selectedGames,
  selectedGameIds,
  mappings,
  onMappingsChange,
}) => {
  const [availableRubrics, setAvailableRubrics] = useState<GalaxyRubric[]>([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string>('');
  const [isLoadingRubrics, setIsLoadingRubrics] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [rubricError, setRubricError] = useState<string | null>(null);

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

      setAvailableRubrics(data || []);
    } catch (error) {
      console.error('Error loading available rubrics:', error);
      setRubricError(error instanceof Error ? error.message : 'Failed to load rubrics');
    } finally {
      setIsLoadingRubrics(false);
    }
  };

  const handleAssignRubric = async () => {
    if (!selectedRubricId || selectedGameIds.size === 0) return;

    try {
      setIsAssigning(true);
      const selectedGamesArray = Array.from(selectedGameIds);

      const mappingsToCreate = selectedGamesArray
        .map((gameId) => ({
          project_config_id: projectConfigId,
          game_id: gameId,
          rubric_id: selectedRubricId,
        }))
        .filter((mapping) => {
          const exists = mappings.some(
            (m) =>
              m.project_config_id === mapping.project_config_id &&
              m.game_id === mapping.game_id &&
              m.rubric_id === mapping.rubric_id
          );
          return !exists;
        });

      if (mappingsToCreate.length === 0) {
        toast.error('All selected games already have this rubric assigned');
        setIsAssigning(false);
        return;
      }

      const { error } = await bulkCreateRubricMappings(mappingsToCreate);

      if (error) throw error;

      setSelectedRubricId('');
      onMappingsChange();
      toast.success(`Assigned rubric to ${mappingsToCreate.length} game(s)`);
    } catch (error) {
      console.error('Error assigning rubric:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      const { error } = await deleteRubricMapping(mappingId);

      if (error) throw error;

      onMappingsChange();
    } catch (error) {
      console.error('Error deleting mapping:', error);
    }
  };

  const getSelectedGames = (): Game[] => {
    return selectedGames.filter((game) => selectedGameIds.has(game.id));
  };

  const getMappingsForGame = (gameId: string): GalaxyRubricMapping[] => {
    return mappings.filter((m) => m.game_id === gameId);
  };

  if (!campaignId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <AlertCircle className="h-16 w-16 text-warning-500 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Campaign ID Required</h3>
        <p className="text-gray-400">
          This project configuration does not have a campaign ID configured.
          <br />
          Please configure a campaign ID in the project settings to manage rubric mappings.
        </p>
      </div>
    );
  }

  const selectedGamesForAssignment = getSelectedGames();

  return (
    <div className="h-full flex flex-col">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Assign Rubric to Selected Games</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={loadAvailableRubrics}
              isLoading={isLoadingRubrics}
              leftIcon={<RefreshCw size={16} />}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedGamesForAssignment.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Gamepad2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Click on games in the middle panel to select them for rubric assignment</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">
                  Assigning to {selectedGamesForAssignment.length} game{selectedGamesForAssignment.length !== 1 ? 's' : ''}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedGamesForAssignment.map((game) => (
                    <Badge key={game.id} variant="info" size="sm">
                      {game.name}
                    </Badge>
                  ))}
                </div>
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
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : availableRubrics.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No rubrics available for this campaign</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <select
                    value={selectedRubricId}
                    onChange={(e) => setSelectedRubricId(e.target.value)}
                    className="w-full px-4 py-2 bg-dark-300 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a rubric...</option>
                    {availableRubrics.map((rubric) => (
                      <option key={rubric.id} value={rubric.id}>
                        {rubric.name} ({rubric.id})
                      </option>
                    ))}
                  </select>
                  <Button
                    fullWidth
                    onClick={handleAssignRubric}
                    isLoading={isAssigning}
                    disabled={!selectedRubricId}
                    leftIcon={<Plus size={18} />}
                  >
                    Assign to Selected Games
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle>All Rubric Mappings</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {selectedGames.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No games added yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedGames.map((game) => {
                const gameMappings = getMappingsForGame(game.id);

                return (
                  <div key={game.id} className="border border-dark-200 rounded-lg p-4 bg-dark-300">
                    <div className="flex items-center gap-3 mb-3">
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
                        <h4 className="font-semibold text-white truncate">{game.name}</h4>
                        {game.publisher && (
                          <p className="text-xs text-gray-400 truncate">{game.publisher}</p>
                        )}
                      </div>
                      <Badge variant="info" size="sm">
                        {gameMappings.length} rubric{gameMappings.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {gameMappings.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No rubrics assigned</p>
                    ) : (
                      <div className="space-y-2">
                        {gameMappings.map((mapping) => {
                          const rubric = availableRubrics.find((r) => r.id === mapping.rubric_id);
                          return (
                            <div
                              key={mapping.id}
                              className="flex items-center justify-between p-2 bg-dark-400 rounded"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white font-medium truncate">
                                  {rubric?.name || mapping.rubric_id}
                                </p>
                                <p className="text-xs text-gray-400 font-mono truncate">
                                  {mapping.rubric_id}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteMapping(mapping.id)}
                                className="flex-shrink-0 p-1 text-error-500 hover:text-error-600 hover:bg-error-500/10 rounded transition-colors"
                                title="Remove mapping"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RubricAssignmentPanel;
