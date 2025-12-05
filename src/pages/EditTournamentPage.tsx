import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTournamentStore } from '../store/tournamentStore';
import { useFieldStore } from '../store/fieldStore';
import { useGameStore } from '../store/gameStore';
import { supabase } from '../lib/supabase';
import TournamentGameInfo from '../components/tournament/TournamentGameInfo';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import RadioGroup from '../components/ui/RadioGroup';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Select from '../components/ui/Select';
import Checkbox from '../components/ui/Checkbox';
import Modal from '../components/ui/Modal';
import PrizeManager from '../components/tournament/PrizeManager';
import CountrySelector from '../components/tournament/CountrySelector';
import { countries } from '../../src/data/countries';
import { Calendar, Upload, X, Globe, ArrowLeft, ArrowRight, Check, Gamepad2, Users, Monitor, Smartphone, Tablet, Headphones, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Database } from '../types/supabase';

type Tournament = Database['public']['Tables']['tournaments']['Row'];

interface Prize {
  id?: string;
  position: number;
  title: string;
  description: string;
  image_url?: string | null;
  imageFile?: File | null;
  imagePreview?: string | null;
}

const EditTournamentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { updateTournament, isLoading } = useTournamentStore();
  const { fields, fetchFields } = useFieldStore();
  const { games, fetchGames } = useGameStore();
  
  // Modal and step management
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  // Tournament state
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Step 1: Basic Information
  const [tournamentType, setTournamentType] = useState<'solo' | 'team'>('solo');
  const [locationType, setLocationType] = useState<'online' | 'offline'>('online');
  const [locationName, setLocationName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eligibleCountries, setEligibleCountries] = useState<string[]>([]);
  const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState(5);
  
  // Step 2: Game Information
  const [selectedGameId, setSelectedGameId] = useState('');
  const [selectedBattleRoyaleGame, setSelectedBattleRoyaleGame] = useState('');
  const [tournamentFormat, setTournamentFormat] = useState('Swiss');
  const [maxPlayers, setMaxPlayers] = useState('16');
  const [customPlayerCount, setCustomPlayerCount] = useState('');
  const [minimumAge, setMinimumAge] = useState(13);
  const [compatibleDevices, setCompatibleDevices] = useState<string[]>([]);
  
  // Round Robin specific settings
  const [roundRobinGroupSize, setRoundRobinGroupSize] = useState('4');
  const [roundRobinMaxPlayers, setRoundRobinMaxPlayers] = useState('16');
  
  // New field for max_nb_players
  const [maxNbPlayers, setMaxNbPlayers] = useState('16');

  // Backup players settings
  const [allowBackups, setAllowBackups] = useState(false);
  const [maxBackupPlayers, setMaxBackupPlayers] = useState('0');

  // Step 3: Registration
  const [registrationStartDate, setRegistrationStartDate] = useState('');
  const [registrationEndDate, setRegistrationEndDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [twitchUrl, setTwitchUrl] = useState('');
  const [discordUrl, setDiscordUrl] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  
  // Step 4: Prizes
  const [prizes, setPrizes] = useState<Prize[]>([]);
  
  // Private server code
  const [privateServerCode, setPrivateServerCode] = useState('');
  
  // Image uploads
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [announcementFile, setAnnouncementFile] = useState<File | null>(null);
  
  // Image previews
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [announcementPreview, setAnnouncementPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchFields();
    fetchGames();
    
    const fetchTournament = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        if (!data) {
          setError('Tournament not found');
          setLoading(false);
          return;
        }
        
        // Load tournament data
        setTournament(data);
        
        // DEBUG: Log the raw tournament data for analysis
        console.log('DEBUG: Raw tournament data:', data);
        console.log('DEBUG: Raw tournament_format from DB:', data.tournament_format);
        
        setTournamentType(data.type as 'solo' | 'team');
        setLocationType(data.location_type as 'online' | 'offline' || 'online');
        setLocationName(data.location_name || '');
        setTitle(data.title);
        setDescription(data.description || '');
        setStartDate(new Date(data.start_date).toISOString().slice(0, 16));
        setEndDate(new Date(data.end_date).toISOString().slice(0, 16));
        setSelectedGameId(data.game_id || '');
        
        // Load max_nb_players if it exists
        if (data.max_nb_players) {
          setMaxNbPlayers(data.max_nb_players.toString());
        }

        // Load backup players settings
        setAllowBackups(data.allow_backups || false);
        if (data.max_backup_players) {
          setMaxBackupPlayers(data.max_backup_players.toString());
        }

        // Load registration dates if they exist
        if (data.registration_start_date) {
          setRegistrationStartDate(new Date(data.registration_start_date).toISOString().slice(0, 16));
        }
        if (data.registration_end_date) {
          setRegistrationEndDate(new Date(data.registration_end_date).toISOString().slice(0, 16));
        }
        
        setTwitchUrl(data.twitch_url || '');
        setDiscordUrl(data.discord_url || '');
        
        // Parse tournament format and extract player count information
        const format = data.tournament_format || 'Swiss';
        console.log('DEBUG: Format variable set to:', format);
        
        // More robust format detection
        const lowerCaseFormat = format.toLowerCase();
        console.log('DEBUG: Lowercase format for detection:', lowerCaseFormat);
        
        let detectedFormat = 'Swiss'; // Default value
        
        if (format.startsWith('Round Robin')) {
          console.log('DEBUG: Detected Round Robin format');
          detectedFormat = 'Round Robin';
          
          // Extract group size from format string like "Round Robin (4 players per group)"
          const groupSizeMatch = format.match(/\((\d+) players per group/);
          if (groupSizeMatch) {
            setRoundRobinGroupSize(groupSizeMatch[1]);
          }
          
          // Extract max players from format string like "max 16 players"
          const maxPlayersMatch = format.match(/max (\d+) players/);
          if (maxPlayersMatch) {
            setRoundRobinMaxPlayers(maxPlayersMatch[1]);
          }
        } else if (format.startsWith('Swiss')) {
          console.log('DEBUG: Detected Swiss format');
          detectedFormat = 'Swiss';
          // Extract player count from format string like "Swiss (64 players)"
          const playerCountMatch = format.match(/\((\d+) players\)/);
          if (playerCountMatch) {
            setMaxPlayers(playerCountMatch[1]);
          }
        } else if (format.startsWith('Single Elimination')) {
          console.log('DEBUG: Detected Single Elimination format');
          detectedFormat = 'Single Elimination';
          // Extract player count from format string like "Single Elimination (32 players)"
          const playerCountMatch = format.match(/\((\d+) players\)/);
          if (playerCountMatch) {
            setCustomPlayerCount(playerCountMatch[1]);
          }
        } else {
          // Check for Battle Royale keywords
          const battleRoyaleKeywords = ['battle royale', 'warzone', 'apex', 'fortnite', 'pubg', 'free fire', 'freefire'];
          console.log('DEBUG: Checking for Battle Royale keywords in:', lowerCaseFormat);
          
          let isBattleRoyale = false;
          for (const keyword of battleRoyaleKeywords) {
            if (lowerCaseFormat.includes(keyword)) {
              console.log('DEBUG: Found Battle Royale keyword:', keyword);
              isBattleRoyale = true;
              break;
            }
          }
          
          if (isBattleRoyale) {
            console.log('DEBUG: Setting format to Battle Royale');
            detectedFormat = 'Battle Royale';
          } else {
            console.log('DEBUG: No Battle Royale keywords found, using format as-is:', format);
            detectedFormat = format;
          }
        }
        
        console.log('DEBUG: Final detectedFormat:', detectedFormat);
        setTournamentFormat(detectedFormat);
        
        // Ensure selectedGameId is set for non-Battle Royale games
        if (detectedFormat === 'Battle Royale') {
          setSelectedBattleRoyaleGame(data.game_id || '');
          setSelectedGameId('');
          console.log('DEBUG: Setting for Battle Royale - selectedBattleRoyaleGame:', data.game_id, 'selectedGameId: cleared');
        } else {
          setSelectedGameId(data.game_id || '');
          setSelectedBattleRoyaleGame('');
          console.log('DEBUG: Setting for non-Battle Royale - selectedGameId:', data.game_id, 'selectedBattleRoyaleGame: cleared');
        }
        
        // Load eligible countries if they exist
        if (data.eligible_countries) {
          setEligibleCountries(data.eligible_countries.split(','));
        }
        
        // Load minimum age if it exists
        if (data.minimum_age) {
          setMinimumAge(data.minimum_age);
        }
        
        // Load max players per team if it exists
        if (data.max_players_per_team) {
          setMaxPlayersPerTeam(data.max_players_per_team);
        }
        
        // Load compatible devices
        if (data.compatible_devices) {
          setCompatibleDevices(data.compatible_devices.split(','));
        }
        
        // Load private server code if it exists
        if (data.private_server_code) {
          setPrivateServerCode(data.private_server_code);
        }
        
        // Set image previews from existing URLs
        if (data.icon_url) {
          setIconPreview(data.icon_url);
        }
        
        if (data.header_url) {
          setHeaderPreview(data.header_url);
        }
        
        if (data.announcement_url) {
          setAnnouncementPreview(data.announcement_url);
        }
        
        // Load field values
        const { data: fieldValues, error: fieldError } = await supabase
          .from('tournament_field_values')
          .select('field_id')
          .eq('tournament_id', id);
          
        if (!fieldError && fieldValues) {
          setSelectedFields(fieldValues.map(fv => fv.field_id));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching tournament:', error);
        setError('Failed to load tournament');
        setLoading(false);
      }
    };
    
    fetchTournament();
  }, [id, fetchFields, fetchGames]);

  // Update max players when group size changes
  useEffect(() => {
    if (roundRobinGroupSize === '4') {
      setRoundRobinMaxPlayers('16');
    } else if (roundRobinGroupSize === '6') {
      setRoundRobinMaxPlayers('12');
    }
  }, [roundRobinGroupSize]);

  // Update maxNbPlayers when format or player count changes
  useEffect(() => {
    if (tournamentFormat === 'Swiss') {
      setMaxNbPlayers(maxPlayers);
    } else if (tournamentFormat === 'Round Robin') {
      setMaxNbPlayers(roundRobinMaxPlayers);
    } else if (tournamentFormat === 'Single Elimination') {
      setMaxNbPlayers(customPlayerCount);
    }
  }, [tournamentFormat, maxPlayers, roundRobinMaxPlayers, customPlayerCount]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    
    // Navigate immediately after closing the modal
    if (location.state?.from === 'tournament-detail') {
      navigate(`/tournaments/${id}`);
    } else {
      navigate('/');
    }
  };

  const toggleFieldSelection = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = (setFile: React.Dispatch<React.SetStateAction<File | null>>, setPreview: React.Dispatch<React.SetStateAction<string | null>>, currentUrl: string | null = null) => {
    setFile(null);
    setPreview(null);
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      if (!file) return null;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${folder}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tournament-image-bucket')
        .upload(filePath, file);
        
      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        toast.error(`Error uploading file: ${uploadError.message}`);
        return null;
      }
      
      const { data } = supabase.storage
        .from('tournament-image-bucket')
        .getPublicUrl(filePath);
        
      return data.publicUrl;
    } catch (error) {
      console.error('Error in file upload:', error);
      toast.error('Failed to upload file. Please try again.');
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!user || !tournament) return;
    
    try {
      // Upload icon if a new one is provided
      let iconUrl = tournament.icon_url;
      if (iconFile) {
        const newIconUrl = await uploadFile(iconFile, 'icons');
        if (newIconUrl) {
          iconUrl = newIconUrl;
        }
      }
      
      // Upload header if a new one is provided
      let headerUrl = tournament.header_url;
      if (headerFile) {
        const newHeaderUrl = await uploadFile(headerFile, 'headers');
        if (newHeaderUrl) {
          headerUrl = newHeaderUrl;
        }
      }
      
      // Upload announcement if a new one is provided
      let announcementUrl = tournament.announcement_url;
      if (announcementFile) {
        const newAnnouncementUrl = await uploadFile(announcementFile, 'announcements');
        if (newAnnouncementUrl) {
          announcementUrl = newAnnouncementUrl;
        }
      }
      
      const devicesString = compatibleDevices.length > 0 ? compatibleDevices.join(',') : null;
      const countriesString = eligibleCountries.length > 0 ? eligibleCountries.join(',') : null;
      
      // Prepare tournament format string with player count information
      let finalTournamentFormat = tournamentFormat;
      if (tournamentFormat === 'Round Robin') {
        finalTournamentFormat = `Round Robin (${roundRobinGroupSize} players per group, max ${roundRobinMaxPlayers} players)`;
      } else if (tournamentFormat === 'Swiss') {
        finalTournamentFormat = `Swiss (${maxPlayers} players)`;
      } else if (tournamentFormat === 'Single Elimination') {
        finalTournamentFormat = `Single Elimination (${customPlayerCount} players)`;
      } else if (tournamentFormat === 'Battle Royale') {
        const selectedGame = games.find(game => game.id === selectedBattleRoyaleGame);
        finalTournamentFormat = `Battle Royale - ${selectedGame?.name || 'Unknown'}`;
      }

      // Prepare main prize from first prize (for backward compatibility)
      const mainPrize = prizes.length > 0 ? prizes[0].description : '';
      
      // Determine which game ID to use
      const finalGameId = tournamentFormat === 'Battle Royale' ? selectedBattleRoyaleGame : selectedGameId;
      
      const result = await updateTournament(id!, {
        title,
        description,
        type: tournamentType,
        location_type: locationType,
        location_name: locationType === 'offline' ? locationName : null,
        start_date: startDate,
        end_date: endDate,
        registration_start_date: registrationStartDate || null,
        registration_end_date: registrationEndDate || null,
        status: new Date() < new Date(startDate) ? 'upcoming' : 
               (new Date() >= new Date(startDate) && new Date() <= new Date(endDate)) ? 'active' : 'past',
        icon_url: iconUrl,
        header_url: headerUrl,
        main_prize: mainPrize,
        twitch_url: twitchUrl,
        discord_url: discordUrl,
        compatible_devices: devicesString,
        announcement_url: announcementUrl,
        tournament_format: finalTournamentFormat,
        game_id: finalGameId || null,
        eligible_countries: countriesString,
        minimum_age: minimumAge,
        max_players_per_team: tournamentType === 'team' ? maxPlayersPerTeam : null,
        max_nb_players: parseInt(maxNbPlayers) || null,
        private_server_code: privateServerCode || null,
        allow_backups: allowBackups,
        max_backup_players: allowBackups && maxBackupPlayers ? parseInt(maxBackupPlayers) : null,
      });
      
      if (result.error) throw result.error;
      
      // Update field values if needed
      if (JSON.stringify(selectedFields.sort()) !== JSON.stringify((await supabase
        .from('tournament_field_values')
        .select('field_id')
        .eq('tournament_id', id))
        .data?.map(fv => fv.field_id)
        .sort() || [])) {
        
        // Delete existing field values
        await supabase
          .from('tournament_field_values')
          .delete()
          .eq('tournament_id', id);
          
        // Insert new field values
        if (selectedFields.length > 0) {
          const fieldValues = selectedFields.map(fieldId => ({
            tournament_id: id!,
            field_id: fieldId,
            value: 'default'
          }));
          
          await supabase
            .from('tournament_field_values')
            .insert(fieldValues);
        }
      }
      
      toast.success('Tournament updated successfully!');
      handleCloseModal();
    } catch (error) {
      console.error('Error updating tournament:', error);
      toast.error('Failed to update tournament');
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
            step < currentStep 
              ? 'bg-primary-600 border-primary-600 text-white' 
              : step === currentStep
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'bg-gray-200 dark:bg-dark-200 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
          }`}>
            {step < currentStep ? (
              <Check className="w-5 h-5" />
            ) : (
              <span className="text-sm font-medium">{step}</span>
            )}
          </div>
          {step < totalSteps && (
            <div className={`w-16 h-0.5 mx-2 transition-all duration-200 ${
              step < currentStep ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Tournament Information</h2>
        <p className="text-gray-400">Update the basic information about your tournament</p>
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
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Game Information</h2>
        <p className="text-gray-400">Configure the game settings and tournament format</p>
      </div>

      <TournamentGameInfo
        selectedGameId={selectedGameId}
        setSelectedGameId={setSelectedGameId}
        tournamentFormat={tournamentFormat}
        setTournamentFormat={setTournamentFormat}
        maxPlayers={maxPlayers}
        setMaxPlayers={setMaxPlayers}
        customPlayerCount={customPlayerCount}
        setCustomPlayerCount={setCustomPlayerCount}
        minimumAge={minimumAge}
        setMinimumAge={setMinimumAge}
        compatibleDevices={compatibleDevices}
        handleDeviceToggle={handleDeviceToggle}
        roundRobinGroupSize={roundRobinGroupSize}
        setRoundRobinGroupSize={setRoundRobinGroupSize}
        roundRobinMaxPlayers={roundRobinMaxPlayers}
        setRoundRobinMaxPlayers={setRoundRobinMaxPlayers}
        tournamentType={tournamentType}
        games={games}
        maxNbPlayers={maxNbPlayers}
        setMaxNbPlayers={setMaxNbPlayers}
        selectedBattleRoyaleGame={selectedBattleRoyaleGame}
        setSelectedBattleRoyaleGame={setSelectedBattleRoyaleGame}
        setTournamentType={setTournamentType}
        maxPlayersPerTeam={maxPlayersPerTeam}
        setMaxPlayersPerTeam={setMaxPlayersPerTeam}
        allowBackups={allowBackups}
        setAllowBackups={setAllowBackups}
        maxBackupPlayers={maxBackupPlayers}
        setMaxBackupPlayers={setMaxBackupPlayers}
      />
    </div>
  );

  const renderStep3 = () => (
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

      {/* Private Server Code */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Private Server Code
        </label>
        <Input
          type="text"
          value={privateServerCode}
          onChange={(e) => setPrivateServerCode(e.target.value)}
          placeholder="Enter private server code (e.g., game password, access key)"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          This code will be displayed on the tournament details page for participants when the tournament is live.
        </p>
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
                onClick={() => handleRemoveFile(setIconFile, setIconPreview, tournament?.icon_url || null)}
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
                onClick={() => handleRemoveFile(setHeaderFile, setHeaderPreview, tournament?.header_url || null)}
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
            Available Information
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

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Prizes</h2>
        <p className="text-gray-400">Configure tournament prizes and rewards</p>
      </div>

      <PrizeManager
        tournamentId={id || ''}
        onPrizesChange={setPrizes}
        initialPrizes={prizes}
        isEditing={true}
      />
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return title.trim() !== '';
      case 2:
        if (tournamentFormat === 'Single Elimination') {
          return selectedGameId !== '' && tournamentFormat !== '' && customPlayerCount !== '' && parseInt(customPlayerCount) >= 2;
        }
        return selectedGameId !== '' && tournamentFormat !== '';
      case 3:
        return startDate !== '' && endDate !== '';
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleDeviceToggle = (device: string) => {
    setCompatibleDevices(prev => 
      prev.includes(device)
        ? prev.filter(d => d !== device)
        : [...prev, device]
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="h-12 w-12 text-error-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {error || 'Tournament not found'}
        </h2>
        <Button onClick={() => navigate('/')} leftIcon={<ArrowLeft size={16} />}>
          Back to Tournaments
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/tournaments/${id}`)}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back to Tournament
        </Button>
      </div>
      
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={`Edit Tournament: ${tournament.title}`}
        size="2xl"
        footer={
          <div className="flex justify-between w-full">
            <Button
              variant="ghost"
              onClick={currentStep === 1 ? handleCloseModal : prevStep}
              leftIcon={<ArrowLeft size={16} />}
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </Button>
            
            {currentStep < totalSteps ? (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                rightIcon={<ArrowRight size={16} />}
              >
                Next Step
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                isLoading={isLoading}
                disabled={!canProceed()}
              >
                Update Tournament
              </Button>
            )}
          </div>
        }
      >
        <div className="max-h-[70vh] overflow-y-auto px-1">
          {renderStepIndicator()}
          {renderCurrentStep()}
        </div>
      </Modal>
      
      <Card>
        <CardHeader>
          <CardTitle>Edit Tournament</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-white mb-2">
              {isModalOpen ? 'Editing Tournament...' : 'Tournament Editor Closed'}
            </h3>
            <p className="text-gray-400 mb-4">
              {isModalOpen 
                ? 'Please use the modal window to edit your tournament details.' 
                : 'You have closed the tournament editor. Click the button below to reopen it.'}
            </p>
            {!isModalOpen && (
              <Button onClick={() => setIsModalOpen(true)}>
                Reopen Editor
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditTournamentPage;