import { supabase } from '../../lib/supabase';
import { updatePlayerRankings, updateTeamRankings } from '../../utils/eloUtils';
import toast from 'react-hot-toast';
import { saveBracket } from '../bracket/BracketService';

export const fetchSoloPlayers = async (
  tournamentData: any,
  userIdSet: Set<string>,
  tournamentId: string,
  setSqlQuery?: (query: string) => void
): Promise<any[]> => {
  console.log(`🔍 SWISS DEBUG: Starting fetchSoloPlayers`);
  console.log(`🔍 SWISS DEBUG: Initial validUserIds size: ${userIdSet.size}`);
  console.log(`🔍 SWISS DEBUG: First 5 valid user IDs:`, Array.from(userIdSet).slice(0, 5));

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

  if (setSqlQuery) {
    setSqlQuery(sqlQuery);
  }

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

  if (registrationsError) {
    console.error('🔍 SWISS DEBUG: Error fetching registrations:', registrationsError);
    throw registrationsError;
  }

  console.log(`🔍 SWISS DEBUG: Found ${registrations?.length || 0} approved registrations`);

  // Double-check that all registration user IDs are in the validUserIds set
  // If not, add them to ensure we don't miss any valid users
  if (registrations && registrations.length > 0) {
    let addedCount = 0;
    registrations.forEach(reg => {
      if (reg.user && reg.user.id && !userIdSet.has(reg.user.id)) {
        userIdSet.add(reg.user.id);
        addedCount++;
        console.log(`🔍 SWISS DEBUG: Added missing user ID to validUserIds: ${reg.user.id}`);
      }
    });

    if (addedCount > 0) {
      console.log(`🔍 SWISS DEBUG: Added ${addedCount} missing user IDs to validUserIds set`);
      console.log(`🔍 SWISS DEBUG: New validUserIds size: ${userIdSet.size}`);
    }
  }

  const validRegistrations = registrations?.filter(reg => {
    const isValid = reg.user && reg.user.id && userIdSet.has(reg.user.id);
    if (!isValid) {
      console.log(`🔍 SWISS DEBUG: Invalid registration filtered out:`, reg);
      if (reg.user && reg.user.id) {
        console.log(`🔍 SWISS DEBUG: User ID ${reg.user.id} exists in registration but not in validUserIds`);
      } else {
        console.log(`🔍 SWISS DEBUG: Registration has no valid user reference`);
      }
    }
    return isValid;
  }) || [];

  console.log(`🔍 SWISS DEBUG: Valid registrations after filtering: ${validRegistrations.length}`);

  // Log all valid user IDs from registrations for debugging
  console.log(`🔍 SWISS DEBUG: Valid registration user IDs:`, validRegistrations.map(reg => reg.user.id));

  let formattedPlayers = validRegistrations.map((reg: any) => ({
    id: reg.user.id,
    name: reg.user.username || reg.user.email.split('@')[0],
    elo: 1000,
    wins: 0,
    losses: 0,
    points: 0,
    opponents: [],
    isQualified: false,
    isEliminated: false
  }));

  console.log(`🔍 SWISS DEBUG: Formatted players before ELO fetch:`, formattedPlayers.map(p => ({
    id: p.id,
    name: p.name,
    valid: userIdSet.has(p.id)
  })));

  // Fetch player rankings if tournament has a game
  if (tournamentData.game_id && formattedPlayers.length > 0) {
    console.log(`🔍 SWISS DEBUG: Fetching ELO ratings for game ${tournamentData.game_id}`);
    const approvedPlayerIds = formattedPlayers.map(p => p.id);

    const { data: rankingsData, error: rankingsError } = await supabase
      .from('player_rankings')
      .select('user_id, elo_rating, game_id')
      .eq('game_id', tournamentData.game_id)
      .in('user_id', approvedPlayerIds);

    if (!rankingsError && rankingsData) {
      console.log(`🔍 SWISS DEBUG: Found ${rankingsData.length} ELO rankings`);
      formattedPlayers = formattedPlayers.map(player => {
        const ranking = rankingsData.find(r => r.user_id === player.id);
        return {
          ...player,
          elo: ranking ? ranking.elo_rating : 1000
        };
      });
    } else if (rankingsError) {
      console.error('🔍 SWISS DEBUG: Error fetching rankings:', rankingsError);
    }
  }

  // Sort by ELO and assign seeds
  formattedPlayers.sort((a, b) => (b.elo || 1000) - (a.elo || 1000));
  formattedPlayers = formattedPlayers.map((player, index) => ({
    ...player,
    seed: index + 1
  }));

  console.log(`🔍 SWISS DEBUG: Final formatted players: ${formattedPlayers.length}`);
  console.log(`🔍 SWISS DEBUG: Final player validation check:`, formattedPlayers.map(p => ({
    id: p.id,
    name: p.name,
    valid: userIdSet.has(p.id)
  })));

  return formattedPlayers;
};

export const fetchTeams = async (
  tournamentData: any,
  userIdSet: Set<string>,
  tournamentId: string
): Promise<any[]> => {
  console.log(`🔍 SWISS DEBUG: Starting fetchTeams`);
  console.log(`🔍 SWISS DEBUG: Initial validUserIds size: ${userIdSet.size}`);

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

  console.log(`🔍 SWISS DEBUG: SQL Query for teams:`, sqlQuery);

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
    console.error('🔍 SWISS DEBUG: Error fetching teams:', teamsError);
    throw teamsError;
  }

  console.log(`🔍 SWISS DEBUG: Found ${teamsData.length} teams`);

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
    console.error('🔍 SWISS DEBUG: Error fetching team members:', teamMembersError);
    throw teamMembersError;
  }

  console.log(`🔍 SWISS DEBUG: Found ${teamMembers.length} team members`);

  // Get all team member user IDs and ensure they're in the validUserIds set
  const teamMemberUserIds = teamMembers.map(m => m.user_id);
  let addedCount = 0;

  teamMemberUserIds.forEach(userId => {
    if (userId && !userIdSet.has(userId)) {
      userIdSet.add(userId);
      addedCount++;
      console.log(`🔍 SWISS DEBUG: Added missing team member ID to validUserIds: ${userId}`);
    }
  });

  if (addedCount > 0) {
    console.log(`🔍 SWISS DEBUG: Added ${addedCount} missing team member IDs to validUserIds set`);
    console.log(`🔍 SWISS DEBUG: New validUserIds size: ${userIdSet.size}`);
  }

  // Fetch approved registrations
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
    console.error('🔍 SWISS DEBUG: Error fetching approved registrations:', registrationsError);
    throw registrationsError;
  }

  console.log(`🔍 SWISS DEBUG: Found ${approvedRegistrations.length} approved registrations`);

  // Create a set of approved user IDs
  const approvedUserIds = new Set(approvedRegistrations.map(reg => reg.user_id));

  // Add approved user IDs to validUserIds set if they're not already there
  let approvedAddedCount = 0;
  approvedRegistrations.forEach(reg => {
    if (reg.user_id && !userIdSet.has(reg.user_id)) {
      userIdSet.add(reg.user_id);
      approvedAddedCount++;
      console.log(`🔍 SWISS DEBUG: Added missing approved user ID to validUserIds: ${reg.user_id}`);
    }
  });

  if (approvedAddedCount > 0) {
    console.log(`🔍 SWISS DEBUG: Added ${approvedAddedCount} missing approved user IDs to validUserIds set`);
    console.log(`🔍 SWISS DEBUG: New validUserIds size: ${userIdSet.size}`);
  }

  // Process teams and check approvals
  const processedTeams = teamsData.map((team, index) => {
    // Find the captain
    const captain = teamMembers.find(tm => tm.team_id === team.id && tm.role === 'captain');
    const captainId = captain?.user_id || team.captain_id;

    // Count team members
    const memberCount = teamMembers.filter(tm => tm.team_id === team.id).length;

    // Check if captain is approved
    const requiredMembers = tournamentData.max_players_per_team || 5;
    const captainApproved = captainId ? approvedUserIds.has(captainId) && userIdSet.has(captainId) : false;
    const hasEnoughMembers = memberCount >= requiredMembers;

    // Team is approved if captain is approved AND it has enough members
    const isApproved = captainApproved && hasEnoughMembers;

    console.log(`🔍 SWISS DEBUG: Team ${team.name} - Captain: ${captainId}, Members: ${memberCount}/${requiredMembers}, Captain approved: ${captainApproved}, Enough members: ${hasEnoughMembers}, Final approved: ${isApproved}`);

    if (captainId && !userIdSet.has(captainId)) {
      console.log(`🔍 SWISS DEBUG: ⚠️ Captain ID ${captainId} for team ${team.name} is not in validUserIds set!`);
    }

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
      losses: 0,
      points: 0,
      opponents: [],
      isQualified: false,
      isEliminated: false
    };
  }).filter(team => team.isApproved);

  console.log(`🔍 SWISS DEBUG: Approved teams after filtering: ${processedTeams.length}`);
  console.log(`🔍 SWISS DEBUG: Team captain IDs:`, processedTeams.map(t => `${t.name} (captain: ${t.captain_id})`));

  // Sort by team strength/ELO if available, otherwise by name
  processedTeams.sort((a, b) => a.name.localeCompare(b.name));

  // Reassign seeds after filtering and sorting
  const finalTeams = processedTeams.map((team, index) => ({
    ...team,
    seed: index + 1
  }));

  console.log(`🔍 SWISS DEBUG: Final teams:`, finalTeams.map(t => ({
    name: t.name,
    captainId: t.captain_id,
    valid: t.captain_id ? userIdSet.has(t.captain_id) : false
  })));

  return finalTeams;
};

export const generateFirstRound = async (
  participants: any[],
  tournamentData: any,
  tournamentId: string,
  validUserIds: Set<string>
) => {
  try {
    console.log('🔍 SWISS DEBUG: ===== STARTING FIRST ROUND GENERATION =====');
    console.log(`🔍 SWISS DEBUG: Tournament ID: ${tournamentId}`);
    console.log(`🔍 SWISS DEBUG: Tournament type: ${tournamentData.type}`);
    console.log(`🔍 SWISS DEBUG: Participants count: ${participants.length}`);
    console.log(`🔍 SWISS DEBUG: Max players configured: ${tournamentData.max_nb_players || 'not set'}`);
    console.log(`🔍 SWISS DEBUG: Valid user IDs count: ${validUserIds.size}`);

    const actualParticipants = participants.length;

    const bracketSize = tournamentData.max_nb_players
      ? Math.pow(2, Math.ceil(Math.log2(tournamentData.max_nb_players)))
      : Math.pow(2, Math.ceil(Math.log2(actualParticipants)));

    const byeCount = bracketSize - actualParticipants;

    console.log(`🔍 SWISS DEBUG: Bracket size: ${bracketSize}, Actual participants: ${actualParticipants}, BYEs needed: ${byeCount}`);

    let invalidParticipants = 0;
    participants.forEach((p, index) => {
      const participantId = tournamentData.type === 'team' ? p.captain_id : p.id;
      const isValid = participantId && validUserIds.has(participantId);

      console.log(`🔍 SWISS DEBUG: Participant ${index}: ${p.name}, ID: ${participantId}, Valid: ${isValid}`);

      if (!isValid) {
        invalidParticipants++;
      }
    });

    if (invalidParticipants > 0) {
      console.log(`🔍 SWISS DEBUG: ⚠️ Found ${invalidParticipants} invalid participants before pairing!`);
    }

    const sortedParticipants = [...participants].sort((a, b) => {
      return (b.elo || 1000) - (a.elo || 1000);
    });

    console.log(`🔍 SWISS DEBUG: Sorted participants by ELO:`, sortedParticipants.map(p => ({
      name: p.name,
      elo: p.elo
    })));

    const newMatches: any[] = [];
    const paired = new Set<string>();
    let position = 1;

    if (byeCount > 0) {
      console.log(`🔍 SWISS DEBUG: Creating ${byeCount} BYE matches for top seeds`);

      for (let i = 0; i < byeCount && i < sortedParticipants.length; i++) {
        const byeParticipant = sortedParticipants[i];
        const byeParticipantId = tournamentData.type === 'team'
          ? byeParticipant.captain_id
          : byeParticipant.id;

        if (byeParticipantId && validUserIds.has(byeParticipantId)) {
          const byeMatch = {
            tournament_id: tournamentId,
            round: 1,
            position: position++,
            player1_id: byeParticipantId,
            player2_id: null,
            winner_id: byeParticipantId,
            is_draw: false
          };

          newMatches.push(byeMatch);
          paired.add(byeParticipantId);

          console.log(`🔍 SWISS DEBUG: ✅ Created BYE match for seed #${i + 1}: ${byeParticipant.name}`);
        }
      }
    }

    const remainingParticipants = sortedParticipants.filter(p => {
      const pId = tournamentData.type === 'team' ? p.captain_id : p.id;
      return pId && !paired.has(pId);
    });

    console.log(`🔍 SWISS DEBUG: ${remainingParticipants.length} participants remaining for regular pairing`);

    const hasOddRemaining = remainingParticipants.length % 2 !== 0;

    if (hasOddRemaining && remainingParticipants.length > 0) {
      const oddByeParticipant = remainingParticipants[remainingParticipants.length - 1];
      const oddByeId = tournamentData.type === 'team'
        ? oddByeParticipant.captain_id
        : oddByeParticipant.id;

      if (oddByeId && validUserIds.has(oddByeId)) {
        const byeMatch = {
          tournament_id: tournamentId,
          round: 1,
          position: position++,
          player1_id: oddByeId,
          player2_id: null,
          winner_id: oddByeId,
          is_draw: false
        };

        newMatches.push(byeMatch);
        paired.add(oddByeId);

        console.log(`🔍 SWISS DEBUG: ✅ Created BYE match for odd participant: ${oddByeParticipant.name}`);
      }
    }

    const participantsForPairing = remainingParticipants.filter(p => {
      const pId = tournamentData.type === 'team' ? p.captain_id : p.id;
      return pId && !paired.has(pId);
    });

    console.log(`🔍 SWISS DEBUG: Starting pairing process with ${participantsForPairing.length} participants...`);
    console.log(`🔍 SWISS DEBUG: Will create ${Math.floor(participantsForPairing.length / 2)} regular matches`);

    const pairingCount = Math.floor(participantsForPairing.length / 2);
    for (let i = 0; i < pairingCount; i++) {
      const participant1 = participantsForPairing[i];
      const participant2 = participantsForPairing[participantsForPairing.length - 1 - i];

      console.log(`🔍 SWISS DEBUG: --- Pairing attempt ${i + 1} ---`);
      console.log(`🔍 SWISS DEBUG: Participant 1: ${participant1.name} (ID: ${participant1.id})`);
      console.log(`🔍 SWISS DEBUG: Participant 2: ${participant2.name} (ID: ${participant2.id})`);

      const participant1Id = tournamentData.type === 'team'
        ? participant1.captain_id
        : participant1.id;
      const participant2Id = tournamentData.type === 'team'
        ? participant2.captain_id
        : participant2.id;

      console.log(`🔍 SWISS DEBUG: Resolved participant 1 ID: ${participant1Id}`);
      console.log(`🔍 SWISS DEBUG: Resolved participant 2 ID: ${participant2Id}`);
      console.log(`🔍 SWISS DEBUG: Participant 1 ID in validUserIds: ${participant1Id ? validUserIds.has(participant1Id) : false}`);
      console.log(`🔍 SWISS DEBUG: Participant 2 ID in validUserIds: ${participant2Id ? validUserIds.has(participant2Id) : false}`);
      console.log(`🔍 SWISS DEBUG: Participant 1 ID already paired: ${participant1Id ? paired.has(participant1Id) : false}`);
      console.log(`🔍 SWISS DEBUG: Participant 2 ID already paired: ${participant2Id ? paired.has(participant2Id) : false}`);

      if (participant1Id && participant2Id &&
          validUserIds.has(participant1Id) && validUserIds.has(participant2Id) &&
          !paired.has(participant1Id) && !paired.has(participant2Id)) {

        const matchData = {
          tournament_id: tournamentId,
          round: 1,
          position: position++,
          player1_id: participant1Id,
          player2_id: participant2Id,
          winner_id: null,
          is_draw: false
        };

        newMatches.push(matchData);
        paired.add(participant1Id);
        paired.add(participant2Id);

        console.log(`🔍 SWISS DEBUG: ✅ Successfully created match ${position - 1}:`);
        console.log(`🔍 SWISS DEBUG:    ${participant1.name} vs ${participant2.name}`);
        console.log(`🔍 SWISS DEBUG:    Match data:`, matchData);
      } else {
        console.log(`🔍 SWISS DEBUG: ❌ Failed to create match for pairing ${i + 1}:`);
        if (!participant1Id) console.log(`🔍 SWISS DEBUG:    - Participant 1 ID is null/undefined`);
        if (!participant2Id) console.log(`🔍 SWISS DEBUG:    - Participant 2 ID is null/undefined`);
        if (participant1Id && !validUserIds.has(participant1Id)) console.log(`🔍 SWISS DEBUG:    - Participant 1 ID not in valid users`);
        if (participant2Id && !validUserIds.has(participant2Id)) console.log(`🔍 SWISS DEBUG:    - Participant 2 ID not in valid users`);
        if (participant1Id && paired.has(participant1Id)) console.log(`🔍 SWISS DEBUG:    - Participant 1 already paired`);
        if (participant2Id && paired.has(participant2Id)) console.log(`🔍 SWISS DEBUG:    - Participant 2 already paired`);
      }
    }

    console.log(`🔍 SWISS DEBUG: Pairing complete. Created ${newMatches.length} matches (including BYEs)`);
    console.log(`🔍 SWISS DEBUG: Paired participants: ${paired.size}`);
    console.log(`🔍 SWISS DEBUG: Unpaired participants: ${participants.length - paired.size}`);

    if (newMatches.length > 0) {
      console.log(`🔍 SWISS DEBUG: Final existing check before insert - Found ${newMatches.length} matches to insert`);

      console.log(`🔍 SWISS DEBUG: Inserting ${newMatches.length} matches into database`);
      const { data: insertedMatches, error } = await supabase
        .from('tournament_matches')
        .insert(newMatches)
        .select();

      if (error) {
        console.error('🔍 SWISS DEBUG: Database insertion error:', error);
        throw error;
      }

      console.log(`🔍 SWISS DEBUG: Successfully inserted ${insertedMatches.length} matches`);
      console.log(`🔍 SWISS DEBUG: ===== FIRST ROUND GENERATION COMPLETE =====`);

      return insertedMatches;
    } else {
      console.log('🔍 SWISS DEBUG: ❌ No matches could be generated - investigating why...');

      console.log(`🔍 SWISS DEBUG: Debugging why no matches were created:`);
      console.log(`🔍 SWISS DEBUG: - Participants length: ${participants.length}`);
      console.log(`🔍 SWISS DEBUG: - Expected matches: ${Math.floor(participants.length / 2)}`);
      console.log(`🔍 SWISS DEBUG: - Tournament type: ${tournamentData.type}`);

      participants.forEach((p, index) => {
        const participantId = tournamentData.type === 'team' ? p.captain_id : p.id;
        console.log(`🔍 SWISS DEBUG: - Participant ${index}: ${p.name}, ID: ${participantId}, Valid: ${participantId ? validUserIds.has(participantId) : false}`);
      });

      toast.error('Could not generate first round matches - check console for details');
      return [];
    }
  } catch (error) {
    console.error('🔍 SWISS DEBUG: Error in generateFirstRound:', error);
    toast.error('Failed to generate first round');
    return [];
  }
};

export const generateNextRound = async (
  participants: any[],
  existingMatches: any[],
  tournamentData: any,
  tournamentId: string,
  currentRound: number,
  validUserIds: Set<string>
) => {
  try {
    console.log('🔍 SWISS DEBUG: ===== STARTING NEXT ROUND GENERATION =====');
    console.log(`🔍 SWISS DEBUG: Current round: ${currentRound}, Next round: ${currentRound + 1}`);
    console.log(`🔍 SWISS DEBUG: Participants count: ${participants.length}`);
    console.log(`🔍 SWISS DEBUG: Valid user IDs count: ${validUserIds.size}`);

    // Check if we've reached the maximum number of rounds for this tournament size
    const maxRounds = 5; // Maximum of 5 rounds for Swiss tournaments
    if (currentRound >= maxRounds) {
      console.log(`🔍 SWISS DEBUG: Maximum rounds (${maxRounds}) reached for ${participants.length} participants`);
      toast.info(`Maximum rounds (${maxRounds}) reached for this tournament. Time to determine the winner!`);
      return [];
    }

    // Check if 50% of participants are already qualified
    const qualifiedCount = participants.filter(p => p.wins >= 3).length;
    const totalParticipants = participants.length;

    if (qualifiedCount >= Math.ceil(totalParticipants / 2)) {
      console.log(`🔍 SWISS DEBUG: ${qualifiedCount} participants (${Math.round(qualifiedCount/totalParticipants*100)}%) have qualified, which is at least 50% of the total ${totalParticipants}`);
      toast.info(`${qualifiedCount} participants have qualified (50% threshold reached). Ready for knockout stage!`);
      return [];
    }

    // Verify all participant IDs are in validUserIds before pairing
    let invalidParticipants = 0;
    participants.forEach((p, index) => {
      const participantId = tournamentData.type === 'team' ? p.captain_id : p.id;
      const isValid = participantId && validUserIds.has(participantId);

      if (!isValid) {
        invalidParticipants++;
        console.log(`🔍 SWISS DEBUG: ⚠️ Invalid participant ${index}: ${p.name}, ID: ${participantId}`);
      }
    });

    if (invalidParticipants > 0) {
      console.log(`🔍 SWISS DEBUG: ⚠️ Found ${invalidParticipants} invalid participants before pairing!`);
    }

    // Filter out eliminated participants (3 losses)
    const activeParticipants = participants.filter(p => p.losses < 3 && p.wins < 3);
    console.log(`🔍 SWISS DEBUG: ${participants.length - activeParticipants.length} participants filtered out (qualified or eliminated)`);
    console.log(`🔍 SWISS DEBUG: ${activeParticipants.length} active participants remaining for pairing`);

    // Sort participants by points (wins), then by ELO
    const sortedParticipants = [...activeParticipants].sort((a, b) => {
      const pointsA = a.points || 0;
      const pointsB = b.points || 0;

      if (pointsA !== pointsB) {
        return pointsB - pointsA; // Higher points first
      }

      return (b.elo || 1000) - (a.elo || 1000); // Higher ELO first
    });

    console.log(`🔍 SWISS DEBUG: Sorted participants by points/ELO:`, sortedParticipants.map(p => ({
      name: p.name,
      points: p.points || 0,
      wins: p.wins || 0,
      losses: p.losses || 0,
      elo: p.elo || 1000
    })));

    const newMatches: any[] = [];
    const paired = new Set<string>();
    const nextRound = currentRound + 1;
    let position = 1;

    if (sortedParticipants.length % 2 !== 0 && sortedParticipants.length > 0) {
      const byeParticipant = sortedParticipants[sortedParticipants.length - 1];
      const byeParticipantId = tournamentData.type === 'team'
        ? byeParticipant.captain_id
        : byeParticipant.id;

      if (byeParticipantId && validUserIds.has(byeParticipantId)) {
        const byeMatch = {
          tournament_id: tournamentId,
          round: nextRound,
          position: position++,
          player1_id: byeParticipantId,
          player2_id: null,
          winner_id: byeParticipantId,
          is_draw: false
        };

        newMatches.push(byeMatch);
        paired.add(byeParticipantId);

        console.log(`🔍 SWISS DEBUG: ✅ Created BYE match for lowest-ranked active participant: ${byeParticipant.name} (${byeParticipant.wins}W-${byeParticipant.losses}L)`);
      }
    }

    // Build a comprehensive list of all previous opponents for each participant
    const allOpponents = new Map<string, Set<string>>();

    // Initialize opponent sets
    sortedParticipants.forEach(participant => {
      const participantId = tournamentData.type === 'team'
        ? participant.captain_id
        : participant.id;
      if (participantId) {
        allOpponents.set(participantId, new Set());
      }
    });

    // Populate opponent sets from all existing matches
    existingMatches.forEach(match => {
      if (match.player1_id && match.player2_id) {
        allOpponents.get(match.player1_id)?.add(match.player2_id);
        allOpponents.get(match.player2_id)?.add(match.player1_id);
      }
    });

    console.log(`🔍 SWISS DEBUG: Starting pairing process for round ${nextRound}...`);

    // Group participants by their win count
    const participantsByWins: Record<number, any[]> = {};

    sortedParticipants.forEach(participant => {
      const wins = participant.wins || 0;
      if (!participantsByWins[wins]) {
        participantsByWins[wins] = [];
      }
      participantsByWins[wins].push(participant);
    });

    // Log the distribution of participants by win count
    Object.entries(participantsByWins).forEach(([wins, participants]) => {
      console.log(`🔍 SWISS DEBUG: ${participants.length} participants with ${wins} win(s)`);
    });

    // Swiss pairing algorithm with improved opponent checking
    // First try to pair participants with the same number of wins
    const winCounts = Object.keys(participantsByWins).map(Number).sort((a, b) => b - a);

    for (const winCount of winCounts) {
      const participantsWithSameWins = participantsByWins[winCount];

      // Randomize the order within each win group to avoid predictable pairings
      const shuffled = [...participantsWithSameWins].sort(() => Math.random() - 0.5);

      console.log(`🔍 SWISS DEBUG: Attempting to pair ${shuffled.length} participants with ${winCount} win(s)`);

      while (shuffled.length >= 2) {
        const participant1 = shuffled[0];
        const participant1Id = tournamentData.type === 'team'
          ? participant1.captain_id
          : participant1.id;

        if (!participant1Id || paired.has(participant1Id)) {
          shuffled.shift(); // Remove and skip this participant
          continue;
        }

        // Find a valid opponent who hasn't played against participant1 yet
        let opponentIndex = -1;

        for (let i = 1; i < shuffled.length; i++) {
          const candidate = shuffled[i];
          const candidateId = tournamentData.type === 'team'
            ? candidate.captain_id
            : candidate.id;

          if (!candidateId || paired.has(candidateId)) continue;

          // Check if they haven't played before
          const hasPlayedBefore = allOpponents.get(participant1Id)?.has(candidateId) || false;
          const bothValid = validUserIds.has(participant1Id) && validUserIds.has(candidateId);

          if (!hasPlayedBefore && bothValid) {
            opponentIndex = i;
            break;
          }
        }

        // If no valid opponent found, allow a rematch as last resort
        if (opponentIndex === -1) {
          for (let i = 1; i < shuffled.length; i++) {
            const candidate = shuffled[i];
            const candidateId = tournamentData.type === 'team'
              ? candidate.captain_id
              : candidate.id;

            if (!candidateId || paired.has(candidateId)) continue;

            if (validUserIds.has(participant1Id) && validUserIds.has(candidateId)) {
              opponentIndex = i;
              console.log(`🔍 SWISS DEBUG: Allowing rematch between ${participant1.name} and ${candidate.name} as no fresh opponents available`);
              break;
            }
          }
        }

        if (opponentIndex !== -1) {
          const participant2 = shuffled[opponentIndex];
          const participant2Id = tournamentData.type === 'team'
            ? participant2.captain_id
            : participant2.id;

          // Create the match
          const matchData = {
            tournament_id: tournamentId,
            round: nextRound,
            position: position++,
            player1_id: participant1Id,
            player2_id: participant2Id,
            winner_id: null,
            is_draw: false
          };

          newMatches.push(matchData);
          paired.add(participant1Id);
          paired.add(participant2Id);

          console.log(`🔍 SWISS DEBUG: Created match: ${participant1.name} (${participant1.wins}W-${participant1.losses}L) vs ${participant2.name} (${participant2.wins}W-${participant2.losses}L)`);

          // Remove both participants from the pool
          shuffled.splice(opponentIndex, 1);
          shuffled.shift();
        } else {
          // No valid opponent found, remove this participant
          console.log(`🔍 SWISS DEBUG: No valid opponent found for ${participant1.name}, removing from pool`);
          shuffled.shift();
        }
      }
    }

    // If we still have unpaired participants with different win counts, try to pair them
    const remainingParticipants = sortedParticipants.filter(p => {
      const id = tournamentData.type === 'team' ? p.captain_id : p.id;
      return id && !paired.has(id) && validUserIds.has(id);
    });

    if (remainingParticipants.length >= 2) {
      console.log(`🔍 SWISS DEBUG: Attempting to pair ${remainingParticipants.length} remaining participants with different win counts`);

      while (remainingParticipants.length >= 2) {
        const participant1 = remainingParticipants[0];
        const participant1Id = tournamentData.type === 'team'
          ? participant1.captain_id
          : participant1.id;

        // Find best opponent
        let bestOpponentIndex = 1; // Default to next participant
        let bestOpponentScore = Infinity; // Lower is better (difference in wins)

        for (let i = 1; i < remainingParticipants.length; i++) {
          const candidate = remainingParticipants[i];
          const candidateId = tournamentData.type === 'team'
            ? candidate.captain_id
            : candidate.id;

          // Skip invalid candidates
          if (!candidateId || !validUserIds.has(candidateId)) continue;

          // Calculate how close their win counts are
          const winDifference = Math.abs((candidate.wins || 0) - (participant1.wins || 0));

          // Check if they've played before
          const hasPlayedBefore = allOpponents.get(participant1Id)?.has(candidateId) || false;

          // Prefer opponents with closer win counts who haven't played before
          const score = winDifference * 10 + (hasPlayedBefore ? 100 : 0);

          if (score < bestOpponentScore) {
            bestOpponentScore = score;
            bestOpponentIndex = i;
          }
        }

        // Create match with best opponent
        const participant2 = remainingParticipants[bestOpponentIndex];
        const participant2Id = tournamentData.type === 'team'
          ? participant2.captain_id
          : participant2.id;

        const matchData = {
          tournament_id: tournamentId,
          round: nextRound,
          position: position++,
          player1_id: participant1Id,
          player2_id: participant2Id,
          winner_id: null,
          is_draw: false
        };

        newMatches.push(matchData);

        console.log(`🔍 SWISS DEBUG: Created match between remaining participants: ${participant1.name} (${participant1.wins}W-${participant1.losses}L) vs ${participant2.name} (${participant2.wins}W-${participant2.losses}L)`);

        // Remove both participants
        remainingParticipants.splice(bestOpponentIndex, 1);
        remainingParticipants.shift();
      }
    }

    console.log(`🔍 SWISS DEBUG: Pairing complete. Created ${newMatches.length} matches for round ${nextRound}`);
    console.log(`🔍 SWISS DEBUG: Paired participants: ${paired.size}`);
    console.log(`🔍 SWISS DEBUG: Unpaired participants: ${sortedParticipants.length - paired.size}`);

    if (newMatches.length > 0) {
      console.log(`🔍 SWISS DEBUG: Inserting ${newMatches.length} matches into database`);

      const { data: insertedMatches, error } = await supabase
        .from('tournament_matches')
        .insert(newMatches)
        .select();

      if (error) {
        console.error('🔍 SWISS DEBUG: Database insertion error:', error);
        throw error;
      }

      console.log(`🔍 SWISS DEBUG: Successfully inserted matches for round ${nextRound}`);
      console.log(`🔍 SWISS DEBUG: ===== NEXT ROUND GENERATION COMPLETE =====`);

      return insertedMatches;
    }

    console.log(`🔍 SWISS DEBUG: No matches created for round ${nextRound}`);
    return [];
  } catch (error) {
    console.error('Error generating next round:', error);
    toast.error('Failed to generate next round');
    return [];
  }
};

export const updateParticipantStandings = (participants: any[], matches: any[], tournamentType: 'solo' | 'team') => {
  console.log(`🔍 SWISS DEBUG: Updating participant standings for ${participants.length} participants and ${matches.length} matches`);

  const standingsMap = new Map();

  participants.forEach(participant => {
    const participantId = tournamentType === 'team'
      ? participant.captain_id
      : participant.id;

    if (participantId) {
      standingsMap.set(participantId, {
        ...participant,
        wins: 0,
        losses: 0,
        points: 0,
        opponents: [],
        isQualified: false,
        isEliminated: false
      });
    }
  });

  matches.forEach(match => {
    if (match.winner_id && match.player1_id && !match.player2_id) {
      if (standingsMap.has(match.winner_id)) {
        const winner = standingsMap.get(match.winner_id);
        winner.wins = (winner.wins || 0) + 1;
        winner.points = (winner.points || 0) + 1;

        if (winner.wins >= 3) {
          winner.isQualified = true;
        }

        standingsMap.set(match.winner_id, winner);
        console.log(`🔍 SWISS DEBUG: BYE win credited to ${winner.name || match.winner_id}: now ${winner.wins}W-${winner.losses}L`);
      }
    } else if (match.winner_id && match.player1_id && match.player2_id) {
      const loserId = match.player1_id === match.winner_id ? match.player2_id : match.player1_id;

      if (standingsMap.has(match.winner_id)) {
        const winner = standingsMap.get(match.winner_id);
        winner.wins = (winner.wins || 0) + 1;
        winner.points = (winner.points || 0) + 1;
        winner.opponents = [...(winner.opponents || []), loserId];

        if (winner.wins >= 3) {
          winner.isQualified = true;
        }

        standingsMap.set(match.winner_id, winner);
      }

      if (standingsMap.has(loserId)) {
        const loser = standingsMap.get(loserId);
        loser.losses = (loser.losses || 0) + 1;
        loser.opponents = [...(loser.opponents || []), match.winner_id];

        if (loser.losses >= 3) {
          loser.isEliminated = true;
        }

        standingsMap.set(loserId, loser);
      }
    }
  });

  return Array.from(standingsMap.values());
};

export const handleWinnerSelected = async (
  matchId: string,
  winnerId: string,
  matches: any[],
  tournament: any,
  updateMatches: (matches: any[]) => void,
  updateParticipants: (participants: any[]) => void,
  participants: any[]
) => {
  try {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const loserId = match.player1_id === winnerId ? match.player2_id : match.player1_id;

    // Update match in database
    const { error } = await supabase
      .from('tournament_matches')
      .update({ winner_id: winnerId })
      .eq('id', matchId);

    if (error) throw error;

    // Update local state
    const updatedMatches = matches.map(m =>
      m.id === matchId ? { ...m, winner_id: winnerId } : m
    );

    // Update ELO ratings
    if (tournament?.game_id && loserId) {
      if (tournament.type === 'solo') {
        await updatePlayerRankings(
          winnerId,
          loserId,
          tournament.game_id,
          false,
          tournament.id
        );
      } else if (tournament.type === 'team') {
        // Get team IDs from captain IDs
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('id, captain_id')
          .in('captain_id', [winnerId, loserId])
          .eq('tournament_id', tournament.id);

        if (!teamError && teamData && teamData.length === 2) {
          const winnerTeam = teamData.find(t => t.captain_id === winnerId);
          const loserTeam = teamData.find(t => t.captain_id === loserId);

          if (winnerTeam && loserTeam) {
            await updateTeamRankings(
              winnerTeam.id,
              loserTeam.id,
              tournament.game_id,
              false,
              tournament.id
            );
          }
        }
      }
    }

    // Update participant standings
    const updatedParticipants = updateParticipantStandings(participants, updatedMatches, tournament.type);

    // Update state
    updateMatches(updatedMatches);
    updateParticipants(updatedParticipants);

    toast.success('Match result updated!');
    return updatedMatches;
  } catch (error) {
    console.error('Error updating match:', error);
    toast.error('Failed to update match result');
    return null;
  }
};

// Calculate the maximum allowed participants for Swiss format
export const getMaxAllowedParticipants = (totalParticipants: number): number => {
  // If max_nb_players is set, use that as the limit
  const swissLimits = [8, 16, 32, 64, 128, 256];

  // Find the largest limit that is less than or equal to total participants
  for (let i = swissLimits.length - 1; i >= 0; i--) {
    if (totalParticipants >= swissLimits[i]) {
      return swissLimits[i];
    }
  }

  // If less than 8 participants, return the total (minimum for Swiss)
  return totalParticipants >= 2 ? Math.min(totalParticipants, 8) : totalParticipants;
};

// Get the maximum number of rounds for a given number of participants
export const getMaxRoundsForParticipants = (participantCount: number): number => {
  // Maximum of 5 rounds for Swiss tournaments
  return 5;
};

// Get the number of players for the final knockout stage
export const getKnockoutParticipantCount = (participantCount: number): number => {
  // Take at most half of the initial players for knockout stage
  return Math.min(Math.floor(participantCount / 2), 16);
};

// Generate knockout stage from Swiss results
export const generateKnockoutStage = async (
  participants: any[],
  tournament: any,
  tournamentId: string,
  currentRound: number,
  validUserIds: Set<string>
) => {
  try {
    console.log('🔍 SWISS DEBUG: ===== STARTING KNOCKOUT STAGE GENERATION =====');

    // Get qualified participants (those with 3+ wins or top half if 50% threshold reached)
    const qualifiedParticipants = participants.filter(p => p.wins >= 3 || p.isQualified);

    console.log(`🔍 SWISS DEBUG: Found ${qualifiedParticipants.length} qualified participants`);

    // If we don't have enough qualified participants, take the top performers
    let finalQualifiedParticipants = qualifiedParticipants;

    if (qualifiedParticipants.length < 2) {
      // Sort all participants by wins, then by ELO
      const sortedParticipants = [...participants].sort((a, b) => {
        const pointsA = a.points || 0;
        const pointsB = b.points || 0;

        if (pointsA !== pointsB) {
          return pointsB - pointsA; // Higher points first
        }

        return (b.elo || 1000) - (a.elo || 1000); // Higher ELO first
      });

      // Take top half, minimum 2, maximum 16
      const knockoutSize = getKnockoutParticipantCount(participants.length);
      finalQualifiedParticipants = sortedParticipants.slice(0, knockoutSize);

      console.log(`🔍 SWISS DEBUG: Not enough qualified participants, taking top ${finalQualifiedParticipants.length} performers`);
    }

    if (finalQualifiedParticipants.length < 2) {
      console.log('🔍 SWISS DEBUG: Not enough qualified participants for knockout stage');
      toast.error('Not enough qualified participants for knockout stage');
      return false;
    }

    console.log(`🔍 SWISS DEBUG: ${finalQualifiedParticipants.length} participants will compete in knockout stage`);

    // Calculate bracket structure
    const rounds = Math.ceil(Math.log2(finalQualifiedParticipants.length));
    const bracketSize = Math.pow(2, rounds);

    // Get the maximum round number from existing Swiss matches
    const maxSwissRound = currentRound;

    // Create seeded bracket positions
    const bracketPositions: (any | null)[] = new Array(bracketSize).fill(null);

    // Place qualified participants in bracket positions
    for (let i = 0; i < finalQualifiedParticipants.length; i++) {
      bracketPositions[i] = finalQualifiedParticipants[i];
    }

    // Generate knockout matches
    const knockoutMatches: any[] = [];
    const firstRoundMatches = bracketSize / 2;
    const knockoutStartRound = maxSwissRound + 1;

    console.log(`🔍 SWISS DEBUG: Generating ${firstRoundMatches} first round knockout matches starting at round ${knockoutStartRound}`);

    // Generate first round matches
    for (let i = 0; i < firstRoundMatches; i++) {
      const participant1 = bracketPositions[i * 2];
      const participant2 = bracketPositions[i * 2 + 1];

      let player1Id = null;
      let player2Id = null;

      if (participant1) {
        const id = tournament.type === 'team' ? participant1.captain_id : participant1.id;
        if (id && validUserIds.has(id)) {
          player1Id = id;
        }
      }

      if (participant2) {
        const id = tournament.type === 'team' ? participant2.captain_id : participant2.id;
        if (id && validUserIds.has(id)) {
          player2Id = id;
        }
      }

      knockoutMatches.push({
        tournament_id: tournamentId,
        round: knockoutStartRound,
        position: i + 1,
        player1_id: player1Id,
        player2_id: player2Id,
        winner_id: null,
        is_draw: false
      });
    }

    // Generate subsequent rounds
    let currentKnockoutRound = knockoutStartRound + 1;
    let matchesInRound = firstRoundMatches / 2;

    while (matchesInRound >= 1) {
      for (let i = 0; i < matchesInRound; i++) {
        knockoutMatches.push({
          tournament_id: tournamentId,
          round: currentKnockoutRound,
          position: i + 1,
          player1_id: null,
          player2_id: null,
          winner_id: null,
          is_draw: false
        });
      }

      currentKnockoutRound++;
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

    console.log(`🔍 SWISS DEBUG: Generated ${knockoutMatches.length} knockout matches`);

    // Save knockout matches to database
    const savedMatches = await saveBracket(knockoutMatches, validUserIds);

    if (!savedMatches) {
      console.error('🔍 SWISS DEBUG: Failed to save knockout matches');
      return false;
    }

    // Update tournament format to indicate transition to knockout stage
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({
        tournament_format: `${tournament.tournament_format} → Single Elimination Knockout`
      })
      .eq('id', tournamentId);

    if (updateError) {
      console.error('🔍 SWISS DEBUG: Failed to update tournament format', updateError);
      return false;
    }

    console.log('🔍 SWISS DEBUG: Successfully generated knockout stage');
    return true;
  } catch (error) {
    console.error('🔍 SWISS DEBUG: Error generating knockout stage:', error);
    return false;
  }
};

export const canEditMatches = (matches: any[], round: number): boolean => {
  const roundMatches = matches.filter(m => m.round === round);
  return roundMatches.length > 0 && roundMatches.every(m => m.winner_id === null);
};

export const updateMatchParticipants = async (
  matchId: string,
  newPlayer1Id: string,
  newPlayer2Id: string,
  validUserIds: Set<string>
): Promise<boolean> => {
  try {
    if (!validUserIds.has(newPlayer1Id) || !validUserIds.has(newPlayer2Id)) {
      toast.error('Invalid participant IDs');
      return false;
    }

    const { error } = await supabase
      .from('tournament_matches')
      .update({
        player1_id: newPlayer1Id,
        player2_id: newPlayer2Id
      })
      .eq('id', matchId);

    if (error) {
      console.error('Error updating match participants:', error);
      toast.error('Failed to update match');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateMatchParticipants:', error);
    toast.error('Failed to update match');
    return false;
  }
};

export const canModifyMatchResult = (matchId: string, matches: any[]): boolean => {
  const match = matches.find(m => m.id === matchId);
  if (!match || !match.winner_id) return false;

  const nextRoundMatches = matches.filter(m => m.round > match.round);
  const hasNextRoundStarted = nextRoundMatches.some(m => m.winner_id !== null);

  return !hasNextRoundStarted;
};

export const resetMatchWinner = async (
  matchId: string,
  matches: any[],
  participants: any[],
  tournament: any,
  updateMatches: (matches: any[]) => void,
  updateParticipants: (participants: any[]) => void
): Promise<boolean> => {
  try {
    if (!canModifyMatchResult(matchId, matches)) {
      toast.error('Cannot reset match: next round has already started');
      return false;
    }

    const { error } = await supabase
      .from('tournament_matches')
      .update({ winner_id: null })
      .eq('id', matchId);

    if (error) {
      console.error('Error resetting match:', error);
      toast.error('Failed to reset match');
      return false;
    }

    const updatedMatches = matches.map(m =>
      m.id === matchId ? { ...m, winner_id: null } : m
    );

    const updatedParticipants = updateParticipantStandings(
      participants,
      updatedMatches,
      tournament.type
    );

    updateMatches(updatedMatches);
    updateParticipants(updatedParticipants);

    toast.success('Match result reset successfully');
    return true;
  } catch (error) {
    console.error('Error in resetMatchWinner:', error);
    toast.error('Failed to reset match');
    return false;
  }
};

export const changeMatchWinner = async (
  matchId: string,
  newWinnerId: string,
  matches: any[],
  participants: any[],
  tournament: any,
  updateMatches: (matches: any[]) => void,
  updateParticipants: (participants: any[]) => void,
  validUserIds: Set<string>
): Promise<boolean> => {
  try {
    if (!canModifyMatchResult(matchId, matches)) {
      toast.error('Cannot change winner: next round has already started');
      return false;
    }

    if (!validUserIds.has(newWinnerId)) {
      toast.error('Invalid winner ID');
      return false;
    }

    const match = matches.find(m => m.id === matchId);
    if (!match) {
      toast.error('Match not found');
      return false;
    }

    if (match.player1_id !== newWinnerId && match.player2_id !== newWinnerId) {
      toast.error('Winner must be one of the match participants');
      return false;
    }

    const { error } = await supabase
      .from('tournament_matches')
      .update({ winner_id: newWinnerId })
      .eq('id', matchId);

    if (error) {
      console.error('Error changing match winner:', error);
      toast.error('Failed to change winner');
      return false;
    }

    const updatedMatches = matches.map(m =>
      m.id === matchId ? { ...m, winner_id: newWinnerId } : m
    );

    const updatedParticipants = updateParticipantStandings(
      participants,
      updatedMatches,
      tournament.type
    );

    updateMatches(updatedMatches);
    updateParticipants(updatedParticipants);

    toast.success('Winner changed successfully');
    return true;
  } catch (error) {
    console.error('Error in changeMatchWinner:', error);
    toast.error('Failed to change winner');
    return false;
  }
};
