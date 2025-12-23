export interface TournamentValidation {
  isValid: boolean;
  message: string;
  minRequired: number;
  recommendedSize?: number;
  bracketSize?: number;
  numberOfByes?: number;
  numberOfRounds?: number;
}

export const getNextPowerOfTwo = (n: number): number => {
  if (n <= 0) return 1;
  if (n === 1) return 1;
  if ((n & (n - 1)) === 0) return n;

  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
};

export const generateSnakeSeeding = (bracketSize: number): number[] => {
  const seeding: number[] = [];
  const rounds = Math.log2(bracketSize);

  seeding.push(1);

  for (let round = 1; round < rounds; round++) {
    const size = seeding.length;
    const nextMax = size * 2 + 1;

    for (let i = 0; i < size; i++) {
      seeding.splice(i * 2 + 1, 0, nextMax - seeding[i * 2]);
    }
  }

  console.log(`[Snake Seeding] Generated for bracket size ${bracketSize}:`, seeding);
  return seeding;
};

export const getMinimumParticipants = (tournamentFormat: string | null): number => {
  if (!tournamentFormat) return 2;

  const format = tournamentFormat.toLowerCase();

  if (format.includes('battle royale')) {
    return 20;
  } else if (format.includes('round robin')) {
    if (format.includes('6')) {
      return 6;
    }
    return 4;
  } else if (format.includes('swiss')) {
    return 8;
  } else {
    return 2;
  }
};

export const calculateBracketStructure = (
  participantCount: number,
  tournamentFormat: string | null,
  maxNbPlayers: number | null = null
): { bracketSize: number; rounds: number; byes: number } => {
  const format = tournamentFormat?.toLowerCase() || '';

  if (format.includes('battle royale')) {
    const bracketSize = maxNbPlayers || participantCount;
    return {
      bracketSize,
      rounds: 3,
      byes: bracketSize - participantCount
    };
  }

  if (format.includes('round robin')) {
    const groupSize = format.includes('6') ? 6 : 4;
    const bracketSize = maxNbPlayers || participantCount;
    const numberOfGroups = Math.ceil(bracketSize / groupSize);

    return {
      bracketSize,
      rounds: groupSize - 1,
      byes: (numberOfGroups * groupSize) - participantCount
    };
  }

  if (format.includes('swiss')) {
    const bracketSize = maxNbPlayers || participantCount;
    const rounds = Math.ceil(Math.log2(bracketSize));
    return {
      bracketSize,
      rounds: Math.min(rounds, 7),
      byes: bracketSize - participantCount
    };
  }

  // Single Elimination: use power-of-2 bracket structure
  const targetSize = maxNbPlayers || participantCount;
  const bracketSize = getNextPowerOfTwo(targetSize);
  const rounds = Math.log2(bracketSize);
  const byes = bracketSize - participantCount;

  console.log(`[Bracket Structure] Participants: ${participantCount}, Target: ${targetSize}, Power-of-2 Bracket: ${bracketSize}, BYEs: ${byes}, Rounds: ${rounds}`);

  return { bracketSize, rounds, byes };
};

export const validateTournamentLaunch = (
  participantCount: number,
  tournamentFormat: string | null,
  maxNbPlayers: number | null,
  tournamentType: 'solo' | 'team'
): TournamentValidation => {
  const minRequired = getMinimumParticipants(tournamentFormat);

  if (participantCount < minRequired) {
    return {
      isValid: false,
      message: `Le tournoi nécessite au moins ${minRequired} ${tournamentType === 'team' ? 'équipes' : 'joueurs'} pour être lancé. Actuellement: ${participantCount}`,
      minRequired
    };
  }

  // Validate that participantCount doesn't exceed maxNbPlayers if set
  if (maxNbPlayers && participantCount > maxNbPlayers) {
    return {
      isValid: false,
      message: `Le nombre de participants (${participantCount}) dépasse la capacité maximale configurée (${maxNbPlayers})`,
      minRequired
    };
  }

  const structure = calculateBracketStructure(participantCount, tournamentFormat, maxNbPlayers);

  const participantLabel = tournamentType === 'team' ? 'équipes' : 'joueurs';
  const capacityInfo = maxNbPlayers
    ? ` (${participantCount} sur ${maxNbPlayers} places maximum)`
    : '';

  let message = `Le tournoi peut être lancé avec ${participantCount} ${participantLabel}${capacityInfo}.`;

  if (tournamentFormat?.toLowerCase().includes('battle royale')) {
    message += ` 3 matches seront joués.`;
    if (structure.byes > 0) {
      message += ` ${structure.byes} place(s) vide(s).`;
    }
  } else if (tournamentFormat?.toLowerCase().includes('round robin')) {
    const groupSize = tournamentFormat.toLowerCase().includes('6') ? 6 : 4;
    const bracketSize = maxNbPlayers || participantCount;
    const numberOfGroups = Math.ceil(bracketSize / groupSize);
    message += ` ${numberOfGroups} groupe(s) de ${groupSize} ${participantLabel} maximum seront créés.`;
    if (structure.byes > 0) {
      message += ` ${structure.byes} place(s) vide(s) dans les groupes.`;
    }
  } else if (tournamentFormat?.toLowerCase().includes('swiss')) {
    message += ` ${structure.rounds} rounds Swiss seront joués.`;
    if (structure.byes > 0) {
      message += ` ${structure.byes} BYE(s) seront attribués pour les places vides.`;
    }
  } else {
    // Single Elimination with power-of-2 bracket
    message += ` Bracket de ${structure.bracketSize} places (${structure.rounds} rounds).`;
    if (structure.byes > 0) {
      message += ` ${structure.byes} BYE(s) seront attribués aux meilleurs joueurs (Round 1).`;
    }
  }

  return {
    isValid: true,
    message,
    minRequired,
    bracketSize: structure.bracketSize,
    numberOfByes: structure.byes,
    numberOfRounds: structure.rounds
  };
};

export const isRegistrationOpen = (
  registrationStartDate: string | null,
  registrationEndDate: string | null,
  registrationLocked: boolean
): boolean => {
  if (registrationLocked) return false;

  const now = new Date();

  if (registrationStartDate) {
    const startDate = new Date(registrationStartDate);
    if (now < startDate) return false;
  }

  if (registrationEndDate) {
    const endDate = new Date(registrationEndDate);
    if (now > endDate) return false;
  }

  return true;
};

export const getRegistrationStatus = (
  registrationStartDate: string | null,
  registrationEndDate: string | null,
  registrationLocked: boolean
): 'not_started' | 'open' | 'closed' | 'locked' => {
  if (registrationLocked) return 'locked';

  const now = new Date();

  if (registrationStartDate) {
    const startDate = new Date(registrationStartDate);
    if (now < startDate) return 'not_started';
  }

  if (registrationEndDate) {
    const endDate = new Date(registrationEndDate);
    if (now > endDate) return 'closed';
  }

  return 'open';
};

export const getRegistrationStatusLabel = (
  status: 'not_started' | 'open' | 'closed' | 'locked'
): string => {
  switch (status) {
    case 'not_started':
      return 'Pas encore ouvertes';
    case 'open':
      return 'Ouvertes';
    case 'closed':
      return 'Fermées';
    case 'locked':
      return 'Verrouillées';
  }
};

export const getRegistrationStatusColor = (
  status: 'not_started' | 'open' | 'closed' | 'locked'
): 'secondary' | 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'not_started':
      return 'secondary';
    case 'open':
      return 'success';
    case 'closed':
      return 'warning';
    case 'locked':
      return 'error';
  }
};

export interface BracketValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    participantCount: number;
    bracketSize: number;
    expectedByes: number;
    actualByeMatches: number;
    totalMatches: number;
    expectedMatches: number;
    totalRounds: number;
  };
}

export const isPowerOfTwo = (n: number): boolean => {
  if (n <= 0) return false;
  return (n & (n - 1)) === 0;
};

export const validateBracketStructure = (
  participantCount: number,
  matches: Array<{
    round: number;
    position: number;
    player1_id: string | null;
    player2_id: string | null;
    winner_id: string | null;
    is_bye?: boolean;
  }>
): BracketValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const bracketSize = getNextPowerOfTwo(participantCount);
  const expectedByes = bracketSize - participantCount;
  const expectedMatches = bracketSize - 1;
  const expectedRounds = Math.log2(bracketSize);

  if (!isPowerOfTwo(bracketSize)) {
    errors.push(`Bracket size ${bracketSize} is not a power of 2`);
  }

  const totalMatches = matches.length;
  if (totalMatches !== expectedMatches) {
    errors.push(`Expected ${expectedMatches} matches but got ${totalMatches}`);
  }

  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  if (rounds.length !== expectedRounds) {
    warnings.push(`Expected ${expectedRounds} rounds but found ${rounds.length}`);
  }

  for (let round = 1; round <= expectedRounds; round++) {
    const expectedMatchesInRound = bracketSize / Math.pow(2, round);
    const actualMatchesInRound = matches.filter(m => m.round === round).length;
    if (actualMatchesInRound !== expectedMatchesInRound) {
      errors.push(`Round ${round}: expected ${expectedMatchesInRound} matches, got ${actualMatchesInRound}`);
    }
  }

  const round1Matches = matches.filter(m => m.round === 1);
  const byeMatchesInRound1 = round1Matches.filter(m =>
    (!m.player1_id && m.player2_id) || (m.player1_id && !m.player2_id)
  ).length;

  if (byeMatchesInRound1 !== expectedByes) {
    warnings.push(`Expected ${expectedByes} BYE matches in Round 1, found ${byeMatchesInRound1}`);
  }

  const byesAfterRound1 = matches.filter(m =>
    m.round > 1 &&
    ((!m.player1_id && m.player2_id) || (m.player1_id && !m.player2_id)) &&
    !m.winner_id
  );

  if (byesAfterRound1.length > 0) {
    errors.push(`Found ${byesAfterRound1.length} orphaned BYE(s) after Round 1 - bracket structure is invalid`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      participantCount,
      bracketSize,
      expectedByes,
      actualByeMatches: byeMatchesInRound1,
      totalMatches,
      expectedMatches,
      totalRounds: rounds.length
    }
  };
};

export const getBracketSizeInfo = (participantCount: number): {
  bracketSize: number;
  byes: number;
  rounds: number;
  roundBreakdown: string;
} => {
  const bracketSize = getNextPowerOfTwo(participantCount);
  const byes = bracketSize - participantCount;
  const rounds = Math.log2(bracketSize);

  const breakdown: string[] = [];
  let remaining = bracketSize;
  for (let r = 1; r <= rounds; r++) {
    remaining = remaining / 2;
    breakdown.push(`R${r}: ${remaining * 2} to ${remaining}`);
  }

  return {
    bracketSize,
    byes,
    rounds,
    roundBreakdown: breakdown.join(' | ')
  };
};
