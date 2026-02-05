import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PieChart, Activity, Users, Trophy, Calendar, Clock, Circle, Gamepad2, BarChart2, UserCheck, Award, FileText, Save, Check } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { formatDate } from '../utils/dateUtils';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { useRegistrationStats } from '../hooks/useRegistrationStats';
import { useAuthStore } from '../store/authStore';
import { useTournamentStore } from '../store/tournamentStore';
import FilterBar from '../components/statistics/FilterBar';
import RegistrationKPIs from '../components/statistics/RegistrationKPIs';
import TournamentComparisonTable from '../components/statistics/TournamentComparisonTable';
import CSVExportModal from '../components/tournament/CSVExportModal';
import { exportPlayersToCSV } from '../utils/csvExportUtils';
import toast from 'react-hot-toast';

interface TournamentStats {
  total: number;
  upcoming: number;
  active: number;
  past: number;
}

interface PlayerStats {
  total: number;
  registered: number;
}

interface PopularTournament {
  id: string;
  title: string;
  playerCount: number;
  type: 'solo' | 'team';
  status: 'upcoming' | 'active' | 'past';
}

interface GameStats {
  id: string;
  name: string;
  tournamentCount: number;
}

interface GameRegistrationStats {
  id: string;
  name: string;
  playerCount: number;
}

interface UserTournamentStats {
  userCount: number;
  avgTournamentsPerUser: number;
  maxTournamentsPerUser: number;
}

interface UserTypeStats {
  gameId: string;
  gameName: string;
  soloCount: number;
  teamCount: number;
}

const StatisticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, canGenerateReports } = useAuthStore();
  const { filters, updateFilters, resetFilters, getActiveFilterCount, getShareableUrl } = useUrlFilters();
  const { stats: registrationStats, tournamentDetails, isLoading: isLoadingRegistrations } = useRegistrationStats(filters);

  const [tournamentStats, setTournamentStats] = useState<TournamentStats>({
    total: 0,
    upcoming: 0,
    active: 0,
    past: 0,
  });

  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    total: 0,
    registered: 0,
  });

  const [popularTournament, setPopularTournament] = useState<PopularTournament | null>(null);
  const [popularGames, setPopularGames] = useState<GameStats[]>([]);
  const [mostRegisteredGames, setMostRegisteredGames] = useState<GameRegistrationStats[]>([]);
  const [userTournamentStats, setUserTournamentStats] = useState<UserTournamentStats>({
    userCount: 0,
    avgTournamentsPerUser: 0,
    maxTournamentsPerUser: 0,
  });
  const [userTypeStats, setUserTypeStats] = useState<UserTypeStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isGenerateReportModalOpen, setIsGenerateReportModalOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [selectedReportTournamentId, setSelectedReportTournamentId] = useState<string>('');
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [availableTournaments, setAvailableTournaments] = useState<Array<{id: string, title: string, status: string}>>([]);

  const [isCSVExportModalOpen, setIsCSVExportModalOpen] = useState(false);
  const [selectedTournamentForExport, setSelectedTournamentForExport] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);

  const { tournaments, fetchTournaments } = useTournamentStore();

  useEffect(() => {
    if (searchParams.get('generate-report') === 'true') {
      setIsGenerateReportModalOpen(true);
      const now = new Date();
      setReportTitle(`Tournament Report - ${now.toLocaleDateString()}`);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchTournamentsForReports = async () => {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select('id, title, status')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAvailableTournaments(data || []);
      } catch (err) {
        console.error('Error fetching tournaments:', err);
      }
    };

    fetchTournamentsForReports();
    fetchTournaments();
    fetchRegistrations();
  }, [fetchTournaments]);

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select(`
          id,
          status,
          created_at,
          user_id,
          team_id,
          tournament:tournament_id (
            id,
            title,
            type,
            status,
            tournament_format,
            game_id
          ),
          user:user_id (
            id,
            email,
            has_parental_consent,
            country,
            username,
            discord_handle
          ),
          team:team_id (
            id,
            name
          )
        `);

      if (error) throw error;

      const processedData = data?.map((reg: any) => ({
        ...reg,
        tournament: reg.tournament,
        user: reg.user,
        team: reg.team,
        is_captain: false,
      })) || [];

      setRegistrations(processedData);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setIsLoading(true);
        
        // Fetch tournament statistics
        const { data: tournaments, error: tournamentError } = await supabase
          .from('tournaments')
          .select('id, status');
        
        if (tournamentError) throw tournamentError;
        
        const tournamentCounts = {
          total: tournaments.length,
          upcoming: tournaments.filter(t => t.status === 'upcoming').length,
          active: tournaments.filter(t => t.status === 'active').length,
          past: tournaments.filter(t => t.status === 'past').length,
        };
        
        setTournamentStats(tournamentCounts);
        
        // Fetch total users count
        const { count: userCount, error: userError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'gamer');
        
        if (userError) throw userError;
        
        // Fetch registered player count (unique users who have registered for tournaments)
        const { data: registeredUsers, error: registrationError } = await supabase
          .from('tournament_registrations')
          .select('user_id')
          .limit(1000);
        
        if (registrationError) throw registrationError;
        
        // Get unique user IDs
        const uniqueUserIds = new Set(registeredUsers.map(reg => reg.user_id));
        
        setPlayerStats({
          total: userCount || 0,
          registered: uniqueUserIds.size,
        });
        
        // Fetch tournament registrations to find the most popular tournament
        const { data: tournamentRegs, error: regError } = await supabase
          .from('tournament_registrations')
          .select('tournament_id');
          
        if (regError) throw regError;
        
        // Count registrations per tournament
        const tournamentRegCounts: Record<string, number> = {};
        tournamentRegs.forEach(reg => {
          tournamentRegCounts[reg.tournament_id] = (tournamentRegCounts[reg.tournament_id] || 0) + 1;
        });
        
        // Get the tournament with the most registrations
        let mostPopularTournamentId = '';
        let maxRegCount = 0;
        
        Object.entries(tournamentRegCounts).forEach(([tournamentId, count]) => {
          if (count > maxRegCount) {
            mostPopularTournamentId = tournamentId;
            maxRegCount = count;
          }
        });
        
        if (mostPopularTournamentId && maxRegCount > 0) {
          // Get details of the most popular tournament
          const { data: popularTournamentData, error: popularTournamentError } = await supabase
            .from('tournaments')
            .select('id, title, type, status')
            .eq('id', mostPopularTournamentId)
            .single();
            
          if (popularTournamentError) throw popularTournamentError;
          
          if (popularTournamentData) {
            setPopularTournament({
              id: popularTournamentData.id,
              title: popularTournamentData.title,
              playerCount: maxRegCount,
              type: popularTournamentData.type,
              status: popularTournamentData.status
            });
          }
        }

        // Fetch games statistics
        const { data: gamesWithTournaments, error: gamesError } = await supabase
          .from('tournaments')
          .select('game_id')
          .not('game_id', 'is', null);
        
        if (gamesError) throw gamesError;

        // Count tournaments per game
        const gameCountMap: Record<string, number> = {};
        gamesWithTournaments.forEach(t => {
          if (t.game_id) {
            gameCountMap[t.game_id] = (gameCountMap[t.game_id] || 0) + 1;
          }
        });

        // If we have games with tournaments, get their details
        if (Object.keys(gameCountMap).length > 0) {
          const { data: gameDetails, error: gameDetailsError } = await supabase
            .from('games')
            .select('id, name')
            .in('id', Object.keys(gameCountMap));
          
          if (gameDetailsError) throw gameDetailsError;
          
          const topGames = gameDetails.map(game => ({
            id: game.id,
            name: game.name,
            tournamentCount: gameCountMap[game.id] || 0
          })).sort((a, b) => b.tournamentCount - a.tournamentCount).slice(0, 5);
          
          setPopularGames(topGames);
        }

        // NEW KPI: Games with most registered players
        const { data: gameRegistrations, error: gameRegError } = await supabase
          .from('tournament_registrations')
          .select(`
            tournament:tournament_id (
              game_id
            )
          `)
          .not('tournament.game_id', 'is', null);
        
        if (gameRegError) throw gameRegError;
        
        // Count registrations per game
        const gameRegCounts: Record<string, number> = {};
        gameRegistrations.forEach(reg => {
          if (reg.tournament && reg.tournament.game_id) {
            gameRegCounts[reg.tournament.game_id] = (gameRegCounts[reg.tournament.game_id] || 0) + 1;
          }
        });
        
        // Get game details for the most registered games
        if (Object.keys(gameRegCounts).length > 0) {
          const { data: gameRegDetails, error: gameRegDetailsError } = await supabase
            .from('games')
            .select('id, name')
            .in('id', Object.keys(gameRegCounts));
          
          if (gameRegDetailsError) throw gameRegDetailsError;
          
          const topRegisteredGames = gameRegDetails.map(game => ({
            id: game.id,
            name: game.name,
            playerCount: gameRegCounts[game.id] || 0
          })).sort((a, b) => b.playerCount - a.playerCount).slice(0, 5);
          
          setMostRegisteredGames(topRegisteredGames);
        }

        // NEW KPI: Amount of registered tournaments per user
        const { data: userRegistrations, error: userRegError } = await supabase
          .from('tournament_registrations')
          .select('user_id');
        
        if (userRegError) throw userRegError;
        
        // Count registrations per user
        const userRegCounts: Record<string, number> = {};
        userRegistrations.forEach(reg => {
          userRegCounts[reg.user_id] = (userRegCounts[reg.user_id] || 0) + 1;
        });
        
        // Calculate statistics
        const userIds = Object.keys(userRegCounts);
        const totalRegisteredUsers = userIds.length;
        const totalRegistrations = userRegistrations.length;
        const avgTournamentsPerUser = totalRegisteredUsers > 0 
          ? Math.round((totalRegistrations / totalRegisteredUsers) * 10) / 10 
          : 0;
        const maxTournamentsPerUser = userIds.length > 0 
          ? Math.max(...Object.values(userRegCounts)) 
          : 0;
        
        setUserTournamentStats({
          userCount: totalRegisteredUsers,
          avgTournamentsPerUser,
          maxTournamentsPerUser
        });

        // NEW KPI: User type of games registrations (solo vs team)
        const { data: tournamentTypes, error: tournamentTypesError } = await supabase
          .from('tournament_registrations')
          .select(`
            tournament:tournament_id (
              id,
              type,
              game_id
            )
          `)
          .not('tournament.game_id', 'is', null);
        
        if (tournamentTypesError) throw tournamentTypesError;
        
        // Count solo vs team registrations per game
        const gameTypeMap: Record<string, { solo: number; team: number }> = {};
        tournamentTypes.forEach(reg => {
          if (reg.tournament && reg.tournament.game_id) {
            const gameId = reg.tournament.game_id;
            if (!gameTypeMap[gameId]) {
              gameTypeMap[gameId] = { solo: 0, team: 0 };
            }
            
            if (reg.tournament.type === 'solo') {
              gameTypeMap[gameId].solo++;
            } else {
              gameTypeMap[gameId].team++;
            }
          }
        });
        
        // Get game details for the type statistics
        if (Object.keys(gameTypeMap).length > 0) {
          const { data: gameTypeDetails, error: gameTypeDetailsError } = await supabase
            .from('games')
            .select('id, name')
            .in('id', Object.keys(gameTypeMap));
          
          if (gameTypeDetailsError) throw gameTypeDetailsError;
          
          const gameTypeStats = gameTypeDetails.map(game => ({
            gameId: game.id,
            gameName: game.name,
            soloCount: gameTypeMap[game.id].solo,
            teamCount: gameTypeMap[game.id].team
          })).sort((a, b) => (b.soloCount + b.teamCount) - (a.soloCount + a.teamCount)).slice(0, 5);
          
          setUserTypeStats(gameTypeStats);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError('Failed to load statistics');
        setIsLoading(false);
      }
    };
    
    fetchStatistics();
  }, []);

  const handleGenerateReport = async () => {
    if (!user || !reportTitle.trim()) {
      toast.error('Please provide a report title');
      return;
    }

    if (!canGenerateReports()) {
      toast.error('You do not have permission to generate reports. Only super_admin and master_admin can create reports.');
      return;
    }

    try {
      setIsSavingReport(true);

      const snapshotData = {
        filters,
        tournamentStats,
        playerStats,
        popularTournament,
        popularGames,
        mostRegisteredGames,
        userTournamentStats,
        userTypeStats,
        registrationStats,
        tournamentDetails,
        generatedAt: new Date().toISOString()
      };

      const { data: reportData, error: reportError } = await supabase
        .from('tournament_reports')
        .insert({
          title: reportTitle,
          snapshot_data: snapshotData,
          notes: reportNotes || null,
          period_start: filters.startDate || null,
          period_end: filters.endDate || null,
          tournament_id: selectedReportTournamentId || null,
          created_by: user.id
        })
        .select()
        .single();

      if (reportError) throw reportError;

      toast.success('Report generated successfully');
      setIsGenerateReportModalOpen(false);
      setReportTitle('');
      setReportNotes('');
      setSelectedReportTournamentId('');
      navigate('/reports');
    } catch (err) {
      console.error('Error generating report:', err);
      toast.error('Failed to generate report');
    } finally {
      setIsSavingReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Circle className="h-12 w-12 text-error-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-300 mb-2">
          {error}
        </h2>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Platform Overview</h2>
        {canGenerateReports() ? (
          <Button
            leftIcon={<FileText size={16} />}
            onClick={() => {
              const now = new Date();
              setReportTitle(`Tournament Report - ${now.toLocaleDateString()}`);
              setIsGenerateReportModalOpen(true);
            }}
          >
            Generate Report
          </Button>
        ) : (
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              Report generation restricted to Super Admin and Master Admin
            </Badge>
          </div>
        )}
      </div>

      <FilterBar
        filters={filters}
        onFiltersChange={updateFilters}
        onReset={resetFilters}
        activeFilterCount={getActiveFilterCount()}
        onShare={getShareableUrl}
      />

      <RegistrationKPIs stats={registrationStats} isLoading={isLoadingRegistrations} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tournament Status Distribution */}
        <Card className="bg-gradient-to-br from-secondary-600 to-secondary-800 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-100">Tournament Status</p>
                <h3 className="text-3xl font-bold mt-1">
                  {((tournamentStats.active / tournamentStats.total) * 100 || 0).toFixed(0)}% Active
                </h3>
              </div>
              <div className="p-3 bg-white/10 rounded-lg">
                <PieChart className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-white/20 h-2 rounded-full">
                <div className="flex h-2 rounded-full">
                  <div 
                    className="bg-success-300 h-2 rounded-l-full" 
                    style={{ 
                      width: `${tournamentStats.active / tournamentStats.total * 100}%`,
                      display: tournamentStats.active ? 'block' : 'none'
                    }}
                  ></div>
                  <div 
                    className="bg-primary-300 h-2" 
                    style={{ 
                      width: `${tournamentStats.upcoming / tournamentStats.total * 100}%`,
                      display: tournamentStats.upcoming ? 'block' : 'none'
                    }}
                  ></div>
                  <div 
                    className="bg-gray-300 h-2 rounded-r-full" 
                    style={{ 
                      width: `${tournamentStats.past / tournamentStats.total * 100}%`,
                      display: tournamentStats.past ? 'block' : 'none'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Player Stats KPI */}
        <Card className="bg-gradient-to-br from-accent-500 to-accent-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-accent-100">Total Players</p>
                <h3 className="text-3xl font-bold mt-1">{playerStats.total}</h3>
              </div>
              <div className="p-3 bg-white/10 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-white/20 h-1 rounded-full">
                <div 
                  className="bg-white h-1 rounded-full" 
                  style={{ 
                    width: `${(playerStats.registered / playerStats.total) * 100 || 0}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs mt-2 text-accent-100">
                {playerStats.registered} players registered for tournaments
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Most Active Time Period */}
        <Card className="bg-gradient-to-br from-success-600 to-success-800 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-success-100">Tournament Activity</p>
                <h3 className="text-3xl font-bold mt-1">{tournamentStats.active + tournamentStats.upcoming}</h3>
              </div>
              <div className="p-3 bg-white/10 rounded-lg">
                <Activity className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-success-100">Active Now</span>
                <Badge className="bg-white/20 text-white">{tournamentStats.active}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-success-100">Upcoming</span>
                <Badge className="bg-white/20 text-white">{tournamentStats.upcoming}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Popular Tournament */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Trophy className="h-5 w-5 text-accent-500 mr-2" />
              Most Popular Tournament
            </CardTitle>
          </CardHeader>
          <CardContent>
            {popularTournament ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white">
                    {popularTournament.title}
                  </h3>
                  <div className="flex space-x-2">
                    <Badge variant={popularTournament.type === 'solo' ? 'accent' : 'secondary'}>
                      {popularTournament.type === 'solo' ? 'Solo' : 'Team'}
                    </Badge>
                    <Badge 
                      variant={
                        popularTournament.status === 'upcoming' ? 'primary' :
                        popularTournament.status === 'active' ? 'success' : 'secondary'
                      }
                    >
                      {popularTournament.status.charAt(0).toUpperCase() + popularTournament.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-dark-200 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-primary-500 mr-2" />
                      <span className="text-lg font-medium text-white">{popularTournament.playerCount}</span>
                    </div>
                    <span className="text-gray-400">Total Players</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No tournaments with players yet
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Tournament Status Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Calendar className="h-5 w-5 text-primary-500 mr-2" />
              Tournament Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                      Progress
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-primary-300">
                      {tournamentStats.total > 0 
                        ? Math.round((tournamentStats.past / tournamentStats.total) * 100) 
                        : 0}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200 dark:bg-dark-200">
                  <div
                    style={{ width: `${(tournamentStats.past / tournamentStats.total) * 100}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center p-3 bg-primary-50 dark:bg-dark-200 rounded-lg">
                  <Clock className="h-6 w-6 text-primary-500 mb-2" />
                  <span className="text-2xl font-bold text-white">{tournamentStats.upcoming}</span>
                  <span className="text-xs text-gray-400">Upcoming</span>
                </div>
                
                <div className="flex flex-col items-center p-3 bg-success-50 dark:bg-success-900/10 rounded-lg">
                  <Activity className="h-6 w-6 text-success-500 mb-2" />
                  <span className="text-2xl font-bold text-white">{tournamentStats.active}</span>
                  <span className="text-xs text-gray-400">Active</span>
                </div>
                
                <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-900/10 rounded-lg">
                  <Trophy className="h-6 w-6 text-gray-500 mb-2" />
                  <span className="text-2xl font-bold text-white">{tournamentStats.past}</span>
                  <span className="text-xs text-gray-400">Completed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NEW KPI: User Tournament Registrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <UserCheck className="h-5 w-5 text-primary-500 mr-2" />
            User Tournament Participation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-dark-200 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Registered Users</h3>
                <Users className="h-5 w-5 text-primary-400" />
              </div>
              <p className="text-2xl font-bold text-white">{userTournamentStats.userCount}</p>
              <p className="text-xs text-gray-500 mt-1">Users who registered for at least one tournament</p>
            </div>
            
            <div className="bg-dark-200 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Avg. Tournaments per User</h3>
                <BarChart2 className="h-5 w-5 text-accent-400" />
              </div>
              <p className="text-2xl font-bold text-white">{userTournamentStats.avgTournamentsPerUser}</p>
              <p className="text-xs text-gray-500 mt-1">Average number of tournaments per registered user</p>
            </div>
            
            <div className="bg-dark-200 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Max Tournaments per User</h3>
                <Award className="h-5 w-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-white">{userTournamentStats.maxTournamentsPerUser}</p>
              <p className="text-xs text-gray-500 mt-1">Highest number of tournaments by a single user</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* NEW KPI: Games with Most Registered Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Users className="h-5 w-5 text-success-500 mr-2" />
            Games with Most Registered Players
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mostRegisteredGames.length > 0 ? (
            <div className="space-y-4">
              {mostRegisteredGames.map((game, index) => (
                <div key={game.id} className="flex items-center">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-success-100 dark:bg-success-900/20 text-success-800 dark:text-success-300 font-bold rounded-full mr-4">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-white">{game.name}</h4>
                      <span className="text-sm text-gray-400">
                        {game.playerCount} player{game.playerCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-dark-200 h-2 rounded-full mt-1">
                      <div 
                        className="bg-success-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(game.playerCount / (mostRegisteredGames[0]?.playerCount || 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No games with registered players yet
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* NEW KPI: User Type of Games Registrations (Solo vs Team) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Gamepad2 className="h-5 w-5 text-accent-500 mr-2" />
            Game Registration Types (Solo vs Team)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userTypeStats.length > 0 ? (
            <div className="space-y-6">
              {userTypeStats.map((game) => (
                <div key={game.gameId} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-white">{game.gameName}</h4>
                    <span className="text-sm text-gray-400">
                      {game.soloCount + game.teamCount} total registrations
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-dark-200 h-4 rounded-full overflow-hidden">
                    <div className="flex h-full">
                      <div 
                        className="bg-accent-500 h-full flex items-center justify-center text-xs text-white"
                        style={{ 
                          width: `${(game.soloCount / (game.soloCount + game.teamCount)) * 100}%`,
                          minWidth: game.soloCount > 0 ? '40px' : '0'
                        }}
                      >
                        {game.soloCount > 0 && (
                          <span className="px-2 truncate">Solo</span>
                        )}
                      </div>
                      <div 
                        className="bg-secondary-500 h-full flex items-center justify-center text-xs text-white"
                        style={{ 
                          width: `${(game.teamCount / (game.soloCount + game.teamCount)) * 100}%`,
                          minWidth: game.teamCount > 0 ? '40px' : '0'
                        }}
                      >
                        {game.teamCount > 0 && (
                          <span className="px-2 truncate">Team</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Solo: {game.soloCount} ({Math.round((game.soloCount / (game.soloCount + game.teamCount)) * 100)}%)</span>
                    <span>Team: {game.teamCount} ({Math.round((game.teamCount / (game.soloCount + game.teamCount)) * 100)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No game registration type data available
            </div>
          )}
        </CardContent>
      </Card>
      
      <TournamentComparisonTable
        tournaments={tournamentDetails}
        isLoading={isLoadingRegistrations}
        canExportPlayers={canGenerateReports()}
        onExportPlayers={(tournamentId) => {
          const tournament = tournaments.find(t => t.id === tournamentId);
          if (tournament) {
            setSelectedTournamentForExport(tournament);
            setIsCSVExportModalOpen(true);
          }
        }}
      />

      {/* Popular Games */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Gamepad2 className="h-5 w-5 text-accent-500 mr-2" />
            Popular Games
          </CardTitle>
        </CardHeader>
        <CardContent>
          {popularGames.length > 0 ? (
            <div className="space-y-4">
              {popularGames.map((game, index) => (
                <div key={game.id} className="flex items-center">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-accent-100 dark:bg-accent-900/20 text-accent-800 dark:text-accent-300 font-bold rounded-full mr-4">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-white">{game.name}</h4>
                      <span className="text-sm text-gray-400">
                        {game.tournamentCount} tournament{game.tournamentCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-dark-200 h-2 rounded-full mt-1">
                      <div 
                        className="bg-accent-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(game.tournamentCount / (popularGames[0]?.tournamentCount || 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No games with tournaments yet
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isGenerateReportModalOpen}
        onClose={() => {
          setIsGenerateReportModalOpen(false);
          setReportTitle('');
          setReportNotes('');
          setSelectedReportTournamentId('');
        }}
        title="Generate Tournament Report"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Report Title <span className="text-error-500">*</span>
            </label>
            <Input
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="e.g., Q4 2024 Tournament Summary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Trophy className="h-4 w-4 inline mr-1" />
              Tournament Scope
            </label>
            <select
              value={selectedReportTournamentId}
              onChange={(e) => setSelectedReportTournamentId(e.target.value)}
              className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Tournaments</option>
              {availableTournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.title} ({tournament.status})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedReportTournamentId
                ? 'Report will be associated with the selected tournament'
                : 'Report will include data from all tournaments based on current filters'}
            </p>
          </div>

          {filters.tournamentIds.length > 0 && (
            <div className="bg-primary-900/20 border border-primary-500/30 rounded-lg p-3">
              <div className="flex items-start">
                <Trophy className="h-4 w-4 text-primary-400 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-primary-300 font-medium">Active Tournament Filter</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {filters.tournamentIds.length} tournament{filters.tournamentIds.length > 1 ? 's' : ''} currently selected in filters.
                    Statistics shown are filtered accordingly.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={reportNotes}
              onChange={(e) => setReportNotes(e.target.value)}
              placeholder="Add any additional context, lessons learned, or key observations..."
              className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={4}
            />
          </div>

          <div className="bg-dark-200 p-4 rounded-lg border border-dark-300">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Report Contents</h4>
            <ul className="space-y-1 text-sm text-gray-400">
              <li className="flex items-center">
                <Check className="h-4 w-4 text-success-500 mr-2" />
                Tournament and player statistics
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-success-500 mr-2" />
                Registration metrics and KPIs
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-success-500 mr-2" />
                Game popularity and engagement data
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-success-500 mr-2" />
                Current filter selections
              </li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsGenerateReportModalOpen(false);
                setReportTitle('');
                setReportNotes('');
                setSelectedReportTournamentId('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={isSavingReport || !reportTitle.trim()}
              leftIcon={<Save size={16} />}
            >
              {isSavingReport ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </div>
      </Modal>

      {selectedTournamentForExport && (
        <CSVExportModal
          isOpen={isCSVExportModalOpen}
          onClose={() => {
            setIsCSVExportModalOpen(false);
            setSelectedTournamentForExport(null);
          }}
          tournamentId={selectedTournamentForExport.id}
          tournamentData={{
            id: selectedTournamentForExport.id,
            title: selectedTournamentForExport.title,
            type: selectedTournamentForExport.type,
            game_id: selectedTournamentForExport.game_id,
          }}
          playerCount={
            registrations.filter(
              reg => reg.tournament.id === selectedTournamentForExport.id
            ).length
          }
          onExport={async (selectedFields) => {
            await exportPlayersToCSV({
              tournamentId: selectedTournamentForExport.id,
              selectedFields,
              registrations,
              tournament: selectedTournamentForExport,
              tournaments: tournaments,
            });
          }}
        />
      )}
    </div>
  );
};

export default StatisticsPage;