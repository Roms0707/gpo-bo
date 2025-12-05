import { AlertCircle } from 'lucide-react';
import Button from './Button';

interface ConfigErrorScreenProps {
  error: Error;
  onRetry: () => void;
}

export function ConfigErrorScreen({ error, onRetry }: ConfigErrorScreenProps) {
  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center">
        <div className="mb-4 flex justify-center">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Configuration Error</h2>
        <p className="text-gray-300 mb-6">
          Failed to load the application configuration. Please check your connection and try again.
        </p>
        <div className="bg-gray-900 rounded p-4 mb-6 text-left">
          <p className="text-sm text-red-400 font-mono break-words">{error.message}</p>
        </div>
        <Button onClick={onRetry} className="w-full mb-4">
          Retry
        </Button>
        <p className="text-sm text-gray-400">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}
