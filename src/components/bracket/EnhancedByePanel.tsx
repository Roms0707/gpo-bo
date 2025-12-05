import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Info, X, Users, ArrowRight, History } from 'lucide-react';
import { Match } from './types';
import Button from '../ui/Button';
import { ByeDetectionResult } from '../../services/byeDetectionService';

interface EnhancedByePanelProps {
  byeDetection: ByeDetectionResult;
  show: boolean;
  onClose: () => void;
  totalRounds: number;
  onEnableEditing?: () => void;
  onFillBye?: (matchId: string) => void;
  onViewHistory?: () => void;
}

const EnhancedByePanel: React.FC<EnhancedByePanelProps> = ({
  byeDetection,
  show,
  onClose,
  totalRounds,
  onEnableEditing,
  onFillBye,
  onViewHistory
}) => {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  if (!show) return null;

  const {
    hasByes,
    totalByes,
    byesByRound,
    problematicByes,
    round1Byes,
    affectedRounds,
    canEnableEditing
  } = byeDetection;

  const toggleRound = (round: number) => {
    setExpandedRound(expandedRound === round ? null : round);
  };

  return (
    <div className="fixed right-4 top-20 z-50 w-96 bg-dark-300 border-2 border-primary-500 rounded-lg shadow-2xl max-h-[85vh] flex flex-col">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 rounded-t-lg flex items-center justify-between flex-shrink-0">
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

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        <div className="bg-dark-200 rounded-lg p-3 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total BYE détectés:</span>
            <span className={`text-xl font-bold ${problematicByes.length > 0 ? 'text-orange-400' : 'text-white'}`}>
              {totalByes}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Rounds affectés:</span>
            <span className="text-lg font-semibold text-white">{affectedRounds.length} / {totalRounds}</span>
          </div>
          {problematicByes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-medium text-orange-400">
                  {problematicByes.length} BYE problématique{problematicByes.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {round1Byes.length > 0 && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleRound(1)}
              className="w-full p-3 flex items-center justify-between hover:bg-green-900/10 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <h4 className="font-semibold text-green-300">Round 1 - BYE Automatiques</h4>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
                  {round1Byes.length}
                </span>
                <ArrowRight className={`h-4 w-4 text-green-400 transition-transform ${expandedRound === 1 ? 'rotate-90' : ''}`} />
              </div>
            </button>
            {expandedRound === 1 && (
              <div className="px-3 pb-3 space-y-2">
                <p className="text-xs text-green-200 mb-2">
                  Ces BYE sont normaux (nombre impair de participants). Le joueur passe automatiquement au tour suivant sans jouer.
                </p>
                {round1Byes.map(match => (
                  <div key={match.id} className="text-xs text-gray-300 bg-dark-300 px-2 py-2 rounded flex items-center justify-between">
                    <span>Match {match.position} - Le joueur avec le meilleur ELO</span>
                    <span className="text-green-400 text-xs">Auto-advance</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {affectedRounds.filter(r => r > 1).map(round => {
          const roundByes = byesByRound.get(round) || [];
          const isExpanded = expandedRound === round;

          return (
            <div key={round} className="bg-orange-900/20 border border-orange-500/30 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleRound(round)}
                className="w-full p-3 flex items-center justify-between hover:bg-orange-900/10 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  <h4 className="font-semibold text-orange-300">Round {round} - Action Requise</h4>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-orange-400 bg-orange-900/30 px-2 py-1 rounded">
                    {roundByes.length}
                  </span>
                  <ArrowRight className={`h-4 w-4 text-orange-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  <p className="text-xs text-orange-200 mb-2">
                    BYE détecté (nombre impair de participants dans ce round). Le joueur avec le meilleur ELO passe automatiquement au round suivant.
                  </p>
                  {roundByes.map(match => (
                    <div key={match.id} className="text-xs text-gray-300 bg-dark-300 px-2 py-2 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Match {match.position}</span>
                        <span className="text-orange-400 font-medium">
                          {match.winner_id ? 'Auto-advance actif' : 'En attente'}
                        </span>
                      </div>
                      {onFillBye && (
                        <Button
                          size="sm"
                          onClick={() => onFillBye(match.id)}
                          className="mt-1 w-full text-xs"
                        >
                          Remplir ce BYE
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {!hasByes && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-gray-300 font-medium">Aucun BYE détecté</p>
            <p className="text-xs text-gray-500 mt-1">Le bracket est complet</p>
          </div>
        )}

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-blue-300 mb-2 flex items-center">
            <Info className="h-3 w-3 mr-1" />
            Qu'est-ce qu'un BYE ?
          </h5>
          <ul className="text-xs text-blue-200 space-y-1">
            <li>• Un BYE signifie qu'un joueur ne joue pas ce round et passe automatiquement au suivant</li>
            <li>• Les BYE apparaissent quand le nombre de participants est impair dans un round</li>
            <li>• Le joueur avec le meilleur ELO reçoit le BYE en priorité</li>
            <li>• Exemple: 97 joueurs = 1 BYE au Round 1, puis d'autres BYE dans les rounds suivants</li>
            <li>• Exemple: 96 joueurs = 1 BYE seulement au Round 6 (quand il reste 3 joueurs)</li>
            <li>• Les matchs terminés restent protégés</li>
          </ul>
        </div>

        <div className="flex space-x-2">
          {canEnableEditing && onEnableEditing && (
            <Button
              size="sm"
              onClick={onEnableEditing}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              leftIcon={<Users size={14} />}
            >
              Activer l'Édition
            </Button>
          )}
          {onViewHistory && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onViewHistory}
              leftIcon={<History size={14} />}
            >
              Historique
            </Button>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="w-full"
        >
          Fermer
        </Button>
      </div>
    </div>
  );
};

export default EnhancedByePanel;
