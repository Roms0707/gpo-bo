import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Wifi } from 'lucide-react';
import Button from '../ui/Button';
import { testDiscordConfiguration, isValidDiscordServerId, isValidDiscordUrl, DiscordHealthcheckResult } from '../../services/discordHealthcheckService';

interface DiscordTestButtonProps {
  discordServerId: string;
  discordUrl: string;
  disabled?: boolean;
}

const DiscordTestButton: React.FC<DiscordTestButtonProps> = ({
  discordServerId,
  discordUrl,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiscordHealthcheckResult | null>(null);

  const canTest = discordServerId &&
    isValidDiscordServerId(discordServerId) &&
    (!discordUrl || isValidDiscordUrl(discordUrl));

  const handleTest = async () => {
    if (!canTest || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      const healthcheckResult = await testDiscordConfiguration(discordServerId);
      setResult(healthcheckResult);
    } finally {
      setIsLoading(false);
    }
  };

  const getResultDisplay = () => {
    if (!result) return null;

    if (result.success) {
      return (
        <div className="flex items-start gap-2 p-3 bg-success-900/20 border border-success-500/30 rounded-lg mt-3">
          <CheckCircle className="w-5 h-5 text-success-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-success-300">Configuration Valid</p>
            <p className="text-xs text-success-400/80 mt-0.5">
              {result.guildName
                ? `Bot has access to server: ${result.guildName}`
                : result.message}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-start gap-2 p-3 bg-error-900/20 border border-error-500/30 rounded-lg mt-3">
        <XCircle className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-error-300">Configuration Error</p>
          <p className="text-xs text-error-400/80 mt-0.5">{result.message}</p>
        </div>
      </div>
    );
  };

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleTest}
        disabled={disabled || !canTest || isLoading}
        leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
      >
        {isLoading ? 'Testing...' : 'Test Discord Configuration'}
      </Button>
      {getResultDisplay()}
    </div>
  );
};

export default DiscordTestButton;
