export interface Match {
  id: string;
  round: number;
  position: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  tournament_id: string;
  is_draw: boolean;
  is_bye?: boolean;
  is_lucky_loser_match?: boolean;
  lucky_loser_player_id?: string | null;
  replaced_player_id?: string | null;
  forfeit_reason?: string | null;
}

export interface Player {
  id: string;
  name: string;
  elo?: number;
  seed?: number;
  discord_handle?: string;
  gamePublisherId?: string;
  gamePublisherLabel?: string;
}

export interface Team {
  id: string;
  name: string;
  captain_id?: string;
  seed?: number;
  elo?: number;
  memberCount?: number;
  isApproved?: boolean;
  captainApproved?: boolean;
  hasEnoughMembers?: boolean;
  requiredMembers?: number;
  discord_handle?: string;
  gamePublisherId?: string;
  gamePublisherLabel?: string;
}

export interface PlayerRanking {
  user_id: string;
  elo_rating: number;
  game_id: string;
}

// Firework particle interface
export interface Firework {
  id: number;
  x: number;
  y: number;
  particles: Particle[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

// Type for inserting new matches without ID (Supabase will generate UUID)
export type MatchInsert = Omit<Match, 'id'>;