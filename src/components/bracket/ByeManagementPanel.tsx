import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { Match } from './types';
import Button from '../ui/Button';

interface ByeManagementPanelProps {
  byesByRound: Map<number, Match[]>;
  show: boolean;
  onClose: () => void;
  totalRounds: number;
}

const ByeManagementPanel: React.FC<ByeManagementPanelProps> = ({
  byesByRound,
  show,
  onClose,
  totalRounds
}) => {
  if (!show) return null;

  const totalByes = Array.from(byesByRound.values()).reduce((acc, matches) => acc + matches.length, 0);
  const byesAfterFirstRound = Array.from(byesByRound.entries()).filter(([round]) => round > 1);

  return (
    <div className="fixed right-4 top-20 z-50 w-80 bg-dark-300 border-2 border-primary-500 rounded-lg shadow-2xl">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Info className="h-5 w-5 text-white" />
          <h3 className="text-white font-bold">Gestion des BYE</h3>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Summary */}
        <div className="bg-dark-200 rounded-lg p-3 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total BYE détectés:</span>
            <span className="text-xl font-bold text-white">{totalByes}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Rounds affectés:</span>
            <span className="text-lg font-semibold text-white">{byesByRound.size} / {totalRounds}</span>
          </div>
        </div>

        {/* Round 1 BYEs */}
        {byesByRound.has(1) && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <h4 className="font-semibold text-green-300">Round 1 - BYE Automatiques</h4>
            </div>
            <p className="text-xs text-green-200 mb-2">
              {byesByRound.get(1)!.length} match(s) avec BYE au premier tour (gérés automatiquement)
            </p>
            <div className="space-y-1">
              {byesByRound.get(1)!.map(match => (
                <div key={match.id} className="text-xs text-gray-300 bg-dark-300 px-2 py-1 rounded">
                  Match {match.position} - Round {match.round}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BYEs after round 1 */}
        {byesAfterFirstRound.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <h4 className="font-semibold text-orange-300">BYE après Round 1</h4>
            </div>
            <p className="text-xs text-orange-200 bg-orange-900/20 border border-orange-500/30 rounded p-2">
              Ces BYE nécessitent votre attention. Vous pouvez les ajuster manuellement en mode draft. L'édition est activée automatiquement pour corriger ces BYE.
            </p>
            {byesAfterFirstRound.map(([round, matches]) => (
              <div key={round} className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
                <h5 className="font-semibold text-orange-300 mb-2">Round {round}</h5>
                <div className="space-y-1">
                  {matches.map(match => (
                    <div key={match.id} className="text-xs text-gray-300 bg-dark-300 px-2 py-1 rounded flex items-center justify-between">
                      <span>Match {match.position}</span>
                      <span className="text-orange-400 font-medium">À ajuster</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No BYEs */}
        {totalByes === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-gray-300">Aucun BYE détecté</p>
            <p className="text-xs text-gray-500 mt-1">Le bracket est complet</p>
          </div>
        )}

        {/* Help Text */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-blue-300 mb-2">💡 Comment gérer les BYE</h5>
          <ul className="text-xs text-blue-200 space-y-1">
            <li>• Les BYE du Round 1 sont automatiques</li>
            <li>• <strong>Exception BYE:</strong> Quand des BYE sont détectés après le Round 1, vous pouvez éditer le bracket en mode draft même si les rounds suivants ont commencé</li>
            <li>• Glissez-déposez les participants pour réorganiser</li>
            <li>• Ajoutez des backup players si disponibles</li>
            <li>• Passez le bracket en mode "live" une fois les BYE corrigés</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ByeManagementPanel;
