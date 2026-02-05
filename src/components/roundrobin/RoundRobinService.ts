import { supabase } from '../../lib/supabase';
import { insertMatches, saveBracket } from '../bracket/BracketService';
import { Player, Team, Tournament } from './types';
import toast from 'react-hot-toast';
import { updatePlayerRankings, updateTeamRankings } from '../../utils/eloUtils';

export const fetchSoloPlayers = async (
  tournamentData: Tournament, 
  userIdSet: Set<string>,
  tournamentId: string,
  setSqlQuery: (query: string) => void,
  setRegistrationsCount: (count: number) => void
): Promise<Player[]> => {
  console.log(`🔍 DEBUG: Fetching solo players for tournament ${tournamentId}`);
  
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
  tr.tournament_id = '${tournamentId}'
  AND tr.status = 'approved'
  `;
  
  setSqlQuery(sqlQuery);

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
    .eq('tournament_id', tournamentId)
    .eq('status', 'approved');

  if (registrationsError) throw registrationsError;

  setRegistrationsCount(registrations?.length || 0);
  console.log(`🔍 DEBUG: Found ${registrations?.length || 0} approved registrations`);

  const validRegistrations = registrations?.filter(reg => {
    const isValid = reg.user && reg.user.id && userIdSet.has(reg.user.id);
    if (!isValid) {
      console.log(`🔍 DEBUG: Invalid registration found:`, reg);
    }
    return isValid;
  }) || [];

  console.log(`🔍 DEBUG: ${validRegistrations.length} registrations have valid user references`);

  let formattedPlayers = validRegistrations.map((reg: any) => ({
    id: reg.user.id,
    name: reg.user.username || reg.user.email.split('@')[0],
    elo: 1000,
    wins: 0,
    losses: 0
  }));

  // Fetch player rankings if tournament has a game
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

  // Sort by ELO and assign seeds
  formattedPlayers.sort((a, b) => (b.elo || 1000) - (a.elo || 1000));
  formattedPlayers = formattedPlayers.map((player, index) => ({
    ...player,
    seed: index + 1
  }));

  console.log(`🔍 DEBUG: Final formatted players: ${formattedPlayers.length}`);
  console.log(`🔍 DEBUG: Player IDs:`, formattedPlayers.map(p => `${p.name} (${p.id})`));
  
  return formattedPlayers;
};

export const fetchTeams = async (
  tournamentData: Tournament, 
  userIdSet: Set<string>,
  tournamentId: string
): Promise<Team[]> => {
  console.log(`🔍 DEBUG: Fetching teams for tournament ${tournamentId}`);
  
  // SQL query for debugging
  const sqlQuery = `
WITH approved_registrations AS (
  SELECT 
    tr.user_id,
    tr.team_id,
    tr.status
  FROM 
    tournament_registrations tr
  WHERE 
    tr.tournament_id = '${tournamentId}'
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
  t.tournament_id = '${tournamentId}'
ORDER BY 
  tmc.member_count DESC, t.name ASC
  `;
  
  console.log(`🔍 DEBUG: SQL Query for teams:`, sqlQuery);
  
  // Fetch teams for this tournament
  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      captain_id
    `)
    .eq('tournament_id', tournamentId);
    
  if (teamsError) {
    console.error('Error fetching teams:', teamsError);
    throw teamsError;
  }

  console.log(`🔍 DEBUG: Found ${teamsData.length} teams`);

  // Fetch team members to get member counts and identify captains
  const { data: teamMembers, error: teamMembersError } = await supabase
    .from('team_members')
    .select(`
      team_id,
      user_id,
      role
    `)
    .in('team_id', teamsData.map(t => t.id));
    
  if (teamMembersError) {
    console.error('Error fetching team members:', teamMembersError);
    throw teamMembersError;
  }

  console.log(`🔍 DEBUG: Found ${teamMembers.length} team members`);

  // Fetch approved registrations for captains
  const { data: approvedRegistrations, error: registrationsError } = await supabase
    .from('tournament_registrations')
    .select(`
      user_id,
      team_id,
      status
    `)
    .eq('tournament_id', tournamentId)
    .eq('status', 'approved');
    
  if (registrationsError) {
    console.error('Error fetching approved registrations:', registrationsError);
    throw registrationsError;
  }

  console.log(`🔍 DEBUG: Found ${approvedRegistrations.length} approved registrations`);
  
  // Create a set of approved user IDs
  const approvedUserIds = new Set(approvedRegistrations.map(reg => reg.user_id));
  
  // Process teams and check approvals
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
    
    console.log(`🔍 DEBUG: Team ${team.name} - Captain: ${captainId}, Members: ${memberCount}/${requiredMembers}, Captain approved: ${captainApproved}, Enough members: ${hasEnoughMembers}, Final approved: ${isApproved}`);
    
    return {
      id: team.id,
      name: team.name,
      captain_id: captainId,
      seed: index + 1,
      memberCount,
      captainApproved,
      hasEnoughMembers,
      requiredMembers,
      isApproved,
      wins: 0,
      losses: 0
    };
  });
  
  // Filter to only approved teams
  const approvedTeams = processedTeams.filter(team => team.isApproved);
  
  // Sort approved teams by member count (highest first) and assign seeds
  approvedTeams.sort((a, b) => b.memberCount - a.memberCount);
  const seededTeams = approvedTeams.map((team, index) => ({
    ...team,
    seed: index + 1
  }));
  
  console.log(`🔍 DEBUG: Final approved teams: ${seededTeams.length}`);
  console.log(`🔍 DEBUG: Team captain IDs:`, seededTeams.map(t => `${t.name} (captain: ${t.captain_id})`));
  
  return seededTeams;
};

export const generateRoundRobinMatches = async (
  participants: Player[] | Team[],
  tournamentData: Tournament,
  userIdSet: Set<string>,
  tournamentId: string,
  bracketGenerated: boolean
): Promise<any[]> => {
  try {
    console.log(`🔍 DEBUG: generateRoundRobinMatches called - bracketGenerated state is: ${bracketGenerated}`);
    console.log(`🔍 DEBUG: userIdSet in generateRoundRobinMatches:`, Array.from(userIdSet));

    // Prevent duplicate generation
    if (bracketGenerated) {
      console.log('🔍 DEBUG: Bracket already generated, skipping...');
      return [];
    }

    const participantCount = participants.length;
    if (participantCount < 2) {
      console.log('🔍 DEBUG: Not enough participants for Round Robin');
      toast.error('Need at least 2 participants for Round Robin');
      return [];
    }

    // Extract group size from tournament format
    const formatMatch = tournamentData.tournament_format?.match(/(\d+) players per group/);
    const groupSize = formatMatch ? parseInt(formatMatch[1]) : 4;

    // Use max_nb_players if provided, otherwise use participantCount
    const maxPlayers = tournamentData.max_nb_players || participantCount;
    console.log(`🔍 DEBUG: Max players configured: ${maxPlayers}, Actual participants: ${participantCount}`);

    // Calculate number of groups based on max_nb_players
    const numberOfGroups = Math.ceil(maxPlayers / groupSize);
    console.log(`🔍 DEBUG: Creating ${numberOfGroups} groups with ${groupSize} players each (total capacity: ${numberOfGroups * groupSize})`);

    // Fill groups with actual participants, leaving empty slots as needed
    const groupedParticipants: (Player | Team | null)[][] = [];
    for (let i = 0; i < numberOfGroups; i++) {
      groupedParticipants[i] = [];
    }

    // Distribute participants across groups
    for (let i = 0; i < maxPlayers; i++) {
      const groupIndex = Math.floor(i / groupSize);
      if (i < participantCount) {
        groupedParticipants[groupIndex].push(participants[i]);
      } else {
        // Empty slot (will result in BYE)
        groupedParticipants[groupIndex].push(null);
      }
    }

    const matches: any[] = [];

    // Generate matches for each group
    for (let groupIndex = 0; groupIndex < numberOfGroups; groupIndex++) {
      const groupParticipants = groupedParticipants[groupIndex];
      const groupId = `group-${groupIndex + 1}`;
      let matchPosition = 1;

      console.log(`🔍 DEBUG: Processing Group ${groupIndex + 1} with ${groupParticipants.filter(p => p !== null).length} real participants out of ${groupParticipants.length} slots`);

      // Generate all possible matches within the group (Round Robin)
      // Skip matches where either participant is null (empty slot/BYE)
      for (let i = 0; i < groupParticipants.length; i++) {
        for (let j = i + 1; j < groupParticipants.length; j++) {
          const participant1 = groupParticipants[i];
          const participant2 = groupParticipants[j];

          // Skip if either participant is null (BYE slot)
          if (!participant1 || !participant2) {
            console.log(`🔍 DEBUG: Skipping match due to empty slot (BYE)`);
            continue;
          }

          // For teams, use captain_id; for solo, use player id
          const player1Id = tournamentData.type === 'team'
            ? (participant1 as Team).captain_id
            : participant1.id;
          const player2Id = tournamentData.type === 'team'
            ? (participant2 as Team).captain_id
            : participant2.id;

          console.log(`🔍 DEBUG: Attempting to create match between ${participant1.name} (${player1Id}) and ${participant2.name} (${player2Id})`);

          // Validate that both IDs exist in valid users
          if (player1Id && player2Id &&
              userIdSet.has(player1Id) && userIdSet.has(player2Id)) {

            matches.push({
              tournament_id: tournamentId,
              round: groupIndex + 1,
              position: matchPosition++,
              player1_id: player1Id,
              player2_id: player2Id,
              winner_id: null,
              is_draw: false,
              group_id: groupId
            });

            console.log(`🔍 DEBUG: Successfully created match between ${participant1.name} and ${participant2.name}`);
          } else {
            console.warn(`🔍 DEBUG: Skipping match due to invalid player IDs: ${player1Id} (valid: ${player1Id && userIdSet.has(player1Id)}), ${player2Id} (valid: ${player2Id && userIdSet.has(player2Id)})`);
          }
        }
      }
    }

    console.log(`🔍 DEBUG: Generated ${matches.length} matches for ${numberOfGroups} groups (${maxPlayers} total capacity, ${participantCount} real participants)`);

    if (matches.length > 0) {
      // Check one more time if matches already exist before inserting
      const { data: existingCheck, error: existingCheckError } = await supabase
        .from('tournament_matches')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1);

      if (existingCheckError) throw existingCheckError;

      console.log(`🔍 DEBUG: Final existing check before insert - Found ${existingCheck?.length || 0} existing matches`);

      if (existingCheck && existingCheck.length > 0) {
        console.log('🔍 DEBUG: Matches already exist, skipping insertion');
        return [];
      }

      // Insert matches using the new insertMatches function (preserves existing matches)
      console.log(`🔍 DEBUG: Inserting ${matches.length} matches into database`);
      const insertedMatches = await insertMatches(matches, userIdSet);

      if (insertedMatches) {
        console.log(`🔍 DEBUG: Successfully inserted ${insertedMatches.length} matches`);
        return insertedMatches;
      } else {
        console.error('🔍 DEBUG: Failed to insert matches');
        toast.error('Failed to generate Round Robin bracket');
        return [];
      }
    } else {
      console.log('🔍 DEBUG: No matches to insert');
      return [];
    }
  } catch (error) {
    console.error('🔍 DEBUG: Error generating Round Robin matches:', error);
    toast.error('Failed to generate Round Robin bracket');
    return [];
  }
};

export const calculateParticipantStandings = (
  participants: Player[] | Team[], 
  matches: any[], 
  tournamentData: Tournament
): (Player | Team)[] => {
  // Create a map to track wins/losses for each participant
  const standingsMap = new Map();
  
  // Initialize all participants with 0 wins/losses
  participants.forEach(participant => {
    const participantId = tournamentData.type === 'team' 
      ? (participant as Team).captain_id 
      : participant.id;
    
    if (participantId) {
      standingsMap.set(participantId, {
        ...participant,
        wins: 0,
        losses: 0,
        groupId: null,
        groupPosition: null,
        isQualified: false
      });
    }
  });

  // Calculate wins/losses from matches
  matches.forEach(match => {
    if (match.winner_id) {
      // Winner gets a win
      if (standingsMap.has(match.winner_id)) {
        const winner = standingsMap.get(match.winner_id);
        winner.wins = (winner.wins || 0) + 1;
        winner.groupId = match.group_id;
        standingsMap.set(match.winner_id, winner);
      }

      // Loser gets a loss
      const loserId = match.player1_id === match.winner_id ? match.player2_id : match.player1_id;
      if (loserId && standingsMap.has(loserId)) {
        const loser = standingsMap.get(loserId);
        loser.losses = (loser.losses || 0) + 1;
        loser.groupId = match.group_id;
        standingsMap.set(loserId, loser);
      }
    }
  });

  // Group participants by their group and calculate positions
  const groupedParticipants = new Map();
  standingsMap.forEach((participant, participantId) => {
    if (participant.groupId) {
      if (!groupedParticipants.has(participant.groupId)) {
        groupedParticipants.set(participant.groupId, []);
      }
      groupedParticipants.get(participant.groupId).push(participant);
    }
  });

  // Sort participants within each group and assign positions
  groupedParticipants.forEach((groupParticipants, groupId) => {
    // Sort by wins (descending), then by losses (ascending)
    groupParticipants.sort((a: any, b: any) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });

    // Assign group positions and qualification status
    groupParticipants.forEach((participant: any, index: number) => {
      participant.groupPosition = index + 1;
      // Top 50% of each group qualify (minimum 1 per group)
      const qualifyingSpots = Math.max(1, Math.floor(groupParticipants.length / 2));
      participant.isQualified = index < qualifyingSpots;
      
      // Update in the main standings map
      const participantId = tournamentData.type === 'team' 
        ? participant.captain_id 
        : participant.id;
      standingsMap.set(participantId, participant);
    });
  });

  return Array.from(standingsMap.values());
};