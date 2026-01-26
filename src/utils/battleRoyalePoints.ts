/**
 * Battle Royale Points Calculation Utilities
 *
 * This module contains functions to calculate points for Battle Royale tournaments
 * based on placement and eliminations according to the specified point distribution tables.
 */

// Point distribution tables for different player counts
const PLACEMENT_POINTS = {
  // For games with 100 players max (Fortnite, PUBG)
  100: {
    1: 30, 2: 28, 3: 26, 4: 24, 5: 23, 6: 22, 7: 21, 8: 20, 9: 19, 10: 18,
    11: 16, 12: 16, 13: 16, 14: 16, 15: 16, // 11-15th
    16: 14, 17: 14, 18: 14, 19: 14, 20: 14, // 16-20th
    21: 12, 22: 12, 23: 12, 24: 12, 25: 12, 26: 12, 27: 12, 28: 12, 29: 12, 30: 12, // 21-30th
    31: 10, 32: 10, 33: 10, 34: 10, 35: 10, 36: 10, 37: 10, 38: 10, 39: 10, 40: 10, // 31-40th
    41: 8, 42: 8, 43: 8, 44: 8, 45: 8, 46: 8, 47: 8, 48: 8, 49: 8, 50: 8, // 41-50th
    51: 5, 52: 5, 53: 5, 54: 5, 55: 5, 56: 5, 57: 5, 58: 5, 59: 5, 60: 5, // 51-60th
    61: 3, 62: 3, 63: 3, 64: 3, 65: 3, 66: 3, 67: 3, 68: 3, 69: 3, 70: 3, 71: 3, 72: 3, 73: 3, 74: 3, 75: 3, // 61-75th
    // 76-100th get 0 points (default)
  },

  // For games with 150 players max (Warzone)
  150: {
    1: 30, 2: 28, 3: 26, 4: 24, 5: 23, 6: 22, 7: 21, 8: 20, 9: 19, 10: 18,
    11: 16, 12: 16, 13: 16, 14: 16, 15: 16, 16: 16, // 11-16th
    17: 14, 18: 14, 19: 14, 20: 14, 21: 14, 22: 14, 23: 14, // 17-23rd
    24: 12, 25: 12, 26: 12, 27: 12, 28: 12, 29: 12, 30: 12, 31: 12, 32: 12, 33: 12, 34: 12, 35: 12, 36: 12, 37: 12, 38: 12, // 24-38th
    39: 10, 40: 10, 41: 10, 42: 10, 43: 10, 44: 10, 45: 10, 46: 10, 47: 10, 48: 10, 49: 10, 50: 10, 51: 10, 52: 10, 53: 10, // 39-53rd
    54: 8, 55: 8, 56: 8, 57: 8, 58: 8, 59: 8, 60: 8, 61: 8, 62: 8, 63: 8, 64: 8, 65: 8, 66: 8, 67: 8, 68: 8, // 54-68th
    69: 5, 70: 5, 71: 5, 72: 5, 73: 5, 74: 5, 75: 5, 76: 5, 77: 5, 78: 5, 79: 5, 80: 5, 81: 5, 82: 5, 83: 5, // 69-83rd
    84: 3, 85: 3, 86: 3, 87: 3, 88: 3, 89: 3, 90: 3, 91: 3, 92: 3, 93: 3, 94: 3, 95: 3, 96: 3, 97: 3, 98: 3, 99: 3, 100: 3, 101: 3, 102: 3, 103: 3, 104: 3, 105: 3, 106: 3, 107: 3, 108: 3, 109: 3, 110: 3, 111: 3, 112: 3, 113: 3, // 84-113th
    // 114-150th get 0 points (default)
  },

  // For games with 60 players max (Apex Legends)
  60: {
    1: 12, 2: 9, 3: 7, 4: 5, 5: 4,
    6: 3, 7: 3, // 6-7th
    8: 2, 9: 2, 10: 2, // 8-10th
    11: 1, 12: 1, 13: 1, 14: 1, 15: 1, // 11-15th
    // 16-20th get 0 points (default)
  },

  // For games with 50 players max (Free Fire)
  50: {
    1: 30, 2: 28, 3: 26, 4: 24, 5: 23, 6: 22, 7: 21, 8: 20, 9: 19, 10: 18,
    11: 16, 12: 16, 13: 16, // 11-13th
    14: 14, 15: 14, 16: 14, // 14-16th
    17: 12, 18: 12, 19: 12, 20: 12, 21: 12, // 17-21st
    22: 10, 23: 10, 24: 10, 25: 10, 26: 10, // 22-26th
    27: 8, 28: 8, 29: 8, 30: 8, 31: 8, // 27-31st
    32: 5, 33: 5, 34: 5, 35: 5, 36: 5, // 32-36th
    37: 3, 38: 3, 39: 3, 40: 3, 41: 3, 42: 3, 43: 3, // 37-43rd
    // 44-50th get 0 points (default)
  }
};

// Elimination points per kill by game
const ELIMINATION_POINTS = {
  fortnite: 1,
  warzone: 2,
  apex: 3,
  pubg: 2,
  freefire: 2,
  'free fire': 2,
  'call of duty': 2,
  cod: 2
};

/**
 * Get placement points based on game type, max players, and placement
 */
export const getPlacementPoints = (gameName: string, maxPlayers: number, placement: number): number => {
  const gameNameLower = gameName.toLowerCase().trim();

  // Determine which point table to use based on max players
  let pointTable: Record<number, number> = {};

  if (maxPlayers === 60) {
    pointTable = PLACEMENT_POINTS[60];
  } else if (maxPlayers === 50) {
    pointTable = PLACEMENT_POINTS[50];
  } else if (maxPlayers === 150) {
    pointTable = PLACEMENT_POINTS[150];
  } else {
    // Default to 100 players table for other cases
    pointTable = PLACEMENT_POINTS[100];
  }

  // Return points for the placement, or 0 if not in the table
  return pointTable[placement] || 0;
};

/**
 * Get elimination points based on game type and number of eliminations
 */
export const getEliminationPoints = (gameName: string, eliminations: number): number => {
  const gameNameLower = gameName.toLowerCase().trim();

  // Find the points per elimination for this game
  let pointsPerElimination = 0;

  for (const [gameKey, points] of Object.entries(ELIMINATION_POINTS)) {
    if (gameNameLower.includes(gameKey)) {
      pointsPerElimination = points;
      break;
    }
  }

  return pointsPerElimination * eliminations;
};

/**
 * Calculate total match points (placement + eliminations)
 */
export const calculateTotalMatchPoints = (
  gameName: string,
  maxPlayers: number,
  placement: number,
  eliminations: number
): number => {
  const placementPoints = getPlacementPoints(gameName, maxPlayers, placement);
  const eliminationPoints = getEliminationPoints(gameName, eliminations);

  return placementPoints + eliminationPoints;
};

/**
 * Get the maximum number of players for a Battle Royale game
 */
export const getMaxPlayersForGame = (gameName: string): number => {
  const gameNameLower = gameName.toLowerCase().trim();

  if (gameNameLower.includes('warzone') || gameNameLower.includes('call of duty') || gameNameLower.includes('cod')) {
    return 150;
  } else if (gameNameLower.includes('apex') || gameNameLower.includes('legends')) {
    return 60;
  } else if (gameNameLower.includes('fortnite') || gameNameLower.includes('pubg') || gameNameLower.includes('playerunknown')) {
    return 100;
  } else if (gameNameLower.includes('freefire') || gameNameLower.includes('free fire') || gameNameLower.includes('garena')) {
    return 50;
  } else {
    return 100; // Default
  }
};

/**
 * Validate placement based on max players
 */
export const isValidPlacement = (placement: number, maxPlayers: number): boolean => {
  return placement >= 1 && placement <= maxPlayers;
};

/**
 * Get game-specific information for Battle Royale
 */
export const getBattleRoyaleGameInfo = (gameName: string) => {
  const gameNameLower = gameName.toLowerCase().trim();
  const maxPlayers = getMaxPlayersForGame(gameName);

  let isTeamBased = false;
  let playersPerTeam = 1;

  // Apex Legends is team-based with 3 players per squad
  if (gameNameLower.includes('apex') || gameNameLower.includes('legends')) {
    isTeamBased = true;
    playersPerTeam = 3;
  }

  return {
    maxPlayers,
    isTeamBased,
    playersPerTeam,
    eliminationPointsPerKill: getEliminationPoints(gameName, 1)
  };
};
