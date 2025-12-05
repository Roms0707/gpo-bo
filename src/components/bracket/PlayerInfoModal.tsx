import React from 'react';
import { MessageCircle, Gamepad2, Trophy, Hash } from 'lucide-react';
import Modal from '../ui/Modal';
import { Player, Team } from './types';

interface PlayerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Player | Team | null;
  isTeam: boolean;
}

const PlayerInfoModal: React.FC<PlayerInfoModalProps> = ({
  isOpen,
  onClose,
  participant,
  isTeam
}) => {
  if (!participant) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Informations du joueur"
      size="md"
    >
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-1">
            <Trophy className="h-5 w-5 text-primary-500" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {isTeam ? 'Nom de l\'équipe' : 'Nom du joueur'}
            </span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {participant.name}
          </p>
        </div>

        {participant.seed && (
          <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Hash className="h-5 w-5 text-primary-500" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Seed
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              #{participant.seed}
            </p>
          </div>
        )}

        {'elo' in participant && participant.elo && (
          <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Trophy className="h-5 w-5 text-primary-500" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                ELO
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {participant.elo}
            </p>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-1">
            <MessageCircle className="h-5 w-5 text-primary-500" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Discord
            </span>
          </div>
          {participant.discord_handle ? (
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {participant.discord_handle}
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              Non renseigné
            </p>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-1">
            <Gamepad2 className="h-5 w-5 text-primary-500" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {participant.gamePublisherLabel || 'Game ID'}
            </span>
          </div>
          {participant.gamePublisherId ? (
            <p className="text-lg font-semibold text-gray-900 dark:text-white break-all">
              {participant.gamePublisherId}
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              Non renseigné
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PlayerInfoModal;
