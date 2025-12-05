import React, { useEffect, useState } from 'react';
import { Monitor, Smartphone, Tablet, Gamepad2, Headphones, Crosshair } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface TournamentGameInfoProps {
  selectedGameId: string;
  setSelectedGameId: (id: string) => void;
  tournamentFormat: string;
  setTournamentFormat: (format: string) => void;
  maxPlayers: string;
  setMaxPlayers: (count: string) => void;
  customPlayerCount: string;
  setCustomPlayerCount: (count: string) => void;
  minimumAge: number;
  setMinimumAge: (age: number) => void;
  compatibleDevices: string[];
  handleDeviceToggle: (device: string) => void;
  roundRobinGroupSize: string;
  setRoundRobinGroupSize: (size: string) => void;
  roundRobinMaxPlayers: string;
  setRoundRobinMaxPlayers: (count: string) => void;
  tournamentType: 'solo' | 'team';
  games: any[];
  // New props for max_nb_players
  maxNbPlayers: string;
  setMaxNbPlayers: (count: string) => void;
  // New props for Battle Royale
  selectedBattleRoyaleGame: string;
  setSelectedBattleRoyaleGame: (id: string) => void;
  // New props for team configuration
  setTournamentType: (type: 'solo' | 'team') => void;
  maxPlayersPerTeam: number;
  setMaxPlayersPerTeam: (count: number) => void;
  // New props for backup players
  allowBackups: boolean;
  setAllowBackups: (allow: boolean) => void;
  maxBackupPlayers: string;
  setMaxBackupPlayers: (count: string) => void;
}

const TournamentGameInfo: React.FC<TournamentGameInfoProps> = ({
  selectedGameId,
  setSelectedGameId,
  tournamentFormat,
  setTournamentFormat,
  maxPlayers,
  setMaxPlayers,
  customPlayerCount,
  setCustomPlayerCount,
  minimumAge,
  setMinimumAge,
  compatibleDevices,
  handleDeviceToggle,
  roundRobinGroupSize,
  setRoundRobinGroupSize,
  roundRobinMaxPlayers,
  setRoundRobinMaxPlayers,
  tournamentType,
  games,
  maxNbPlayers,
  setMaxNbPlayers,
  selectedBattleRoyaleGame,
  setSelectedBattleRoyaleGame,
  setTournamentType,
  maxPlayersPerTeam,
  setMaxPlayersPerTeam,
  allowBackups,
  setAllowBackups,
  maxBackupPlayers,
  setMaxBackupPlayers
}) => {
  // Debug logging to track tournamentFormat prop value
  console.log('DEBUG: TournamentGameInfo rendering. tournamentFormat prop:', tournamentFormat);
  console.log('DEBUG: TournamentGameInfo rendering. selectedGameId prop:', selectedGameId);
  console.log('DEBUG: TournamentGameInfo rendering. selectedBattleRoyaleGame prop:', selectedBattleRoyaleGame);

  // Helper function to get max players based on tournament format
  const getMaxPlayers = (): string => {
    if (tournamentFormat === 'Swiss') return maxPlayers;
    if (tournamentFormat === 'Round Robin') return roundRobinMaxPlayers;
    if (tournamentFormat === 'Single Elimination') return customPlayerCount;
    if (tournamentFormat === 'Battle Royale') return maxNbPlayers;
    return '0';
  };

  // Check if Apex Legends is selected for Battle Royale
  const isApexSelected = tournamentFormat === 'Battle Royale' && selectedBattleRoyaleGame &&
    games.find(game => game.id === selectedBattleRoyaleGame)?.name.toLowerCase().includes('apex');
  // Get Battle Royale games
  console.log("Available games:", games.map(game => game.name));
  const battleRoyaleGames = games.filter(game => 
    game.name.toLowerCase().includes('warzone') || 
    game.name.toLowerCase().includes('call of duty') ||
    game.name.toLowerCase().includes('freefire') || 
    game.name.toLowerCase().includes('free fire') ||
    game.name.toLowerCase().includes('apex') ||
    game.name.toLowerCase().includes('fortnite') ||
    game.name.toLowerCase().includes('pubg') ||
    game.name.toLowerCase().includes('battle royale')
  );
  console.log("Filtered Battle Royale games:", battleRoyaleGames.map(game => game.name));

  // Update maxNbPlayers when format or player count changes
  useEffect(() => {
    if (tournamentFormat === 'Swiss') {
      setMaxNbPlayers(maxPlayers);
    } else if (tournamentFormat === 'Round Robin') {
      setMaxNbPlayers(roundRobinMaxPlayers);
    } else if (tournamentFormat === 'Single Elimination') {
      setMaxNbPlayers(customPlayerCount);
    } else if (tournamentFormat === 'Battle Royale' && selectedBattleRoyaleGame) {
      // Set max players based on selected Battle Royale game
      const selectedGame = games.find(game => game.id === selectedBattleRoyaleGame);
      if (selectedGame) {
        const gameName = selectedGame.name.toLowerCase().trim();
        if (gameName.includes('warzone') || gameName.includes('call of duty') || gameName.includes('cod')) {
            setMaxNbPlayers('150');
        } else if (gameName.includes('apex') || gameName.includes('legends')) {
            setMaxNbPlayers('60');
        } else if (gameName.includes('fortnite') || gameName.includes('pubg') || gameName.includes('playerunknown')) {
            setMaxNbPlayers('100');
        } else if (gameName.includes('freefire') || gameName.includes('free fire') || gameName.includes('garena')) {
            setMaxNbPlayers('50');
        } else {
            setMaxNbPlayers('100');
        }
      }
    }
  }, [tournamentFormat, maxPlayers, roundRobinMaxPlayers, customPlayerCount, selectedBattleRoyaleGame, games, setMaxNbPlayers]);

  // Handle Battle Royale game selection
  const handleBattleRoyaleGameChange = (gameId: string) => {
    setSelectedBattleRoyaleGame(gameId);
    setSelectedGameId(gameId);
    
    // Set max players based on selected game
    const selectedGame = games.find(game => game.id === gameId);
    if (selectedGame) {
      const gameName = selectedGame.name.toLowerCase().trim();
      if (gameName.includes('warzone') || gameName.includes('call of duty') || gameName.includes('cod')) {
          setMaxNbPlayers('150');
      } else if (gameName.includes('apex') || gameName.includes('legends')) {
          setMaxNbPlayers('60');
          // Apex Legends is team-based: 20 squads of 3 players
          setTournamentType('team');
          setMaxPlayersPerTeam(3);
      } else if (gameName.includes('fortnite') || gameName.includes('pubg') || gameName.includes('playerunknown')) {
          setMaxNbPlayers('100');
      } else if (gameName.includes('freefire') || gameName.includes('free fire') || gameName.includes('garena')) {
          setMaxNbPlayers('50');
      } else {
          setMaxNbPlayers('100');
      }
    }
  };

  return (
    <div className="space-y-6">
      <Select
        label="Tournament Format"
        value={tournamentFormat}
        onChange={(e) => setTournamentFormat(e.target.value)}
        options={[
          { value: 'Swiss', label: 'Swiss' },
          { value: 'Round Robin', label: 'Round Robin' },
          { value: 'Single Elimination', label: 'Single Elimination' },
          { value: 'Battle Royale', label: 'Battle Royale' }
        ]}
      />
      
      {tournamentFormat === 'Battle Royale' ? (
        // Battle Royale specific configuration
        <div className="space-y-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-yellow-900 dark:text-yellow-200 mb-4 flex items-center">
              <Crosshair className="h-5 w-5 mr-2 text-yellow-500" />
              Battle Royale Configuration
            </h3>
            
            <div className="space-y-4">
              <Select
                label="Select Battle Royale Game"
                value={selectedBattleRoyaleGame}
                onChange={(e) => handleBattleRoyaleGameChange(e.target.value)}
                options={[
                  { value: '', label: 'Select a game' },
                  ...battleRoyaleGames.map(game => ({
                    value: game.id,
                    label: game.name
                  }))
                ]}
                required
              />
              
              {selectedBattleRoyaleGame && (
                <div className="bg-dark-200 p-3 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="text-white">Maximum Players:</span>
                    <span className="font-bold text-primary-400">{maxNbPlayers}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Player limit is automatically set based on the selected game.
                  </p>
                  {isApexSelected && (
                    <div className="mt-2 p-2 bg-blue-900/20 border border-blue-500/30 rounded">
                      <p className="text-xs text-blue-300">
                        <strong>Apex Legends Configuration:</strong> 20 squads of 3 players each (60 total players)
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> Battle Royale tournaments require manual entry of player placements and eliminations after each match.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : tournamentFormat === 'Round Robin' ? (
        // Round Robin specific configuration
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-900 dark:text-blue-200 mb-4">Round Robin Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Group Formation
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="groupSize"
                      value="4"
                      checked={roundRobinGroupSize === '4'}
                      onChange={(e) => setRoundRobinGroupSize(e.target.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-white">Group of 4</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="groupSize"
                      value="6"
                      checked={roundRobinGroupSize === '6'}
                      onChange={(e) => setRoundRobinGroupSize(e.target.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-white">Group of 6</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select The Maximum Of {tournamentType === 'team' ? 'Teams' : 'Players'} For The Group That You Selected
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {roundRobinGroupSize === '4' ? 
                    ['16', '32', '64'].map((limit) => (
                      <label key={limit} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="roundRobinMaxPlayers"
                          value={limit}
                          checked={roundRobinMaxPlayers === limit}
                          onChange={(e) => setRoundRobinMaxPlayers(e.target.value)}
                          className="sr-only"
                        />
                        <div className={`w-full p-3 text-center rounded-md border-2 transition-all ${
                          roundRobinMaxPlayers === limit
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-white'
                        }`}>
                          <span className="font-medium">{limit}</span>
                        </div>
                      </label>
                    )) :
                    ['12', '24', '48', '96'].map((limit) => (
                      <label key={limit} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="roundRobinMaxPlayers"
                          value={limit}
                          checked={roundRobinMaxPlayers === limit}
                          onChange={(e) => setRoundRobinMaxPlayers(e.target.value)}
                          className="sr-only"
                        />
                        <div className={`w-full p-3 text-center rounded-md border-2 transition-all ${
                          roundRobinMaxPlayers === limit
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-white'
                        }`}>
                          <span className="font-medium">{limit}</span>
                        </div>
                      </label>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : tournamentFormat === 'Swiss' ? (
        // Swiss tournament configuration
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Number of {tournamentType === 'team' ? 'Teams' : 'Players'}
          </label>
          <div className="bg-gray-50 dark:bg-dark-200 p-4 rounded-lg">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {['8', '16', '32', '64', '128', '256'].map((limit) => (
                <label key={limit} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="maxPlayers"
                    value={limit}
                    checked={maxPlayers === limit}
                    onChange={(e) => setMaxPlayers(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-full p-3 text-center rounded-md border-2 transition-all ${
                    maxPlayers === limit
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-white'
                  }`}>
                    <span className="font-medium">{limit}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : tournamentFormat === 'Single Elimination' ? (
        // Single Elimination tournament configuration
        <div>
          <Input
            label={`Number of ${tournamentType === 'team' ? 'Teams' : 'Players'}`}
            type="number"
            min="2"
            value={customPlayerCount}
            onChange={(e) => setCustomPlayerCount(e.target.value)}
            placeholder={`Enter the number of ${tournamentType === 'team' ? 'teams' : 'players'}`}
            required
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter any number of {tournamentType === 'team' ? 'teams' : 'players'} for the single elimination tournament.
          </p>
        </div>
      ) : null}
      
      {tournamentFormat !== 'Battle Royale' && (
        <Select
          label="Tournament Game"
          value={selectedGameId}
          onChange={(e) => setSelectedGameId(e.target.value)}
          options={[
            { value: '', label: 'Select a game' },
            ...games.map(game => ({
              value: game.id,
              label: game.name
            }))
          ]}
        />
      )}

      {/* Backup Players Configuration */}
      {tournamentFormat && tournamentFormat !== 'Battle Royale' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="allowBackups"
              checked={allowBackups}
              onChange={(e) => {
                setAllowBackups(e.target.checked);
                if (!e.target.checked) {
                  setMaxBackupPlayers('0');
                }
              }}
              className="h-4 w-4 mt-1 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <label htmlFor="allowBackups" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Allow Backup Players
              </label>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enable backup players to handle absenteeism. Backups will be automatically promoted if an active player withdraws.
              </p>
            </div>
          </div>

          {allowBackups && (
            <div>
              <Input
                label="Maximum Number of Backup Players"
                type="number"
                min="1"
                max="999"
                value={maxBackupPlayers}
                onChange={(e) => setMaxBackupPlayers(e.target.value)}
                placeholder="Enter maximum backup players"
                required
              />
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 p-2 rounded">
                <strong>Total Registration Capacity:</strong> {getMaxPlayers()} active {tournamentType === 'team' ? 'teams' : 'players'} + {maxBackupPlayers || 0} backups = {(parseInt(getMaxPlayers()) || 0) + (parseInt(maxBackupPlayers) || 0)} total registrations
              </p>
            </div>
          )}
        </div>
      )}

      <Input
        label="Minimum Age Required"
        type="number"
        min="13"
        value={minimumAge.toString()}
        onChange={(e) => setMinimumAge(parseInt(e.target.value))}
        required
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Type of Device
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { id: 'pc', label: 'PC', icon: Monitor },
            { id: 'ios', label: 'iOS', icon: Smartphone },
            { id: 'android', label: 'Android', icon: Tablet },
            { id: 'console', label: 'Console', icon: Gamepad2 },
            { id: 'cross-platform', label: 'Cross Platform', icon: Headphones }
          ].map(({ id, label, icon: Icon }) => (
            <div
              key={id}
              onClick={() => handleDeviceToggle(id)}
              className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                compatibleDevices.includes(id)
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-white'
              }`}
            >
              <Icon className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TournamentGameInfo;