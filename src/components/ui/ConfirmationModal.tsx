import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {isDestructive && (
          <div className="flex items-center space-x-2 p-3 bg-warning-900/20 border border-warning-500/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-warning-400 flex-shrink-0" />
            <p className="text-sm text-warning-300">
              This action requires confirmation
            </p>
          </div>
        )}

        <p className="text-gray-300">{message}</p>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            isLoading={isLoading}
            className={isDestructive ? 'bg-error-600 hover:bg-error-700' : ''}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
