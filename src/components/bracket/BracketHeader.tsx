import React from 'react';
import { Crown, Users, Target, Calendar } from 'lucide-react';
import { Player, Team } from './types';
import Badge from '../ui/Badge';

interface BracketHeaderProps {
  tournament: any;
  participants: Player[] | Team[];
  byes: number;
  rounds: number;
}

const BracketHeader: React.FC<BracketHeaderProps> = ({
  tournament,
  participants,
  byes,
  rounds
}) => {
  const hasReducedParticipants = tournament?.initial_max_players &&
    tournament.actual_participants &&
    tournament.actual_participants < tournament.initial_max_players;

  const percentageFilled = tournament?.initial_max_players && tournament.actual_participants
    ? Math.round((tournament.actual_participants / tournament.initial_max_players) * 100)
    : 100;

  return (
    <div className="mb-4 space-y-3">
      {hasReducedParticipants && (
        <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
          <div className="flex items-start space-x-2">
            <Target className="h-4 w-4 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-300">Tournoi lancé avec capacité réduite</span>
                <Badge variant="warning" className="text-xs">
                  {percentageFilled}% rempli
                </Badge>
              </div>
              <p className="text-xs text-amber-200 mt-1">
                {tournament.actual_participants} {tournament.type === 'team' ? 'équipes' : 'joueurs'} sur {tournament.initial_max_players} prévus initialement
              </p>
              {tournament.bracket_launched_at && (
                <div className="flex items-center text-xs text-amber-300 mt-1">
                  <Calendar className="h-3 w-3 mr-1" />
                  Lancé le {new Date(tournament.bracket_launched_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-3 bg-dark-300 rounded-lg">
        <h4 className="text-white font-medium mb-2 flex items-center text-sm">
          <Crown className="h-4 w-4 text-yellow-500 mr-2" />
          Top Seeds
        </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {tournament?.type === 'team' ? (
          (participants as Team[]).slice(0, 4).map((team, index) => (
            <div key={team.id} className="flex items-center space-x-1">
              <span className="text-gray-400">#{team.seed}</span>
              <span className="text-white truncate">{team.name}</span>
              {team.memberCount && (
                <span className="text-gray-500 flex items-center">
                  <Users className="h-3 w-3 mr-0.5" />
                  {team.memberCount}
                </span>
              )}
            </div>
          ))
        ) : (
          (participants as Player[]).slice(0, 4).map((player, index) => (
            <div key={player.id} className="flex items-center space-x-1">
              <span className="text-gray-400">#{player.seed}</span>
              <span className="text-white truncate">{player.name}</span>
              <span className="text-gray-500">({player.elo})</span>
            </div>
          ))
        )}
      </div>
        {byes > 0 && (
          <div className="mt-2 p-2 bg-success-900/20 rounded text-success-300 text-xs">
            <strong>{byes} BYEs:</strong> Top seeds advance to Round 2
          </div>
        )}
      </div>
    </div>
  );
};

export default BracketHeader;
