import React, { useState, useMemo } from 'react';
import { X, Search, User, Users as UsersIcon, Filter, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';

interface Participant {
  id: string;
  name: string;
  captain_id?: string;
  elo?: number;
  wins?: number;
  losses?: number;
  isQualified?: boolean;
  isEliminated?: boolean;
}

interface PlayerPoolSidebarProps {
  show: boolean;
  onClose: () => void;
  participants: Participant[];
  waitingList: Participant[];
  matches: any[];
  tournamentType: 'solo' | 'team';
  onPlayerSelect: (playerId: string, participantName: string) => void;
  selectedMatchId?: string;
}

type FilterType = 'all' | 'active' | 'waiting' | 'qualified' | 'eliminated' | 'unassigned';

const PlayerPoolSidebar: React.FC<PlayerPoolSidebarProps> = ({
  show,
  onClose,
  participants,
  waitingList,
  matches,
  tournamentType,
  onPlayerSelect,
  selectedMatchId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const getPlayerIdFromParticipant = (participant: Participant): string => {
    return tournamentType === 'team' ? participant.captain_id! : participant.id;
  };

  const isPlayerAssigned = (playerId: string): boolean => {
    return matches.some(match =>
      match.player1_id === playerId || match.player2_id === playerId
    );
  };

  const getPlayerMatchCount = (playerId: string): number => {
    return matches.filter(match =>
      match.player1_id === playerId || match.player2_id === playerId
    ).length;
  };

  const filteredParticipants = useMemo(() => {
    let filtered: Participant[] = [];

    switch (filter) {
      case 'all':
        filtered = [...participants, ...waitingList];
        break;
      case 'active':
        filtered = participants.filter(p => !p.isQualified && !p.isEliminated);
        break;
      case 'waiting':
        filtered = waitingList;
        break;
      case 'qualified':
        filtered = participants.filter(p => p.isQualified);
        break;
      case 'eliminated':
        filtered = participants.filter(p => p.isEliminated);
        break;
      case 'unassigned':
        filtered = [...participants, ...waitingList].filter(p => {
          const playerId = getPlayerIdFromParticipant(p);
          return !isPlayerAssigned(playerId);
        });
        break;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [participants, waitingList, filter, searchQuery, matches]);

  if (!show) return null;

  const filterButtons: { type: FilterType; label: string; count: number }[] = [
    { type: 'all', label: 'Tous', count: participants.length + waitingList.length },
    { type: 'active', label: 'Actifs', count: participants.filter(p => !p.isQualified && !p.isEliminated).length },
    { type: 'waiting', label: 'Waiting List', count: waitingList.length },
    { type: 'unassigned', label: 'Non-assignés', count: [...participants, ...waitingList].filter(p => !isPlayerAssigned(getPlayerIdFromParticipant(p))).length },
    { type: 'qualified', label: 'Qualifiés', count: participants.filter(p => p.isQualified).length },
    { type: 'eliminated', label: 'Éliminés', count: participants.filter(p => p.isEliminated).length }
  ];

  return (
    <div className="fixed left-4 top-20 z-50 w-96 bg-dark-300 border-2 border-primary-500 rounded-lg shadow-2xl max-h-[85vh] flex flex-col">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 rounded-t-lg flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2">
          {tournamentType === 'team' ? (
            <UsersIcon className="h-5 w-5 text-white" />
          ) : (
            <User className="h-5 w-5 text-white" />
          )}
          <h3 className="text-white font-bold">
            Pool de {tournamentType === 'team' ? 'Teams' : 'Joueurs'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={`Rechercher ${tournamentType === 'team' ? 'une team' : 'un joueur'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="flex flex-wrap gap-1 flex-1">
            {filterButtons.map(btn => (
              <button
                key={btn.type}
                onClick={() => setFilter(btn.type)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  filter === btn.type
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-200 text-gray-400 hover:bg-dark-100'
                }`}
              >
                {btn.label} ({btn.count})
              </button>
            ))}
          </div>
        </div>

        {selectedMatchId && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-2">
            <p className="text-xs text-blue-300">
              <ArrowRight className="h-3 w-3 inline mr-1" />
              Sélectionnez un {tournamentType === 'team' ? 'team' : 'joueur'} à assigner au match sélectionné
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-2">
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Aucun {tournamentType === 'team' ? 'team' : 'joueur'} trouvé</p>
            </div>
          ) : (
            filteredParticipants.map(participant => {
              const playerId = getPlayerIdFromParticipant(participant);
              const isAssigned = isPlayerAssigned(playerId);
              const matchCount = getPlayerMatchCount(playerId);
              const isInWaitingList = waitingList.some(w => getPlayerIdFromParticipant(w) === playerId);

              return (
                <div
                  key={playerId}
                  className="bg-dark-200 rounded-lg p-3 border border-gray-600 hover:border-primary-500 transition-colors cursor-pointer"
                  onClick={() => onPlayerSelect(playerId, participant.name)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-white font-medium truncate">
                          {participant.name}
                        </span>
                        {isInWaitingList && (
                          <Badge variant="warning" size="sm">WL</Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {participant.elo && (
                          <span className="text-gray-400">
                            ELO: <span className="text-white">{Math.round(participant.elo)}</span>
                          </span>
                        )}
                        {participant.wins !== undefined && (
                          <span className="text-gray-400">
                            <span className="text-success-400">{participant.wins}W</span>
                            {participant.losses !== undefined && (
                              <span className="text-error-400">-{participant.losses}L</span>
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        {participant.isQualified && (
                          <Badge variant="success" size="sm">Qualifié</Badge>
                        )}
                        {participant.isEliminated && (
                          <Badge variant="error" size="sm">Éliminé</Badge>
                        )}
                        {isAssigned && (
                          <Badge variant="info" size="sm">{matchCount} match{matchCount > 1 ? 's' : ''}</Badge>
                        )}
                        {!isAssigned && !isInWaitingList && (
                          <Badge variant="default" size="sm">Disponible</Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayerSelect(playerId, participant.name);
                      }}
                      className="ml-2"
                    >
                      Assigner
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-600 bg-dark-200 rounded-b-lg flex-shrink-0">
        <div className="text-xs text-gray-400">
          <div className="flex justify-between mb-1">
            <span>Total:</span>
            <span className="text-white font-medium">{participants.length + waitingList.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Affichés:</span>
            <span className="text-white font-medium">{filteredParticipants.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerPoolSidebar;
