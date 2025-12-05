import React from 'react';
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Match } from './types';

interface IncompleteMatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  incompleteMatches: Match[];
  currentRound: number;
  nextRound: number | null;
  tournament: any;
  players: any[];
  teams: any[];
  onProceedToNextRound: () => void;
  onStayOnCurrentRound: () => void;
  isProcessing?: boolean;
}

const IncompleteMatchesModal: React.FC<IncompleteMatchesModalProps> = ({
  isOpen,
  onClose,
  incompleteMatches,
  currentRound,
  nextRound,
  tournament,
  players,
  teams,
  onProceedToNextRound,
  onStayOnCurrentRound,
  isProcessing = false
}) => {
  const getParticipantName = (participantId: string | null): string => {
    if (!participantId) return 'TBD';

    if (tournament?.type === 'team') {
      const team = teams.find(t => t.captain_id === participantId);
      return team?.name || 'Unknown Team';
    } else {
      const player = players.find(p => p.id === participantId);
      return player?.name || 'Unknown Player';
    }
  };

  const getRoundName = (round: number, totalRounds: number): string => {
    if (round === totalRounds) return 'Finale';
    if (round === totalRounds - 1) return 'Demi-finale';
    if (round === totalRounds - 2) return 'Quart de finale';
    return `Round ${round}`;
  };

  const totalRounds = Math.max(...Array.from(new Set(
    [...incompleteMatches].map(m => m.round)
  )));

  const currentRoundName = getRoundName(currentRound, totalRounds);
  const nextRoundName = nextRound ? getRoundName(nextRound, totalRounds) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Progression du Tournoi"
      maxWidth="max-w-3xl"
      fullscreen={true}
      backdropBlur={true}
    >
      <div className="space-y-6">
        {/* Warning header */}
        <div className="flex items-start space-x-3 p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-orange-400 mb-2">
              Matchs Incomplets Détectés
            </h3>
            <p className="text-sm text-gray-300">
              Le {currentRoundName} comporte {incompleteMatches.length} match(s) non joué(s).
              Voulez-vous passer au round suivant ou attendre que tous les matchs soient terminés ?
            </p>
          </div>
        </div>

        {/* Incomplete matches list */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Matchs en attente ({incompleteMatches.length})
          </h4>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {incompleteMatches.map((match, index) => (
              <div
                key={match.id}
                className="flex items-center justify-between p-3 bg-dark-200 border border-dark-300 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-medium text-gray-400">
                    Match #{index + 1}
                  </div>
                  <div className="text-sm text-white">
                    {getParticipantName(match.player1_id)}
                    <span className="text-gray-400 mx-2">vs</span>
                    {getParticipantName(match.player2_id)}
                  </div>
                </div>
                <div className="text-xs px-2 py-1 bg-warning-900/30 text-warning-400 rounded">
                  En attente
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-dark-200 rounded-lg border border-dark-300">
            <div className="text-2xl font-bold text-white mb-1">
              {currentRound}
            </div>
            <div className="text-sm text-gray-400">Round Actuel</div>
          </div>
          <div className="p-4 bg-dark-200 rounded-lg border border-dark-300">
            <div className="text-2xl font-bold text-orange-400 mb-1">
              {incompleteMatches.length}
            </div>
            <div className="text-sm text-gray-400">Matchs Non Joués</div>
          </div>
        </div>

        {/* Decision buttons */}
        <div className="space-y-3">
          {nextRound && (
            <Button
              onClick={onProceedToNextRound}
              disabled={isProcessing}
              isLoading={isProcessing}
              className="w-full justify-between bg-primary-600 hover:bg-primary-700"
              size="lg"
            >
              <span>Passer au {nextRoundName}</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          )}

          <Button
            onClick={onStayOnCurrentRound}
            disabled={isProcessing}
            variant="secondary"
            className="w-full"
            size="lg"
          >
            Rester sur le {currentRoundName}
          </Button>
        </div>

        {/* Information note */}
        <div className="p-3 bg-dark-200 rounded-lg">
          <p className="text-xs text-gray-400">
            <strong>Note :</strong> Si vous choisissez de passer au round suivant, les matchs incomplets
            resteront en attente et devront être complétés manuellement. Le timer du {nextRoundName || 'prochain round'}
            démarrera automatiquement.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default IncompleteMatchesModal;
