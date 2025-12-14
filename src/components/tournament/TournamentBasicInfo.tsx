import React, { useState } from 'react';
import { Globe, ArrowLeft, Star, AlertTriangle } from 'lucide-react';
import Input from '../ui/Input';
import RadioGroup from '../ui/RadioGroup';
import CountrySelector from './CountrySelector';
import ConfirmationModal from '../ui/ConfirmationModal';
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
  selectedGameTrailerUrl
}) => {
  const [showFeaturedConfirmModal, setShowFeaturedConfirmModal] = useState(false);
  const [pendingFeaturedAction, setPendingFeaturedAction] = useState<'enable' | 'disable' | null>(null);

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
        <h2 className="text-2xl font-bold text-white mb-2">Tournament Creation</h2>
        <p className="text-gray-400">Let's start with the basic information about your tournament</p>
      </div>

      <RadioGroup
        name="tournamentType"
        label="Tournament Type"
        value={tournamentType}
        onChange={(value) => setTournamentType(value as 'solo' | 'team')}
        options={[
          { 
            value: 'solo', 
            label: 'Solo Tournament', 
            description: 'Individual players compete against each other' 
          },
          { 
            value: 'team', 
            label: 'Team Tournament', 
            description: 'Teams of players compete against other teams' 
          },
        ]}
      />

      {tournamentType === 'team' && (
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
      )}
      
      <RadioGroup
        name="locationType"
        label="Tournament Location"
        value={locationType}
        onChange={(value) => setLocationType(value as 'online' | 'offline')}
        options={[
          { 
            value: 'online', 
            label: 'Online Tournament', 
            description: 'Tournament will be played online' 
          },
          { 
            value: 'offline', 
            label: 'Offline Tournament', 
            description: 'Tournament will be played at a physical location' 
          },
        ]}
      />
      
      {locationType === 'offline' && (
        <Input
          label="Location Name"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          required
          placeholder="Enter the venue or location name"
        />
      )}
      
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

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Eligible Countries
        </label>
        <CountrySelector 
          selectedCountries={eligibleCountries}
          onChange={setEligibleCountries}
          countries={countries}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Select countries eligible for this tournament. Leave empty to allow all countries.
        </p>
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