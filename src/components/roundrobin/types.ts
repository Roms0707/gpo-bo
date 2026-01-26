export interface Player {
  id: string;
  name: string;
  elo?: number;
  seed?: number;
  groupId?: string;
  groupPosition?: number;
  wins?: number;
  losses?: number;
  isQualified?: boolean;
}

export interface Team {
  id: string;
  name: string;
  captain_id?: string;
  seed?: number;
  memberCount?: number;
  groupId?: string;
  groupPosition?: number;
  wins?: number;
  losses?: number;
  isQualified?: boolean;
}

export interface Match {
  id: string;
  round: number;
  position: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  tournament_id: string;
  is_draw: boolean;
  group_id?: string;
}

export interface Tournament {
  id: string;
  title: string;
  type: 'solo' | 'team';
  tournament_format?: string;
  max_players_per_team?: number;
  game_id?: string;
  max_nb_players?: number;
}
