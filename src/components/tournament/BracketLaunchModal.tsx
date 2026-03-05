import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { AlertTriangle, CheckCircle, Users, Trophy, Target, Hash, GitBranch, Rocket, ShieldAlert } from 'lucide-react';
import { TournamentValidation, getBracketSizeInfo } from '../../utils/tournamentValidation';

export type LaunchMode = 'override_all' | 'use_waiting_list';

interface BracketLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: LaunchMode) => void;
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
  const isOverCapacity = validation.isOverCapacity || false;
  const overCapacityCount = validation.overCapacityCount || 0;

  const [selectedMode, setSelectedMode] = useState<LaunchMode>('override_all');

  const effectiveParticipantCount = isOverCapacity && selectedMode === 'use_waiting_list'
    ? (initialMaxPlayers || participantCount)
    : participantCount;

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
            <div className={`mt-1 ${validation.isValid ? (isOverCapacity ? 'text-amber-500' : 'text-green-500') : 'text-red-500'}`}>
              {validation.isValid ? (
                isOverCapacity ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <p className={`font-medium ${validation.isValid ? (isOverCapacity ? 'text-amber-400' : 'text-green-400') : 'text-red-400'}`}>
                {validation.isValid
                  ? (isOverCapacity ? 'Capacité dépassée' : 'Conditions remplies')
                  : 'Conditions non remplies'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {validation.message}
              </p>
            </div>
          </div>

          {isOverCapacity && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-amber-400">
                    {overCapacityCount} {participantLabel} en surplus
                  </p>
                  <p className="text-sm text-amber-300/80 mt-1">
                    Il y a <strong>{participantCount}</strong> {participantLabel} approuvés mais la capacité configurée est de <strong>{initialMaxPlayers}</strong>.
                    Choisissez comment procéder :
                  </p>

                  <div className="mt-4 space-y-3">
                    <label
                      className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedMode === 'override_all'
                          ? 'border-amber-500 bg-amber-900/30'
                          : 'border-gray-600 bg-dark-300/50 hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="launchMode"
                        value="override_all"
                        checked={selectedMode === 'override_all'}
                        onChange={() => setSelectedMode('override_all')}
                        className="mt-1 mr-3 accent-amber-500"
                      />
                      <div>
                        <p className="font-medium text-white text-sm">
                          Lancer avec tous les {participantCount} {participantLabel}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          La capacité maximale sera augmentée a {participantCount}. Tous les {participantLabel} approuvés seront inclus dans le bracket.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedMode === 'use_waiting_list'
                          ? 'border-amber-500 bg-amber-900/30'
                          : 'border-gray-600 bg-dark-300/50 hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="launchMode"
                        value="use_waiting_list"
                        checked={selectedMode === 'use_waiting_list'}
                        onChange={() => setSelectedMode('use_waiting_list')}
                        className="mt-1 mr-3 accent-amber-500"
                      />
                      <div>
                        <p className="font-medium text-white text-sm">
                          Lancer avec {initialMaxPlayers} {participantLabel} (capacité configurée)
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Les {overCapacityCount} derniers inscrits seront placés sur la liste d'attente (waiting list).
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

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
              <p className="text-2xl font-bold text-white">
                {isOverCapacity
                  ? (selectedMode === 'override_all' ? participantCount : initialMaxPlayers)
                  : (initialMaxPlayers || participantCount)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isOverCapacity
                  ? (selectedMode === 'override_all' ? 'Override - tous inclus' : `${overCapacityCount} en waiting list`)
                  : (initialMaxPlayers ? `${percentageFilled}% rempli` : 'Adapté aux participants')}
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
                <GitBranch className="h-5 w-5 text-accent-400" />
                <span className="font-medium text-gray-300">Structure du bracket (Single Elimination)</span>
              </div>

              {(() => {
                const bracketInfo = getBracketSizeInfo(effectiveParticipantCount);
                return (
                  <>
                    <div className="bg-dark-300/50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-gray-300">
                        <span className="text-primary-400 font-bold">{effectiveParticipantCount}</span> {participantLabel}
                        <span className="text-gray-500 mx-2">-&gt;</span>
                        Bracket de <span className="text-accent-400 font-bold">{bracketInfo.bracketSize}</span> places
                        <span className="text-xs text-gray-500 ml-2">(2^{Math.log2(bracketInfo.bracketSize)})</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Participants</p>
                        <p className="text-lg font-semibold text-white">{effectiveParticipantCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Rounds</p>
                        <p className="text-lg font-semibold text-white">{bracketInfo.rounds}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Matches R1</p>
                        <p className="text-lg font-semibold text-white">{bracketInfo.r1Matches}</p>
                      </div>
                      {bracketInfo.byes > 0 && (
                        <div>
                          <p className="text-xs text-gray-500">BYEs vers R2</p>
                          <p className="text-lg font-semibold text-amber-400">{bracketInfo.byes}</p>
                        </div>
                      )}
                    </div>

                    {bracketInfo.byes > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                        <p className="text-xs text-gray-400">
                          <span className="text-green-400 font-medium">{bracketInfo.r1Players}</span> {participantLabel} joueront au Round 1 ({bracketInfo.r1Matches} matches)
                        </p>
                        <p className="text-xs text-gray-400">
                          <span className="text-amber-400 font-medium">{bracketInfo.byes}</span> {participantLabel} (top seeds) passeront directement au Round 2
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
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
                <span className="text-green-500 mr-2">*</span>
                <span>Génération du bracket en mode brouillon pour vérification</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">*</span>
                <span>Enregistrement du nombre de participants réels ({effectiveParticipantCount})</span>
              </li>
              {hasFewerThanExpected && (
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">*</span>
                  <span>Conservation du nombre initial prévu ({initialMaxPlayers}) pour historique</span>
                </li>
              )}
              {isOverCapacity && selectedMode === 'override_all' && (
                <li className="flex items-start">
                  <span className="text-amber-500 mr-2">*</span>
                  <span>Override de la capacité maximale : {initialMaxPlayers} -&gt; {participantCount}</span>
                </li>
              )}
              {isOverCapacity && selectedMode === 'use_waiting_list' && (
                <li className="flex items-start">
                  <span className="text-amber-500 mr-2">*</span>
                  <span>{overCapacityCount} {participantLabel} seront placés en waiting list</span>
                </li>
              )}
              <li className="flex items-start">
                <span className="text-amber-500 mr-2">*</span>
                <span>Les inscriptions seront verrouillées automatiquement</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">*</span>
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
          {isOverCapacity ? (
            <Button
              onClick={() => onConfirm(selectedMode)}
              disabled={!validation.isValid}
              isLoading={isLoading}
              leftIcon={<Rocket size={16} />}
              className={selectedMode === 'override_all'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                : 'bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700'}
            >
              {selectedMode === 'override_all'
                ? `Override et lancer (${participantCount} ${participantLabel})`
                : `Lancer avec waiting list (${initialMaxPlayers} ${participantLabel})`}
            </Button>
          ) : (
            <Button
              onClick={() => onConfirm('override_all')}
              disabled={!validation.isValid}
              isLoading={isLoading}
              leftIcon={<Rocket size={16} />}
              className="bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700"
            >
              Confirmer et générer le bracket
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default BracketLaunchModal;
