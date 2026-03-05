import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeft, AlertTriangle, Menu } from 'lucide-react';
import toast from 'react-hot-toast';
import { saveBracket } from '../components/bracket/BracketService';
import { useTournamentStore } from '../store/tournamentStore';
import { Player, Team, Tournament, Match } from '../components/roundrobin/types';
import TournamentOverview from '../components/roundrobin/TournamentOverview';
import KnockoutStageCard from '../components/roundrobin/KnockoutStageCard';
import GroupStandings from '../components/roundrobin/GroupStandings';
import WaitingList from '../components/roundrobin/WaitingList';
import RoundRobinMatches from '../components/roundrobin/RoundRobinMatches';
import RoundRobinDebugPanel from '../components/roundrobin/RoundRobinDebugPanel';
import RRControlSidebar from '../components/roundrobin/RRControlSidebar';
import RRBracketFAB from '../components/roundrobin/RRBracketFAB';
import {
  fetchSoloPlayers,
  fetchTeams,
  generateRoundRobinMatches,
  calculateParticipantStandings
} from '../components/roundrobin/RoundRobinService';
import { updatePlayerRankings, updateTeamRankings } from '../utils/eloUtils';

const RRBracketPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const effectRan = useRef(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [unassignedParticipants, setUnassignedParticipants] = useState<(Player | Team)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [validUserIds, setValidUserIds] = useState<Set<string>>(new Set());
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [registrationsCount, setRegistrationsCount] = useState(0);
  const [bracketGenerated, setBracketGenerated] = useState(false);
  const [isGeneratingKnockout, setIsGeneratingKnockout] = useState(false);
  const [editableMatches, setEditableMatches] = useState<Match[]>([]);
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [isUpdatingBracketStatus, setIsUpdatingBracketStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (effectRan.current || hasRedirected) return;
    effectRan.current = true;

    fetchTournamentAndPlayers();
  }, [id]);

  const isBattleRoyaleTournament = () => {
    return tournament?.tournament_format?.toLowerCase().includes('battle royale');
  };

  const insertMatches = async (generatedMatches: any[], userIdSet: Set<string>, tournamentId: string, status: string) => {
    // Implementation for inserting matches
    return await saveBracket(generatedMatches, userIdSet, tournamentId, status);
  };

  const fetchTournamentAndPlayers = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);

      // First, fetch all valid user IDs
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

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

      console.log('RR Page - Tournament loaded:', tournamentData.title, 'Format:', tournamentData.tournament_format);
      setTournament(tournamentData);

      // Check if this is a Round Robin tournament that has NOT transitioned to knockout
      if (tournamentData.tournament_format?.toLowerCase().includes('battle royale')) {
        console.log('Redirecting to Battle Royale bracket page');
        setHasRedirected(true);
        navigate(`/tournaments/${id}/bracket`);
        return;
      } else if (tournamentData.tournament_format &&
          tournamentData.tournament_format.includes('Round Robin') &&
          !tournamentData.tournament_format.includes('Single Elimination Knockout')) {
        console.log('Loading Round Robin bracket');
      } else if (tournamentData.tournament_format &&
                 tournamentData.tournament_format.includes('Single Elimination Knockout')) {
        console.log('Redirecting to knockout bracket page');
        setHasRedirected(true);
        navigate(`/tournaments/${id}/bracket`);
        return;
      } else {
        console.log('Not a Round Robin tournament, redirecting to bracket page');
        setHasRedirected(true);
        navigate(`/tournaments/${id}/bracket`);
        return;
      }

      // Check if there are existing matches for this tournament
      const { data: existingMatches, error: existingMatchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', id);

      if (existingMatchesError) throw existingMatchesError;

      // Fetch participants based on tournament type
      let participants: Player[] | Team[] = [];

      if (tournamentData.type === 'solo') {
        participants = await fetchSoloPlayers(tournamentData, userIdSet, id, setSqlQuery, setRegistrationsCount);
        setPlayers(participants as Player[]);
      } else {
        participants = await fetchTeams(tournamentData, userIdSet, id);
        setTeams(participants as Team[]);
      }

      // If we have existing matches, use them
      if (existingMatches && existingMatches.length > 0) {
        console.log(`Found ${existingMatches.length} existing matches for this tournament`);
        setMatches(existingMatches);
        setEditableMatches(existingMatches);
        setBracketGenerated(true);
        setIsDraftMode(tournamentData.bracket_status === 'draft');

        // Calculate participant standings from existing matches
        if (participants.length > 0) {
          const participantsWithStandings = calculateParticipantStandings(participants, existingMatches, tournamentData);

          if (tournamentData.type === 'solo') {
            setPlayers(participantsWithStandings as Player[]);
          } else {
            setTeams(participantsWithStandings as Team[]);
          }

          calculateUnassignedParticipants(participants, tournamentData);
        }
      } else {
        // If no existing matches and we have participants, generate new ones
        if (participants.length > 0) {
          console.log(`Generating professional seeded bracket for ${participants.length} approved participants...`);
          const generatedMatches = await generateRoundRobinMatches(participants, tournamentData, userIdSet, id!, bracketGenerated);

          if (generatedMatches.length > 0) {
            // Save matches in draft mode initially
            const savedMatches = await insertMatches(generatedMatches, userIdSet, id!, 'draft');

            if (savedMatches) {
              setMatches(savedMatches);
              setEditableMatches(savedMatches);
              setBracketGenerated(true);
              setIsDraftMode(true);

              calculateUnassignedParticipants(participants, tournamentData);

              const unassigned = participants.slice(Math.floor(participants.length / getGroupSize(tournamentData)) * getGroupSize(tournamentData));
              if (unassigned.length > 0) {
                toast.success(`Round Robin bracket generated! ${unassigned.length} participants are on the waiting list.`);
              } else {
                toast.success('Round Robin bracket generated successfully!');
              }
            }
          }
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

  const getGroupSize = (tournamentData: Tournament): number => {
    const formatMatch = tournamentData.tournament_format?.match(/(\d+) players per group/);
    return formatMatch ? parseInt(formatMatch[1]) : 4;
  };

  const calculateUnassignedParticipants = (participants: Player[] | Team[], tournamentData: Tournament) => {
    const groupSize = getGroupSize(tournamentData);
    const numberOfCompleteGroups = Math.floor(participants.length / groupSize);
    const participantsInCompleteGroups = numberOfCompleteGroups * groupSize;
    const unassigned = participants.slice(participantsInCompleteGroups);
    setUnassignedParticipants(unassigned);
  };

  const handleSwapPlayers = (matchId: string) => {
    setEditableMatches(prevMatches =>
      prevMatches.map(match =>
        match.id === matchId
          ? { ...match, player1_id: match.player2_id, player2_id: match.player1_id }
          : match
      )
    );
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
          setTournament({ ...tournament, bracket_status: 'live', status: 'active' });
        }

        toast.success('Bracket is now live! Players can start competing.');
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

  const handleWinnerSelected = async (matchId: string, winnerId: string) => {
    // Only allow winner selection when bracket is live
    if (isDraftMode) {
      toast.error('Cannot select winners while bracket is in draft mode');
      return;
    }

    try {
      // Find the match
      const match = matches.find(m => m.id === matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Get the loser ID
      const loserId = match.player1_id === winnerId ? match.player2_id : match.player1_id;
      if (!loserId) {
        throw new Error('Loser ID not found');
      }

      // Update match with winner
      const { error } = await supabase
        .from('tournament_matches')
        .update({ winner_id: winnerId })
        .eq('id', matchId);

      if (error) throw error;

      // Update local state
      const updatedMatches = matches.map(match =>
        match.id === matchId ? { ...match, winner_id: winnerId } : match
      );

      setMatches(updatedMatches);
      setEditableMatches(updatedMatches);

      // Update ELO ratings if tournament has a game
      if (tournament?.game_id) {
        if (tournament.type === 'solo') {
          // For solo tournaments, update player rankings
          await updatePlayerRankings(
            winnerId,
            loserId,
            tournament.game_id,
            false, // Not a draw
            tournament.id
          );
        } else if (tournament.type === 'team') {
          // For team tournaments, we need to get the team IDs
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('id, captain_id')
            .in('captain_id', [winnerId, loserId])
            .eq('tournament_id', tournament.id);

          if (teamError) {
            console.error('Error fetching team data:', teamError);
          } else if (teamData && teamData.length === 2) {
            const winnerTeam = teamData.find(t => t.captain_id === winnerId);
            const loserTeam = teamData.find(t => t.captain_id === loserId);

            if (winnerTeam && loserTeam) {
              await updateTeamRankings(
                winnerTeam.id,
                loserTeam.id,
                tournament.game_id,
                false, // Not a draw
                tournament.id
              );
            }
          }
        }
      }

      // Recalculate standings
      const participants = tournament?.type === 'team' ? teams : players;
      const participantsWithStandings = calculateParticipantStandings(participants, updatedMatches, tournament!);

      if (tournament?.type === 'solo') {
        setPlayers(participantsWithStandings as Player[]);
      } else {
        setTeams(participantsWithStandings as Team[]);
      }

      toast.success('Match result updated!');
    } catch (error) {
      console.error('Error updating match:', error);
      toast.error('Failed to update match result');
    }
  };

  const isGroupStageComplete = () => {
    if (matches.length === 0) return false;
    return matches.every(match => match.winner_id !== null);
  };

  const getQualifiedParticipants = (): (Player | Team)[] => {
    const participants = tournament?.type === 'team' ? teams : players;
    return participants.filter(p => p.isQualified);
  };

  const generateKnockoutStage = async () => {
    try {
      setIsGeneratingKnockout(true);

      const qualifiedParticipants = getQualifiedParticipants();

      if (qualifiedParticipants.length < 2) {
        toast.error('Need at least 2 qualified participants for knockout stage');
        return;
      }

      // Sort qualified participants by group position for proper seeding
      const sortedQualified = qualifiedParticipants.sort((a, b) => {
        if (a.groupId !== b.groupId) {
          return (a.groupId || '').localeCompare(b.groupId || '');
        }
        return (a.groupPosition || 0) - (b.groupPosition || 0);
      });

      // Calculate bracket structure
      const participantCount = sortedQualified.length;
      const rounds = Math.ceil(Math.log2(participantCount));
      const bracketSize = Math.pow(2, rounds);

      // Get the maximum round number from existing group stage matches
      const maxGroupRound = Math.max(...matches.map(m => m.round));

      // Create seeded bracket positions
      const bracketPositions: (Player | Team | null)[] = new Array(bracketSize).fill(null);

      // Place qualified participants in bracket positions
      for (let i = 0; i < sortedQualified.length; i++) {
        bracketPositions[i] = sortedQualified[i];
      }

      // Generate knockout matches starting from the round after group stage
      const knockoutMatches: any[] = [];
      const firstRoundMatches = bracketSize / 2;
      const knockoutStartRound = maxGroupRound + 1;

      // Generate first round matches
      for (let i = 0; i < firstRoundMatches; i++) {
        const participant1 = bracketPositions[i * 2];
        const participant2 = bracketPositions[i * 2 + 1];

        let player1Id = null;
        let player2Id = null;

        if (participant1) {
          const id = tournament!.type === 'team' ? (participant1 as Team).captain_id : participant1.id;
          if (id && validUserIds.has(id)) {
            player1Id = id;
          }
        }

        if (participant2) {
          const id = tournament!.type === 'team' ? (participant2 as Team).captain_id : participant2.id;
          if (id && validUserIds.has(id)) {
            player2Id = id;
          }
        }

        knockoutMatches.push({
          tournament_id: id,
          round: knockoutStartRound,
          position: i + 1,
          player1_id: player1Id,
          player2_id: player2Id,
          winner_id: null,
          is_draw: false,
          group_id: null
        });
      }

      // Generate subsequent rounds
      let currentRound = knockoutStartRound + 1;
      let matchesInRound = firstRoundMatches / 2;

      while (matchesInRound >= 1) {
        for (let i = 0; i < matchesInRound; i++) {
          knockoutMatches.push({
            tournament_id: id,
            round: currentRound,
            position: i + 1,
            player1_id: null,
            player2_id: null,
            winner_id: null,
            is_draw: false,
            group_id: null
          });
        }

        currentRound++;
        matchesInRound /= 2;
      }

      // Process first round BYEs
      knockoutMatches.forEach(match => {
        if (match.round === knockoutStartRound) {
          if (match.player1_id && !match.player2_id) {
            match.winner_id = match.player1_id;
          } else if (!match.player1_id && match.player2_id) {
            match.winner_id = match.player2_id;
          }
        }
      });

      // Advance BYE winners to next round
      knockoutMatches.forEach(match => {
        if (match.round === knockoutStartRound && match.winner_id) {
          const nextRound = knockoutStartRound + 1;
          const nextPosition = Math.ceil(match.position / 2);

          const nextMatch = knockoutMatches.find(m =>
            m.round === nextRound && m.position === nextPosition
          );

          if (nextMatch) {
            const isPlayer1Slot = match.position % 2 !== 0;
            if (isPlayer1Slot) {
              nextMatch.player1_id = match.winner_id;
            } else {
              nextMatch.player2_id = match.winner_id;
            }
          }
        }
      });

      const insertedMatches = await saveBracket(knockoutMatches, validUserIds, id!, 'draft');

      if (!insertedMatches) {
        throw new Error('Failed to insert knockout matches');
      }

      // Update tournament format to indicate knockout stage
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({
          tournament_format: `${tournament!.tournament_format} → Single Elimination Knockout`
        })
        .eq('id', id!);

      if (updateError) throw updateError;

      toast.success(`Knockout stage generated! ${qualifiedParticipants.length} qualified participants will compete in single elimination.`);

      // Navigate to single elimination bracket page
      navigate(`/tournaments/${id}/bracket`);

    } catch (error) {
      console.error('Error generating knockout stage:', error);
      toast.error('Failed to generate knockout stage');
    } finally {
      setIsGeneratingKnockout(false);
    }
  };

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
                {error ? 'Error Loading Round Robin Bracket' : 'Tournament not found'}
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
  const qualifiedParticipants = getQualifiedParticipants();
  const groupStageComplete = isGroupStageComplete();

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

        <Card>
          <CardHeader>
            <CardTitle>Round Robin Bracket - {tournament?.title}</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatMatch = tournament.tournament_format?.match(/(\d+) players per group/);
  const groupSize = formatMatch ? parseInt(formatMatch[1]) : 4;
  const numberOfCompleteGroups = Math.floor(participants.length / groupSize);
  const completedMatches = matches.filter(m => m.winner_id !== null).length;
  const totalMatches = matches.length;

  return (
    <div className="space-y-6">
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
            Round Robin
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
          {groupStageComplete && (
            <div className="text-xs text-success-400 bg-success-900/20 px-2 py-1 rounded border border-success-500/30">
              Group Stage Complete
            </div>
          )}
        </div>
      </div>

      <TournamentOverview
        tournament={tournament}
        participants={participants}
        qualifiedParticipants={qualifiedParticipants}
        unassignedParticipants={unassignedParticipants}
        groupSize={groupSize}
        numberOfCompleteGroups={numberOfCompleteGroups}
        completedMatches={completedMatches}
        totalMatches={totalMatches}
      />

      {groupStageComplete && qualifiedParticipants.length >= 2 && (
        <KnockoutStageCard
          tournament={tournament}
          qualifiedParticipants={qualifiedParticipants}
          isGeneratingKnockout={isGeneratingKnockout}
          onGenerateKnockout={generateKnockoutStage}
        />
      )}

      <GroupStandings
        tournament={tournament}
        participants={participants}
      />

      <WaitingList
        tournament={tournament}
        unassignedParticipants={unassignedParticipants}
        groupSize={groupSize}
      />

      {showDebugInfo && (
        <RoundRobinDebugPanel
          show={showDebugInfo}
          tournament={tournament}
          participants={participants}
          qualifiedParticipants={qualifiedParticipants}
          unassignedParticipants={unassignedParticipants}
          groupSize={groupSize}
          numberOfCompleteGroups={numberOfCompleteGroups}
          matches={matches}
          completedMatches={completedMatches}
          bracketGenerated={bracketGenerated}
          groupStageComplete={groupStageComplete}
          validUserIds={validUserIds}
          sqlQuery={sqlQuery}
        />
      )}

      <RoundRobinMatches
        tournament={tournament}
        matches={isDraftMode ? editableMatches : matches}
        players={players}
        teams={teams}
        onWinnerSelected={handleWinnerSelected}
        isEditable={isDraftMode}
        onMatchUpdate={handleSwapPlayers}
        searchQuery={searchQuery}
      />

      {/* Control Sidebar */}
      <RRControlSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isDraftMode={isDraftMode}
        tournament={tournament}
        isUpdatingBracketStatus={isUpdatingBracketStatus}
        groupStageComplete={groupStageComplete}
        qualifiedCount={qualifiedParticipants.length}
        onPushBracketLive={handlePushBracketLive}
        onEditBracket={handleEditBracket}
        onResetDraft={handleResetDraft}
        onGenerateKnockout={generateKnockoutStage}
        isGeneratingKnockout={isGeneratingKnockout}
      />

      {/* Floating Action Button */}
      <RRBracketFAB
        isDraftMode={isDraftMode}
        isUpdatingBracketStatus={isUpdatingBracketStatus}
        onPushBracketLive={handlePushBracketLive}
        onToggleSidebar={() => setIsSidebarOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchResultsCount={searchQuery ? (isDraftMode ? editableMatches : matches).filter((match) => {
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
          const player1Name = getParticipantName(match.player1_id).toLowerCase();
          const player2Name = getParticipantName(match.player2_id).toLowerCase();
          const query = searchQuery.toLowerCase();
          return player1Name.includes(query) || player2Name.includes(query);
        }).length : undefined}
      />
    </div>
  );
};

export default RRBracketPage;
