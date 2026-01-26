import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTournamentStore } from '../store/tournamentStore';
import { useGameStore } from '../store/gameStore';
import { supabase } from '../lib/supabase';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import PrizeDisplay from '../components/tournament/PrizeDisplay';
import TournamentRulesModal from '../components/tournament/TournamentRulesModal';
import BattleRoyaleLeaderboard from '../components/battleRoyale/BattleRoyaleLeaderboard';
import { Calendar, Users, Trophy, Twitch, MessageSquare, Gamepad, ArrowLeft, Edit, Clock, Globe, AlertTriangle, CheckCircle, MapPin, TowerControl as GameController, User, FileText, Book, Copy, Check, Key, Lock, Unlock, Target, Building2 } from 'lucide-react';
import { Database } from '../types/supabase';
import { formatDateWithTime } from '../utils/dateUtils';
import { fetchProjectConfigurationByConfigId, ProjectConfiguration } from '../services/projectConfigService';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import toast from 'react-hot-toast';
import { getRegistrationStatus, getRegistrationStatusLabel, getRegistrationStatusColor } from '../utils/tournamentValidation';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type TournamentFieldValue = Database['public']['Tables']['tournament_field_values']['Row'];
type TournamentField = Database['public']['Tables']['tournament_fields']['Row'];
type Game = Database['public']['Tables']['games']['Row'];

interface GamePublisherId {
  id: string;
  game_id: string;
  label: string;
  id_name: string;
  required: boolean;
}

interface UserGamePublisherId {
  id: string;
  user_id: string;
  game_publisher_id: string;
  value: string;
  is_validated: boolean;
  game_publisher_id_ref: {
    label: string;
    id_name: string;
  };
}

const TournamentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading, updateTournamentRules } = useTournamentStore();
  const { games, fetchGames } = useGameStore();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [fieldValues, setFieldValues] = useState<(TournamentFieldValue & { field: TournamentField })[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gamePublisherIds, setGamePublisherIds] = useState<GamePublisherId[]>([]);
  const [userPublisherIds, setUserPublisherIds] = useState<UserGamePublisherId[]>([]);
  const [isLoadingPublisherIds, setIsLoadingPublisherIds] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [copied, setCopied] = useState(false);
  const [projectConfig, setProjectConfig] = useState<ProjectConfiguration | null>(null);

  const isBattleRoyaleTournament = () => {
    return tournament?.tournament_format === 'Battle Royale';
  };

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    const fetchTournamentDetails = async () => {
      if (!id) return;

      try {
        setLoading(true);

        // Fetch tournament
        const { data: tournamentData, error: tournamentError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', id)
          .single();

        if (tournamentError) throw tournamentError;

        // Fetch field values with field info
        const { data: fieldValueData, error: fieldValueError } = await supabase
          .from('tournament_field_values')
          .select(`
            *,
            field:field_id(*)
          `)
          .eq('tournament_id', id);

        if (fieldValueError) throw fieldValueError;

        // Fetch teams for team tournaments
        if (tournamentData.type === 'team') {
          const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select('id, name')
            .eq('tournament_id', id);

          if (teamsError) throw teamsError;
          setTeams(teamsData || []);
        }

        // Get game if tournament has game_id
        if (tournamentData.game_id) {
          const gameData = games.find(g => g.id === tournamentData.game_id) || null;
          setGame(gameData);

          // Fetch game publisher IDs if game exists
          if (gameData) {
            await fetchGamePublisherIds(gameData.id);
          }
        } else {
          setGame(null);
        }

        setTournament(tournamentData);
        setFieldValues(fieldValueData as any || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching tournament details:', error);
        setError('Failed to load tournament details');
        setLoading(false);
      }
    };

    if (id && games.length > 0) {
      fetchTournamentDetails();
    }
  }, [id, games]);

  useEffect(() => {
    const loadProjectConfig = async () => {
      if (tournament?.config_id) {
        const result = await fetchProjectConfigurationByConfigId(tournament.config_id);
        if (result.data) {
          setProjectConfig(result.data);
        }
      } else {
        setProjectConfig(null);
      }
    };

    loadProjectConfig();
  }, [tournament?.config_id]);

  const fetchGamePublisherIds = async (gameId: string) => {
    try {
      setIsLoadingPublisherIds(true);

      // Fetch game publisher IDs
      const { data: publisherIdsData, error: publisherIdsError } = await supabase
        .from('game_publisher_ids')
        .select('*')
        .eq('game_id', gameId);

      if (publisherIdsError) throw publisherIdsError;

      setGamePublisherIds(publisherIdsData || []);

      // Fetch user's publisher IDs for this game
      if (publisherIdsData && publisherIdsData.length > 0) {
        const { data: userPublisherIdsData, error: userPublisherIdsError } = await supabase
          .from('game_publisher_id_for_users')
          .select(`
            *,
            game_publisher_id_ref:game_publisher_id (
              label,
              id_name
            )
          `)
          .in('game_publisher_id', publisherIdsData.map(pid => pid.id));

        if (userPublisherIdsError) throw userPublisherIdsError;

        setUserPublisherIds(userPublisherIdsData as UserGamePublisherId[] || []);
      }
    } catch (error) {
      console.error('Error fetching game publisher IDs:', error);
    } finally {
      setIsLoadingPublisherIds(false);
    }
  };

  const handleSaveRules = async (rules: string) => {
    if (!id) return;

    try {
      setIsSavingRules(true);
      await updateTournamentRules(id, rules);

      // Update local tournament state
      if (tournament) {
        setTournament({
          ...tournament,
          rules
        });
      }

      setIsRulesModalOpen(false);
    } catch (error) {
      console.error('Error saving tournament rules:', error);
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleCopyCode = async () => {
    if (!tournament?.private_server_code) return;

    try {
      await navigator.clipboard.writeText(tournament.private_server_code);
      setCopied(true);
      toast.success('Server code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast.error('Failed to copy code');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="primary" className="text-sm">Upcoming</Badge>;
      case 'active':
        return <Badge variant="success" className="text-sm">Active</Badge>;
      case 'past':
        return <Badge variant="secondary" className="text-sm">Past</Badge>;
      default:
        return <Badge className="text-sm">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'solo':
        return <Badge variant="accent" className="text-sm">Solo</Badge>;
      case 'team':
        return <Badge variant="secondary" className="text-sm">Team</Badge>;
      default:
        return <Badge className="text-sm">{type}</Badge>;
    }
  };

  const getLocationTypeBadge = (locationType: string) => {
    switch (locationType) {
      case 'online':
        return <Badge variant="primary" className="text-sm">Online</Badge>;
      case 'offline':
        return <Badge variant="accent" className="text-sm">Offline</Badge>;
      default:
        return <Badge className="text-sm">Online</Badge>;
    }
  };

  const getCompatibleDevices = () => {
    if (!tournament?.compatible_devices) return 'Not specified';

    return tournament.compatible_devices
      .split(',')
      .map(device => device.trim())
      .map(device => {
        switch (device) {
          case 'mobile': return 'Mobile';
          case 'pc': return 'PC';
          case 'playstation': return 'PlayStation';
          case 'xbox': return 'Xbox';
          case 'switch': return 'Nintendo Switch';
          case 'vr': return 'VR';
          default: return device;
        }
      })
      .join(', ');
  };

  const getEligibleCountries = () => {
    if (tournament?.config_id) {
      return null;
    }

    if (!tournament?.eligible_countries) return 'All countries';

    const countryMap: Record<string, string> = {
      'US': 'United States',
      'CA': 'Canada',
      'GB': 'United Kingdom',
      'FR': 'France',
      'DE': 'Germany',
      'IT': 'Italy',
      'ES': 'Spain',
      'JP': 'Japan',
      'AU': 'Australia',
      'BR': 'Brazil',
      'IN': 'India',
      'CN': 'China',
      'RU': 'Russia',
      'KR': 'South Korea',
      'MX': 'Mexico',
      'ZA': 'South Africa',
      'SG': 'Singapore',
      'AE': 'United Arab Emirates'
    };

    return tournament.eligible_countries
      .split(',')
      .map(code => countryMap[code] || code)
      .join(', ');
  };

  const getTournamentFormatLabel = (format: string | null) => {
    if (!format) return 'Not specified';

    switch (format) {
      case 'BO1': return 'Best of 1';
      case 'BO3': return 'Best of 3';
      case 'Round Swiss': return 'Round Swiss';
      case 'Round Robin': return 'Round Robin';
      default: return format;
    }
  };

  const handleEditClick = () => {
    navigate(`/tournaments/edit/${id}`, {
      state: { from: 'tournament-detail' }
    });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back to Tournaments
        </Button>

        <div className="flex space-x-2">
          <Button
            onClick={handleEditClick}
            leftIcon={<Edit size={16} />}
          >
            Edit Tournament
          </Button>
        </div>
      </div>

      {/* Tournament Header */}
      <div className="relative rounded-lg overflow-hidden h-48 md:h-64 bg-gradient-to-r from-dark-300 to-dark-100">
        {tournament.header_url ? (
          <img
            src={tournament.header_url}
            alt={tournament.title}
            className="w-full h-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-dark-500 bg-opacity-50 flex items-end">
          <div className="p-6 text-white">
            <div className="flex items-center space-x-3 mb-2">
              {tournament.icon_url && (
                <img
                  src={tournament.icon_url}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover border-2 border-white"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold">{tournament.title}</h1>
                <div className="flex items-center mt-1 space-x-2">
                  {getStatusBadge(tournament.status)}
                  {getTypeBadge(tournament.type)}
                  {tournament.location_type && getLocationTypeBadge(tournament.location_type)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Game Information Card - Only show if a game is selected */}
          {game && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <GameController className="h-5 w-5 text-accent-500 mr-2" />
                  Game Information
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center space-x-4">
                {game.image_url ? (
                  <img
                    src={game.image_url}
                    alt={game.name}
                    className="h-24 w-36 object-cover rounded-md"
                  />
                ) : (
                  <div className="h-24 w-36 bg-gray-200 dark:bg-dark-200 rounded-md flex items-center justify-center">
                    <GameController className="h-8 w-8 text-gray-400"  />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white">{game.name}</h3>
                  {game.publisher && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Published by {game.publisher}
                    </p>
                  )}
                </div>
              </CardContent>

              {/* Game Publisher IDs */}
              {gamePublisherIds.length > 0 && (
                <div className="px-6 pb-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Required Game IDs
                  </h4>
                  <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gamePublisherIds.map(pid => {
                          const userPid = userPublisherIds.find(upid =>
                            upid.game_publisher_id === pid.id
                          );

                          return (
                            <TableRow key={pid.id}>
                              <TableCell>
                                <div className="flex items-center">
                                  <User className="h-4 w-4 text-primary-500 mr-2" />
                                  <span>{pid.label}</span>
                                  {pid.required && (
                                    <Badge variant="error" className="ml-2 text-xs">Required</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {userPid ? (
                                  userPid.is_validated ? (
                                    <Badge variant="success">Verified</Badge>
                                  ) : (
                                    <Badge variant="warning">Pending Verification</Badge>
                                  )
                                ) : (
                                  <Badge variant="secondary">Not Provided</Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {userPid ? userPid.value : '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Tournament Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tournament.description && (
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {tournament.description}
                  </p>
                </div>
              )}

              {/* Registration Status Card */}
              {(() => {
                const regStatus = getRegistrationStatus(
                  tournament.registration_start_date,
                  tournament.registration_end_date,
                  tournament.registration_locked
                );
                const statusColor = getRegistrationStatusColor(regStatus);
                const statusLabel = getRegistrationStatusLabel(regStatus);

                return (
                  <div className={`p-4 rounded-lg border-2 ${
                    statusColor === 'success'
                      ? 'bg-green-900/20 border-green-500/30'
                      : statusColor === 'warning'
                      ? 'bg-amber-900/20 border-amber-500/30'
                      : statusColor === 'error'
                      ? 'bg-red-900/20 border-red-500/30'
                      : 'bg-gray-900/20 border-gray-500/30'
                  }`}>
                    <div className="flex items-start space-x-3">
                      {regStatus === 'open' ? (
                        <Unlock className="h-5 w-5 text-green-400 mt-0.5" />
                      ) : regStatus === 'locked' || regStatus === 'closed' ? (
                        <Lock className="h-5 w-5 text-red-400 mt-0.5" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-300">Statut des inscriptions</h3>
                          <Badge variant={statusColor}>
                            {statusLabel}
                          </Badge>
                        </div>
                        {tournament.initial_max_players && tournament.actual_participants && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">Participants inscrits</span>
                              <span className="text-white font-medium">
                                {tournament.actual_participants} / {tournament.initial_max_players}
                              </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full ${
                                  (tournament.actual_participants / tournament.initial_max_players) >= 0.9
                                    ? 'bg-green-500'
                                    : (tournament.actual_participants / tournament.initial_max_players) >= 0.5
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{
                                  width: `${Math.min(100, (tournament.actual_participants / tournament.initial_max_players) * 100)}%`
                                }}
                              />
                            </div>
                            {tournament.actual_participants < tournament.initial_max_players && (
                              <div className="flex items-center text-xs text-amber-400 mt-1">
                                <Target className="h-3 w-3 mr-1" />
                                Tournoi lancé avec capacité réduite
                              </div>
                            )}
                          </div>
                        )}
                        {tournament.registration_locked && (
                          <p className="text-xs text-gray-400 mt-2">
                            Les inscriptions sont verrouillées. Le bracket est en cours ou terminé.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Tournament Schedule</h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tournament Start</p>
                        <p className="text-gray-700 dark:text-gray-300">{formatDateWithTime(tournament.start_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tournament End</p>
                        <p className="text-gray-700 dark:text-gray-300">{formatDateWithTime(tournament.end_date)}</p>
                      </div>
                    </div>
                    {tournament.registration_start_date && (
                      <div className="flex items-start">
                        <Calendar className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Registration Opens</p>
                          <p className="text-gray-700 dark:text-gray-300">{formatDateWithTime(tournament.registration_start_date)}</p>
                        </div>
                      </div>
                    )}
                    {tournament.registration_end_date && (
                      <div className="flex items-start">
                        <Calendar className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Registration Closes</p>
                          <p className="text-gray-700 dark:text-gray-300">{formatDateWithTime(tournament.registration_end_date)}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start">
                      <Clock className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Duration</p>
                        <p className="text-gray-700 dark:text-gray-300">
                          {Math.ceil((new Date(tournament.end_date).getTime() - new Date(tournament.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Tournament Format</h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <Users className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Format</p>
                        <p className="text-gray-700 dark:text-gray-300">
                          {tournament.type === 'solo' ? 'Solo Competition' : 'Team-based Competition'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Trophy className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Match Format</p>
                        <p className="text-gray-700 dark:text-gray-300">
                          {getTournamentFormatLabel(tournament.tournament_format)}
                        </p>
                      </div>
                    </div>

                    {tournament.type === 'team' && (
                      <div className="flex items-start">
                        <Users className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Registered Teams</p>
                          <p className="text-gray-700 dark:text-gray-300">
                            {teams.length} {teams.length === 1 ? 'team' : 'teams'}
                          </p>
                        </div>
                      </div>
                    )}

                    {tournament.type === 'team' && tournament.max_players_per_team && (
                      <div className="flex items-start">
                        <Users className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Max Players per Team</p>
                          <p className="text-gray-700 dark:text-gray-300">
                            {tournament.max_players_per_team} players
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Location type and name */}
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Location</p>
                        <p className="text-gray-700 dark:text-gray-300">
                          {tournament.location_type === 'online'
                            ? 'Online'
                            : `Offline: ${tournament.location_name || 'Venue not specified'}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Gamepad className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Compatible Devices</p>
                        <p className="text-gray-700 dark:text-gray-300">
                          {getCompatibleDevices()}
                        </p>
                      </div>
                    </div>

                    {/* Backup Players Information */}
                    {tournament.allow_backups && tournament.max_backup_players && (
                      <div className="flex items-start">
                        <Users className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Backup Players</p>
                          <p className="text-gray-700 dark:text-gray-300">
                            Up to {tournament.max_backup_players} backup {tournament.type === 'team' ? 'teams' : 'players'} allowed
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Total capacity: {tournament.max_nb_players || 0} active + {tournament.max_backup_players} backups = {(tournament.max_nb_players || 0) + tournament.max_backup_players} total registrations
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Eligibility Information */}
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Eligibility Requirements</h3>
                <div className="space-y-2">
                  {tournament.config_id ? (
                    <div className="flex items-start">
                      <Building2 className="h-5 w-5 text-emerald-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Project Configuration</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-emerald-400 font-medium">
                            {projectConfig?.brand_name || tournament.config_id}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {tournament.config_id}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Country restrictions are managed by the project configuration
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start">
                      <Globe className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Project Scope</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-blue-400 font-medium">Worldwide</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Tournament is visible on all frontends
                        </p>
                      </div>
                    </div>
                  )}

                  {!tournament.config_id && (
                    <div className="flex items-start">
                      <Globe className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Eligible Countries</p>
                        <p className="text-gray-700 dark:text-gray-300">
                          {getEligibleCountries()}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start">
                    <Users className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Minimum Age Requirement</p>
                      <p className="text-gray-700 dark:text-gray-300">
                        {tournament.minimum_age ? `${tournament.minimum_age} years or older` : 'No age restriction specified'}
                      </p>
                    </div>
                  </div>

                  {tournament.required_documents_under_18 && (
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Documents Required for Players Under 18
                        </p>
                        <p className="text-gray-700 dark:text-gray-300">
                          {tournament.required_documents_under_18}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {fieldValues.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {fieldValues.map((fieldValue) => (
                      <div key={fieldValue.id} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {fieldValue.field.name}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            {fieldValue.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tournament Rules */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <Book className="h-5 w-5 text-accent-500 mr-2" />
                Tournament Rules
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsRulesModalOpen(true)}
                leftIcon={<Edit size={16} />}
              >
                Edit Rules
              </Button>
            </CardHeader>
            <CardContent>
              {tournament.rules ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-white prose-p:text-white"
                  dangerouslySetInnerHTML={{ __html: tournament.rules }}
                />
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="mb-2">No rules have been defined for this tournament yet.</p>
                  <Button
                    size="sm"
                    onClick={() => setIsRulesModalOpen(true)}
                    leftIcon={<Edit size={16} />}
                  >
                    Add Rules
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tournament Prizes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 text-accent-500 mr-2" />
                Tournament Prizes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PrizeDisplay
                tournamentId={id!}
                showTitle={false}
                layout="grid"
              />
            </CardContent>
          </Card>

          {/* Battle Royale Leaderboard */}
          {isBattleRoyaleTournament() && (
            <BattleRoyaleLeaderboard
              tournamentId={id!}
              showTitle={true}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Private Server Code - Only show if tournament is active and code exists */}
          {tournament.status === 'active' && tournament.private_server_code && (
            <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-500/30">
              <CardHeader>
                <CardTitle className="flex items-center text-green-400">
                  <Key className="h-5 w-5 mr-2" />
                  Private Server Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    Use this code to access the private server for this tournament:
                  </p>
                  <div className="flex items-center space-x-3 p-4 bg-dark-200 rounded-lg border border-green-500/30">
                    <div className="flex-1">
                      <div className="text-xs text-gray-400 mb-1">Server Code</div>
                      <div className="font-mono text-lg text-green-400 font-bold">
                        {tournament.private_server_code}
                      </div>
                    </div>
                    <Button
                      onClick={handleCopyCode}
                      variant="ghost"
                      className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                      leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <div className="text-xs text-gray-400 bg-dark-300 p-3 rounded-md">
                    <strong>Note:</strong> This code is only visible during active tournaments.
                    Use it to join the private server or game lobby.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Connect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tournament.twitch_url && (
                <a
                  href={tournament.twitch_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <Twitch className="h-5 w-5 mr-3" />
                  <span>Watch on Twitch</span>
                </a>
              )}

              {tournament.discord_url && (
                <a
                  href={tournament.discord_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  <MessageSquare className="h-5 w-5 mr-3" />
                  <span>Join Discord</span>
                </a>
              )}

              <a
                href="#share"
                className="flex items-center px-4 py-3 bg-gray-100 dark:bg-dark-200 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-100 transition-colors"
              >
                <Globe className="h-5 w-5 mr-3" />
                <span>Share Tournament</span>
              </a>
            </CardContent>
          </Card>

          {tournament.type === 'team' && (
            <Card>
              <CardHeader>
                <CardTitle>Registered Teams</CardTitle>
              </CardHeader>
              <CardContent>
                {teams.length > 0 ? (
                  <div className="space-y-2">
                    {teams.map(team => (
                      <div
                        key={team.id}
                        className="px-3 py-2 bg-gray-50 dark:bg-dark-200 rounded-md flex justify-between items-center"
                      >
                        <span className="font-medium">{team.name}</span>
                        <Badge variant="secondary" className="text-xs">Team</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <p>No teams registered yet</p>
                  </div>
                )}
              </CardContent>
              {teams.length > 0 && (
                <CardFooter>
                  <Button variant="ghost" size="sm" fullWidth>
                    View All Teams
                  </Button>
                </CardFooter>
              )}
            </Card>
          )}
        </div>
      </div>

      {tournament.announcement_url && (
        <Card>
          <CardHeader>
            <CardTitle>Tournament Announcement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <img
                src={tournament.announcement_url}
                alt="Tournament announcement"
                className="max-w-full rounded-lg"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tournament Rules Modal */}
      <TournamentRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        tournamentId={id!}
        initialRules={tournament.rules}
        onSave={handleSaveRules}
        isLoading={isSavingRules}
      />
    </div>
  );
};

export default TournamentDetailPage;
