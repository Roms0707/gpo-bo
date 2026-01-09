import React, { useState } from 'react';
import { Globe, Star, AlertTriangle, Info, Users, User, Wifi, MapPin } from 'lucide-react';
import Input from '../ui/Input';
import RadioGroup from '../ui/RadioGroup';
import CountrySelector from './CountrySelector';
import ConfirmationModal from '../ui/ConfirmationModal';
import { ProjectConfigSelector } from './ProjectConfigSelector';
import { countries } from '../../data/countries';

interface TournamentBasicInfoProps {
  tournamentType: 'solo' | 'team';
  setTournamentType: (type: 'solo' | 'team') => void;
  locationType: 'online' | 'offline';
  setLocationType: (type: 'online' | 'offline') => void;
  locationName: string;
  setLocationName: (name: string) => void;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  eligibleCountries: string[];
  setEligibleCountries: (countries: string[]) => void;
  maxPlayersPerTeam: number;
  setMaxPlayersPerTeam: (count: number) => void;
  isFeatured: boolean;
  setIsFeatured: (featured: boolean) => void;
  selectedGameTrailerUrl?: string | null;
  configId: string | null;
  setConfigId: (configId: string | null) => void;
}

const TournamentBasicInfo: React.FC<TournamentBasicInfoProps> = ({
  tournamentType,
  setTournamentType,
  locationType,
  setLocationType,
  locationName,
  setLocationName,
  title,
  setTitle,
  description,
  setDescription,
  eligibleCountries,
  setEligibleCountries,
  maxPlayersPerTeam,
  setMaxPlayersPerTeam,
  isFeatured,
  setIsFeatured,
  selectedGameTrailerUrl,
  configId,
  setConfigId,
}) => {
  const [showFeaturedConfirmModal, setShowFeaturedConfirmModal] = useState(false);
  const [pendingFeaturedAction, setPendingFeaturedAction] = useState<'enable' | 'disable' | null>(null);

  const handleConfigChange = (newConfigId: string | null) => {
    setConfigId(newConfigId);
    if (newConfigId !== null) {
      setEligibleCountries([]);
    }
  };

  const isCountrySelectorDisabled = configId !== null;

  const handleFeaturedToggleClick = () => {
    const newAction = isFeatured ? 'disable' : 'enable';
    setPendingFeaturedAction(newAction);
    setShowFeaturedConfirmModal(true);
  };

  const handleFeaturedConfirm = () => {
    if (pendingFeaturedAction === 'enable') {
      setIsFeatured(true);
    } else if (pendingFeaturedAction === 'disable') {
      setIsFeatured(false);
    }
    setShowFeaturedConfirmModal(false);
    setPendingFeaturedAction(null);
  };

  const handleFeaturedCancel = () => {
    setShowFeaturedConfirmModal(false);
    setPendingFeaturedAction(null);
  };

  const hasTrailerUrl = selectedGameTrailerUrl && selectedGameTrailerUrl.trim() !== '';

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Tournament Information</h2>
        <p className="text-gray-400">Let's start with the basic information about your tournament</p>
      </div>

      <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <label htmlFor="featured-toggle" className="block text-sm font-medium text-white cursor-pointer">
                Featured Tournament
              </label>
              <p className="text-xs text-gray-400">
                Featured tournaments appear in the hero carousel on the homepage
              </p>
            </div>
          </div>
          <button
            id="featured-toggle"
            type="button"
            role="switch"
            aria-checked={isFeatured}
            onClick={handleFeaturedToggleClick}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
              transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-300
              ${isFeatured ? 'bg-amber-500' : 'bg-dark-200'}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                transition duration-200 ease-in-out
                ${isFeatured ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tournament Type
          </label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setTournamentType('solo')}
              className={`
                w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                ${tournamentType === 'solo'
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-dark-200 hover:border-gray-500 bg-dark-200/50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  p-2 rounded-lg
                  ${tournamentType === 'solo' ? 'bg-primary-500/20' : 'bg-dark-300'}
                `}>
                  <User className={`w-5 h-5 ${tournamentType === 'solo' ? 'text-primary-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className={`font-medium ${tournamentType === 'solo' ? 'text-primary-300' : 'text-white'}`}>
                    Solo Tournament
                  </p>
                  <p className="text-xs text-gray-400">Individual players compete</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setTournamentType('team')}
              className={`
                w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                ${tournamentType === 'team'
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-dark-200 hover:border-gray-500 bg-dark-200/50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  p-2 rounded-lg
                  ${tournamentType === 'team' ? 'bg-primary-500/20' : 'bg-dark-300'}
                `}>
                  <Users className={`w-5 h-5 ${tournamentType === 'team' ? 'text-primary-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className={`font-medium ${tournamentType === 'team' ? 'text-primary-300' : 'text-white'}`}>
                    Team Tournament
                  </p>
                  <p className="text-xs text-gray-400">Teams compete against each other</p>
                </div>
              </div>
            </button>
          </div>
          {tournamentType === 'team' && (
            <div className="mt-3">
              <Input
                label="Maximum Players per Team"
                type="number"
                min="1"
                max="20"
                value={maxPlayersPerTeam.toString()}
                onChange={(e) => setMaxPlayersPerTeam(parseInt(e.target.value) || 5)}
                placeholder="Enter max players per team"
                required
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tournament Location
          </label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setLocationType('online')}
              className={`
                w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                ${locationType === 'online'
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-dark-200 hover:border-gray-500 bg-dark-200/50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  p-2 rounded-lg
                  ${locationType === 'online' ? 'bg-primary-500/20' : 'bg-dark-300'}
                `}>
                  <Wifi className={`w-5 h-5 ${locationType === 'online' ? 'text-primary-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className={`font-medium ${locationType === 'online' ? 'text-primary-300' : 'text-white'}`}>
                    Online Tournament
                  </p>
                  <p className="text-xs text-gray-400">Played remotely online</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setLocationType('offline')}
              className={`
                w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                ${locationType === 'offline'
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-dark-200 hover:border-gray-500 bg-dark-200/50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  p-2 rounded-lg
                  ${locationType === 'offline' ? 'bg-primary-500/20' : 'bg-dark-300'}
                `}>
                  <MapPin className={`w-5 h-5 ${locationType === 'offline' ? 'text-primary-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className={`font-medium ${locationType === 'offline' ? 'text-primary-300' : 'text-white'}`}>
                    Offline Tournament
                  </p>
                  <p className="text-xs text-gray-400">Physical venue location</p>
                </div>
              </div>
            </button>
          </div>
          {locationType === 'offline' && (
            <div className="mt-3">
              <Input
                label="Location Name"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                required
                placeholder="Enter the venue or location name"
              />
            </div>
          )}
        </div>
      </div>

      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        placeholder="Enter tournament title"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-200 px-3 py-2 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your tournament..."
        />
      </div>

      <ProjectConfigSelector
        value={configId}
        onChange={handleConfigChange}
        label="Project Configuration"
        helpText="Select a project to limit this tournament to a specific frontend, or choose Worldwide for all projects."
      />

      <div className={isCountrySelectorDisabled ? 'opacity-50' : ''}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Eligible Countries
        </label>
        {isCountrySelectorDisabled ? (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-300 font-medium">Country restrictions overridden</p>
                <p className="text-xs text-blue-400/80 mt-1">
                  When a project configuration is selected, country eligibility is managed by the project.
                  Select "Worldwide (All Projects)" to manually configure country restrictions.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <CountrySelector
              selectedCountries={eligibleCountries}
              onChange={setEligibleCountries}
              countries={countries}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Select countries eligible for this tournament. Leave empty to allow all countries.
            </p>
          </>
        )}
      </div>

      <ConfirmationModal
        isOpen={showFeaturedConfirmModal}
        onClose={handleFeaturedCancel}
        onConfirm={handleFeaturedConfirm}
        title={pendingFeaturedAction === 'enable' ? 'Enable Featured Tournament' : 'Remove from Featured'}
        message={
          pendingFeaturedAction === 'enable' ? (
            <div className="space-y-3">
              <p>This tournament will appear in the hero carousel on the homepage, giving it prominent visibility to all users.</p>
              {!hasTrailerUrl && (
                <div className="flex items-start gap-2 p-3 bg-warning-900/20 border border-warning-500/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-warning-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-warning-300">
                    The selected game does not have a trailer URL configured. The featured tournament will display without a video background.
                  </p>
                </div>
              )}
            </div>
          ) : (
            'This tournament will be removed from the hero carousel and will no longer have featured visibility on the homepage.'
          )
        }
        confirmText={pendingFeaturedAction === 'enable' ? 'Enable' : 'Remove'}
        cancelText="Cancel"
        isDestructive={pendingFeaturedAction === 'disable'}
      />
    </div>
  );
};

export default TournamentBasicInfo;
