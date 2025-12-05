import React, { useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface ResetBracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  tournamentTitle?: string;
  hasMatches?: boolean;
}

const ResetBracketModal: React.FC<ResetBracketModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  tournamentTitle = 'this tournament',
  hasMatches = true
}) => {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText.toUpperCase() === 'RESET';

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      setConfirmText('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center space-x-2">
          <RotateCcw className="h-5 w-5 text-error-400" />
          <span>Reset Complete Bracket</span>
        </div>
      }
      fullscreen={true}
      backdropBlur={true}
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-4 bg-error-900/20 border-2 border-error-500/50 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-error-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-error-300 font-semibold mb-2">
              Warning: This action cannot be undone!
            </p>
            <p className="text-sm text-gray-300">
              You are about to completely reset the bracket for <span className="font-semibold text-white">{tournamentTitle}</span>.
            </p>
          </div>
        </div>

        <div className="bg-dark-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-200 mb-2">This action will:</p>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start space-x-2">
              <span className="text-error-400 font-bold">•</span>
              <span>Delete all matches in the bracket</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-error-400 font-bold">•</span>
              <span>Remove all match results and winners</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-error-400 font-bold">•</span>
              <span>Reset the bracket status to allow regeneration</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-error-400 font-bold">•</span>
              <span>Clear bracket launch information</span>
            </li>
          </ul>
        </div>

        {hasMatches && (
          <div className="bg-warning-900/20 border border-warning-500/30 rounded-lg p-3">
            <p className="text-sm text-warning-300">
              <span className="font-semibold">Note:</span> This bracket already has matches.
              All progress will be lost after reset.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Type <span className="font-bold text-white">RESET</span> to confirm:
          </label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type RESET here"
            className="font-mono"
            disabled={isLoading}
            autoComplete="off"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={!isConfirmed}
            className="bg-error-600 hover:bg-error-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            leftIcon={<RotateCcw size={16} />}
          >
            Reset Bracket
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ResetBracketModal;
