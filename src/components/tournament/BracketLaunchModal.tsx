import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { AlertTriangle, CheckCircle, Users, Trophy, Target, Hash } from 'lucide-react';
import { TournamentValidation } from '../../utils/tournamentValidation';

interface BracketLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  validation: TournamentValidation;
  tournamentTitle: string;
  participantCount: number;
  pendingCount?: number;
  rejectedCount?: number;
  initialMaxPlayers: number | null;
  tournamentType: 'solo' | 'team';
  isLoading?: boolean;
}

const BracketLaunchModal: React.FC<BracketLaunchModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  validation,
  tournamentTitle,
  participantCount,
  pendingCount = 0,
  rejectedCount = 0,
  initialMaxPlayers,
  tournamentType,
  isLoading = false
}) => {
  const participantLabel = tournamentType === 'team' ? 'équipes' : 'joueurs';
  const hasFewerThanExpected = initialMaxPlayers && participantCount < initialMaxPlayers;
  const percentageFilled = initialMaxPlayers
    ? Math.round((participantCount / initialMaxPlayers) * 100)
    : 100;
  const hasPendingOrRejected = (pendingCount + rejectedCount) > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmer le lancement du tournoi"
      size="lg"
    >
      <div className="space-y-6">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="font-semibold text-blue-300 mb-2 flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            {tournamentTitle}
          </h3>
          <p className="text-sm text-gray-300">
            Vous êtes sur le point de générer le bracket pour ce tournoi.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className={`mt-1 ${validation.isValid ? 'text-green-500' : 'text-red-500'}`}>
              {validation.isValid ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <p className={`font-medium ${validation.isValid ? 'text-green-400' : 'text-red-400'}`}>
                {validation.isValid ? 'Conditions remplies' : 'Conditions non remplies'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {validation.message}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-dark-200 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-5 w-5 text-primary-400" />
                <span className="text-sm font-medium text-gray-400">Participants inscrits</span>
              </div>
              <p className="text-2xl font-bold text-white">{participantCount}</p>
              <p className="text-xs text-gray-500 mt-1">{participantLabel} approuvés</p>
            </div>

            <div className="bg-dark-200 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-5 w-5 text-accent-400" />
                <span className="text-sm font-medium text-gray-400">Capacité du bracket</span>
              </div>
              <p className="text-2xl font-bold text-white">{initialMaxPlayers || participantCount}</p>
              <p className="text-xs text-gray-500 mt-1">
                {initialMaxPlayers ? `${percentageFilled}% rempli` : 'Adapté aux participants'}
              </p>
            </div>
          </div>

          {initialMaxPlayers && initialMaxPlayers > participantCount && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Hash className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-400">Places disponibles</p>
                  <p className="text-sm text-blue-300 mt-1">
                    Le bracket sera créé avec <strong>{initialMaxPlayers}</strong> places au total.
                    Il y a actuellement <strong>{initialMaxPlayers - participantCount}</strong> place(s) vide(s) qui seront gérées comme des BYEs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasPendingOrRejected && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-400">Inscriptions non incluses</p>
                  <p className="text-sm text-blue-300 mt-1">
                    Seuls les {participantCount} {participantLabel} <strong>approuvés</strong> seront inclus dans le bracket.
                    {pendingCount > 0 && ` ${pendingCount} inscription(s) en attente`}
                    {pendingCount > 0 && rejectedCount > 0 && ' et'}
                    {rejectedCount > 0 && ` ${rejectedCount} inscription(s) rejetée(s)`}
                    {' '}ne seront <strong>PAS</strong> incluses.
                  </p>
                </div>
              </div>
            </div>
          )}

          {validation.isValid && (
            <div className="bg-dark-200 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-3">
                <Hash className="h-5 w-5 text-accent-400" />
                <span className="font-medium text-gray-300">Structure du bracket</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Participants</p>
                  <p className="text-lg font-semibold text-white">{participantCount}</p>
                </div>
                {validation.numberOfRounds !== undefined && (
                  <div>
                    <p className="text-xs text-gray-500">Nombre de rounds</p>
                    <p className="text-lg font-semibold text-white">{validation.numberOfRounds}</p>
                  </div>
                )}
                {validation.numberOfByes !== undefined && validation.numberOfByes > 0 && (
                  <div>
                    <p className="text-xs text-gray-500">BYEs attribués</p>
                    <p className="text-lg font-semibold text-amber-400">{validation.numberOfByes}</p>
                  </div>
                )}
              </div>
              {validation.bracketSize && validation.bracketSize !== participantCount && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400">
                    Capacité totale du bracket: <span className="font-medium text-gray-300">{validation.bracketSize}</span> places
                    {validation.bracketSize > participantCount && (
                      <span className="text-amber-400"> ({validation.bracketSize - participantCount} places vides)</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {hasFewerThanExpected && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-400">Attention</p>
                  <p className="text-sm text-amber-300 mt-1">
                    Le tournoi sera lancé avec {participantCount} {participantLabel} sur {initialMaxPlayers} prévus initialement.
                    Le nombre maximum sera ajusté automatiquement au nombre réel de participants.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-dark-300 border border-gray-700 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-300 mb-2">Actions qui seront effectuées :</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>Génération du bracket en mode brouillon pour vérification</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>Enregistrement du nombre de participants réels ({participantCount})</span>
              </li>
              {hasFewerThanExpected && (
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Conservation du nombre initial prévu ({initialMaxPlayers}) pour historique</span>
                </li>
              )}
              <li className="flex items-start">
                <span className="text-amber-500 mr-2">•</span>
                <span>Les inscriptions seront verrouillées automatiquement</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span className="font-medium">Cette action ne peut pas être annulée une fois le bracket en mode "live"</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!validation.isValid}
            isLoading={isLoading}
            className="bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700"
          >
            Confirmer et générer le bracket
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BracketLaunchModal;
