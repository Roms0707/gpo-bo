import React from 'react';
import { AlertTriangle, FastForward, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Match, Player, Team } from './types';

interface ForceRoundProgressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  currentRound: number;
  nextRound: number;
  totalRounds: number;
  incompleteMatches: Match[];
  tournament: any;
  players: Player[];
  teams: Team[];
  currentRoundName: string;
  nextRoundName: string;
}

const ForceRoundProgressionModal: React.FC<ForceRoundProgressionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentRound,
  nextRound,
  totalRounds,
  incompleteMatches,
  tournament,
  players,
  teams,
  currentRoundName,
  nextRoundName
}) => {
  const [isProgressing, setIsProgressing] = React.useState(false);

  const getParticipantName = (participantId: string | null): string => {
    if (!participantId) return 'BYE';
    if (tournament?.type === 'team') {
      const team = teams.find(t => t.captain_id === participantId);
      return team?.name || 'Unknown Team';
    } else {
      const player = players.find(p => p.id === participantId);
      return player?.name || 'Unknown Player';
    }
  };

  const handleConfirm = async () => {
    setIsProgressing(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error during forced progression:', error);
    } finally {
      setIsProgressing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isProgressing && onClose()}
      title="Forcer la Progression au Round Suivant"
      maxWidth="max-w-3xl"
      fullscreen={true}
      backdropBlur={true}
    >
      <div className="space-y-6">
        {/* Warning Banner */}
        <div className="flex items-start space-x-3 p-4 bg-orange-900/30 border-2 border-orange-500/50 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-orange-400 mb-2">
              Attention: Progression Forcée
            </h3>
            <p className="text-sm text-gray-300">
              Vous êtes sur le point de forcer la progression au <strong>{nextRoundName}</strong> avant
              l'expiration du timer. Cette action aura les conséquences suivantes:
            </p>
          </div>
        </div>

        {/* Round Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-dark-200 rounded-lg border border-orange-500/30">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-medium text-gray-400">Round Actuel</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {currentRoundName}
            </div>
            <div className="text-xs text-orange-400">Sera terminé immédiatement</div>
          </div>

          <div className="p-4 bg-dark-200 rounded-lg border border-primary-500/30">
            <div className="flex items-center space-x-2 mb-2">
              <FastForward className="h-4 w-4 text-primary-400" />
              <span className="text-sm font-medium text-gray-400">Prochain Round</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {nextRoundName}
            </div>
            <div className="text-xs text-primary-400">Démarrera immédiatement</div>
          </div>
        </div>

        {/* Incomplete Matches Section */}
        {incompleteMatches.length > 0 && (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-start space-x-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-base font-semibold text-red-400 mb-1">
                  {incompleteMatches.length} Match{incompleteMatches.length > 1 ? 'es' : ''} Incomplet{incompleteMatches.length > 1 ? 's' : ''}
                </h4>
                <p className="text-sm text-gray-300 mb-3">
                  Les matchs suivants n'ont pas de vainqueur. Les deux joueurs seront considérés comme
                  ayant perdu par forfait (double forfeit) et seront éliminés du tournoi:
                </p>
              </div>
            </div>

            {/* List of incomplete matches */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {incompleteMatches.map((match, index) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-3 bg-dark-300 rounded border border-red-500/20"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono text-gray-500">
                      Match {index + 1}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-white">
                        {getParticipantName(match.player1_id)}
                      </span>
                      <span className="text-gray-500">vs</span>
                      <span className="text-sm text-white">
                        {getParticipantName(match.player2_id)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-red-400 font-medium">
                    Double Forfait
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Consequences List */}
        <div className="p-4 bg-dark-200 rounded-lg border border-gray-700">
          <h4 className="text-sm font-semibold text-white mb-3">Conséquences de cette action:</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start space-x-2">
              <span className="text-orange-400 font-bold">•</span>
              <span>Le timer du <strong>{currentRoundName}</strong> sera terminé immédiatement</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-orange-400 font-bold">•</span>
              <span>
                {incompleteMatches.length > 0
                  ? `${incompleteMatches.length} match(es) incomplet(s) seront marqués comme double forfait`
                  : 'Tous les matchs sont complétés, aucun forfait'
                }
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-orange-400 font-bold">•</span>
              <span>Les joueurs des matchs incomplets seront éliminés du tournoi</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-orange-400 font-bold">•</span>
              <span>Des BYEs automatiques seront créés dans le {nextRoundName} si nécessaire</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-orange-400 font-bold">•</span>
              <span>Le timer du <strong>{nextRoundName}</strong> démarrera avec sa durée configurée</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-orange-400 font-bold">•</span>
              <span>Les participants seront notifiés du changement de round</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleConfirm}
            disabled={isProgressing}
            isLoading={isProgressing}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white border-2 border-orange-500/50"
            size="lg"
          >
            <div className="flex items-center justify-center space-x-2">
              <FastForward className="h-5 w-5" />
              <span>Confirmer et Forcer la Progression</span>
            </div>
          </Button>

          <Button
            onClick={onClose}
            disabled={isProgressing}
            variant="secondary"
            size="lg"
          >
            Annuler
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ForceRoundProgressionModal;
