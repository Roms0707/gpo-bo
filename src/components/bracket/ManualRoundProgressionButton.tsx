import React, { useState } from 'react';
import { ChevronRight, Clock, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { getRoundName } from '../../services/roundNotificationService';

interface ManualRoundProgressionButtonProps {
  currentRound: number;
  nextRound: number;
  totalRounds: number;
  nextRoundDuration: number;
  onProceed: () => Promise<void>;
  isProcessing?: boolean;
}

const ManualRoundProgressionButton: React.FC<ManualRoundProgressionButtonProps> = ({
  currentRound,
  nextRound,
  totalRounds,
  nextRoundDuration,
  onProceed,
  isProcessing = false
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProgressing, setIsProgressing] = useState(false);

  const currentRoundName = getRoundName(currentRound, totalRounds);
  const nextRoundName = getRoundName(nextRound, totalRounds);

  const handleConfirm = async () => {
    setIsProgressing(true);
    try {
      await onProceed();
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Error during manual progression:', error);
    } finally {
      setIsProgressing(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirmModal(true)}
        disabled={isProcessing || isProgressing}
        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 border-2 border-green-500/50"
        size="lg"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Tous les matchs terminés</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Passer au {nextRoundName}</span>
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>
      </Button>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => !isProgressing && setShowConfirmModal(false)}
        title="Progression Manuelle au Round Suivant"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="flex items-start space-x-3 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-400 mb-2">
                Round Actuel Complété
              </h3>
              <p className="text-sm text-gray-300">
                Tous les matchs du <strong>{currentRoundName}</strong> sont terminés.
                Vous pouvez maintenant passer au round suivant avant l'expiration du timer.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-dark-200 rounded-lg border border-dark-300">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-gray-400">Round Actuel</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {currentRoundName}
              </div>
              <div className="text-xs text-green-400">Complété</div>
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

          <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="text-orange-400 font-bold mt-0.5">⚠</div>
              <div className="flex-1">
                <p className="text-sm text-gray-300">
                  <strong className="text-orange-400">Important:</strong> Cette action terminera le timer
                  du {currentRoundName} immédiatement et démarrera le timer du {nextRoundName}.
                  Les joueurs seront notifiés du changement de round.
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
                <span>Confirmer et Passer au {nextRoundName}</span>
                <ChevronRight className="h-5 w-5" />
              </div>
            </Button>

            <Button
              onClick={() => setShowConfirmModal(false)}
              disabled={isProgressing}
              variant="secondary"
              size="lg"
            >
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ManualRoundProgressionButton;
