import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import { ArrowLeft, AlertTriangle, Bug, Target, Info, Users } from 'lucide-react';
import toast from 'react-hot-toast';

// Import Swiss components
import SwissOverview from '../components/swiss/SwissOverview';
import SwissStandings from '../components/swiss/SwissStandings';
import SwissMatches from '../components/swiss/SwissMatches';
import SwissDebugPanel from '../components/swiss/SwissDebugPanel';
import KnockoutTransitionCard from '../components/swiss/KnockoutTransitionCard';
import EnhancedByePanel from '../components/bracket/EnhancedByePanel';
import PlayerPoolSidebar from '../components/bracket/PlayerPoolSidebar';
import ModificationHistoryPanel from '../components/bracket/ModificationHistoryPanel';
import BracketSearchBar from '../components/bracket/BracketSearchBar';
import { MatchNotificationPanel } from '../components/notifications/MatchNotificationPanel';

// Import BYE detection and cross-round services
import { detectByes, shouldAutoEnableEditing } from '../services/byeDetectionService';
import { movePlayerToMatch, swapPlayersInMatch, removePlayerFromMatch, canPlayerBeMoved } from '../services/crossRoundService';

// Import Swiss services
import {
  fetchSoloPlayers,
  fetchTeams,
  generateFirstRound,
  generateNextRound,
  updateParticipantStandings,
  handleWinnerSelected as handleWinnerUpdate,
  getMaxAllowedParticipants,
  getMaxRoundsForParticipants,
  generateKnockoutStage,
  getKnockoutParticipantCount,
  canEditMatches,
  updateMatchParticipants,
  canModifyMatchResult,
  resetMatchWinner,
  changeMatchWinner
} from '../components/swiss/SwissService';

interface Player {
  id: string;
  name: string;
  elo?: number;
  seed?: number;
  wins?: number;
  losses?: number;
  points?: number;
  opponents?: string[];
  isQualified?: boolean;
  isEliminated?: boolean;
}

interface Team {
  id: string;
  name: string;
  captain_id?: string;
  seed?: number;
  wins?: number;
  losses?: number;
  points?: number;
  opponents?: string[];
  isQualified?: boolean;
  isEliminated?: boolean;
}

interface Match {
  id: string;
  round: number;
  position: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  tournament_id: string;
  is_draw: boolean;
}

interface Tournament {
  id: string;
  title: string;
  type: 'solo' | 'team';
  tournament_format?: string;
  max_players_per_team?: number;
  game_id?: string;
  max_nb_players?: number;
}

const SwissBracketPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const effectRan = useRef(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [waitingListParticipants, setWaitingListParticipants] = useState<(Player | Team)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [validUserIds, setValidUserIds] = useState<Set<string>>(new Set());
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [currentRound, setCurrentRound] = useState(1);
  const [isGeneratingRound, setIsGeneratingRound] = useState(false);
  const [isGeneratingKnockout, setIsGeneratingKnockout] = useState(false);
  const [maxRounds, setMaxRounds] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [showByePanel, setShowByePanel] = useState(false);
  const [showPlayerPool, setShowPlayerPool] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedMatchForFill, setSelectedMatchForFill] = useState<string | null>(null);
  const [isEditingEnabled, setIsEditingEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchBarFixed, setIsSearchBarFixed] = useState(false);
  const searchBarObserverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (effectRan.current || hasRedirected) return;
    effectRan.current = true;

    fetchTournamentAndPlayers();
  }, [id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSearchBarFixed(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: '-1px 0px 0px 0px'
      }
    );

    const currentRef = searchBarObserverRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  const isBattleRoyaleTournament = () => {
    return tournament?.tournament_format?.toLowerCase().includes('battle royale');
  };

  const fetchTournamentAndPlayers = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);

      // First, fetch all valid user IDs - this is critical for validation
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id');

      if (usersError) {
        console.error('Error fetching user IDs:', usersError);
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

      console.log('Swiss Page - Tournament loaded:', tournamentData.title, 'Format:', tournamentData.tournament_format);
      setTournament(tournamentData);

      // Check if this is a Swiss tournament that has transitioned to knockout
      if (tournamentData.tournament_format?.toLowerCase().includes('battle royale')) {
        console.log('Redirecting to Battle Royale bracket page');
        setHasRedirected(true);
        navigate(`/tournaments/${id}/bracket`);
        return;
      } else if (tournamentData.tournament_format &&
          tournamentData.tournament_format.includes('Swiss') &&
          tournamentData.tournament_format.includes('Single Elimination Knockout')) {
        console.log('Redirecting to knockout bracket page');
        setHasRedirected(true);
        navigate(`/tournaments/${id}/bracket`);
        return;
      }

      // Check if this is a Swiss tournament
      if (!tournamentData.tournament_format || !tournamentData.tournament_format.includes('Swiss')) {
        console.log('Not a Swiss tournament, redirecting to bracket page');
        setHasRedirected(true);
        navigate(`/tournaments/${id}/bracket`);
        return;
      }

      console.log('Loading Swiss bracket');

      // Fetch existing matches
      const { data: existingMatches, error: existingMatchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', id)
        .order('round', { ascending: true })
        .order('position', { ascending: true });
        
      if (existingMatchesError) {
        console.error('Error fetching existing matches:', existingMatchesError);
        throw existingMatchesError;
      }
      
      // Fetch all participants - this will also validate and update the userIdSet
      let allParticipants: Player[] | Team[] = [];
      
      if (tournamentData.type === 'solo') {
        allParticipants = await fetchSoloPlayers(tournamentData, userIdSet, id, setSqlQuery);
      } else {
        allParticipants = await fetchTeams(tournamentData, userIdSet, id);
      }

      // Apply Swiss tournament limits and create waiting list
      // Use max_nb_players if available, otherwise calculate from participant count
      const maxAllowed = tournamentData.max_nb_players 
        ? Math.min(tournamentData.max_nb_players, getMaxAllowedParticipants(allParticipants.length))
        : getMaxAllowedParticipants(allParticipants.length);
        
      const activeParticipants = allParticipants.slice(0, maxAllowed);
      const waitingList = allParticipants.slice(maxAllowed);

      // Set active participants and waiting list
      if (tournamentData.type === 'solo') {
        setPlayers(activeParticipants as Player[]);
      } else {
        setTeams(activeParticipants as Team[]);
      }
      setWaitingListParticipants(waitingList);

      // Set max rounds to 5
      setMaxRounds(5);

      if (existingMatches && existingMatches.length > 0) {
        setMatches(existingMatches);
        
        // Calculate current round
        const maxRound = Math.max(...existingMatches.map(m => m.round));
        setCurrentRound(maxRound);
        
        // Update participant standings
        const updatedParticipants = updateParticipantStandings(activeParticipants, existingMatches, tournamentData.type);
        if (tournamentData.type === 'solo') {
          setPlayers(updatedParticipants as Player[]);
        } else {
          setTeams(updatedParticipants as Team[]);
        }
      } else if (activeParticipants.length >= 2) {
        // Generate first round if no matches exist
        setIsGeneratingRound(true);
        const generatedMatches = await generateFirstRound(
          activeParticipants, 
          tournamentData, 
          id,
          userIdSet
        );
        setIsGeneratingRound(false);
        
        if (generatedMatches && generatedMatches.length > 0) {
          setMatches(generatedMatches);
          setCurrentRound(1);
          toast.success(`First round generated with ${generatedMatches.length} matches!`);
        }
      }

      // Show waiting list notification if applicable
      if (waitingList.length > 0) {
        toast.success(`Tournament bracket created with ${activeParticipants.length} participants. ${waitingList.length} participants are on the waiting list.`);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchTournamentAndPlayers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tournament data';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const handleWinnerSelected = async (matchId: string, winnerId: string) => {
    const participants = tournament?.type === 'team' ? teams : players;
    const updatedMatches = await handleWinnerUpdate(
      matchId, 
      winnerId, 
      matches, 
      tournament!, 
      setMatches,
      tournament?.type === 'team' ? setTeams : setPlayers,
      participants
    );
  };

  const getParticipantName = (participantId: string | null) => {
    if (!participantId) return 'TBD';
    
    if (tournament?.type === 'team') {
      const team = teams.find(t => t.captain_id === participantId);
      return team ? team.name : 'Unknown Team';
    } else {
      const player = players.find(p => p.id === participantId);
      return player ? player.name : 'Unknown Player';
    }
  };

  const canGenerateNextRound = () => {
    // Check if all matches in the current round are completed
    const currentRoundMatches = matches.filter(m => m.round === currentRound);
    const allMatchesCompleted = currentRoundMatches.length > 0 && 
                               currentRoundMatches.every(m => m.winner_id !== null);
    
    // Check if we've reached the maximum number of rounds
    const reachedMaxRounds = currentRound >= maxRounds;
    
    // Check if 50% of participants are qualified
    const participants = tournament?.type === 'team' ? teams : players;
    const qualifiedCount = participants.filter(p => p.wins >= 3 || p.isQualified).length;
    const fiftyPercentReached = qualifiedCount >= Math.ceil(participants.length / 2);
    
    // Check if there are any active participants (not qualified or eliminated)
    const activeParticipants = participants.filter(p => p.wins < 3 && p.losses < 3 && !p.isQualified && !p.isEliminated);
    const hasActiveParticipants = activeParticipants.length >= 2;
    
    return allMatchesCompleted && !reachedMaxRounds && !fiftyPercentReached && hasActiveParticipants;
  };

  const canTransitionToKnockout = () => {
    // Check if all matches in the current round are completed
    const currentRoundMatches = matches.filter(m => m.round === currentRound);
    const allMatchesCompleted = currentRoundMatches.length > 0 && 
                               currentRoundMatches.every(m => m.winner_id !== null);
    
    // Check if we've reached the maximum number of rounds OR 50% of participants are qualified
    const participants = tournament?.type === 'team' ? teams : players;
    const qualifiedCount = participants.filter(p => p.wins >= 3 || p.isQualified).length;
    const fiftyPercentReached = qualifiedCount >= Math.ceil(participants.length / 2);
    
    return allMatchesCompleted && (currentRound >= maxRounds || fiftyPercentReached);
  };

  const handleGenerateNextRound = async () => {
    if (!tournament || !id) {
      toast.error('Tournament data not available');
      return;
    }
    
    setIsGeneratingRound(true);
    const participants = tournament.type === 'team' ? teams : players;
    
    try {
      const newMatches = await generateNextRound(
        participants, 
        matches, 
        tournament, 
        id,
        currentRound,
        validUserIds
      );
      
      if (newMatches && newMatches.length > 0) {
        setMatches([...matches, ...newMatches]);
        setCurrentRound(currentRound + 1);
        toast.success(`Round ${currentRound + 1} generated successfully!`);
      } else {
        toast.error('Failed to generate next round');
      }
    } catch (error) {
      console.error('Error generating next round:', error);
      toast.error('Failed to generate next round');
    } finally {
      setIsGeneratingRound(false);
    }
  };

  const handleGenerateKnockout = async () => {
    if (!tournament || !id) {
      toast.error('Tournament data not available');
      return;
    }

    setIsGeneratingKnockout(true);
    const participants = tournament.type === 'team' ? teams : players;

    try {
      // Get qualified participants (those with 3+ wins or top performers if 50% threshold reached)
      const qualifiedParticipants = participants.filter(p => p.wins >= 3 || p.isQualified);

      // If we don't have enough qualified participants, take the top performers
      let finalQualifiedParticipants = qualifiedParticipants;

      if (qualifiedParticipants.length < 2) {
        // Sort all participants by wins, then by points, then by ELO
        const sortedParticipants = [...participants].sort((a, b) => {
          if (a.wins !== b.wins) return b.wins - a.wins;
          if (a.points !== b.points) return b.points - a.points;
          return (b.elo || 1000) - (a.elo || 1000);
        });

        // Take top half, minimum 2, maximum 16
        const knockoutSize = getKnockoutParticipantCount(participants.length);
        finalQualifiedParticipants = sortedParticipants.slice(0, knockoutSize);
      }

      const success = await generateKnockoutStage(
        finalQualifiedParticipants,
        tournament,
        id,
        currentRound,
        validUserIds
      );

      if (success) {
        toast.success('Knockout stage generated successfully!');
        // Navigate to the single elimination bracket page
        navigate(`/tournaments/${id}/bracket`);
      } else {
        toast.error('Failed to generate knockout stage');
      }
    } catch (error) {
      console.error('Error generating knockout stage:', error);
      toast.error('Failed to generate knockout stage');
    } finally {
      setIsGeneratingKnockout(false);
    }
  };

  const handleSaveMatchEdits = async (updatedMatches: any[]): Promise<boolean> => {
    if (!id) return false;

    try {
      for (const match of updatedMatches) {
        const success = await updateMatchParticipants(
          match.id,
          match.player1_id,
          match.player2_id,
          validUserIds
        );

        if (!success) {
          toast.error('Failed to update some matches');
          return false;
        }
      }

      const { data: refreshedMatches, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', id)
        .order('round', { ascending: true })
        .order('position', { ascending: true });

      if (error) {
        console.error('Error refreshing matches:', error);
        return false;
      }

      setMatches(refreshedMatches);
      toast.success('Matches updated successfully!');
      return true;
    } catch (error) {
      console.error('Error saving match edits:', error);
      return false;
    }
  };

  const handleResetMatch = async (matchId: string): Promise<boolean> => {
    if (!tournament) return false;

    const participants = tournament.type === 'team' ? teams : players;
    const updateParticipantsFn = tournament.type === 'team' ? setTeams : setPlayers;

    return await resetMatchWinner(
      matchId,
      matches,
      participants,
      tournament,
      setMatches,
      updateParticipantsFn
    );
  };

  const handleChangeWinner = async (matchId: string, newWinnerId: string): Promise<boolean> => {
    if (!tournament) return false;

    const participants = tournament.type === 'team' ? teams : players;
    const updateParticipantsFn = tournament.type === 'team' ? setTeams : setPlayers;

    return await changeMatchWinner(
      matchId,
      newWinnerId,
      matches,
      participants,
      tournament,
      setMatches,
      updateParticipantsFn,
      validUserIds
    );
  };

  const handlePlayerSelect = async (playerId: string, participantName: string) => {
    if (!selectedMatchForFill || !id) {
      toast.error('No match selected');
      return;
    }

    const targetMatch = matches.find(m => m.id === selectedMatchForFill);
    if (!targetMatch) {
      toast.error('Match not found');
      return;
    }

    const hasPlayer1 = targetMatch.player1_id !== null;
    const hasPlayer2 = targetMatch.player2_id !== null;

    let targetSlot: 'player1' | 'player2';
    if (!hasPlayer1) {
      targetSlot = 'player1';
    } else if (!hasPlayer2) {
      targetSlot = 'player2';
    } else {
      toast.error('Match is full. Remove a player first.');
      return;
    }

    const success = await movePlayerToMatch(
      {
        playerId,
        toMatchId: selectedMatchForFill,
        targetSlot,
        reason: `BYE filled with ${participantName}`
      },
      validUserIds,
      id
    );

    if (success) {
      setSelectedMatchForFill(null);
      await fetchTournamentAndPlayers();
    }
  };

  const handleFillBye = (matchId: string) => {
    setSelectedMatchForFill(matchId);
    setShowPlayerPool(true);
  };

  const handleEnableEditing = () => {
    setIsEditingEnabled(true);
    setShowByePanel(false);
    toast.success('Mode édition activé. Vous pouvez maintenant réorganiser les joueurs.');
  };

  const handleViewHistory = () => {
    setShowByePanel(false);
    setShowHistory(true);
  };

  const byeDetection = detectByes(matches, maxRounds);
  const shouldAutoEdit = shouldAutoEnableEditing(matches);

  useEffect(() => {
    if (shouldAutoEdit && !isEditingEnabled) {
      setShowByePanel(true);
    }
  }, [shouldAutoEdit, isEditingEnabled]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !tournament) {
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
                <AlertTriangle className="h-12 w-12 text-error-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {error ? 'Error Loading Swiss Bracket' : 'Tournament not found'}
              </h3>
              <p className="text-gray-400 mb-6 text-center max-w-md">
                {error || 'The tournament you are looking for could not be found.'}
              </p>
              <div className="flex items-center space-x-3">
                <Button onClick={() => {
                  setError(null);
                  setHasRedirected(false);
                  effectRan.current = false;
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

  const participants = tournament?.type === 'team' ? teams : players;
  const currentRoundMatches = matches.filter(m => m.round === currentRound);
  const sortedParticipants = [...participants].sort((a, b) => {
    // First sort by wins
    if (a.wins !== b.wins) return b.wins - a.wins;
    
    // Then by points
    const pointsA = a.points || 0;
    const pointsB = b.points || 0;
    if (pointsA !== pointsB) return pointsB - pointsA;
    
    // Finally by ELO
    return (b.elo || 1000) - (a.elo || 1000);
  });

  if (participants.length === 0) {
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

        <div className="text-center py-8">
          <AlertTriangle className="h-16 w-16 text-warning-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No Approved {tournament?.type === 'team' ? 'Teams' : 'Players'}
          </h3>
          <p className="text-gray-400 mb-6">
            This tournament doesn't have any approved {tournament?.type === 'team' ? 'team' : 'player'} registrations yet.
          </p>
          <Button onClick={() => navigate('/brackets')}>
            Back to Brackets
          </Button>
        </div>
      </div>
    );
  }

  const totalParticipants = participants.length + waitingListParticipants.length;
  const maxAllowed = tournament.max_nb_players 
    ? Math.min(tournament.max_nb_players, getMaxAllowedParticipants(totalParticipants))
    : getMaxAllowedParticipants(totalParticipants);
  
  // Get qualified participants for knockout stage
  const qualifiedParticipants = sortedParticipants.filter(p => p.wins >= 3 || p.isQualified);
  
  // If not enough qualified, take top performers up to half of initial participants
  let finalQualifiedParticipants = qualifiedParticipants;
  if (qualifiedParticipants.length < 2) {
    const knockoutSize = getKnockoutParticipantCount(participants.length);
    finalQualifiedParticipants = sortedParticipants.slice(0, knockoutSize);
  }

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

        <div className="flex items-center space-x-2">
          {/* Notification Panel - Demo using admin user */}
          {tournament && (
            <MatchNotificationPanel
              userId="admin-demo-user-id"
              tournamentId={id}
            />
          )}
          <div className="text-xs text-gray-400 bg-dark-200 px-2 py-1 rounded">
            Swiss Tournament - Round {currentRound}/{maxRounds}
          </div>
          {byeDetection.hasByes && (
            <Button
              variant="ghost"
              onClick={() => setShowByePanel(!showByePanel)}
              leftIcon={<Info size={16} />}
              className={byeDetection.problematicByes.length > 0 ? 'text-orange-400' : 'text-blue-400'}
            >
              {byeDetection.totalByes} BYE{byeDetection.totalByes > 1 ? 's' : ''}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => setShowPlayerPool(!showPlayerPool)}
            leftIcon={<Users size={16} />}
            className="text-primary-400"
          >
            Joueurs
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            leftIcon={<Bug size={16} />}
            className="text-yellow-500"
          >
            {showDebugInfo ? 'Hide Debug' : 'Show Debug'}
          </Button>
        </div>
      </div>

      <SwissOverview
        tournament={tournament}
        participants={participants}
        waitingListParticipants={waitingListParticipants}
        currentRound={currentRound}
        currentRoundMatches={currentRoundMatches}
        maxAllowed={maxAllowed}
        maxRounds={maxRounds}
      />

      {/* Search Bar Observer Anchor */}
      <div ref={searchBarObserverRef} className="h-0" />

      {/* Search Bar - Fixed when scrolled past */}
      <div className={`mb-6 ${isSearchBarFixed ? 'fixed top-0 left-0 right-0 z-50' : ''}`}>
        <BracketSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          resultsCount={searchQuery ? currentRoundMatches.filter((match, index) => {
            const matchNumber = index + 1;
            const player1Name = getParticipantName(match.player1_id).toLowerCase();
            const player2Name = getParticipantName(match.player2_id).toLowerCase();
            const query = searchQuery.toLowerCase();
            return (
              matchNumber.toString().includes(query) ||
              player1Name.includes(query) ||
              player2Name.includes(query)
            );
          }).length : undefined}
          isFixed={isSearchBarFixed}
        />
      </div>

      {/* Placeholder to prevent layout shift when fixed */}
      {isSearchBarFixed && <div className="h-[88px] mb-6" />}

      {/* Show knockout transition card when Swiss stage is complete */}
      {canTransitionToKnockout() && (
        <KnockoutTransitionCard
          tournament={tournament}
          qualifiedParticipants={finalQualifiedParticipants}
          isGeneratingKnockout={isGeneratingKnockout}
          onGenerateKnockout={handleGenerateKnockout}
        />
      )}

      <SwissStandings
        sortedParticipants={sortedParticipants}
        tournament={tournament}
        canGenerateNextRound={canGenerateNextRound()}
        isGeneratingRound={isGeneratingRound}
        currentRound={currentRound}
        onGenerateNextRound={handleGenerateNextRound}
        maxRounds={maxRounds}
        isGeneratingKnockout={isGeneratingKnockout}
        onGenerateKnockout={handleGenerateKnockout}
        canTransitionToKnockout={canTransitionToKnockout()}
      />

      <SwissMatches
        currentRoundMatches={currentRoundMatches}
        getParticipantName={getParticipantName}
        handleWinnerSelected={handleWinnerSelected}
        currentRound={currentRound}
        canEditMatches={canEditMatches(matches, currentRound)}
        onSaveEdits={handleSaveMatchEdits}
        onResetMatch={handleResetMatch}
        onChangeWinner={handleChangeWinner}
        canModifyResult={(matchId) => canModifyMatchResult(matchId, matches)}
        searchQuery={searchQuery}
      />

      {showDebugInfo && (
        <SwissDebugPanel
          show={showDebugInfo}
          tournament={tournament}
          participants={participants}
          waitingListParticipants={waitingListParticipants}
          currentRound={currentRound}
          currentRoundMatches={currentRoundMatches}
          maxAllowed={maxAllowed}
          totalParticipants={totalParticipants}
          validUserIds={validUserIds}
          isGeneratingRound={isGeneratingRound}
          sqlQuery={sqlQuery}
          maxRounds={maxRounds}
        />
      )}

      <EnhancedByePanel
        byeDetection={byeDetection}
        show={showByePanel}
        onClose={() => setShowByePanel(false)}
        totalRounds={maxRounds}
        onEnableEditing={handleEnableEditing}
        onFillBye={handleFillBye}
        onViewHistory={handleViewHistory}
      />

      <PlayerPoolSidebar
        show={showPlayerPool}
        onClose={() => {
          setShowPlayerPool(false);
          setSelectedMatchForFill(null);
        }}
        participants={participants}
        waitingList={waitingListParticipants}
        matches={matches}
        tournamentType={tournament.type}
        onPlayerSelect={handlePlayerSelect}
        selectedMatchId={selectedMatchForFill}
      />

      <ModificationHistoryPanel
        show={showHistory}
        onClose={() => setShowHistory(false)}
        tournamentId={id!}
      />
    </div>
  );
};

export default SwissBracketPage;