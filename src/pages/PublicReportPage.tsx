import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PieChart, Activity, Users, Trophy, Calendar, Gamepad2, BarChart2, UserCheck, Award, FileText, AlertCircle, Eye } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { formatDateWithTime } from '../utils/dateUtils';
import RegistrationKPIs from '../components/statistics/RegistrationKPIs';
import TournamentComparisonTable from '../components/statistics/TournamentComparisonTable';
import { Database } from '../types/supabase';

type TournamentReport = Database['public']['Tables']['tournament_reports']['Row'] & {
  tournament?: {
    id: string;
    title: string;
  } | null;
};

const PublicReportPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<TournamentReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshotData, setSnapshotData] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid report link');
      setIsLoading(false);
      return;
    }

    fetchReport();
  }, [token]);

  const fetchReport = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: shareData, error: shareError } = await supabase
        .from('report_shares')
        .select('*')
        .eq('share_token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (shareError) throw shareError;

      if (!shareData) {
        setError('Report not found or link has expired');
        setIsLoading(false);
        return;
      }

      if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
        setError('This report link has expired');
        setIsLoading(false);
        return;
      }

      const { data: reportData, error: reportError } = await supabase
        .from('tournament_reports')
        .select(`
          *,
          tournament:tournament_id(id, title)
        `)
        .eq('id', shareData.report_id)
        .single();

      if (reportError) throw reportError;

      setReport(reportData);
      setSnapshotData(reportData.snapshot_data);

      await supabase
        .from('report_shares')
        .update({
          view_count: shareData.view_count + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', shareData.id);

      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Failed to load report');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-500 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !report || !snapshotData) {
    return (
      <div className="min-h-screen bg-dark-500 flex flex-col items-center justify-center p-6">
        <AlertCircle className="h-16 w-16 text-error-500 mb-4" />
        <h2 className="text-2xl font-semibold text-white mb-2">
          {error || 'Report not found'}
        </h2>
        <p className="text-gray-400 text-center max-w-md">
          This report may have been removed or the link may have expired. Please contact the report creator for a new link.
        </p>
      </div>
    );
  }

  const {
    tournamentStats,
    playerStats,
    popularTournament,
    popularGames,
    mostRegisteredGames,
    userTournamentStats,
    userTypeStats,
    registrationStats,
    tournamentDetails
  } = snapshotData;

  return (
    <div className="min-h-screen bg-dark-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-gradient-to-r from-primary-600 to-accent-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <FileText className="h-6 w-6 mr-2" />
                <h1 className="text-3xl font-bold">{report.title}</h1>
              </div>
              {report.tournament && (
                <p className="text-primary-100 mb-2">
                  Tournament: {report.tournament.title}
                </p>
              )}
              {report.period_start && report.period_end && (
                <p className="text-primary-100">
                  Period: {formatDateWithTime(report.period_start)} - {formatDateWithTime(report.period_end)}
                </p>
              )}
              <p className="text-primary-100 text-sm mt-2">
                Generated: {formatDateWithTime(report.created_at)}
              </p>
            </div>
          </div>

          {report.notes && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <h3 className="text-lg font-semibold mb-2">Notes</h3>
              <p className="text-primary-100 whitespace-pre-line">{report.notes}</p>
            </div>
          )}
        </div>

        {registrationStats && (
          <RegistrationKPIs stats={registrationStats} isLoading={false} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournamentStats && (
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
                          width: `${(tournamentStats.active / tournamentStats.total) * 100}%`,
                          display: tournamentStats.active ? 'block' : 'none'
                        }}
                      ></div>
                      <div
                        className="bg-primary-300 h-2"
                        style={{
                          width: `${(tournamentStats.upcoming / tournamentStats.total) * 100}%`,
                          display: tournamentStats.upcoming ? 'block' : 'none'
                        }}
                      ></div>
                      <div
                        className="bg-gray-300 h-2 rounded-r-full"
                        style={{
                          width: `${(tournamentStats.past / tournamentStats.total) * 100}%`,
                          display: tournamentStats.past ? 'block' : 'none'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {playerStats && (
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
          )}

          {tournamentStats && (
            <Card className="bg-gradient-to-br from-success-600 to-success-800 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-success-100">Tournament Activity</p>
                    <h3 className="text-3xl font-bold mt-1">
                      {tournamentStats.active + tournamentStats.upcoming}
                    </h3>
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
          )}
        </div>

        {userTournamentStats && (
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
                  <p className="text-xs text-gray-500 mt-1">
                    Users who registered for at least one tournament
                  </p>
                </div>

                <div className="bg-dark-200 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-400">Avg. Tournaments per User</h3>
                    <BarChart2 className="h-5 w-5 text-accent-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {userTournamentStats.avgTournamentsPerUser}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Average number of tournaments per registered user
                  </p>
                </div>

                <div className="bg-dark-200 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-400">Max Tournaments per User</h3>
                    <Award className="h-5 w-5 text-yellow-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {userTournamentStats.maxTournamentsPerUser}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Highest number of tournaments by a single user
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {mostRegisteredGames && mostRegisteredGames.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Users className="h-5 w-5 text-success-500 mr-2" />
                Games with Most Registered Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mostRegisteredGames.map((game: any, index: number) => (
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
            </CardContent>
          </Card>
        )}

        {userTypeStats && userTypeStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Gamepad2 className="h-5 w-5 text-accent-500 mr-2" />
                Game Registration Types (Solo vs Team)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {userTypeStats.map((game: any) => (
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
                          {game.soloCount > 0 && <span className="px-2 truncate">Solo</span>}
                        </div>
                        <div
                          className="bg-secondary-500 h-full flex items-center justify-center text-xs text-white"
                          style={{
                            width: `${(game.teamCount / (game.soloCount + game.teamCount)) * 100}%`,
                            minWidth: game.teamCount > 0 ? '40px' : '0'
                          }}
                        >
                          {game.teamCount > 0 && <span className="px-2 truncate">Team</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>
                        Solo: {game.soloCount} (
                        {Math.round((game.soloCount / (game.soloCount + game.teamCount)) * 100)}%)
                      </span>
                      <span>
                        Team: {game.teamCount} (
                        {Math.round((game.teamCount / (game.soloCount + game.teamCount)) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {tournamentDetails && tournamentDetails.length > 0 && (
          <TournamentComparisonTable tournaments={tournamentDetails} isLoading={false} />
        )}

        {popularGames && popularGames.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Gamepad2 className="h-5 w-5 text-accent-500 mr-2" />
                Popular Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {popularGames.map((game: any, index: number) => (
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
            </CardContent>
          </Card>
        )}

        <div className="text-center text-gray-500 text-sm py-6 border-t border-dark-300">
          <p>This is a snapshot report generated on {formatDateWithTime(report.created_at)}</p>
        </div>
      </div>
    </div>
  );
};

export default PublicReportPage;
