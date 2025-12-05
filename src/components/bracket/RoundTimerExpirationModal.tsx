import React, { useState } from 'react';
import { Clock, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { getRoundName } from '../../services/roundNotificationService';
import { Match, Player, Team } from './types';

interface RoundTimerExpirationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRound: number;
  nextRound: number | null;
  totalRounds: number;
  nextRoundDuration?: number;
  onConfirmProgression: () => Promise<void>;
  incompleteMatches?: Match[];
  tournament?: any;
  players?: Player[];
  teams?: Team[];
}

const RoundTimerExpirationModal: React.FC<RoundTimerExpirationModalProps> = ({
  isOpen,
  onClose,
  currentRound,
  nextRound,
  totalRounds,
  nextRoundDuration = 60,
  onConfirmProgression,
  incompleteMatches = [],
  tournament,
  players = [],
  teams = []
}) => {
  const [isProgressing, setIsProgressing] = useState(false);

  const currentRoundName = getRoundName(currentRound, totalRounds);
  const nextRoundName = nextRound ? getRoundName(nextRound, totalRounds) : null;

  const getParticipantName = (participantId: string | null): string => {
    if (!participantId) return 'Bye';
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
      await onConfirmProgression();
    } catch (error) {
      console.error('Error during progression:', error);
    } finally {
      setIsProgressing(false);
    }
  };

  const handleStay = () => {
    if (!isProgressing) {
      onClose();
    }
  };

  if (!nextRound) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={() => !isProgressing && onClose()}
        title="Timer du Round Expiré"
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex items-start space-x-3 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-400 mb-2">
                Temps Écoulé
              </h3>
              <p className="text-sm text-gray-300">
                Le timer du <strong>{currentRoundName}</strong> est expiré.
                C'est le dernier round du tournoi.
              </p>
            </div>
          </div>

          <div className="p-4 bg-dark-200 rounded-lg border border-dark-300">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-gray-400">Round Actuel</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {currentRoundName}
            </div>
            <div className="text-xs text-red-400">Timer Expiré</div>
          </div>

          {incompleteMatches.length > 0 && (
            <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
              <div className="flex items-start space-x-2 mb-3">
                <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-400 mb-2">
                    {incompleteMatches.length} match(s) non terminé(s):
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {incompleteMatches.map((match) => (
                      <div
                        key={match.id}
                        className="text-xs text-gray-300 bg-dark-300/50 px-2 py-1 rounded"
                      >
                        {getParticipantName(match.player1_id)} vs {getParticipantName(match.player2_id)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <Button
              onClick={handleStay}
              disabled={isProgressing}
              className="flex-1 bg-primary-600 hover:bg-primary-700"
              size="lg"
            >
              OK, Compris
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isProgressing && onClose()}
      title="Timer du Round Expiré"
      size="xl"
    >
      <div className="space-y-6">
        <div className="flex items-start space-x-3 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-400 mb-2">
              Temps Écoulé
            </h3>
            <p className="text-sm text-gray-300">
              Le timer du <strong>{currentRoundName}</strong> est expiré.
              Voulez-vous passer au round suivant maintenant?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-dark-200 rounded-lg border border-red-500/30">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-gray-400">Round Actuel</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {currentRoundName}
            </div>
            <div className="text-xs text-red-400">Timer Expiré</div>
          </div>

          <div className="p-4 bg-dark-200 rounded-lg border border-primary-500/30">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-primary-400" />
              <span className="text-sm font-medium text-gray-400">Prochain Round</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {nextRoundName}
            </div>
            <div className="text-xs text-primary-400">
              Durée: {nextRoundDuration} minutes
            </div>
          </div>
        </div>

        {incompleteMatches.length > 0 ? (
          <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
            <div className="flex items-start space-x-2 mb-3">
              <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-400 mb-2">
                  {incompleteMatches.length} match(s) non terminé(s):
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {incompleteMatches.map((match) => (
                    <div
                      key={match.id}
                      className="text-xs text-gray-300 bg-dark-300/50 px-2 py-1 rounded"
                    >
                      {getParticipantName(match.player1_id)} vs {getParticipantName(match.player2_id)}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Ces matchs seront considérés comme non terminés si vous passez au round suivant.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start space-x-3 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-400 mb-2">
                Tous les Matchs Terminés
              </h3>
              <p className="text-sm text-gray-300">
                Tous les matchs du {currentRoundName} sont complétés.
                Vous pouvez passer au round suivant en toute sécurité.
              </p>
            </div>
          </div>
        )}

        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-start space-x-2">
            <div className="text-blue-400 font-bold mt-0.5">ℹ</div>
            <div className="flex-1">
              <p className="text-sm text-gray-300">
                <strong className="text-blue-400">Information:</strong> En confirmant cette action,
                le timer du {currentRoundName} sera complété et le timer du {nextRoundName} démarrera
                immédiatement. Les joueurs seront notifiés du changement.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={handleConfirm}
            disabled={isProgressing}
            isLoading={isProgressing}
            className="flex-1 bg-primary-600 hover:bg-primary-700"
            size="lg"
          >
            <div className="flex items-center justify-center space-x-2">
              <span>Passer au {nextRoundName}</span>
              <ChevronRight className="h-5 w-5" />
            </div>
          </Button>

          <Button
            onClick={handleStay}
            disabled={isProgressing}
            variant="secondary"
            size="lg"
          >
            Rester sur ce Round
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RoundTimerExpirationModal;
