import { useState, useEffect, useCallback, useMemo } from 'react';
import { Game, GalaxyRubricMapping, ContentCategory, CONTENT_CATEGORIES } from '../../types/galaxyRubricMapping';
import { fetchMappingsByProject, bulkDeleteMappingsByGame } from '../../services/galaxyRubricMappingService';
import {
  fetchAllGames,
  fetchLinkedGameEntries,
  linkGame as linkGameService,
  unlinkGame as unlinkGameService,
  updateSortOrders,
  LinkedGame,
} from '../../services/projectConfigGamesService';
import toast from 'react-hot-toast';

export interface UseRubricMappingDataReturn {
  allGames: Game[];
  linkedGames: LinkedGame[];
  allMappings: GalaxyRubricMapping[];
  filteredMappings: GalaxyRubricMapping[];
  isInitialLoading: boolean;
  isLinking: boolean;
  gameMappingCount: number;
  projectMappingCount: number;
  categoryCounts: Record<ContentCategory, number>;
  linkedGameIds: Set<string>;
  showLinkPopover: boolean;
  setShowLinkPopover: (show: boolean) => void;
  handleLinkGame: (gameId: string) => Promise<void>;
  handleUnlinkGame: (linkId: string, gameId: string, mappingCount: number) => Promise<void>;
  handleReorder: (reorderedGames: LinkedGame[]) => Promise<void>;
  handleMappingsChange: () => Promise<void>;
  contentCategory: ContentCategory;
  setContentCategory: (category: ContentCategory) => void;
  selectedGame: Game | null;
  setSelectedGame: (game: Game | null) => void;
}

export function useRubricMappingData(projectConfigId: string): UseRubricMappingDataReturn {
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [linkedGamesRaw, setLinkedGamesRaw] = useState<LinkedGame[]>([]);
  const [allMappings, setAllMappings] = useState<GalaxyRubricMapping[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [contentCategory, setContentCategory] = useState<ContentCategory>('tips');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsInitialLoading(true);
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
            mappingCount: mappings.filter((m) => m.game_id === link.game_id && m.scope === 'game').length,
            game,
          };
        })
        .filter(Boolean) as LinkedGame[];

      setLinkedGamesRaw(linked);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [projectConfigId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredMappings = useMemo(
    () => allMappings.filter((m) => m.content_category === contentCategory),
    [allMappings, contentCategory]
  );

  const linkedGames = useMemo(() => {
    return linkedGamesRaw.map((lg) => ({
      ...lg,
      mappingCount: filteredMappings.filter(
        (m) => m.game_id === lg.game.id && m.scope === 'game'
      ).length,
    }));
  }, [linkedGamesRaw, filteredMappings]);

  const categoryCounts = useMemo(() => {
    const counts = {} as Record<ContentCategory, number>;
    for (const cat of CONTENT_CATEGORIES) {
      counts[cat.id] = allMappings.filter((m) => m.content_category === cat.id).length;
    }
    return counts;
  }, [allMappings]);

  const handleLinkGame = async (gameId: string) => {
    setIsLinking(true);
    const { error } = await linkGameService(projectConfigId, gameId);
    setIsLinking(false);
    if (!error) {
      toast.success('Game linked');
      setShowLinkPopover(false);
      await loadData();
    }
  };

  const handleUnlinkGame = async (linkId: string, gameId: string, mappingCount: number) => {
    const { error: unlinkError } = await unlinkGameService(linkId);
    if (unlinkError) return;

    if (mappingCount > 0) {
      await bulkDeleteMappingsByGame(projectConfigId, gameId);
    }

    toast.success('Game unlinked');
    await loadData();
  };

  const handleReorder = async (reorderedGames: LinkedGame[]) => {
    const previousOrder = [...linkedGamesRaw];
    setLinkedGamesRaw(reorderedGames);
    const updates = reorderedGames.map((g, i) => ({
      id: g.linkId,
      sort_order: i,
    }));
    const { error } = await updateSortOrders(updates);
    if (error) {
      setLinkedGamesRaw(previousOrder);
      toast.error('Failed to save game order');
    }
  };

  const refreshMappings = useCallback(async () => {
    try {
      const mappingsRes = await fetchMappingsByProject(projectConfigId);
      const mappings = mappingsRes.data || [];
      setAllMappings(mappings);
    } catch (error) {
      console.error('Error refreshing mappings:', error);
    }
  }, [projectConfigId]);

  const handleMappingsChange = async () => {
    await refreshMappings();
  };

  const gameMappingCount = filteredMappings.filter((m) => m.scope === 'game').length;
  const projectMappingCount = filteredMappings.filter((m) => m.scope === 'project').length;
  const linkedGameIds = new Set(linkedGames.map((g) => g.game.id));

  return {
    allGames,
    linkedGames,
    allMappings,
    filteredMappings,
    isInitialLoading,
    isLinking,
    gameMappingCount,
    projectMappingCount,
    categoryCounts,
    linkedGameIds,
    showLinkPopover,
    setShowLinkPopover,
    handleLinkGame,
    handleUnlinkGame,
    handleReorder,
    handleMappingsChange,
    contentCategory,
    setContentCategory,
    selectedGame,
    setSelectedGame,
  };
}
