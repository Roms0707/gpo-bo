import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTournamentStore } from '../store/tournamentStore';
import { useFieldStore } from '../store/fieldStore';
import { useGameStore } from '../store/gameStore';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

// Import custom components
import StepIndicator from '../components/tournament/StepIndicator';
import TournamentBasicInfo from '../components/tournament/TournamentBasicInfo';
import TournamentGameInfo from '../components/tournament/TournamentGameInfo';
import TournamentRegistrationInfo from '../components/tournament/TournamentRegistrationInfo';
import PrizeManager from '../components/tournament/PrizeManager';

interface Prize {
  position: number;
  title: string;
  description: string;
  image_url?: string | null;
  imageFile?: File | null;
  imagePreview?: string | null;
}

const CreateTournamentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { createTournament, isLoading } = useTournamentStore();
  const { fields, fetchFields } = useFieldStore();
  const { games, fetchGames } = useGameStore();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
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
  
  // Step 2: Game Information
  const [selectedGameId, setSelectedGameId] = useState('');
  const [tournamentFormat, setTournamentFormat] = useState('Swiss');
  const [maxPlayers, setMaxPlayers] = useState('16');
  const [customPlayerCount, setCustomPlayerCount] = useState('');
  const [minimumAge, setMinimumAge] = useState(13);
  const [compatibleDevices, setCompatibleDevices] = useState<string[]>([]);
  
  // Round Robin specific settings
  const [roundRobinGroupSize, setRoundRobinGroupSize] = useState('4');
  const [roundRobinMaxPlayers, setRoundRobinMaxPlayers] = useState('16');
  
  // Battle Royale specific settings
  const [selectedBattleRoyaleGame, setSelectedBattleRoyaleGame] = useState('');
  
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
  }, [fetchFields, fetchGames]);

  // Update max players when group size changes
  useEffect(() => {
    if (roundRobinGroupSize === '4') {
      setRoundRobinMaxPlayers('16');
    } else if (roundRobinGroupSize === '6') {
      setRoundRobinMaxPlayers('12');
    }
  }, [roundRobinGroupSize]);

  // Reset player selection when format changes
  useEffect(() => {
    if (tournamentFormat === 'Swiss') {
      setMaxPlayers('8');
    } else if (tournamentFormat === 'Single Elimination') {
      setCustomPlayerCount('');
    } else if (tournamentFormat === 'Round Robin') {
      setRoundRobinMaxPlayers(roundRobinGroupSize === '4' ? '16' : '12');
    } else if (tournamentFormat === 'Battle Royale') {
      setSelectedBattleRoyaleGame('');
    }
  }, [tournamentFormat, roundRobinGroupSize]);

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

  const handleRemoveFile = (setFile: React.Dispatch<React.SetStateAction<File | null>>, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
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

  const uploadPrizeImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `tournament-prizes/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tournament-image-bucket')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage
        .from('tournament-image-bucket')
        .getPublicUrl(filePath);
        
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading prize image:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    try {
      // Upload files
      let iconUrl = null;
      if (iconFile) {
        iconUrl = await uploadFile(iconFile, 'icons');
        if (!iconUrl) {
          toast.error('Failed to upload tournament icon');
          return;
        }
      }
      
      let headerUrl = null;
      if (headerFile) {
        headerUrl = await uploadFile(headerFile, 'headers');
        if (!headerUrl) {
          toast.error('Failed to upload tournament header');
          return;
        }
      }
      
      let announcementUrl = null;
      if (announcementFile) {
        announcementUrl = await uploadFile(announcementFile, 'announcements');
        if (!announcementUrl) {
          toast.error('Failed to upload tournament announcement');
          return;
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
      
      const result = await createTournament({
        title,
        description,
        type: tournamentType,
        location_type: locationType,
        location_name: locationType === 'offline' ? locationName : null,
        start_date: startDate,
        end_date: endDate,
        registration_start_date: registrationStartDate || null,
        registration_end_date: registrationEndDate || null,
        created_by: user.id,
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
        allow_backups: allowBackups,
        max_backup_players: allowBackups && maxBackupPlayers ? parseInt(maxBackupPlayers) : null,
        is_featured: isFeatured,
        config_id: configId,
      });
      
      if (result.error) throw result.error;
      
      const newTournament = result.data;
      
      // Save prizes if any
      if (prizes.length > 0 && newTournament) {
        const prizeInserts = [];
        
        for (const prize of prizes) {
          let prizeImageUrl = null;
          
          // Upload prize image if provided
          if (prize.imageFile) {
            prizeImageUrl = await uploadPrizeImage(prize.imageFile);
          }
          
          prizeInserts.push({
            tournament_id: newTournament.id,
            position: prize.position,
            title: prize.title,
            prize_name: prize.description, // Store description in prize_name field
            image_url: prizeImageUrl
          });
        }
        
        const { error: prizeError } = await supabase
          .from('tournament_prizes')
          .insert(prizeInserts);
          
        if (prizeError) {
          console.error('Error saving prizes:', prizeError);
          toast.error('Tournament created but failed to save prizes');
        }
      }
      
      if (selectedFields.length > 0 && newTournament) {
        const fieldValues = selectedFields.map(fieldId => ({
          tournament_id: newTournament.id,
          field_id: fieldId,
          value: 'default'
        }));
        
        const { error: fieldValueError } = await supabase
          .from('tournament_field_values')
          .insert(fieldValues);
          
        if (fieldValueError) {
          console.error('Error saving field values:', fieldValueError);
          toast.error('Tournament created but failed to save custom field values');
        }
      }
      
      toast.success('Tournament created successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast.error('Failed to create tournament');
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        const selectedGame = games.find(g => g.id === selectedGameId);
        return (
          <TournamentBasicInfo
            tournamentType={tournamentType}
            setTournamentType={setTournamentType}
            locationType={locationType}
            setLocationType={setLocationType}
            locationName={locationName}
            setLocationName={setLocationName}
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            eligibleCountries={eligibleCountries}
            setEligibleCountries={setEligibleCountries}
            maxPlayersPerTeam={maxPlayersPerTeam}
            setMaxPlayersPerTeam={setMaxPlayersPerTeam}
            isFeatured={isFeatured}
            setIsFeatured={setIsFeatured}
            selectedGameTrailerUrl={selectedGame?.trailer_url}
            configId={configId}
            setConfigId={setConfigId}
          />
        );
      case 2:
        return (
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
        );
      case 3:
        return (
          <TournamentRegistrationInfo
            registrationStartDate={registrationStartDate}
            setRegistrationStartDate={setRegistrationStartDate}
            registrationEndDate={registrationEndDate}
            setRegistrationEndDate={setRegistrationEndDate}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            twitchUrl={twitchUrl}
            setTwitchUrl={setTwitchUrl}
            discordUrl={discordUrl}
            setDiscordUrl={setDiscordUrl}
            iconFile={iconFile}
            setIconFile={setIconFile}
            iconPreview={iconPreview}
            setIconPreview={setIconPreview}
            headerFile={headerFile}
            setHeaderFile={setHeaderFile}
            headerPreview={headerPreview}
            setHeaderPreview={setHeaderPreview}
            selectedFields={selectedFields}
            toggleFieldSelection={toggleFieldSelection}
            fields={fields}
            handleFileChange={handleFileChange}
            handleRemoveFile={handleRemoveFile}
          />
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Prizes</h2>
              <p className="text-gray-400">Configure tournament prizes and rewards</p>
            </div>

            <PrizeManager
              tournamentId=""
              onPrizesChange={setPrizes}
              initialPrizes={prizes}
              isEditing={false}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return title.trim() !== '';
      case 2:
        if (tournamentFormat === 'Single Elimination') {
          return selectedGameId !== '' && tournamentFormat !== '' && customPlayerCount !== '' && parseInt(customPlayerCount) >= 2;
        } else if (tournamentFormat === 'Battle Royale') {
          return selectedBattleRoyaleGame !== '';
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back to Tournaments
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Tournament</CardTitle>
        </CardHeader>
        
        <CardContent>
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
          {renderCurrentStep()}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            variant="ghost"
            onClick={currentStep === 1 ? () => navigate('/') : prevStep}
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
              Create Tournament
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateTournamentPage;