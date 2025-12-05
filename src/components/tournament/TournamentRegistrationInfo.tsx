import React from 'react';
import { Upload, X } from 'lucide-react';
import Input from '../ui/Input';
import Checkbox from '../ui/Checkbox';

interface TournamentRegistrationInfoProps {
  registrationStartDate: string;
  setRegistrationStartDate: (date: string) => void;
  registrationEndDate: string;
  setRegistrationEndDate: (date: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  twitchUrl: string;
  setTwitchUrl: (url: string) => void;
  discordUrl: string;
  setDiscordUrl: (url: string) => void;
  iconFile: File | null;
  setIconFile: React.Dispatch<React.SetStateAction<File | null>>;
  iconPreview: string | null;
  setIconPreview: React.Dispatch<React.SetStateAction<string | null>>;
  headerFile: File | null;
  setHeaderFile: React.Dispatch<React.SetStateAction<File | null>>;
  headerPreview: string | null;
  setHeaderPreview: React.Dispatch<React.SetStateAction<string | null>>;
  selectedFields: string[];
  toggleFieldSelection: (fieldId: string) => void;
  fields: any[];
  handleFileChange: (
    e: React.ChangeEvent<HTMLInputElement>, 
    setFile: React.Dispatch<React.SetStateAction<File | null>>, 
    setPreview: React.Dispatch<React.SetStateAction<string | null>>
  ) => void;
  handleRemoveFile: (
    setFile: React.Dispatch<React.SetStateAction<File | null>>, 
    setPreview: React.Dispatch<React.SetStateAction<string | null>>
  ) => void;
}

const TournamentRegistrationInfo: React.FC<TournamentRegistrationInfoProps> = ({
  registrationStartDate,
  setRegistrationStartDate,
  registrationEndDate,
  setRegistrationEndDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  twitchUrl,
  setTwitchUrl,
  discordUrl,
  setDiscordUrl,
  iconFile,
  setIconFile,
  iconPreview,
  setIconPreview,
  headerFile,
  setHeaderFile,
  headerPreview,
  setHeaderPreview,
  selectedFields,
  toggleFieldSelection,
  fields,
  handleFileChange,
  handleRemoveFile
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Registration</h2>
        <p className="text-gray-400">Configure registration settings and tournament schedule</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registration Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Registration Start Date
          </label>
          <Input
            type="datetime-local"
            value={registrationStartDate}
            onChange={(e) => setRegistrationStartDate(e.target.value)}
            placeholder="dd/mm/yyyy, --:--"
          />
        </div>

        {/* Registration End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Registration End Date
          </label>
          <Input
            type="datetime-local"
            value={registrationEndDate}
            onChange={(e) => setRegistrationEndDate(e.target.value)}
            placeholder="dd/mm/yyyy, --:--"
          />
        </div>

        {/* Tournament Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tournament Start Date
          </label>
          <Input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            placeholder="dd/mm/yyyy, --:--"
          />
        </div>

        {/* Tournament End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tournament End Date
          </label>
          <Input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            placeholder="dd/mm/yyyy, --:--"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Twitch URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Twitch URL
          </label>
          <Input
            type="url"
            value={twitchUrl}
            onChange={(e) => setTwitchUrl(e.target.value)}
            placeholder="https://twitch.tv/your-channel"
          />
        </div>

        {/* Discord URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Discord URL
          </label>
          <Input
            type="url"
            value={discordUrl}
            onChange={(e) => setDiscordUrl(e.target.value)}
            placeholder="https://discord.gg/your-server"
          />
        </div>
      </div>

      {/* Tournament Icon */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tournament Icon
        </label>
        <div className="mt-1 flex items-center space-x-4">
          {iconPreview ? (
            <div className="relative">
              <img 
                src={iconPreview} 
                alt="Tournament icon preview" 
                className="h-16 w-16 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => handleRemoveFile(setIconFile, setIconPreview)}
                className="absolute -top-2 -right-2 bg-error-500 text-white rounded-full p-1 shadow-sm hover:bg-error-600 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-200 hover:bg-gray-50 dark:hover:bg-dark-100 cursor-pointer transition-colors">
              <Upload className="h-5 w-5 mr-2" />
              <span>Upload Icon</span>
              <input
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setIconFile, setIconPreview)}
              />
            </label>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Recommended size: 128x128px
          </span>
        </div>
      </div>
      
      {/* Tournament Header */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tournament Header
        </label>
        <div className="mt-1 flex items-center space-x-4">
          {headerPreview ? (
            <div className="relative">
              <img 
                src={headerPreview} 
                alt="Tournament header preview" 
                className="h-32 w-64 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => handleRemoveFile(setHeaderFile, setHeaderPreview)}
                className="absolute -top-2 -right-2 bg-error-500 text-white rounded-full p-1 shadow-sm hover:bg-error-600 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-200 hover:bg-gray-50 dark:hover:bg-dark-100 cursor-pointer transition-colors">
              <Upload className="h-5 w-5 mr-2" />
              <span>Upload Header</span>
              <input
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setHeaderFile, setHeaderPreview)}
              />
            </label>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Recommended size: 1200x400px
          </span>
        </div>
      </div>

      {/* Available Fields */}
      {fields.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Available Fields
          </label>
          <div className="bg-gray-50 dark:bg-dark-200 p-4 rounded-md border border-gray-200 dark:border-dark-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map((field) => (
                <Checkbox
                  key={field.id}
                  id={`field-${field.id}`}
                  label={field.name}
                  checked={selectedFields.includes(field.id)}
                  onChange={() => toggleFieldSelection(field.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentRegistrationInfo;