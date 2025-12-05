import React, { Fragment } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'large';
  maxWidth?: string;
  fullscreen?: boolean;
  backdropBlur?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  maxWidth,
  fullscreen = false,
  backdropBlur = false,
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    'large': 'max-w-4xl',
  };

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity ${
          fullscreen ? 'bg-opacity-70 backdrop-blur-sm z-[100]' : 'bg-opacity-50 z-40'
        } ${backdropBlur ? 'backdrop-blur-sm' : ''}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`fixed inset-0 overflow-y-auto ${
        fullscreen ? 'z-[101]' : 'z-50'
      }`}>
        <div className="flex min-h-full items-center justify-center p-2 sm:p-4 text-center">
          <div
            className={`w-full ${maxWidth || sizeClasses[size]} transform overflow-hidden rounded-lg bg-white dark:bg-dark-300 text-left align-middle shadow-xl transition-all ${
              fullscreen ? 'animate-in fade-in zoom-in-95 duration-200' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-dark-200 px-4 md:px-6 py-3 md:py-4">
              <h3 className="text-base md:text-lg font-medium leading-6 text-gray-900 dark:text-white">
                {title}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-1 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </Button>
            </div>

            {/* Content */}
            <div className="px-4 md:px-6 py-3 md:py-4 max-h-[calc(100vh-200px)] overflow-y-auto text-gray-900 dark:text-white">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-gray-200 dark:border-dark-200 px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-dark-300 sticky bottom-0">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default Modal;