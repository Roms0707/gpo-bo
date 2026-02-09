import React, { useState, useEffect } from 'react';
import { Game, GalaxyRubricMapping } from '../../types/galaxyRubricMapping';
import { fetchMappingsByProject, bulkDeleteMappingsByGame } from '../../services/galaxyRubricMappingService';
import {
  fetchAllGames,
  fetchLinkedGameEntries,
  linkGame as linkGameService,
  unlinkGame as unlinkGameService,
  updateSortOrders,
  LinkedGame,
} from '../../services/projectConfigGamesService';
import GamesCarousel from './GamesCarousel';
import LinkedGamesPanel from './LinkedGamesPanel';
import GameRubricPanel from './GameRubricPanel';
import { Gamepad2, Link2, GitBranch } from 'lucide-react';
import toast from 'react-hot-toast';

interface RubricMappingManagerProps {
  projectConfigId: string;
  campaignId: string | null;
}

const RubricMappingManager: React.FC<RubricMappingManagerProps> = ({
  projectConfigId,
  campaignId,
}) => {
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [linkedGames, setLinkedGames] = useState<LinkedGame[]>([]);
  const [allMappings, setAllMappings] = useState<GalaxyRubricMapping[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectConfigId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [gamesRes, linksRes, mappingsRes] = await Promise.all([
        fetchAllGames(),
        fetchLinkedGameEntries(projectConfigId),
        fetchMappingsByProject(projectConfigId),
      ]);

      const games = gamesRes.data || [];
      const links = linksRes.data || [];
      const mappings = mappingsRes.data || [];

      setAllGames(games);
      setAllMappings(mappings);

      const gameMap = new Map(games.map((g) => [g.id, g]));
      const linked: LinkedGame[] = links
        .map((link) => {
          const game = gameMap.get(link.game_id);
          if (!game) return null;
          return {
            linkId: link.id,
            sortOrder: link.sort_order,
            mappingCount: mappings.filter((m) => m.game_id === link.game_id).length,
            game,
          };
        })
        .filter(Boolean) as LinkedGame[];

      setLinkedGames(linked);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkGame = async (gameId: string) => {
    setIsLinking(true);
    const { error } = await linkGameService(projectConfigId, gameId);
    setIsLinking(false);
    if (!error) {
      toast.success('Game linked');
      await loadData();
    }
  };

  const handleUnlinkGame = async (linkId: string, gameId: string, mappingCount: number) => {
    const { error: unlinkError } = await unlinkGameService(linkId);
    if (unlinkError) return;

    if (mappingCount > 0) {
      await bulkDeleteMappingsByGame(projectConfigId, gameId);
    }

    if (selectedGame?.id === gameId) {
      setSelectedGame(null);
    }

    toast.success('Game unlinked');
    await loadData();
  };

  const handleReorder = async (reorderedGames: LinkedGame[]) => {
    setLinkedGames(reorderedGames);
    const updates = reorderedGames.map((g, i) => ({
      id: g.linkId,
      sort_order: i,
    }));
    await updateSortOrders(updates);
  };

  const handleSelectGame = (game: Game) => {
    setSelectedGame(game);
  };

  const handleMappingsChange = async () => {
    await loadData();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const linkedGameIds = new Set(linkedGames.map((g) => g.game.id));
  const gamesWithRubrics = linkedGames.filter((g) => g.mappingCount > 0).length;
  const totalMappings = allMappings.length;

  return (
    <div className="space-y-6">
      <div className="p-3 bg-dark-300 rounded-lg border border-dark-200">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Gamepad2 size={16} className="text-gray-400" />
            <span className="text-sm text-gray-400">Linked Games:</span>
            <span className="text-sm font-semibold text-white">{linkedGames.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-gray-400" />
            <span className="text-sm text-gray-400">With Rubrics:</span>
            <span className="text-sm font-semibold text-white">{gamesWithRubrics}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link2 size={16} className="text-gray-400" />
            <span className="text-sm text-gray-400">Total Mappings:</span>
            <span className="text-sm font-semibold text-primary-500">{totalMappings}</span>
          </div>
        </div>
      </div>

      <div className="bg-dark-300 rounded-lg border border-dark-200 p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Available Games
        </h3>
        <GamesCarousel
          allGames={allGames}
          linkedGameIds={linkedGameIds}
          onLinkGame={handleLinkGame}
          isLinking={isLinking}
        />
      </div>

      <div className="bg-dark-300 rounded-lg border border-dark-200 p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Linked Games
        </h3>
        <LinkedGamesPanel
          linkedGames={linkedGames}
          selectedGameId={selectedGame?.id || null}
          onSelectGame={handleSelectGame}
          onUnlinkGame={handleUnlinkGame}
          onReorder={handleReorder}
        />
      </div>

      {selectedGame && linkedGameIds.has(selectedGame.id) && (
        <div className="bg-dark-300 rounded-lg border border-dark-200 p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Rubric Configuration — {selectedGame.name}
          </h3>
          <GameRubricPanel
            projectConfigId={projectConfigId}
            campaignId={campaignId}
            selectedGame={selectedGame}
            mappings={allMappings}
            onMappingsChange={handleMappingsChange}
          />
        </div>
      )}
    </div>
  );
};

export default RubricMappingManager;
