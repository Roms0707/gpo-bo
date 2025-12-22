import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DragEndEvent, DndContext, DragOverlay } from '@dnd-kit/core';
import { supabase } from '../lib/supabase';
import { useTournamentStore } from '../store/tournamentStore';
import { useAuthStore } from '../store/authStore';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeft, Trophy, ChevronRight, Crown, Sparkles, Star, Target, Award, AlertTriangle, RotateCcw, Clock, Wrench, Maximize, Bell, Menu } from 'lucide-react';
import BracketDisplay from '../components/bracket/BracketDisplay';
import BracketHeader from '../components/bracket/BracketHeader';
import EmptyBracketMessage from '../components/bracket/EmptyBracketMessage';
import WinnerCelebration from '../components/bracket/WinnerCelebration';
import FireworksCanvas from '../components/bracket/FireworksCanvas';
import TeamDebugPanel from '../components/bracket/TeamDebugPanel';
import BattleRoyaleLeaderboard from '../components/battleRoyale/BattleRoyaleLeaderboard';
import BackupPanel from '../components/bracket/BackupPanel';
import ByeManagementPanel from '../components/bracket/ByeManagementPanel';
import CrossRoundMoveModal from '../components/bracket/CrossRoundMoveModal';
import ResetBracketModal from '../components/bracket/ResetBracketModal';
import RoundTimerDisplay from '../components/bracket/RoundTimerDisplay';
import IncompleteMatchesModal from '../components/bracket/IncompleteMatchesModal';
import ForceRoundProgressionModal from '../components/bracket/ForceRoundProgressionModal';
import RoundTimerExpirationModal from '../components/bracket/RoundTimerExpirationModal';
import PlayerInfoModal from '../components/bracket/PlayerInfoModal';
import BracketControlSidebar from '../components/bracket/BracketControlSidebar';
import BracketFAB from '../components/bracket/BracketFAB';
import { detectByes } from '../services/byeDetectionService';
import { Match, Player, Team, Firework, MatchInsert } from '../components/bracket/types';
import {
  generateProfessionalBracket,
  saveBracket,
  updateMatchWinner,
  canEditFirstRound,
  resetBracketMatchWinner,
  changeBracketMatchWinner,
  canModifyBracketMatch,
  getByesByRound,
  canModifyRound,
  canEditMatchInRound,
  getEditableMatches,
  calculateTotalByesInBracket,
  calculateRoundsNeeded,
  handleRoundProgression,
  progressToNextRound,
  getIncompleteMatches,
  isRoundCompleted,
  forceProgressToNextRound,
  detectAndRepairOrphanedByes,
  startRoundOne
} from '../components/bracket/BracketService';
import {
  RoundTimer,
  getRoundTimers,
  getActiveRoundTimer,
  initializeRoundTimers,
  startRoundTimer,
  subscribeToTimerUpdates,
  completeRoundTimer
} from '../services/roundTimerService';
import { deleteTimersForTournament } from '../services/roundTimerService';
import { deleteNotificationsForTournament, getRoundName } from '../services/roundNotificationService';

const BracketPage: React.FC = () => {
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
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [registrationsCount, setRegistrationsCount] = useState(0);
  const [validRegistrationsCount, setValidRegistrationsCount] = useState(0);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [approvedTeams, setApprovedTeams] = useState<Team[]>([]);
  const [bracketAlreadyGenerated, setBracketAlreadyGenerated] = useState(false);
  const [allMatchesCompleted, setAllMatchesCompleted] = useState(false);
  const [showFinalLeaderboard, setShowFinalLeaderboard] = useState(false);
  const [editableMatches, setEditableMatches] = useState<Match[]>([]);
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [isUpdatingBracketStatus, setIsUpdatingBracketStatus] = useState(false);
  const [backupPlayers, setBackupPlayers] = useState<Player[]>([]);
  const [backupTeams, setBackupTeams] = useState<Team[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [byesByRound, setByesByRound] = useState<Map<number, Match[]>>(new Map());
  const [showByePanel, setShowByePanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
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
  const [showTimerExpirationModal, setShowTimerExpirationModal] = useState(false);
  const [timerExpirationData, setTimerExpirationData] = useState<{
    currentRound: number;
    nextRound: number | null;
    nextRoundDuration: number;
    incompleteMatches: Match[];
  } | null>(null);
  const hasShownExpirationModal = useRef<Set<string>>(new Set());
  const [showPlayerInfoModal, setShowPlayerInfoModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Player | Team | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { canResetBrackets } = useAuthStore();
  const { resetBracket } = useTournamentStore();

  useEffect(() => {
    if (id && !hasRedirected) {
      fetchTournamentAndPlayers();
    }
  }, [id]);

  useEffect(() => {
    if (matches.length > 0) {
      const detectedByes = getByesByRound(matches);
      setByesByRound(detectedByes);

      if (detectedByes.size > 0 && isDraftMode) {
        const byesAfterFirstRound = Array.from(detectedByes.keys()).some(round => round > 1);
        if (byesAfterFirstRound) {
          setShowByePanel(true);
        }
      }
    }
  }, [matches, isDraftMode]);

  const isBattleRoyaleTournament = () => {
    return tournament?.tournament_format?.toLowerCase().includes('battle royale');
  };

  const checkBattleRoyaleCompletion = async () => {
    if (!isBattleRoyaleTournament() || !id) return;

    try {
      // Check if all 3 matches have results
      const { data: results, error } = await supabase
        .from('battle_royale_results')
        .select('match_number')
        .eq('tournament_id', id);

      if (error) throw error;

      // Check if we have results for all 3 matches
      const matchNumbers = new Set(results.map(r => r.match_number));
      const completed = matchNumbers.has(1) && matchNumbers.has(2) && matchNumbers.has(3);
      
      setAllMatchesCompleted(completed);
    } catch (error) {
      console.error('Error checking Battle Royale completion:', error);
    }
  };

  const checkForTournamentWinner = (updatedMatches: Match[]) => {
    // Find the final match (highest round number)
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
        const winner = players.find(p => p.id ===  finalMatch.winner_id);
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
      setError(null);

      // First, fetch all valid user IDs to ensure we only use existing users
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      // Create a set of valid user IDs for quick lookup
      const userIdSet = new Set(allUsers.map(user => user.id));
      setValidUserIds(userIdSet);

      // Fetch tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (tournamentError) {
        console.error('Error fetching tournament:', tournamentError);
        throw tournamentError;
      }

      if (!tournamentData) {
        throw new Error('Tournament not found');
      }

      console.log('Tournament loaded:', tournamentData.title, 'Format:', tournamentData.tournament_format);
      setTournament(tournamentData);

      // For Battle Royale tournaments, check completion status and skip bracket generation
      if (tournamentData.tournament_format?.toLowerCase().includes('battle royale')) {
        console.log('Battle Royale tournament detected');
        await checkBattleRoyaleCompletion();
        setIsLoading(false);
        return;
      }

      // Check if this is a Round Robin tournament that has NOT transitioned to knockout
      if (tournamentData.tournament_format &&
          tournamentData.tournament_format.includes('Round Robin') &&
          !tournamentData.tournament_format.includes('Single Elimination Knockout')) {
        console.log('Redirecting to Round Robin bracket page');
        setHasRedirected(true);
        navigate(`/tournaments/${id}/rr-bracket`);
        return;
      }

      // Check if this is a Swiss tournament that has NOT transitioned to knockout
      if (tournamentData.tournament_format &&
          tournamentData.tournament_format.includes('Swiss') &&
          !tournamentData.tournament_format.includes('Single Elimination Knockout')) {
        console.log('Redirecting to Swiss bracket page');
        setHasRedirected(true);
        navigate(`/tournaments/${id}/swiss-bracket`);
        return;
      }

      console.log('Loading Single Elimination bracket');

      // If we reach here, it's a Single Elimination tournament OR a Round Robin/Swiss that has transitioned to knockout

      // First, check if there are existing matches for this tournament
      const { data: existingMatches, error: existingMatchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', id);
        
      if (existingMatchesError) throw existingMatchesError;
      
      // Fetch participants (players or teams) based on tournament type
      let participants: Player[] | Team[] = [];
      
      if (tournamentData.type === 'solo') {
        participants = await fetchSoloPlayers(tournamentData, userIdSet);
      } else {
        participants = await fetchTeams(tournamentData, userIdSet);
      }
      
      // If we have existing matches, use them
      if (existingMatches && existingMatches.length > 0) {
        setMatches(existingMatches);
        setEditableMatches(existingMatches);
        setBracketAlreadyGenerated(true);
        setIsDraftMode(tournamentData.bracket_status === 'draft');
        
        // Check if tournament is already completed
        checkForTournamentWinner(existingMatches);
      } else {
        // If no existing matches and we have participants, generate new ones
        if (participants.length > 0) {
          try {
            console.log(`Generating bracket for ${participants.length} participants...`);
            console.log(`Max players configured: ${tournamentData.max_nb_players || 'not set'}`);
            const generatedMatches = generateProfessionalBracket(
              participants,
              id!,
              tournamentData.type,
              userIdSet,
              tournamentData.max_nb_players
            );
            console.log(`Generated ${generatedMatches.length} matches`);

            if (generatedMatches.length > 0) {
              console.log('Saving bracket to database...');
              const savedMatches = await saveBracket(generatedMatches, userIdSet, id!, 'draft');

              if (savedMatches) {
                console.log('Bracket saved successfully');
                setMatches(savedMatches);
                setEditableMatches(savedMatches);
                setBracketAlreadyGenerated(true);
                setIsDraftMode(true);

                // Initialize round timers for the bracket
                const totalRounds = calculateRoundsNeeded(participants.length);
                await initializeRoundTimers(id!, totalRounds);
                await loadRoundTimers();

                // Check if tournament is already completed
                checkForTournamentWinner(savedMatches);
              } else {
                console.error('Failed to save bracket to database');
              }
            } else {
              console.warn('No matches were generated');
            }
          } catch (bracketError) {
            console.error('Error generating bracket:', bracketError);
          }
        } else {
          console.warn('No participants found for bracket generation');
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tournament data';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };
  
  const fetchSoloPlayers = async (tournamentData: any, userIdSet: Set<string>): Promise<Player[]> => {
    // Construct the SQL query for debugging
    const sqlQuery = `
SELECT
  tr.user_id,
  u.id,
  u.email,
  u.username
FROM
  tournament_registrations tr
JOIN
  users u ON tr.user_id = u.id
WHERE
  tr.tournament_id = '${id}'
  AND tr.status = 'approved'
    `;

    setSqlQuery(sqlQuery);

    // Fetch ONLY approved players registered for this specific tournament
    const { data: registrations, error: registrationsError } = await supabase
      .from('tournament_registrations')
      .select(`
        user_id,
        user:user_id (
          id,
          email,
          username,
          discord_handle
        )
      `)
      .eq('tournament_id', id)
      .eq('status', 'approved');

    // Fetch backup players separately
    const { data: backupRegistrations, error: backupError } = await supabase
      .from('tournament_registrations')
      .select(`
        user_id,
        user:user_id (
          id,
          email,
          username,
          discord_handle
        )
      `)
      .eq('tournament_id', id)
      .eq('status', 'backup');

    if (registrationsError) {
      console.error('Error fetching registrations:', registrationsError);
      throw registrationsError;
    }

    console.log(`\ud83d\udcc8 REGISTRATIONS: Total approved registrations fetched: ${registrations?.length || 0}`);

    // Store the total count of approved registrations
    setRegistrationsCount(registrations?.length || 0);

    // Filter out registrations with invalid user references
    const validRegistrations = registrations?.filter(reg => {
      const isValid = reg.user && reg.user.id && userIdSet.has(reg.user.id);
      if (!isValid) {
        console.warn(`\u26a0\ufe0f REGISTRATIONS: Filtered out invalid registration:`, reg);
      }
      return isValid;
    }) || [];

    console.log(`\ud83d\udcc8 REGISTRATIONS: Valid registrations after filtering: ${validRegistrations.length}`);

    // Store the count of valid registrations
    setValidRegistrationsCount(validRegistrations.length);

    // Format approved players data
    let formattedPlayers = validRegistrations.map((reg: any) => ({
      id: reg.user.id,
      name: reg.user.username || reg.user.email.split('@')[0],
      elo: 1000,
      discord_handle: reg.user.discord_handle
    }));

    // Fetch player rankings for this tournament's game (if it has one) - only for approved players
    if (tournamentData.game_id && formattedPlayers.length > 0) {
      const approvedPlayerIds = formattedPlayers.map(p => p.id);

      const { data: rankingsData, error: rankingsError } = await supabase
        .from('player_rankings')
        .select('user_id, elo_rating, game_id')
        .eq('game_id', tournamentData.game_id)
        .in('user_id', approvedPlayerIds);

      if (!rankingsError && rankingsData) {
        // Update players with their actual ELO ratings
        formattedPlayers = formattedPlayers.map(player => {
          const ranking = rankingsData.find(r => r.user_id === player.id);
          return {
            ...player,
            elo: ranking ? ranking.elo_rating : 1000
          };
        });
      }

      // Fetch game publisher IDs for this tournament's game
      const { data: gamePublisherIds, error: publisherIdsError } = await supabase
        .from('game_publisher_id_for_users')
        .select(`
          user_id,
          value,
          game_publisher_id:game_publisher_id (
            label,
            id_name
          )
        `)
        .eq('game_id', tournamentData.game_id)
        .in('user_id', approvedPlayerIds);

      if (!publisherIdsError && gamePublisherIds) {
        // Update players with their game publisher IDs
        formattedPlayers = formattedPlayers.map(player => {
          const publisherId = gamePublisherIds.find(p => p.user_id === player.id);
          return {
            ...player,
            gamePublisherId: publisherId?.value,
            gamePublisherLabel: publisherId?.game_publisher_id?.label
          };
        });
      }
    }

    // Sort players by ELO (highest first) and assign seeds
    formattedPlayers.sort((a, b) => (b.elo || 1000) - (a.elo || 1000));
    formattedPlayers = formattedPlayers.map((player, index) => ({
      ...player,
      seed: index + 1
    }));

    // Update the state
    setPlayers(formattedPlayers);

    // Process backup players
    if (!backupError && backupRegistrations) {
      const validBackupRegistrations = backupRegistrations.filter(reg => {
        const isValid = reg.user && reg.user.id && userIdSet.has(reg.user.id);
        return isValid;
      }) || [];

      let formattedBackups = validBackupRegistrations.map((reg: any) => ({
        id: reg.user.id,
        name: reg.user.username || reg.user.email.split('@')[0],
        elo: 1000,
        discord_handle: reg.user.discord_handle
      }));

      // Fetch rankings for backup players if game_id exists
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

        // Fetch game publisher IDs for backup players
        const { data: backupPublisherIds, error: backupPublisherError } = await supabase
          .from('game_publisher_id_for_users')
          .select(`
            user_id,
            value,
            game_publisher_id:game_publisher_id (
              label,
              id_name
            )
          `)
          .eq('game_id', tournamentData.game_id)
          .in('user_id', backupPlayerIds);

        if (!backupPublisherError && backupPublisherIds) {
          formattedBackups = formattedBackups.map(player => {
            const publisherId = backupPublisherIds.find(p => p.user_id === player.id);
            return {
              ...player,
              gamePublisherId: publisherId?.value,
              gamePublisherLabel: publisherId?.game_publisher_id?.label
            };
          });
        }
      }

      // Sort backup players by ELO and assign seeds
      formattedBackups.sort((a, b) => (b.elo || 1000) - (a.elo || 1000));
      formattedBackups = formattedBackups.map((player, index) => ({
        ...player,
        seed: index + 1
      }));

      setBackupPlayers(formattedBackups);
    }

    // Return the formatted players for immediate use
    return formattedPlayers;
  };
  
  const fetchTeams = async (tournamentData: any, userIdSet: Set<string>): Promise<Team[]> => {
    // For team tournaments, we need to fetch teams and their captains
    const sqlQuery = `
WITH approved_registrations AS (
  SELECT 
    tr.user_id,
    tr.team_id,
    tr.status
  FROM 
    tournament_registrations tr
  WHERE 
    tr.tournament_id = '${id}'
    AND tr.status = 'approved'
),
team_captains AS (
  SELECT 
    tm.team_id,
    tm.user_id AS captain_id
  FROM 
    team_members tm
  WHERE 
    tm.role = 'captain'
    AND tm.team_id IN (SELECT DISTINCT team_id FROM approved_registrations WHERE team_id IS NOT NULL)
),
team_member_counts AS (
  SELECT 
    tm.team_id,
    COUNT(tm.user_id) AS member_count
  FROM 
    team_members tm
  WHERE 
    tm.team_id IN (SELECT DISTINCT team_id FROM approved_registrations WHERE team_id IS NOT NULL)
  GROUP BY 
    tm.team_id
)
SELECT 
  t.id,
  t.name,
  tc.captain_id,
  tmc.member_count,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM approved_registrations ar 
      WHERE ar.user_id = tc.captain_id AND ar.team_id = t.id
    ) THEN true
    ELSE false
  END AS captain_approved,
  CASE 
    WHEN tmc.member_count >= ${tournamentData.max_players_per_team || 5} THEN true
    ELSE false
  END AS has_enough_members,
  ${tournamentData.max_players_per_team || 5} AS required_members
FROM 
  teams t
LEFT JOIN 
  team_captains tc ON t.id = tc.team_id
LEFT JOIN 
  team_member_counts tmc ON t.id = tmc.team_id
WHERE 
  t.tournament_id = '${id}'
ORDER BY 
  tmc.member_count DESC, t.name ASC
    `;
    
    setSqlQuery(sqlQuery);
    
    // Fetch teams for this tournament
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        captain_id
      `)
      .eq('tournament_id', id);
      
    if (teamsError) throw teamsError;
    
    // Fetch team members to get member counts and captain info
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from('team_members')
      .select(`
        team_id,
        user_id,
        role,
        user:user_id (
          id,
          discord_handle
        )
      `)
      .in('team_id', teamsData.map(t => t.id));

    if (teamMembersError) throw teamMembersError;
    
    // Fetch approved registrations for captains
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
    
    // Create a set of approved user IDs
    const approvedUserIds = new Set(approvedRegistrations.map(reg => reg.user_id));
    
    // Process teams and check approvals...
    const processedTeams = teamsData.map((team, index) => {
      // Find the captain
      const captain = teamMembers.find(tm => tm.team_id === team.id && tm.role === 'captain');
      const captainId = captain?.user_id || team.captain_id;
      
      // Count team members
      const memberCount = teamMembers.filter(tm => tm.team_id === team.id).length;
      
      // Check if captain is approved
      const captainApproved = captainId ? approvedUserIds.has(captainId) && userIdSet.has(captainId) : false;
      
      // Check if team has enough members
      const requiredMembers = tournamentData.max_players_per_team || 5;
      const hasEnoughMembers = memberCount >= requiredMembers;
      
      // Team is approved if captain is approved AND it has enough members
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
    
    // Store all teams for debugging
    setAllTeams(processedTeams);
    
    // Filter to only approved teams
    const approvedTeamsData = processedTeams.filter(team => team.isApproved);
    setApprovedTeams(approvedTeamsData);
    
    // Sort approved teams by member count (highest first) and assign seeds
    approvedTeamsData.sort((a, b) => b.memberCount - a.memberCount);
    let seededTeams = approvedTeamsData.map((team, index) => ({
      ...team,
      seed: index + 1
    }));

    // Enrich teams with captain's discord_handle and game publisher ID
    if (tournamentData.game_id && seededTeams.length > 0) {
      const captainIds = seededTeams.map(t => t.captain_id).filter(Boolean);

      // Fetch discord handles for captains
      seededTeams = seededTeams.map(team => {
        const captain = teamMembers.find(tm => tm.user_id === team.captain_id && tm.role === 'captain');
        return {
          ...team,
          discord_handle: captain?.user?.discord_handle
        };
      });

      // Fetch game publisher IDs for captains
      if (captainIds.length > 0) {
        const { data: captainPublisherIds, error: captainPublisherError } = await supabase
          .from('game_publisher_id_for_users')
          .select(`
            user_id,
            value,
            game_publisher_id:game_publisher_id (
              label,
              id_name
            )
          `)
          .eq('game_id', tournamentData.game_id)
          .in('user_id', captainIds);

        if (!captainPublisherError && captainPublisherIds) {
          seededTeams = seededTeams.map(team => {
            const publisherId = captainPublisherIds.find(p => p.user_id === team.captain_id);
            return {
              ...team,
              gamePublisherId: publisherId?.value,
              gamePublisherLabel: publisherId?.game_publisher_id?.label
            };
          });
        }
      }
    }

    // Update the state
    setTeams(seededTeams);

    // Fetch backup teams (teams with backup status)
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
      let seededBackupTeams = backupTeamsData.map((team, index) => ({
        ...team,
        seed: index + 1
      }));

      // Enrich backup teams with captain's discord_handle and game publisher ID
      if (tournamentData.game_id && seededBackupTeams.length > 0) {
        const backupCaptainIds = seededBackupTeams.map(t => t.captain_id).filter(Boolean);

        // Fetch discord handles for backup captains
        seededBackupTeams = seededBackupTeams.map(team => {
          const captain = teamMembers.find(tm => tm.user_id === team.captain_id && tm.role === 'captain');
          return {
            ...team,
            discord_handle: captain?.user?.discord_handle
          };
        });

        // Fetch game publisher IDs for backup captains
        if (backupCaptainIds.length > 0) {
          const { data: backupCaptainPublisherIds, error: backupCaptainPublisherError } = await supabase
            .from('game_publisher_id_for_users')
            .select(`
              user_id,
              value,
              game_publisher_id:game_publisher_id (
                label,
                id_name
              )
            `)
            .eq('game_id', tournamentData.game_id)
            .in('user_id', backupCaptainIds);

          if (!backupCaptainPublisherError && backupCaptainPublisherIds) {
            seededBackupTeams = seededBackupTeams.map(team => {
              const publisherId = backupCaptainPublisherIds.find(p => p.user_id === team.captain_id);
              return {
                ...team,
                gamePublisherId: publisherId?.value,
                gamePublisherLabel: publisherId?.game_publisher_id?.label
              };
            });
          }
        }
      }

      setBackupTeams(seededBackupTeams);
    }

    // Return the formatted teams for immediate use
    return seededTeams;
  };

  // Load round timers from database
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

      // Find active timer
      const active = timers.find(t => t.status === 'active');
      setActiveTimer(active || null);

      // Check if current round is complete
      if (active && matches.length > 0) {
        const roundComplete = isRoundCompleted(matches, active.round_number);
        setIsCurrentRoundComplete(roundComplete);

        // Find next round timer
        const next = timers.find(t => t.round_number === active.round_number + 1);
        setNextRoundTimer(next || null);
      } else {
        setIsCurrentRoundComplete(false);
        setNextRoundTimer(null);
      }
    }
  };

  // Handle timer expiration
  const handleTimerExpired = async () => {
    if (!activeTimer || !id || !tournament) return;

    const modalKey = `${id}-${activeTimer.round_number}`;
    if (hasShownExpirationModal.current.has(modalKey)) {
      return;
    }

    hasShownExpirationModal.current.add(modalKey);

    const incompleteMatches = getIncompleteMatches(matches, activeTimer.round_number);
    const nextTimer = roundTimers.find(t => t.round_number === activeTimer.round_number + 1);

    setTimerExpirationData({
      currentRound: activeTimer.round_number,
      nextRound: nextTimer ? nextTimer.round_number : null,
      nextRoundDuration: nextTimer ? nextTimer.duration_minutes : 60,
      incompleteMatches
    });

    setShowTimerExpirationModal(true);
    toast.warning(`Le temps du Round ${activeTimer.round_number} est écoulé !`);
  };

  // Handle progression to next round from modal
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

  // Handle staying on current round from modal
  const handleStayOnCurrentRound = () => {
    setShowIncompleteMatchesModal(false);
    setIncompleteMatchesData(null);
    toast.info('Restez sur le round actuel');
  };

  // Handle manual progression to next round (triggered by admin button)
  const handleManualProgression = async () => {
    if (!id || !tournament || !activeTimer || !nextRoundTimer) {
      toast.error('Impossible de progresser: données manquantes');
      return;
    }

    try {
      const totalRounds = calculateRoundsNeeded(
        tournament.type === 'team' ? teams.length : players.length
      );

      // Progress to the next round
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

  // Handle timer expiration modal confirmation
  const handleTimerExpirationConfirm = async () => {
    if (!timerExpirationData || !id || !tournament) return;

    const { nextRound } = timerExpirationData;
    if (!nextRound) {
      setShowTimerExpirationModal(false);
      setTimerExpirationData(null);
      return;
    }

    try {
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
        toast.success(`Progression au Round ${nextRound} réussie !`);
        setShowTimerExpirationModal(false);
        setTimerExpirationData(null);
        await loadRoundTimers();
        await fetchTournamentAndPlayers();
      } else {
        toast.error('Erreur lors de la progression au round suivant');
      }
    } catch (error) {
      console.error('Error during timer expiration progression:', error);
      toast.error('Erreur lors de la progression');
    }
  };

  // Handle timer expiration modal close (stay on current round)
  const handleTimerExpirationClose = () => {
    setShowTimerExpirationModal(false);
    setTimerExpirationData(null);
    toast.info('Vous restez sur le round actuel');
  };

  // Handle force progression button click (show modal)
  const handleShowForceProgression = () => {
    if (!id || !tournament || !activeTimer || !nextRoundTimer) {
      toast.error('Impossible de forcer la progression: données manquantes');
      return;
    }

    // Get incomplete matches for current round
    const incompleteMatches = getIncompleteMatches(matches, activeTimer.round_number);

    setForceProgressionData({
      currentRound: activeTimer.round_number,
      nextRound: nextRoundTimer.round_number,
      incompleteMatches
    });

    setShowForceProgressionModal(true);
  };

  // Handle confirmed force progression from modal
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

        // Update local matches state
        setMatches(result.updatedMatches);

        // Reload timers and tournament data
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

  // Subscribe to real-time timer updates
  useEffect(() => {
    if (!id) return;

    const channel = subscribeToTimerUpdates(id, (payload) => {
      console.log('Timer update received:', payload);
      loadRoundTimers();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [id]);

  // Load timers on mount and when bracket is generated
  useEffect(() => {
    if (id && bracketAlreadyGenerated) {
      loadRoundTimers();
    }
  }, [id, bracketAlreadyGenerated]);

  // Auto-initialize timers if bracket exists but timers are missing
  useEffect(() => {
    const initializeTimersIfMissing = async () => {
      if (!id || !bracketAlreadyGenerated || !isDraftMode || !matches.length) return;
      if (roundTimers.length > 0) return;

      console.log('Bracket exists but no timers found. Initializing round timers...');

      const maxRound = Math.max(...matches.map(m => m.round));
      const totalRounds = maxRound;

      try {
        toast.loading('Initialisation des timers de round...', { id: 'init-timers' });
        const initializedTimers = await initializeRoundTimers(id, totalRounds);

        if (initializedTimers && initializedTimers.length > 0) {
          toast.success(`${initializedTimers.length} timers de round initialisés avec succès!`, { id: 'init-timers' });
          await loadRoundTimers();
        } else {
          toast.error('Échec de l\'initialisation des timers', { id: 'init-timers' });
        }
      } catch (error) {
        console.error('Error auto-initializing timers:', error);
        toast.error('Erreur lors de l\'initialisation des timers', { id: 'init-timers' });
      }
    };

    initializeTimersIfMissing();
  }, [id, bracketAlreadyGenerated, isDraftMode, matches, roundTimers.length]);

  const handleSwapPlayers = (matchId: string) => {
    setEditableMatches(prevMatches =>
      prevMatches.map(match =>
        match.id === matchId
          ? { ...match, player1_id: match.player2_id, player2_id: match.player1_id }
          : match
      )
    );
  };

  const handleManualInitializeTimers = async () => {
    if (!id || !matches.length) {
      toast.error('Impossible d\'initialiser les timers: bracket non généré');
      return;
    }

    const maxRound = Math.max(...matches.map(m => m.round));
    const totalRounds = maxRound;

    try {
      toast.loading('Initialisation des timers...', { id: 'manual-init' });

      const initializedTimers = await initializeRoundTimers(id, totalRounds);

      if (initializedTimers && initializedTimers.length > 0) {
        toast.success(`${initializedTimers.length} timers créés avec succès!`, { id: 'manual-init' });
        await loadRoundTimers();
      } else {
        toast.error('Échec de l\'initialisation', { id: 'manual-init' });
      }
    } catch (error) {
      console.error('Error manually initializing timers:', error);
      toast.error('Erreur lors de l\'initialisation', { id: 'manual-init' });
    }
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

  const handleDragStart = (event: any) => {
    setActiveDragId(event.active.id);
    setActiveDragData(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveDragId(null);
    setActiveDragData(null);

    if (!over || active.id === over.id) {
      return;
    }

    const sourceData = active.data.current;
    const targetData = over.data.current;

    if (!sourceData || !targetData) {
      return;
    }

    // Check if source is a backup player
    if (sourceData.type === 'backup') {
      const backupParticipantId = sourceData.participantId as string;
      const targetMatchId = targetData.matchId as string;
      const targetPosition = targetData.position as 'player1' | 'player2';
      const targetMatch = editableMatches.find(m => m.id === targetMatchId);

      if (!targetMatch) {
        return;
      }

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

    if (!sourceParticipantId) {
      return;
    }

    const sourceMatch = editableMatches.find(m => m.id === sourceMatchId);
    const targetMatch = editableMatches.find(m => m.id === targetMatchId);

    if (!sourceMatch || !targetMatch) {
      return;
    }

    if (sourceMatch.round !== targetMatch.round) {
      const totalRounds = Math.max(...editableMatches.map(m => m.round));
      const byeDetection = detectByes(editableMatches, totalRounds);

      if (byeDetection.hasByes) {
        const validation = validateCrossRoundMove(sourceMatch, targetMatch, sourceParticipantId);

        if (!validation.isValid) {
          toast.error(validation.errorMessage || 'Cannot perform cross-round move');
          return;
        }

        const getParticipantName = (participantId: string): string => {
          if (tournament?.type === 'team') {
            const team = teams.find(t => t.captain_id === participantId);
            return team?.name || 'Unknown Team';
          } else {
            const player = players.find(p => p.id === participantId);
            return player?.username || 'Unknown Player';
          }
        };

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

  const handlePushBracketLive = async () => {
    if (!id) return;

    try {
      setIsUpdatingBracketStatus(true);

      // Save the current editable matches and set bracket status to live
      const savedMatches = await saveBracket(editableMatches, validUserIds, id, 'live');

      if (savedMatches) {
        setMatches(savedMatches);
        setIsDraftMode(false);

        // Update tournament state
        if (tournament) {
          setTournament({ ...tournament, bracket_status: 'live' });
        }

        // Start Round 1 with timer and notifications
        const started = await startRoundOne(
          id,
          tournament?.title || 'Tournament',
          savedMatches,
          tournament?.game_id
        );

        if (started) {
          await loadRoundTimers();
          toast.success('Bracket is now live! Round 1 has started and players have been notified.');
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
      
      // Update tournament state
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

  const handlePlayerInfoClick = (participantId: string) => {
    const isTeam = tournament?.type === 'team';
    let participant: Player | Team | null = null;

    if (isTeam) {
      participant = teams.find(t => t.captain_id === participantId) || null;
    } else {
      participant = players.find(p => p.id === participantId) || null;
    }

    if (participant) {
      setSelectedParticipant(participant);
      setShowPlayerInfoModal(true);
    }
  };

  const handleResendNotifications = async () => {
    if (!id || !activeTimer || !tournament) return;

    try {
      const { sendMatchNotificationsForRound } = await import('../components/bracket/BracketService');

      await sendMatchNotificationsForRound(
        id,
        tournament.title,
        activeTimer.round_number,
        matches,
        tournament.game_id
      );

      toast.success(`Notifications renvoyées pour le round ${activeTimer.round_number}`);
    } catch (error) {
      console.error('Error resending notifications:', error);
      toast.error('Échec de l\'envoi des notifications');
    }
  };

  const handleWinnerSelected = async (matchId: string, winnerId: string) => {
    // Only allow winner selection when bracket is live
    if (isDraftMode) {
      toast.error('Cannot select winners while bracket is in draft mode');
      return;
    }

    try {
      const updatedMatches = await updateMatchWinner(matches, matchId, winnerId);
      setMatches(updatedMatches);

      // Check if this completed the tournament
      checkForTournamentWinner(updatedMatches);

      // Check for round progression
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
          // Show modal for incomplete matches
          setIncompleteMatchesData({
            matches: progressionResult.incompleteMatches,
            currentRound: activeTimer.round_number,
            nextRound: progressionResult.nextRound
          });
          setShowIncompleteMatchesModal(true);
        }

        // Reload timers to reflect any changes
        await loadRoundTimers();

        // Check if the current round is now complete after this match update
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
      toast.loading('D\u00e9tection et r\u00e9paration des BYE orphelins...', { id: 'repair-byes' });

      const result = await detectAndRepairOrphanedByes(id);

      if (result.success) {
        if (result.byesFound === 0) {
          toast.success(result.message, { id: 'repair-byes' });
        } else {
          toast.success(
            `R\u00e9par\u00e9 avec succ\u00e8s: ${result.byesFixed} BYE(s) corrig\u00e9(s), ${result.consolidatedMatches} match(s) consolid\u00e9(s)`,
            { id: 'repair-byes' }
          );
          // Reload the bracket to show the fixes
          await fetchTournamentAndPlayers();
        }
      } else {
        toast.error(`Erreur: ${result.message}`, { id: 'repair-byes' });
      }
    } catch (error) {
      console.error('Error repairing orphaned BYEs:', error);
      toast.error('Erreur lors de la r\u00e9paration des BYE', { id: 'repair-byes' });
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
        // Delete all timers and notifications for this tournament
        await deleteTimersForTournament(id);
        await deleteNotificationsForTournament(id);

        setShowResetModal(false);
        setMatches([]);
        setEditableMatches([]);
        setBracketAlreadyGenerated(false);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/brackets')}
            leftIcon={<ArrowLeft size={16} />}
          >
            Back to Brackets
          </Button>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="p-4 bg-error-900/20 rounded-full mb-4">
                <Trophy className="h-16 w-16 text-error-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Error Loading Bracket</h3>
              <p className="text-gray-400 mb-6 text-center max-w-md">{error}</p>
              <div className="flex items-center space-x-3">
                <Button onClick={() => {
                  setError(null);
                  setHasRedirected(false);
                  fetchTournamentAndPlayers();
                }}>
                  Try Again
                </Button>
                <Button variant="secondary" onClick={() => navigate('/brackets')}>
                  Back to Brackets
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if no approved players/teams
  if ((tournament?.type === 'solo' && players.length === 0) ||
      (tournament?.type === 'team' && teams.length === 0)) {
    return (
      <EmptyBracketMessage
        tournament={tournament}
        sqlQuery={sqlQuery}
        registrationsCount={registrationsCount}
      />
    );
  }

  const participants = tournament?.type === 'team' ? teams : players;
  const totalParticipants = participants.length;
  const rounds = calculateRoundsNeeded(totalParticipants);
  const byes = calculateTotalByesInBracket(totalParticipants);

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

  // Special rendering for Battle Royale tournaments
  if (isBattleRoyaleTournament()) {
    return (
      <div className="flex flex-col h-full relative">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/brackets')}
            leftIcon={<ArrowLeft size={16} />}
          >
            Back to Brackets
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-400 bg-dark-200 px-2 py-1 rounded">
              Battle Royale Tournament
            </div>
          </div>
        </div>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-center">
              {tournament?.title} - Battle Royale
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allMatchesCompleted ? (
              // Show final leaderboard when all matches are completed
              <div className="space-y-6">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-yellow-500/20 rounded-full">
                      <Trophy className="h-12 w-12 text-yellow-400" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Tournament Complete!</h2>
                  <p className="text-gray-400 mb-6">All 3 matches have been completed. Here are the final results:</p>
                </div>
                
                <BattleRoyaleLeaderboard 
                  tournamentId={id!}
                  showTitle={false}
                />
                
                <div className="flex justify-center space-x-4 mt-6">
                  <Button
                    onClick={() => navigate(`/tournaments/${id}/br-entry`)}
                    leftIcon={<Target size={16} />}
                    variant="secondary"
                  >
                    Edit Match Results
                  </Button>
                  <Button
                    onClick={() => navigate(`/tournaments/${id}`)}
                    leftIcon={<Award size={16} />}
                  >
                    View Tournament Details
                  </Button>
                </div>
              </div>
            ) : (
              // Show centered button to enter match results
              <div className="flex flex-col items-center justify-center py-16">
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-orange-500/20 rounded-full">
                      <Target className="h-16 w-16 text-orange-400" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Battle Royale Tournament</h2>
                  <p className="text-gray-400 mb-6 max-w-md">
                    Enter match results for each of the 3 Battle Royale matches. 
                    Players will be ranked based on their cumulative points across all matches.
                  </p>
                </div>
                
                <Button
                  onClick={() => navigate(`/tournaments/${id}/br-entry`)}
                  leftIcon={<Target size={20} />}
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold px-8 py-4 text-lg"
                >
                  Enter Match Results
                </Button>
                
                <div className="mt-8 bg-dark-200 p-4 rounded-lg max-w-md">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">How it works:</h3>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Enter placement and eliminations for each player</li>
                    <li>• Points are calculated automatically based on game rules</li>
                    <li>• Final ranking is based on total points across 3 matches</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Fireworks Canvas */}
      <FireworksCanvas
        show={showCelebration}
        fireworks={fireworks}
        setFireworks={setFireworks}
      />

      {/* Winner Celebration Overlay */}
      <WinnerCelebration
        show={showCelebration}
        winner={tournamentWinner}
        tournament={tournament}
        onContinue={() => setShowCelebration(false)}
        onBackToRegistrations={() => navigate('/brackets')}
      />

      {/* BYE Management Panel */}
      <ByeManagementPanel
        byesByRound={byesByRound}
        show={showByePanel}
        onClose={() => setShowByePanel(false)}
        totalRounds={calculateRoundsNeeded(totalParticipants)}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={() => navigate('/brackets')}
            leftIcon={<ArrowLeft size={16} />}
          >
            Back to Brackets
          </Button>
          <div className="h-6 w-px bg-gray-700" />
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-dark-200 hover:bg-dark-100 transition-colors"
          >
            <Menu className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-300">Controls</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-xs text-gray-400 bg-dark-200 px-2 py-1 rounded">
            Single Elimination
          </div>
          {tournament && (
            <div className={`text-xs px-2 py-1 rounded ${
              tournament.bracket_status === 'live'
                ? 'bg-success-900/20 text-success-400 border border-success-500/30'
                : 'bg-warning-900/20 text-warning-400 border border-warning-500/30'
            }`}>
              {tournament.bracket_status === 'live' ? 'Live' : 'Draft'}
            </div>
          )}
        </div>
      </div>

      {/* Debug Info Panel - Hidden by default */}
      {showDebugInfo && (
        tournament?.type === 'team' ? (
          <TeamDebugPanel
            show={showDebugInfo}
            tournament={tournament}
            allTeams={allTeams}
            approvedTeams={approvedTeams}
            sqlQuery={sqlQuery}
          />
        ) : (
          <TeamDebugPanel
            show={showDebugInfo}
            tournament={tournament}
            players={players}
            sqlQuery={sqlQuery}
            registrationsCount={registrationsCount}
            validRegistrationsCount={validRegistrationsCount}
          />
        )
      )}

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-3">
              <Trophy className="h-5 w-5 text-primary-400" />
              <span>{tournament?.title}</span>
            </div>
            <div className="text-sm text-gray-400">
              {participants.length} {tournament?.type === 'team' ? 'Teams' : 'Players'} | {byes} BYEs | {rounds} Rounds
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Draft Mode Helper Message */}
            <div className="px-6 pt-4">
            {isDraftMode && (
              <div className="mb-4 bg-gradient-to-r from-primary-900/30 to-primary-800/20 border-2 border-primary-500/50 rounded-lg p-4 flex items-start space-x-3 shadow-lg">
                <div className="flex-shrink-0 mt-0.5 animate-pulse">
                  <div className="bg-primary-500 rounded-full p-2">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-primary-200 font-bold mb-2 text-base">Draft Mode - Reorganize Matches</p>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-start space-x-2">
                      <span className="text-primary-400 font-bold">•</span>
                      <p><span className="font-semibold text-white">Drag & Drop:</span> Drag participants between matches in any editable round</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-primary-400 font-bold">•</span>
                      <p><span className="font-semibold text-white">Swap Button:</span> Quick exchange within the same match</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-primary-400 font-bold">•</span>
                      <p><span className="font-semibold text-white">Multi-Round Edit:</span> Edit any round as long as the next round hasn't started</p>
                    </div>
                    {byesByRound.size > 0 && Array.from(byesByRound.keys()).some(round => round > 1) && (
                      <div className="flex items-start space-x-2">
                        <span className="text-orange-400 font-bold">⚡</span>
                        <p className="text-orange-300"><span className="font-semibold">Exception BYE:</span> Avec des BYE détectés, vous pouvez éditer même si les rounds suivants ont commencé</p>
                      </div>
                    )}
                    <div className="flex items-start space-x-2">
                      <span className="text-success-400 font-bold">•</span>
                      <p className="text-success-300"><span className="font-semibold">Green highlight</span> shows valid drop zones</p>
                    </div>
                    {byesByRound.size > 0 && Array.from(byesByRound.keys()).some(round => round > 1) && (
                      <div className="flex items-start space-x-2 mt-3 pt-3 border-t border-primary-500/30">
                        <span className="text-orange-400 font-bold">⚠</span>
                        <p className="text-orange-300"><span className="font-semibold">BYE Detected:</span> {Array.from(byesByRound.values()).reduce((acc, m) => acc + m.length, 0)} BYE(s) detected. Click the BYE button above for details.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Active Round Timer Display (Live Mode Only) */}
            {!isDraftMode && activeTimer && (
              <div className="mb-4 flex-shrink-0">
                <RoundTimerDisplay
                  timer={activeTimer}
                  totalRounds={rounds}
                  onTimerExpired={handleTimerExpired}
                  isCurrentRoundComplete={isCurrentRoundComplete}
                  nextRoundTimer={nextRoundTimer}
                  onManualProgression={handleManualProgression}
                  onForceProgression={handleShowForceProgression}
                />
              </div>
            )}
            </div>

            {/* Scrollable Bracket Container */}
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 overflow-x-auto overflow-y-auto bracket-scroll-container">
                {/* Condensed Seeding Information */}
                <div className="px-6">
                  <BracketHeader
                    tournament={tournament}
                    participants={participants}
                    byes={byes}
                    rounds={rounds}
                  />
                </div>

                {/* Bracket Display */}
                <BracketDisplay
                  matches={isDraftMode ? editableMatches : matches}
                  tournament={tournament}
                  players={players}
                  teams={teams}
                  onWinnerSelected={handleWinnerSelected}
                  isEditable={isDraftMode}
                  onMatchUpdate={handleSwapPlayers}
                  canModifyResult={!isDraftMode}
                  onResetMatch={handleResetMatch}
                  onChangeWinner={handleChangeWinner}
                  searchQuery={searchQuery}
                  highlightedMatchIds={highlightedMatchIds}
                  onPlayerInfoClick={handlePlayerInfoClick}
                />
              </div>

              {/* Backup Panel */}
              <BackupPanel
                backupPlayers={backupPlayers}
                backupTeams={backupTeams}
                isTeamTournament={tournament?.type === 'team'}
                show={isDraftMode}
              />
            </div>
          </div>

          {/* Drag Overlay for visual feedback */}
          <DragOverlay>
            {activeDragId && activeDragData ? (
              <div className="bg-primary-600 border-2 border-primary-400 rounded-lg p-3 shadow-2xl opacity-90">
                <div className="text-white font-medium text-sm">
                  {activeDragData.type === 'backup' ? '🛡️ ' : ''}
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
        </CardContent>
      </Card>

      {/* Cross-Round Move Confirmation Modal */}
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

      {/* Reset Bracket Confirmation Modal */}
      <ResetBracketModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetBracket}
        isLoading={isResettingBracket}
        tournamentTitle={tournament?.title}
        hasMatches={matches.length > 0}
      />

      {/* Incomplete Matches Modal */}
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

      {/* Force Round Progression Modal */}
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

      {/* Timer Expiration Modal */}
      {timerExpirationData && (
        <RoundTimerExpirationModal
          isOpen={showTimerExpirationModal}
          onClose={handleTimerExpirationClose}
          currentRound={timerExpirationData.currentRound}
          nextRound={timerExpirationData.nextRound}
          totalRounds={calculateRoundsNeeded(
            tournament?.type === 'team' ? teams.length : players.length
          )}
          nextRoundDuration={timerExpirationData.nextRoundDuration}
          onConfirmProgression={handleTimerExpirationConfirm}
          incompleteMatches={timerExpirationData.incompleteMatches}
          tournament={tournament}
          players={players}
          teams={teams}
        />
      )}

      {/* Player Info Modal */}
      <PlayerInfoModal
        isOpen={showPlayerInfoModal}
        onClose={() => setShowPlayerInfoModal(false)}
        participant={selectedParticipant}
        isTeam={tournament?.type === 'team'}
      />

      {/* Control Sidebar */}
      <BracketControlSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isDraftMode={isDraftMode}
        tournament={tournament}
        byesByRound={byesByRound}
        roundTimers={roundTimers}
        canResetBrackets={canResetBrackets()}
        isUpdatingBracketStatus={isUpdatingBracketStatus}
        isRepairingByes={isRepairingByes}
        bracketAlreadyGenerated={bracketAlreadyGenerated}
        activeTimer={activeTimer}
        onPushBracketLive={handlePushBracketLive}
        onEditBracket={handleEditBracket}
        onResetDraft={handleResetDraft}
        onShowByePanel={() => setShowByePanel(true)}
        onRepairByes={handleRepairOrphanedByes}
        onResetBracket={() => setShowResetModal(true)}
        onLoadTimers={loadRoundTimers}
        onInitializeTimers={handleManualInitializeTimers}
        onResendNotifications={handleResendNotifications}
        matches={matches}
      />

      {/* Floating Action Button */}
      <BracketFAB
        tournamentId={id || ''}
        isDraftMode={isDraftMode}
        isUpdatingBracketStatus={isUpdatingBracketStatus}
        onPushBracketLive={handlePushBracketLive}
        onToggleSidebar={() => setIsSidebarOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchResultsCount={searchQuery ? highlightedMatchIds.size : undefined}
      />
    </div>
  );
};

export default BracketPage;