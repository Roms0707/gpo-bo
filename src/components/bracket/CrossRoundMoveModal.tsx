import React from 'react';
import { AlertTriangle, ArrowRight, Users, Shield, Info } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface CrossRoundMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sourceRound: number;
  targetRound: number;
  playerName: string;
  sourceMatchPosition: number;
  targetMatchPosition: number;
  totalByes: number;
  isLoading?: boolean;
}

const CrossRoundMoveModal: React.FC<CrossRoundMoveModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  sourceRound,
  targetRound,
  playerName,
  sourceMatchPosition,
  targetMatchPosition,
  totalByes,
  isLoading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmation de Déplacement Cross-Round" size="lg" fullscreen={true} backdropBlur={true}>
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-4 bg-gradient-to-r from-orange-900/30 to-amber-900/30 border-2 border-orange-500/40 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-orange-300 font-semibold mb-1">Action Exceptionnelle Autorisée</h4>
            <p className="text-sm text-orange-200">
              Des BYE ont été détectés dans le bracket, vous permettant de réorganiser les participants entre différents rounds.
            </p>
          </div>
        </div>

        <div className="bg-dark-200 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">BYE détectés dans le bracket:</span>
            <span className="text-xl font-bold text-orange-400">{totalByes}</span>
          </div>
          <div className="flex items-center justify-center space-x-2 p-3 bg-dark-300 rounded-lg">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-xs text-green-300">Exception BYE Active</span>
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-sm font-semibold text-gray-300 flex items-center">
            <Info className="h-4 w-4 mr-2 text-blue-400" />
            Détails du Déplacement
          </h5>

          <div className="bg-dark-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Participant</p>
                <p className="font-semibold text-white flex items-center">
                  <Users className="h-4 w-4 mr-2 text-primary-400" />
                  {playerName}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-600 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 text-center">
                  <p className="text-xs text-gray-400 mb-1">De</p>
                  <div className="bg-dark-300 rounded px-3 py-2">
                    <p className="text-sm font-bold text-blue-400">Round {sourceRound}</p>
                    <p className="text-xs text-gray-400">Match {sourceMatchPosition}</p>
                  </div>
                </div>

                <ArrowRight className="h-8 w-8 text-orange-400 mx-4 flex-shrink-0" />

                <div className="flex-1 text-center">
                  <p className="text-xs text-gray-400 mb-1">Vers</p>
                  <div className="bg-dark-300 rounded px-3 py-2">
                    <p className="text-sm font-bold text-green-400">Round {targetRound}</p>
                    <p className="text-xs text-gray-400">Match {targetMatchPosition}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-blue-300 mb-2 flex items-center">
            <Info className="h-3 w-3 mr-1" />
            À Savoir
          </h5>
          <ul className="text-xs text-blue-200 space-y-1">
            <li>• Cette action est autorisée uniquement en présence de BYE</li>
            <li>• Le déplacement sera enregistré dans l'historique des modifications</li>
            <li>• Les matchs avec résultats restent protégés</li>
            <li>• Cette action peut être annulée avant la mise en live</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            isLoading={isLoading}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
          >
            Confirmer le Déplacement
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CrossRoundMoveModal;
