import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import toast from 'react-hot-toast';
import { DragEndEvent, DndContext, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { supabase } from '../lib/supabase';
import { useTournamentStore } from '../store/tournamentStore';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Map as MapIcon,
  Menu,
  Search,
  Focus
} from 'lucide-react';
import BracketDisplay from '../components/bracket/BracketDisplay';
import WinnerCelebration from '../components/bracket/WinnerCelebration';
import FireworksCanvas from '../components/bracket/FireworksCanvas';
import BackupPanel from '../components/bracket/BackupPanel';
import ByeManagementPanel from '../components/bracket/ByeManagementPanel';
import CrossRoundMoveModal from '../components/bracket/CrossRoundMoveModal';
import ResetBracketModal from '../components/bracket/ResetBracketModal';
import IncompleteMatchesModal from '../components/bracket/IncompleteMatchesModal';
import ForceRoundProgressionModal from '../components/bracket/ForceRoundProgressionModal';
import FullScreenSidebar from '../components/bracket/FullScreenSidebar';
import FullScreenMiniMap from '../components/bracket/FullScreenMiniMap';
import RoundTimerDisplay from '../components/bracket/RoundTimerDisplay';
import RoundTimerConfigModal from '../components/bracket/RoundTimerConfigModal';
import { detectByes } from '../services/byeDetectionService';
import { Match, Player, Team, Firework } from '../components/bracket/types';
import {
  generateProfessionalBracket,
  saveBracket,
  updateMatchWinner,
  resetBracketMatchWinner,
  changeBracketMatchWinner,
  getByesByRound,
  canEditMatchInRound,
  calculateTotalByesInBracket,
  calculateRoundsNeeded,
  handleRoundProgression,
  progressToNextRound,
  getIncompleteMatches,
  isRoundCompleted,
  forceProgressToNextRound,
  detectAndRepairOrphanedByes
} from '../components/bracket/BracketService';
import {
  RoundTimer,
  getRoundTimers,
  initializeRoundTimers,
  startRoundTimer,
  subscribeToTimerUpdates,
  completeRoundTimer
} from '../services/roundTimerService';
import { deleteTimersForTournament } from '../services/roundTimerService';
import { deleteNotificationsForTournament, getRoundName } from '../services/roundNotificationService';

const FullScreenBracketPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tournament, setTournament] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [tournamentWinner, setTournamentWinner] = useState<Player | Team | null>(null);
  const [fireworks, setFireworks] = useState<Firework[]>([]);
  const [validUserIds, setValidUserIds] = useState<Set<string>>(new Set());
  const [editableMatches, setEditableMatches] = useState<Match[]>([]);
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [isUpdatingBracketStatus, setIsUpdatingBracketStatus] = useState(false);
  const [backupPlayers, setBackupPlayers] = useState<Player[]>([]);
  const [backupTeams, setBackupTeams] = useState<Team[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [byesByRound, setByesByRound] = useState<Map<number, Match[]>>(new Map());
  const [showByePanel, setShowByePanel] = useState(false);
  const [showCrossRoundModal, setShowCrossRoundModal] = useState(false);
  const [crossRoundPendingMove, setCrossRoundPendingMove] = useState<any>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResettingBracket, setIsResettingBracket] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roundTimers, setRoundTimers] = useState<RoundTimer[]>([]);
  const [activeTimer, setActiveTimer] = useState<RoundTimer | null>(null);
  const [showIncompleteMatchesModal, setShowIncompleteMatchesModal] = useState(false);
  const [incompleteMatchesData, setIncompleteMatchesData] = useState<{
    matches: Match[];
    currentRound: number;
    nextRound: number | null;
  } | null>(null);
  const [isCurrentRoundComplete, setIsCurrentRoundComplete] = useState(false);
  const [nextRoundTimer, setNextRoundTimer] = useState<RoundTimer | null>(null);
  const [showForceProgressionModal, setShowForceProgressionModal] = useState(false);
  const [forceProgressionData, setForceProgressionData] = useState<{
    currentRound: number;
    nextRound: number;
    incompleteMatches: Match[];
  } | null>(null);
  const [isRepairingByes, setIsRepairingByes] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isZoomControlsVisible, setIsZoomControlsVisible] = useState(true);
  const [autoScaleEnabled, setAutoScaleEnabled] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showTimerConfigModal, setShowTimerConfigModal] = useState(false);
  const bracketContainerRef = useRef<HTMLDivElement>(null);
  const headerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const zoomControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canResetBrackets = useAuthStore((state) => state.canResetBrackets);
  const resetBracket = useTournamentStore((state) => state.resetBracket);

  useEffect(() => {
    if (id) {
      fetchTournamentAndPlayers();
    }
  }, [id]);

  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate(`/tournaments/${id}/bracket`);
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [id, navigate]);

  useEffect(() => {
    if (matches.length > 0) {
      const detectedByes = getByesByRound(matches);
      setByesByRound(detectedByes);
    }
  }, [matches, isDraftMode]);

  const checkForTournamentWinner = (updatedMatches: Match[]) => {
    const maxRound = Math.max(...updatedMatches.map(m => m.round));
    const finalMatch = updatedMatches.find(m => m.round === maxRound);

    if (finalMatch && finalMatch.winner_id && !showCelebration) {
      if (tournament?.type === 'team') {
        const winner = teams.find(t => t.captain_id === finalMatch.winner_id);
        if (winner) {
          setTournamentWinner(winner);
          setShowCelebration(true);
        }
      } else {
        const winner = players.find(p => p.id === finalMatch.winner_id);
        if (winner) {
          setTournamentWinner(winner);
          setShowCelebration(true);
        }
      }
    }
  };

  const fetchTournamentAndPlayers = async () => {
    if (!id) return;

    try {
      setIsLoading(true);

      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id');

      if (usersError) throw usersError;

      const userIdSet = new Set(allUsers.map(user => user.id));
      setValidUserIds(userIdSet);

      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (tournamentError) throw tournamentError;
      if (!tournamentData) throw new Error('Tournament not found');

      setTournament(tournamentData);

      const { data: existingMatches, error: existingMatchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', id);

      if (existingMatchesError) throw existingMatchesError;

      let participants: Player[] | Team[] = [];

      if (tournamentData.type === 'solo') {
        participants = await fetchSoloPlayers(tournamentData, userIdSet);
      } else {
        participants = await fetchTeams(tournamentData, userIdSet);
      }

      if (existingMatches && existingMatches.length > 0) {
        setMatches(existingMatches);
        setEditableMatches(existingMatches);
        setIsDraftMode(tournamentData.bracket_status === 'draft');
        checkForTournamentWinner(existingMatches);
      } else {
        if (participants.length > 0) {
          const generatedMatches = generateProfessionalBracket(
            participants,
            id!,
            tournamentData.type,
            userIdSet,
            tournamentData.max_nb_players
          );

          if (generatedMatches.length > 0) {
            const savedMatches = await saveBracket(generatedMatches, userIdSet, id!, 'draft');

            if (savedMatches) {
              setMatches(savedMatches);
              setEditableMatches(savedMatches);
              setIsDraftMode(true);

              const totalRounds = calculateRoundsNeeded(participants.length);
              await initializeRoundTimers(id!, totalRounds);
              await loadRoundTimers();

              checkForTournamentWinner(savedMatches);
            }
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      toast.error('Failed to load tournament data');
      setIsLoading(false);
    }
  };

  const fetchSoloPlayers = async (tournamentData: any, userIdSet: Set<string>): Promise<Player[]> => {
    const { data: registrations, error: registrationsError } = await supabase
      .from('tournament_registrations')
      .select(`
        user_id,
        user:user_id (
          id,
          email,
          username
        )
      `)
      .eq('tournament_id', id)
      .eq('status', 'approved');

    const { data: backupRegistrations, error: backupError } = await supabase
      .from('tournament_registrations')
      .select(`
        user_id,
        user:user_id (
          id,
          email,
          username
        )
      `)
      .eq('tournament_id', id)
      .eq('status', 'backup');

    if (registrationsError) throw registrationsError;

    const validRegistrations = registrations?.filter(reg => {
      return reg.user && reg.user.id && userIdSet.has(reg.user.id);
    }) || [];

    let formattedPlayers = validRegistrations.map((reg: any) => ({
      id: reg.user.id,
      name: reg.user.username || reg.user.email.split('@')[0],
      elo: 1000
    }));

    if (tournamentData.game_id && formattedPlayers.length > 0) {
      const approvedPlayerIds = formattedPlayers.map(p => p.id);

      const { data: rankingsData, error: rankingsError } = await supabase
        .from('player_rankings')
        .select('user_id, elo_rating, game_id')
        .eq('game_id', tournamentData.game_id)
        .in('user_id', approvedPlayerIds);

      if (!rankingsError && rankingsData) {
        formattedPlayers = formattedPlayers.map(player => {
          const ranking = rankingsData.find(r => r.user_id === player.id);
          return {
            ...player,
            elo: ranking ? ranking.elo_rating : 1000
          };
        });
      }
    }

    formattedPlayers.sort((a, b) => (b.elo || 1000) - (a.elo || 1000));
    formattedPlayers = formattedPlayers.map((player, index) => ({
      ...player,
      seed: index + 1
    }));

    setPlayers(formattedPlayers);

    if (!backupError && backupRegistrations) {
      const validBackupRegistrations = backupRegistrations.filter(reg => {
        return reg.user && reg.user.id && userIdSet.has(reg.user.id);
      }) || [];

      let formattedBackups = validBackupRegistrations.map((reg: any) => ({
        id: reg.user.id,
        name: reg.user.username || reg.user.email.split('@')[0],
        elo: 1000
      }));

      if (tournamentData.game_id && formattedBackups.length > 0) {
        const backupPlayerIds = formattedBackups.map(p => p.id);

        const { data: backupRankingsData, error: backupRankingsError } = await supabase
          .from('player_rankings')
          .select('user_id, elo_rating, game_id')
          .eq('game_id', tournamentData.game_id)
          .in('user_id', backupPlayerIds);

        if (!backupRankingsError && backupRankingsData) {
          formattedBackups = formattedBackups.map(player => {
            const ranking = backupRankingsData.find(r => r.user_id === player.id);
            return {
              ...player,
              elo: ranking ? ranking.elo_rating : 1000
            };
          });
        }
      }

      formattedBackups.sort((a, b) => (b.elo || 1000) - (a.elo || 1000));
      formattedBackups = formattedBackups.map((player, index) => ({
        ...player,
        seed: index + 1
      }));

      setBackupPlayers(formattedBackups);
    }

    return formattedPlayers;
  };

  const fetchTeams = async (tournamentData: any, userIdSet: Set<string>): Promise<Team[]> => {
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        captain_id
      `)
      .eq('tournament_id', id);

    if (teamsError) throw teamsError;

    const { data: teamMembers, error: teamMembersError } = await supabase
      .from('team_members')
      .select(`
        team_id,
        user_id,
        role
      `)
      .in('team_id', teamsData.map(t => t.id));

    if (teamMembersError) throw teamMembersError;

    const { data: approvedRegistrations, error: registrationsError } = await supabase
      .from('tournament_registrations')
      .select(`
        user_id,
        team_id,
        status
      `)
      .eq('tournament_id', id)
      .eq('status', 'approved');

    if (registrationsError) throw registrationsError;

    const approvedUserIds = new Set(approvedRegistrations.map(reg => reg.user_id));

    const processedTeams = teamsData.map((team) => {
      const captain = teamMembers.find(tm => tm.team_id === team.id && tm.role === 'captain');
      const captainId = captain?.user_id || team.captain_id;
      const memberCount = teamMembers.filter(tm => tm.team_id === team.id).length;
      const captainApproved = captainId ? approvedUserIds.has(captainId) && userIdSet.has(captainId) : false;
      const requiredMembers = tournamentData.max_players_per_team || 5;
      const hasEnoughMembers = memberCount >= requiredMembers;
      const isApproved = captainApproved && hasEnoughMembers;

      return {
        id: team.id,
        name: team.name,
        captain_id: captainId,
        memberCount,
        captainApproved,
        hasEnoughMembers,
        requiredMembers,
        isApproved
      };
    });

    const approvedTeamsData = processedTeams.filter(team => team.isApproved);
    approvedTeamsData.sort((a, b) => b.memberCount - a.memberCount);
    const seededTeams = approvedTeamsData.map((team, index) => ({
      ...team,
      seed: index + 1
    }));

    setTeams(seededTeams);

    const { data: backupRegistrations, error: backupError } = await supabase
      .from('tournament_registrations')
      .select(`
        user_id,
        team_id,
        status
      `)
      .eq('tournament_id', id)
      .eq('status', 'backup');

    if (!backupError && backupRegistrations) {
      const backupUserIds = new Set(backupRegistrations.map(reg => reg.user_id));

      const backupProcessedTeams = teamsData.map((team) => {
        const captain = teamMembers.find(tm => tm.team_id === team.id && tm.role === 'captain');
        const captainId = captain?.user_id || team.captain_id;
        const memberCount = teamMembers.filter(tm => tm.team_id === team.id).length;
        const captainBackup = captainId ? backupUserIds.has(captainId) && userIdSet.has(captainId) : false;
        const requiredMembers = tournamentData.max_players_per_team || 5;
        const hasEnoughMembers = memberCount >= requiredMembers;
        const isBackup = captainBackup && hasEnoughMembers;

        return {
          id: team.id,
          name: team.name,
          captain_id: captainId,
          memberCount,
          captainApproved: false,
          hasEnoughMembers,
          requiredMembers,
          isApproved: false,
          isBackup
        };
      });

      const backupTeamsData = backupProcessedTeams.filter(team => team.isBackup);
      backupTeamsData.sort((a, b) => b.memberCount - a.memberCount);
      const seededBackupTeams = backupTeamsData.map((team, index) => ({
        ...team,
        seed: index + 1
      }));

      setBackupTeams(seededBackupTeams);
    }

    return seededTeams;
  };

  const loadRoundTimers = async () => {
    if (!id) return;

    const timers = await getRoundTimers(id);
    if (timers) {
      // Defensive check: if multiple timers are active, keep only the highest round number active
      const activeTimers = timers.filter(t => t.status === 'active');
      if (activeTimers.length > 1) {
        console.warn(`⚠️ Multiple active timers detected (${activeTimers.length}). Auto-correcting...`);

        // Sort by round number descending
        activeTimers.sort((a, b) => b.round_number - a.round_number);
        const correctActiveTimer = activeTimers[0];

        // Complete all other active timers (they are stale)
        for (let i = 1; i < activeTimers.length; i++) {
          const staleTimer = activeTimers[i];
          await completeRoundTimer(id, staleTimer.round_number);
          console.log(`✅ Auto-completed stale timer for round ${staleTimer.round_number}`);
        }

        // Reload timers after correction
        const correctedTimers = await getRoundTimers(id);
        if (correctedTimers) {
          setRoundTimers(correctedTimers);
          const active = correctedTimers.find(t => t.status === 'active');
          setActiveTimer(active || null);

          if (active && matches.length > 0) {
            const roundComplete = isRoundCompleted(matches, active.round_number);
            setIsCurrentRoundComplete(roundComplete);
            const next = correctedTimers.find(t => t.round_number === active.round_number + 1);
            setNextRoundTimer(next || null);
          } else {
            setIsCurrentRoundComplete(false);
            setNextRoundTimer(null);
          }
        }
        return;
      }

      setRoundTimers(timers);

      const active = timers.find(t => t.status === 'active');
      setActiveTimer(active || null);

      if (active && matches.length > 0) {
        const roundComplete = isRoundCompleted(matches, active.round_number);
        setIsCurrentRoundComplete(roundComplete);

        const next = timers.find(t => t.round_number === active.round_number + 1);
        setNextRoundTimer(next || null);
      } else {
        setIsCurrentRoundComplete(false);
        setNextRoundTimer(null);
      }
    }
  };

  const handleTimerExpired = async () => {
    if (!activeTimer || !id || !tournament) return;
    toast.warning(`Le temps du Round ${activeTimer.round_number} est écoulé !`);
    await loadRoundTimers();
  };

  const handleManualProgression = async () => {
    if (!id || !tournament || !activeTimer || !nextRoundTimer) {
      toast.error('Impossible de progresser: données manquantes');
      return;
    }

    try {
      const totalRounds = calculateRoundsNeeded(
        tournament.type === 'team' ? teams.length : players.length
      );

      const success = await progressToNextRound(
        id,
        tournament.title,
        nextRoundTimer.round_number,
        totalRounds
      );

      if (success) {
        toast.success(`Progression manuelle au Round ${nextRoundTimer.round_number} réussie !`);
        await loadRoundTimers();
        await fetchTournamentAndPlayers();
      } else {
        toast.error('Erreur lors de la progression au round suivant');
      }
    } catch (error) {
      console.error('Error during manual progression:', error);
      toast.error('Erreur lors de la progression manuelle');
    }
  };

  const handleShowForceProgression = () => {
    if (!id || !tournament || !activeTimer || !nextRoundTimer) {
      toast.error('Impossible de forcer la progression: données manquantes');
      return;
    }

    const incompleteMatches = getIncompleteMatches(matches, activeTimer.round_number);

    setForceProgressionData({
      currentRound: activeTimer.round_number,
      nextRound: nextRoundTimer.round_number,
      incompleteMatches
    });

    setShowForceProgressionModal(true);
  };

  const handleConfirmForceProgression = async () => {
    if (!id || !tournament || !forceProgressionData) {
      toast.error('Impossible de forcer la progression: données manquantes');
      return;
    }

    try {
      const totalRounds = calculateRoundsNeeded(
        tournament.type === 'team' ? teams.length : players.length
      );

      toast.loading('Progression forcée en cours...', { id: 'force-progression' });

      const result = await forceProgressToNextRound(
        id,
        tournament.title,
        matches,
        forceProgressionData.currentRound,
        forceProgressionData.nextRound,
        totalRounds
      );

      if (result.success) {
        toast.success(
          `Progression forcée au Round ${forceProgressionData.nextRound} réussie !`,
          { id: 'force-progression' }
        );

        setMatches(result.updatedMatches);
        await loadRoundTimers();
        await fetchTournamentAndPlayers();

        setShowForceProgressionModal(false);
        setForceProgressionData(null);
      } else {
        toast.error('Erreur lors de la progression forcée', { id: 'force-progression' });
      }
    } catch (error) {
      console.error('Error during forced progression:', error);
      toast.error('Erreur lors de la progression forcée', { id: 'force-progression' });
    }
  };

  useEffect(() => {
    if (!id) return;

    const channel = subscribeToTimerUpdates(id, () => {
      loadRoundTimers();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [id]);

  useEffect(() => {
    if (id && matches.length > 0) {
      loadRoundTimers();
    }
  }, [id, matches.length]);

  useEffect(() => {
    if (!bracketContainerRef.current) return;

    const updateContainerSize = () => {
      if (bracketContainerRef.current) {
        const rect = bracketContainerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateContainerSize();

    const resizeObserver = new ResizeObserver(updateContainerSize);
    resizeObserver.observe(bracketContainerRef.current);

    return () => resizeObserver.disconnect();
  }, [isSidebarOpen]);

  const handleHeaderMouseEnter = useCallback(() => {
    if (headerTimeoutRef.current) {
      clearTimeout(headerTimeoutRef.current);
      headerTimeoutRef.current = null;
    }
    setIsHeaderVisible(true);
  }, []);

  const handleHeaderMouseLeave = useCallback(() => {
    headerTimeoutRef.current = setTimeout(() => {
      setIsHeaderVisible(false);
    }, 500);
  }, []);

  const handleZoomControlsMouseEnter = useCallback(() => {
    if (zoomControlsTimeoutRef.current) {
      clearTimeout(zoomControlsTimeoutRef.current);
      zoomControlsTimeoutRef.current = null;
    }
    setIsZoomControlsVisible(true);
  }, []);

  const handleZoomControlsMouseLeave = useCallback(() => {
    zoomControlsTimeoutRef.current = setTimeout(() => {
      setIsZoomControlsVisible(false);
    }, 500);
  }, []);

  const handleSidebarMouseEnter = useCallback(() => {
    if (sidebarTimeoutRef.current) {
      clearTimeout(sidebarTimeoutRef.current);
      sidebarTimeoutRef.current = null;
    }
    if (!isSidebarOpen) {
      setIsSidebarOpen(true);
    }
  }, [isSidebarOpen]);

  const handleSidebarMouseLeave = useCallback(() => {
    sidebarTimeoutRef.current = setTimeout(() => {
      setIsSidebarOpen(false);
    }, 800);
  }, []);

  useEffect(() => {
    return () => {
      if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current);
      if (zoomControlsTimeoutRef.current) clearTimeout(zoomControlsTimeoutRef.current);
      if (sidebarTimeoutRef.current) clearTimeout(sidebarTimeoutRef.current);
    };
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setActiveDragData(event.active.data.current);
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveDragId(null);
    setActiveDragData(null);
    setIsDragging(false);

    if (!over || active.id === over.id) {
      return;
    }

    const sourceData = active.data.current;
    const targetData = over.data.current;

    if (!sourceData || !targetData) {
      return;
    }

    if (sourceData.type === 'backup') {
      const backupParticipantId = sourceData.participantId as string;
      const targetMatchId = targetData.matchId as string;
      const targetPosition = targetData.position as 'player1' | 'player2';
      const targetMatch = editableMatches.find(m => m.id === targetMatchId);

      if (!targetMatch) return;

      if (!canEditMatchInRound(targetMatch, editableMatches)) {
        toast.error(`Cannot modify this match - Round ${targetMatch.round + 1} has already started`);
        return;
      }

      if (targetMatch.winner_id) {
        toast.error('Cannot modify matches that already have winners');
        return;
      }

      const targetFieldName = targetPosition === 'player1' ? 'player1_id' : 'player2_id';

      setEditableMatches(prevMatches =>
        prevMatches.map(match => {
          if (match.id === targetMatchId) {
            return {
              ...match,
              [targetFieldName]: backupParticipantId
            };
          }
          return match;
        })
      );

      if (tournament?.type === 'team') {
        const backupTeam = backupTeams.find(t => t.captain_id === backupParticipantId);
        if (backupTeam) {
          setTeams(prev => [...prev, backupTeam]);
        }
        setBackupTeams(prev => prev.filter(t => t.captain_id !== backupParticipantId));
      } else {
        const backupPlayer = backupPlayers.find(p => p.id === backupParticipantId);
        if (backupPlayer) {
          setPlayers(prev => [...prev, backupPlayer]);
        }
        setBackupPlayers(prev => prev.filter(p => p.id !== backupParticipantId));
      }

      toast.success('Backup player added to match');
      return;
    }

    const sourceMatchId = sourceData.matchId as string;
    const sourcePosition = sourceData.position as 'player1' | 'player2';
    const sourceParticipantId = sourceData.participantId as string | null;

    const targetMatchId = targetData.matchId as string;
    const targetPosition = targetData.position as 'player1' | 'player2';

    if (!sourceParticipantId) return;

    const sourceMatch = editableMatches.find(m => m.id === sourceMatchId);
    const targetMatch = editableMatches.find(m => m.id === targetMatchId);

    if (!sourceMatch || !targetMatch) return;

    if (sourceMatch.round !== targetMatch.round) {
      const totalRounds = Math.max(...editableMatches.map(m => m.round));
      const byeDetection = detectByes(editableMatches, totalRounds);

      if (byeDetection.hasByes) {
        const validation = validateCrossRoundMove(sourceMatch, targetMatch, sourceParticipantId);

        if (!validation.isValid) {
          toast.error(validation.errorMessage || 'Cannot perform cross-round move');
          return;
        }

        const targetFieldName = targetPosition === 'player1' ? 'player1_id' : 'player2_id';
        const targetParticipantId = targetMatch[targetFieldName];

        setCrossRoundPendingMove({
          sourceMatchId,
          targetMatchId,
          sourcePosition,
          targetPosition,
          sourceParticipantId,
          targetParticipantId,
          sourceRound: sourceMatch.round,
          targetRound: targetMatch.round,
          playerName: getParticipantName(sourceParticipantId),
          sourceMatchPosition: sourceMatch.position,
          targetMatchPosition: targetMatch.position,
          totalByes: byeDetection.totalByes
        });

        setShowCrossRoundModal(true);
        return;
      } else {
        toast.error('Can only reorganize participants within the same round (no BYE detected)');
        return;
      }
    }

    if (!canEditMatchInRound(sourceMatch, editableMatches) || !canEditMatchInRound(targetMatch, editableMatches)) {
      toast.error('Cannot reorganize these matches - next round has already started');
      return;
    }

    if (sourceMatch.winner_id || targetMatch.winner_id) {
      toast.error('Cannot reorganize matches that already have winners');
      return;
    }

    const sourceFieldName = sourcePosition === 'player1' ? 'player1_id' : 'player2_id';
    const targetFieldName = targetPosition === 'player1' ? 'player1_id' : 'player2_id';

    const targetParticipantId = targetMatch[targetFieldName];

    setEditableMatches(prevMatches =>
      prevMatches.map(match => {
        if (match.id === sourceMatchId) {
          return {
            ...match,
            [sourceFieldName]: targetParticipantId
          };
        }
        if (match.id === targetMatchId) {
          return {
            ...match,
            [targetFieldName]: sourceParticipantId
          };
        }
        return match;
      })
    );

    toast.success('Participants reorganized successfully');
  };

  const validateCrossRoundMove = (
    sourceMatch: Match,
    targetMatch: Match,
    sourceParticipantId: string
  ): { isValid: boolean; errorMessage?: string } => {
    if (sourceMatch.winner_id || targetMatch.winner_id) {
      return { isValid: false, errorMessage: 'Cannot reorganize matches that already have winners' };
    }

    if (!canEditMatchInRound(sourceMatch, editableMatches) || !canEditMatchInRound(targetMatch, editableMatches)) {
      return { isValid: false, errorMessage: 'Cannot reorganize these matches - subsequent rounds have already started' };
    }

    const participantInTargetRound = editableMatches.some(m =>
      m.round === targetMatch.round &&
      m.id !== targetMatch.id &&
      (m.player1_id === sourceParticipantId || m.player2_id === sourceParticipantId)
    );

    if (participantInTargetRound) {
      return { isValid: false, errorMessage: 'Participant already has a match in the target round' };
    }

    return { isValid: true };
  };

  const handleConfirmCrossRoundMove = () => {
    if (!crossRoundPendingMove) return;

    const {
      sourceMatchId,
      targetMatchId,
      sourcePosition,
      targetPosition,
      sourceParticipantId,
      targetParticipantId
    } = crossRoundPendingMove;

    const sourceFieldName = sourcePosition === 'player1' ? 'player1_id' : 'player2_id';
    const targetFieldName = targetPosition === 'player1' ? 'player1_id' : 'player2_id';

    setEditableMatches(prevMatches =>
      prevMatches.map(match => {
        if (match.id === sourceMatchId) {
          return {
            ...match,
            [sourceFieldName]: targetParticipantId
          };
        }
        if (match.id === targetMatchId) {
          return {
            ...match,
            [targetFieldName]: sourceParticipantId
          };
        }
        return match;
      })
    );

    toast.success('Déplacement cross-round effectué (Exception BYE)');
    setShowCrossRoundModal(false);
    setCrossRoundPendingMove(null);
  };

  const handlePushBracketLive = async () => {
    if (!id) return;

    try {
      setIsUpdatingBracketStatus(true);

      const savedMatches = await saveBracket(editableMatches, validUserIds, id, 'live');

      if (savedMatches) {
        setMatches(savedMatches);
        setIsDraftMode(false);

        if (tournament) {
          setTournament({ ...tournament, bracket_status: 'live' });
        }

        const started = await startRoundTimer(id, 1);
        if (started) {
          await loadRoundTimers();
          toast.success('Bracket is now live! Round 1 timer has started.');
        } else {
          toast.success('Bracket is now live! Players can start competing.');
        }
      }
    } catch (error) {
      console.error('Error pushing bracket live:', error);
      toast.error('Failed to push bracket live');
    } finally {
      setIsUpdatingBracketStatus(false);
    }
  };

  const handleEditBracket = async () => {
    if (!id) return;

    try {
      setIsUpdatingBracketStatus(true);

      const { updateBracketStatus } = useTournamentStore.getState();
      await updateBracketStatus(id, 'draft');

      setIsDraftMode(true);

      if (tournament) {
        setTournament({ ...tournament, bracket_status: 'draft' });
      }

      toast.success('Bracket is now in draft mode. You can make changes.');
    } catch (error) {
      console.error('Error setting bracket to draft:', error);
      toast.error('Failed to set bracket to draft mode');
    } finally {
      setIsUpdatingBracketStatus(false);
    }
  };

  const handleResetDraft = () => {
    setEditableMatches([...matches]);
    toast.success('Draft reset to last live version');
  };

  const handleWinnerSelected = async (matchId: string, winnerId: string) => {
    if (isDraftMode) {
      toast.error('Cannot select winners while bracket is in draft mode');
      return;
    }

    try {
      const updatedMatches = await updateMatchWinner(matches, matchId, winnerId);
      setMatches(updatedMatches);

      checkForTournamentWinner(updatedMatches);

      if (id && tournament && activeTimer) {
        const totalRounds = calculateRoundsNeeded(
          tournament.type === 'team' ? teams.length : players.length
        );

        const progressionResult = await handleRoundProgression(
          id,
          tournament.title,
          updatedMatches,
          activeTimer.round_number,
          totalRounds
        );

        if (progressionResult.shouldShowModal && progressionResult.nextRound) {
          setIncompleteMatchesData({
            matches: progressionResult.incompleteMatches,
            currentRound: activeTimer.round_number,
            nextRound: progressionResult.nextRound
          });
          setShowIncompleteMatchesModal(true);
        }

        await loadRoundTimers();

        const roundComplete = isRoundCompleted(updatedMatches, activeTimer.round_number);
        setIsCurrentRoundComplete(roundComplete);
      }
    } catch (error) {
      console.error('Error updating match:', error);
    }
  };

  const handleResetMatch = async (matchId: string): Promise<boolean> => {
    if (isDraftMode) {
      toast.error('Cannot reset match while bracket is in draft mode');
      return false;
    }

    try {
      const updatedMatches = await resetBracketMatchWinner(matchId, matches);

      if (updatedMatches) {
        setMatches(updatedMatches);
        toast.success('Match result reset successfully');
        return true;
      } else {
        toast.error('Cannot reset match: next match has already been played');
        return false;
      }
    } catch (error) {
      console.error('Error resetting match:', error);
      toast.error('Failed to reset match');
      return false;
    }
  };

  const handleChangeWinner = async (matchId: string, newWinnerId: string): Promise<boolean> => {
    if (isDraftMode) {
      toast.error('Cannot change winner while bracket is in draft mode');
      return false;
    }

    try {
      const updatedMatches = await changeBracketMatchWinner(matchId, newWinnerId, matches, validUserIds);

      if (updatedMatches) {
        setMatches(updatedMatches);
        toast.success('Winner changed successfully');
        checkForTournamentWinner(updatedMatches);
        return true;
      } else {
        toast.error('Cannot change winner: next match has already been played');
        return false;
      }
    } catch (error) {
      console.error('Error changing winner:', error);
      toast.error('Failed to change winner');
      return false;
    }
  };

  const handleRepairOrphanedByes = async () => {
    if (!id) return;

    try {
      setIsRepairingByes(true);
      toast.loading('Détection et réparation des BYE orphelins...', { id: 'repair-byes' });

      const result = await detectAndRepairOrphanedByes(id);

      if (result.success) {
        if (result.byesFound === 0) {
          toast.success(result.message, { id: 'repair-byes' });
        } else {
          toast.success(
            `Réparé avec succès: ${result.byesFixed} BYE(s) corrigé(s), ${result.consolidatedMatches} match(s) consolidé(s)`,
            { id: 'repair-byes' }
          );
          await fetchTournamentAndPlayers();
        }
      } else {
        toast.error(`Erreur: ${result.message}`, { id: 'repair-byes' });
      }
    } catch (error) {
      console.error('Error repairing orphaned BYEs:', error);
      toast.error('Erreur lors de la réparation des BYE', { id: 'repair-byes' });
    } finally {
      setIsRepairingByes(false);
    }
  };

  const handleResetBracket = async () => {
    if (!id) return;

    try {
      setIsResettingBracket(true);

      const success = await resetBracket(id);

      if (success) {
        await deleteTimersForTournament(id);
        await deleteNotificationsForTournament(id);

        setShowResetModal(false);
        setMatches([]);
        setEditableMatches([]);
        setIsDraftMode(false);
        setRoundTimers([]);
        setActiveTimer(null);

        if (tournament) {
          setTournament({
            ...tournament,
            bracket_status: null,
            bracket_launched_at: null,
            actual_participants: null
          });
        }

        await fetchTournamentAndPlayers();
      }
    } catch (error) {
      console.error('Error resetting bracket:', error);
    } finally {
      setIsResettingBracket(false);
    }
  };

  const handleProceedToNextRound = async () => {
    if (!incompleteMatchesData || !id || !tournament) return;

    const { nextRound } = incompleteMatchesData;
    if (!nextRound) return;

    const totalRounds = calculateRoundsNeeded(
      tournament.type === 'team' ? teams.length : players.length
    );

    const success = await progressToNextRound(
      id,
      tournament.title,
      nextRound,
      totalRounds
    );

    if (success) {
      toast.success(`Progression au Round ${nextRound} !`);
      setShowIncompleteMatchesModal(false);
      setIncompleteMatchesData(null);
      await loadRoundTimers();
    } else {
      toast.error('Erreur lors de la progression au round suivant');
    }
  };

  const handleStayOnCurrentRound = () => {
    setShowIncompleteMatchesModal(false);
    setIncompleteMatchesData(null);
    toast.info('Restez sur le round actuel');
  };

  const getParticipantName = (participantId: string | null): string => {
    if (!participantId) return 'Bye';
    if (tournament?.type === 'team') {
      const team = teams.find(t => t.captain_id === participantId);
      return team?.name || 'Unknown Team';
    } else {
      const player = players.find(p => p.id === participantId);
      return player?.name || 'Unknown Player';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-dark-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const participants = tournament?.type === 'team' ? teams : players;
  const currentMatches = isDraftMode ? editableMatches : matches;
  const sortedMatches = [...currentMatches].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.position - b.position;
  });

  const highlightedMatchIds = new Set<string>();
  if (searchQuery) {
    sortedMatches.forEach((match, index) => {
      const matchNumber = index + 1;
      const player1Name = getParticipantName(match.player1_id).toLowerCase();
      const player2Name = getParticipantName(match.player2_id).toLowerCase();
      const query = searchQuery.toLowerCase();

      if (
        matchNumber.toString().includes(query) ||
        player1Name.includes(query) ||
        player2Name.includes(query)
      ) {
        highlightedMatchIds.add(match.id);
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-dark-400 flex flex-col">
      <FireworksCanvas
        show={showCelebration}
        fireworks={fireworks}
        setFireworks={setFireworks}
      />

      <WinnerCelebration
        show={showCelebration}
        winner={tournamentWinner}
        tournament={tournament}
        onContinue={() => setShowCelebration(false)}
        onBackToRegistrations={() => navigate('/brackets')}
      />

      <ByeManagementPanel
        byesByRound={byesByRound}
        show={showByePanel}
        onClose={() => setShowByePanel(false)}
        totalRounds={calculateRoundsNeeded(participants.length)}
      />

      <div
        className="fixed top-0 left-0 right-0 h-4 z-40"
        onMouseEnter={handleHeaderMouseEnter}
      />

      <div
        className={`absolute top-0 left-0 right-0 z-30 bg-dark-300 border-b border-gray-700 shadow-lg transition-all duration-300 ease-in-out ${
          isHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
        onMouseEnter={handleHeaderMouseEnter}
        onMouseLeave={handleHeaderMouseLeave}
      >
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              leftIcon={<Menu size={18} />}
            >
              {isSidebarOpen ? 'Hide' : 'Show'} Controls
            </Button>
            <div className="h-6 w-px bg-gray-600"></div>
            <h1 className="text-lg font-semibold text-white truncate max-w-md">
              {tournament?.title}
            </h1>
            <div className={`text-xs px-2 py-1 rounded ${
              tournament?.bracket_status === 'live'
                ? 'bg-success-900/20 text-success-400 border border-success-500/30'
                : 'bg-warning-900/20 text-warning-400 border border-warning-500/30'
            }`}>
              {tournament?.bracket_status === 'live' ? 'Live' : 'Draft'}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search matches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-dark-200 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
              />
            </div>

            {!isDraftMode && activeTimer && (
              <RoundTimerDisplay
                timer={activeTimer}
                totalRounds={calculateRoundsNeeded(participants.length)}
                onTimerExpired={handleTimerExpired}
                isCurrentRoundComplete={isCurrentRoundComplete}
                nextRoundTimer={nextRoundTimer}
                onManualProgression={handleManualProgression}
                onForceProgression={handleShowForceProgression}
                compact={true}
              />
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/tournaments/${id}/bracket`)}
              leftIcon={<X size={18} />}
              className="text-gray-300 hover:text-white"
            >
              Exit Full Screen
            </Button>
          </div>
        </div>
      </div>

      <div
        className="fixed left-0 top-[60px] bottom-0 w-4 z-40"
        onMouseEnter={handleSidebarMouseEnter}
      />

      <div
        className="flex flex-1 overflow-hidden"
        style={{ marginTop: isHeaderVisible ? '60px' : '0px', transition: 'margin-top 0.3s ease-in-out' }}
      >
        <div
          onMouseEnter={handleSidebarMouseEnter}
          onMouseLeave={handleSidebarMouseLeave}
        >
          <FullScreenSidebar
            isOpen={isSidebarOpen}
            isDraftMode={isDraftMode}
            tournament={tournament}
            byesByRound={byesByRound}
            roundTimers={roundTimers}
            canResetBrackets={canResetBrackets()}
            isUpdatingBracketStatus={isUpdatingBracketStatus}
            isRepairingByes={isRepairingByes}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onPushBracketLive={handlePushBracketLive}
            onEditBracket={handleEditBracket}
            onResetDraft={handleResetDraft}
            onShowByePanel={() => setShowByePanel(true)}
            onRepairByes={handleRepairOrphanedByes}
            onResetBracket={() => setShowResetModal(true)}
            onLoadTimers={loadRoundTimers}
            onOpenTimerModal={() => setShowTimerConfigModal(true)}
            tournamentId={id || ''}
          />
        </div>

        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div ref={bracketContainerRef} className="flex-1 relative overflow-hidden">
            <TransformWrapper
              initialScale={1}
              minScale={0.3}
              maxScale={2}
              centerOnInit={false}
              wheel={{ step: 0.1 }}
              panning={{ disabled: isDragging, velocityDisabled: false }}
              doubleClick={{ disabled: false }}
              limitToBounds={false}
              onZoom={(ref) => setZoomLevel(ref.state.scale)}
            >
              {({ zoomIn, zoomOut, resetTransform, centerView }) => (
                <>
                  <div
                    className={`absolute top-4 right-4 z-20 flex flex-col space-y-2 transition-opacity duration-300 ${
                      isZoomControlsVisible ? 'opacity-100' : 'opacity-30'
                    }`}
                    onMouseEnter={handleZoomControlsMouseEnter}
                    onMouseLeave={handleZoomControlsMouseLeave}
                  >
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => zoomIn()}
                      className="w-10 h-10 p-0 flex items-center justify-center"
                      title="Zoom In"
                    >
                      <ZoomIn size={18} />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => zoomOut()}
                      className="w-10 h-10 p-0 flex items-center justify-center"
                      title="Zoom Out"
                    >
                      <ZoomOut size={18} />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        resetTransform();
                        centerView();
                      }}
                      className="w-10 h-10 p-0 flex items-center justify-center"
                      title="Reset View"
                    >
                      <Maximize2 size={18} />
                    </Button>
                    <Button
                      size="sm"
                      variant={autoScaleEnabled ? 'primary' : 'secondary'}
                      onClick={() => setAutoScaleEnabled(!autoScaleEnabled)}
                      className="w-10 h-10 p-0 flex items-center justify-center"
                      title={autoScaleEnabled ? 'Disable Auto-Fit' : 'Auto-Fit to Screen'}
                    >
                      <Focus size={18} />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowMiniMap(!showMiniMap)}
                      className="w-10 h-10 p-0 flex items-center justify-center"
                      title="Toggle Mini Map"
                    >
                      <MapIcon size={18} />
                    </Button>
                    <div className="bg-dark-300 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center">
                      {Math.round(zoomLevel * 100)}%
                    </div>
                  </div>

                  {showMiniMap && (
                    <FullScreenMiniMap
                      matches={currentMatches}
                      tournament={tournament}
                      onClose={() => setShowMiniMap(false)}
                    />
                  )}

                  <TransformComponent
                    wrapperStyle={{
                      width: '100%',
                      height: '100%',
                      overflow: 'visible'
                    }}
                    contentStyle={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                      minWidth: '100%',
                      minHeight: '100%'
                    }}
                  >
                    <div className="p-8">
                      <BracketDisplay
                        matches={currentMatches}
                        tournament={tournament}
                        players={players}
                        teams={teams}
                        onWinnerSelected={handleWinnerSelected}
                        isEditable={isDraftMode}
                        onMatchUpdate={(matchId) => {
                          setEditableMatches(prevMatches =>
                            prevMatches.map(match =>
                              match.id === matchId
                                ? { ...match, player1_id: match.player2_id, player2_id: match.player1_id }
                                : match
                            )
                          );
                        }}
                        canModifyResult={!isDraftMode}
                        onResetMatch={handleResetMatch}
                        onChangeWinner={handleChangeWinner}
                        searchQuery={searchQuery}
                        highlightedMatchIds={highlightedMatchIds}
                        autoScale={autoScaleEnabled}
                        containerWidth={containerSize.width - 64}
                        containerHeight={containerSize.height - 64}
                      />
                    </div>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>

            <BackupPanel
              backupPlayers={backupPlayers}
              backupTeams={backupTeams}
              isTeamTournament={tournament?.type === 'team'}
              show={isDraftMode}
            />
          </div>

          <DragOverlay>
            {activeDragId && activeDragData ? (
              <div className="bg-primary-600 border-2 border-primary-400 rounded-lg p-3 shadow-2xl opacity-90">
                <div className="text-white font-medium text-sm">
                  {activeDragData.type === 'backup' ? '' : ''}
                  {activeDragData.participantName || (
                    tournament?.type === 'team'
                      ? teams.find(t => t.captain_id === activeDragData.participantId)?.name || 'Unknown'
                      : players.find(p => p.id === activeDragData.participantId)?.name || 'Unknown'
                  )}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {crossRoundPendingMove && (
        <CrossRoundMoveModal
          isOpen={showCrossRoundModal}
          onClose={() => {
            setShowCrossRoundModal(false);
            setCrossRoundPendingMove(null);
          }}
          onConfirm={handleConfirmCrossRoundMove}
          sourceRound={crossRoundPendingMove.sourceRound}
          targetRound={crossRoundPendingMove.targetRound}
          playerName={crossRoundPendingMove.playerName}
          sourceMatchPosition={crossRoundPendingMove.sourceMatchPosition}
          targetMatchPosition={crossRoundPendingMove.targetMatchPosition}
          totalByes={crossRoundPendingMove.totalByes}
        />
      )}

      <ResetBracketModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetBracket}
        isLoading={isResettingBracket}
        tournamentTitle={tournament?.title}
        hasMatches={matches.length > 0}
      />

      {incompleteMatchesData && (
        <IncompleteMatchesModal
          isOpen={showIncompleteMatchesModal}
          onClose={() => {
            setShowIncompleteMatchesModal(false);
            setIncompleteMatchesData(null);
          }}
          incompleteMatches={incompleteMatchesData.matches}
          currentRound={incompleteMatchesData.currentRound}
          nextRound={incompleteMatchesData.nextRound}
          tournament={tournament}
          players={players}
          teams={teams}
          onProceedToNextRound={handleProceedToNextRound}
          onStayOnCurrentRound={handleStayOnCurrentRound}
        />
      )}

      {forceProgressionData && (
        <ForceRoundProgressionModal
          isOpen={showForceProgressionModal}
          onClose={() => {
            setShowForceProgressionModal(false);
            setForceProgressionData(null);
          }}
          onConfirm={handleConfirmForceProgression}
          currentRound={forceProgressionData.currentRound}
          nextRound={forceProgressionData.nextRound}
          totalRounds={calculateRoundsNeeded(
            tournament?.type === 'team' ? teams.length : players.length
          )}
          incompleteMatches={forceProgressionData.incompleteMatches}
          tournament={tournament}
          players={players}
          teams={teams}
          currentRoundName={getRoundName(
            forceProgressionData.currentRound,
            calculateRoundsNeeded(
              tournament?.type === 'team' ? teams.length : players.length
            )
          )}
          nextRoundName={getRoundName(
            forceProgressionData.nextRound,
            calculateRoundsNeeded(
              tournament?.type === 'team' ? teams.length : players.length
            )
          )}
        />
      )}

      <RoundTimerConfigModal
        isOpen={showTimerConfigModal}
        onClose={() => setShowTimerConfigModal(false)}
        timers={roundTimers}
        totalRounds={calculateRoundsNeeded(participants.length)}
        onTimersUpdated={loadRoundTimers}
      />
    </div>
  );
};

export default FullScreenBracketPage;
