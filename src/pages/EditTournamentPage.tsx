import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTournamentStore } from '../store/tournamentStore';
import { useFieldStore } from '../store/fieldStore';
import { useGameStore } from '../store/gameStore';
import { supabase } from '../lib/supabase';
import TournamentGameInfo from '../components/tournament/TournamentGameInfo';
import ScheduleTimeline from '../components/tournament/ScheduleTimeline';
import StepIndicator from '../components/tournament/StepIndicator';
import TournamentConfigInfo from '../components/tournament/TournamentConfigInfo';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import RadioGroup from '../components/ui/RadioGroup';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import PrizeManager from '../components/tournament/PrizeManager';
import CountrySelector from '../components/tournament/CountrySelector';
import { ProjectConfigSelector } from '../components/tournament/ProjectConfigSelector';
import { countries } from '../../src/data/countries';
import { Calendar, Upload, X, Globe, ArrowLeft, ArrowRight, Gamepad2, Users, Monitor, Smartphone, Tablet, Headphones, AlertTriangle, Star, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { Database } from '../types/supabase';

const STEP_LABELS = ['Information', 'Game', 'Scheduling', 'Registration', 'Prizes'];

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
  const totalSteps = 5;
  
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
  const [isFeatured, setIsFeatured] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [showFeaturedConfirmModal, setShowFeaturedConfirmModal] = useState(false);
  const [pendingFeaturedAction, setPendingFeaturedAction] = useState<'enable' | 'disable' | null>(null);

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
  const [hasDiscord, setHasDiscord] = useState(false);
  const [discordUrl, setDiscordUrl] = useState('');
  const [discordServerId, setDiscordServerId] = useState('');
  const [discordUrlError, setDiscordUrlError] = useState<string | null>(null);
  const [discordServerIdError, setDiscordServerIdError] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  
  // Step 4: Prizes
  const [prizes, setPrizes] = useState<Prize[]>([]);
  
  // Private server code
  const [privateServerCode, setPrivateServerCode] = useState('');
  
  // Image uploads
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [announcementFile, setAnnouncementFile] = useState<File | null>(null);

  // Image previews
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
        setHasDiscord(!!(data.discord_url || data.discord_server_id));
        setDiscordUrl(data.discord_url || '');
        setDiscordServerId(data.discord_server_id || '');
        
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
        
        // Load config_id if it exists
        if (data.config_id) {
          setConfigId(data.config_id);
        }

        // Load eligible countries if they exist (only if no config_id)
        if (data.eligible_countries && !data.config_id) {
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

        // Load is_featured if it exists
        setIsFeatured(data.is_featured || false);
        
        // Set image previews from existing URLs
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

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
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

  const selectedGameForTrailer = games.find(g => g.id === selectedGameId);
  const hasTrailerUrl = selectedGameForTrailer?.trailer_url && selectedGameForTrailer.trailer_url.trim() !== '';

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
      const countriesString = configId ? null : (eligibleCountries.length > 0 ? eligibleCountries.join(',') : null);
      
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
        header_url: headerUrl,
        main_prize: mainPrize,
        twitch_url: twitchUrl,
        discord_url: discordUrl,
        discord_server_id: discordServerId || null,
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
        is_featured: isFeatured,
        config_id: configId,
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


  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Tournament Information</h2>
        <p className="text-gray-400">Update the basic information about your tournament</p>
      </div>

      <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <label htmlFor="featured-toggle-edit" className="block text-sm font-medium text-white cursor-pointer">
                Featured Tournament
              </label>
              <p className="text-xs text-gray-400">
                Featured tournaments appear in the hero carousel on the homepage
              </p>
            </div>
          </div>
          <button
            id="featured-toggle-edit"
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
                <div className={`p-2 rounded-lg ${tournamentType === 'solo' ? 'bg-primary-500/20' : 'bg-dark-300'}`}>
                  <Users className={`w-5 h-5 ${tournamentType === 'solo' ? 'text-primary-400' : 'text-gray-400'}`} />
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
                <div className={`p-2 rounded-lg ${tournamentType === 'team' ? 'bg-primary-500/20' : 'bg-dark-300'}`}>
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
                <div className={`p-2 rounded-lg ${locationType === 'online' ? 'bg-primary-500/20' : 'bg-dark-300'}`}>
                  <Globe className={`w-5 h-5 ${locationType === 'online' ? 'text-primary-400' : 'text-gray-400'}`} />
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
                <div className={`p-2 rounded-lg ${locationType === 'offline' ? 'bg-primary-500/20' : 'bg-dark-300'}`}>
                  <Globe className={`w-5 h-5 ${locationType === 'offline' ? 'text-primary-400' : 'text-gray-400'}`} />
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
        <h2 className="text-2xl font-bold text-white mb-2">Scheduling</h2>
        <p className="text-gray-400">Set your tournament schedule and registration dates</p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-500/5 via-emerald-500/5 to-amber-500/5 border border-blue-500/20 rounded-2xl">
        <ScheduleTimeline
          registrationStartDate={registrationStartDate}
          setRegistrationStartDate={setRegistrationStartDate}
          registrationEndDate={registrationEndDate}
          setRegistrationEndDate={setRegistrationEndDate}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <TournamentConfigInfo
      twitchUrl={twitchUrl}
      setTwitchUrl={setTwitchUrl}
      hasDiscord={hasDiscord}
      setHasDiscord={setHasDiscord}
      discordUrl={discordUrl}
      setDiscordUrl={setDiscordUrl}
      discordServerId={discordServerId}
      setDiscordServerId={setDiscordServerId}
      headerFile={headerFile}
      setHeaderFile={setHeaderFile}
      headerPreview={headerPreview}
      setHeaderPreview={setHeaderPreview}
      selectedFields={selectedFields}
      toggleFieldSelection={toggleFieldSelection}
      fields={fields}
      handleRemoveFile={handleRemoveFile}
      privateServerCode={privateServerCode}
      setPrivateServerCode={setPrivateServerCode}
      showPrivateServerCode={true}
    />
  );

  const renderStep5 = () => (
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
      case 5:
        return renderStep5();
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
      case 5:
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
        size="5xl"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button
              variant="ghost"
              onClick={currentStep === 1 ? handleCloseModal : prevStep}
              leftIcon={<ArrowLeft size={16} />}
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleSubmit}
                isLoading={isLoading}
              >
                Save Changes
              </Button>

              {currentStep < totalSteps && (
                <Button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  rightIcon={<ArrowRight size={16} />}
                >
                  Next Step
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="max-h-[70vh] overflow-y-auto px-1">
          <StepIndicator
            currentStep={currentStep}
            totalSteps={totalSteps}
            stepLabels={STEP_LABELS}
            onStepClick={handleStepClick}
            allowFreeNavigation={true}
          />
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

export default EditTournamentPage;