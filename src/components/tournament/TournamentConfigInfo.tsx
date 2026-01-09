import React, { useEffect, useState } from 'react';
import { MessageCircle, HelpCircle, Image, Tv, Settings } from 'lucide-react';
import Input from '../ui/Input';
import DragDropUpload from '../ui/DragDropUpload';
import DiscordTestButton from './DiscordTestButton';
import { isValidDiscordUrl, isValidDiscordServerId } from '../../services/discordHealthcheckService';

interface TournamentConfigInfoProps {
  twitchUrl: string;
  setTwitchUrl: (url: string) => void;
  hasDiscord: boolean;
  setHasDiscord: (value: boolean) => void;
  discordUrl: string;
  setDiscordUrl: (url: string) => void;
  discordServerId: string;
  setDiscordServerId: (serverId: string) => void;
  headerFile: File | null;
  setHeaderFile: React.Dispatch<React.SetStateAction<File | null>>;
  headerPreview: string | null;
  setHeaderPreview: React.Dispatch<React.SetStateAction<string | null>>;
  selectedFields: string[];
  toggleFieldSelection: (fieldId: string) => void;
  fields: any[];
  handleRemoveFile: (
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>
  ) => void;
  privateServerCode?: string;
  setPrivateServerCode?: (code: string) => void;
  showPrivateServerCode?: boolean;
}

const TournamentConfigInfo: React.FC<TournamentConfigInfoProps> = ({
  twitchUrl,
  setTwitchUrl,
  hasDiscord,
  setHasDiscord,
  discordUrl,
  setDiscordUrl,
  discordServerId,
  setDiscordServerId,
  headerFile,
  setHeaderFile,
  headerPreview,
  setHeaderPreview,
  selectedFields,
  toggleFieldSelection,
  fields,
  handleRemoveFile,
  privateServerCode,
  setPrivateServerCode,
  showPrivateServerCode = false
}) => {
  const [discordUrlError, setDiscordUrlError] = useState<string | null>(null);
  const [discordServerIdError, setDiscordServerIdError] = useState<string | null>(null);

  useEffect(() => {
    if (!discordUrl) {
      setDiscordServerId('');
      setDiscordServerIdError(null);
    }
  }, [discordUrl, setDiscordServerId]);

  const handleDiscordUrlBlur = () => {
    if (discordUrl && !isValidDiscordUrl(discordUrl)) {
      setDiscordUrlError('Invalid Discord URL. Use https://discord.gg/... or https://discord.com/invite/...');
    } else {
      setDiscordUrlError(null);
    }
  };

  const handleDiscordServerIdBlur = () => {
    if (discordServerId && !isValidDiscordServerId(discordServerId)) {
      setDiscordServerIdError('Invalid Server ID format. It should be a 17-20 digit number.');
    } else if (discordUrl && !discordServerId) {
      setDiscordServerIdError('Server ID is required when Discord URL is provided.');
    } else {
      setDiscordServerIdError(null);
    }
  };

  const handleHeaderFileSelect = (file: File) => {
    setHeaderFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setHeaderPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleHeaderRemove = () => {
    handleRemoveFile(setHeaderFile, setHeaderPreview);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Registration Settings</h2>
        <p className="text-gray-400">Configure tournament branding and registration fields</p>
      </div>

      <div className="p-5 bg-gradient-to-br from-primary-500/5 via-blue-500/5 to-emerald-500/5 border border-primary-500/20 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-primary-500/20 to-blue-500/20 rounded-lg">
            <Image className="w-4 h-4 text-primary-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Tournament Header</h3>
            <p className="text-xs text-gray-400">Upload a banner image for your tournament</p>
          </div>
        </div>

        <DragDropUpload
          onFileSelect={handleHeaderFileSelect}
          onRemove={handleHeaderRemove}
          preview={headerPreview}
          recommendedSize="1200x400px"
          maxSizeMB={5}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-dark-200/50 border border-dark-100 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Tv className="w-4 h-4 text-purple-400" />
            <label className="text-sm font-medium text-gray-300">Twitch URL</label>
          </div>
          <Input
            type="url"
            value={twitchUrl}
            onChange={(e) => setTwitchUrl(e.target.value)}
            placeholder="https://twitch.tv/your-channel"
          />
        </div>

        {showPrivateServerCode && setPrivateServerCode && (
          <div className="p-4 bg-dark-200/50 border border-dark-100 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-amber-400" />
              <label className="text-sm font-medium text-gray-300">Private Server Code</label>
            </div>
            <Input
              type="text"
              value={privateServerCode || ''}
              onChange={(e) => setPrivateServerCode(e.target.value)}
              placeholder="Enter private server code"
            />
          </div>
        )}
      </div>

      <div className="p-4 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#5865F2]" />
            <div>
              <h3 className="text-sm font-semibold text-white">Discord Configuration</h3>
              <p className="text-xs text-gray-400">Does your tournament have a dedicated Discord?</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hasDiscord}
            onClick={() => {
              if (hasDiscord) {
                setDiscordUrl('');
                setDiscordServerId('');
                setDiscordUrlError(null);
                setDiscordServerIdError(null);
              }
              setHasDiscord(!hasDiscord);
            }}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
              transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:ring-offset-2 focus:ring-offset-dark-300
              ${hasDiscord ? 'bg-[#5865F2]' : 'bg-dark-200'}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                transition duration-200 ease-in-out
                ${hasDiscord ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        {hasDiscord && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Discord Invite URL
                </label>
                <Input
                  type="url"
                  value={discordUrl}
                  onChange={(e) => setDiscordUrl(e.target.value)}
                  onBlur={handleDiscordUrlBlur}
                  placeholder="https://discord.gg/your-server"
                  error={discordUrlError || undefined}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Discord Server ID {discordUrl && <span className="text-error-400">*</span>}
                </label>
                <Input
                  type="text"
                  value={discordServerId}
                  onChange={(e) => setDiscordServerId(e.target.value)}
                  onBlur={handleDiscordServerIdBlur}
                  placeholder="123456789012345678"
                  disabled={!discordUrl}
                  error={discordServerIdError || undefined}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-dark-300/50 rounded-lg">
              <HelpCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400">
                To get the Server ID: Enable Developer Mode in Discord (User Settings &gt; Advanced),
                right-click the server name, and select "Copy Server ID".
              </p>
            </div>

            {discordServerId && (
              <DiscordTestButton
                discordServerId={discordServerId}
                discordUrl={discordUrl}
              />
            )}
          </>
        )}
      </div>

      {fields.length > 0 && (
        <div className="p-4 bg-dark-200/50 border border-dark-100 rounded-xl">
          <label className="block text-sm font-medium text-gray-300 mb-4">
            Available Information Fields
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fields.map((field) => {
              const isSelected = selectedFields.includes(field.id);
              return (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => toggleFieldSelection(field.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-primary-500/10 border-primary-500/50'
                      : 'bg-dark-300/50 border-dark-100 hover:border-gray-500'
                  }`}
                >
                  <span className={`text-sm font-medium ${isSelected ? 'text-primary-300' : 'text-gray-300'}`}>
                    {field.name}
                  </span>
                  <div
                    className={`
                      relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent
                      transition-colors duration-200 ease-in-out
                      ${isSelected ? 'bg-primary-500' : 'bg-dark-100'}
                    `}
                  >
                    <span
                      className={`
                        pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0
                        transition duration-200 ease-in-out
                        ${isSelected ? 'translate-x-4' : 'translate-x-0'}
                      `}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentConfigInfo;
