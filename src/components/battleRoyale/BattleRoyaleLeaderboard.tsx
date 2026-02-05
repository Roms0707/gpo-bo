import React, { useEffect, useState } from 'react';
import { Trophy, Target, Users, Crown, Medal, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import Badge from '../ui/Badge';

interface BattleRoyaleResult {
  id: string;
  match_number: number;
  player_id: string;
  placement: number;
  eliminations: number;
  placement_points: number;
  elimination_points: number;
  total_match_points: number;
}

interface PlayerStats {
  player_id: string;
  username: string;
  email: string;
  match1_points: number;
  match2_points: number;
  match3_points: number;
  total_points: number;
  matches_played: number;
  best_placement: number;
  total_eliminations: number;
}

interface BattleRoyaleLeaderboardProps {
  tournamentId: string;
  showTitle?: boolean;
}

const BattleRoyaleLeaderboard: React.FC<BattleRoyaleLeaderboardProps> = ({
  tournamentId,
  showTitle = true
}) => {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBattleRoyaleResults();
  }, [tournamentId]);

  const fetchBattleRoyaleResults = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all battle royale results for this tournament
      const { data: results, error: resultsError } = await supabase
        .from('battle_royale_results')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('match_number', { ascending: true });

      if (resultsError) throw resultsError;

      // Fetch player information
      const playerIds = [...new Set(results.map(r => r.player_id))];
      
      if (playerIds.length === 0) {
        setPlayerStats([]);
        setIsLoading(false);
        return;
      }

      const { data: players, error: playersError } = await supabase
        .from('users')
        .select('id, username, email')
        .in('id', playerIds);

      if (playersError) throw playersError;

      // Calculate player statistics
      const statsMap = new Map<string, PlayerStats>();

      // Initialize all players
      players.forEach(player => {
        statsMap.set(player.id, {
          player_id: player.id,
          username: player.username || player.email.split('@')[0],
          email: player.email,
          match1_points: 0,
          match2_points: 0,
          match3_points: 0,
          total_points: 0,
          matches_played: 0,
          best_placement: Infinity,
          total_eliminations: 0
        });
      });

      // Process results
      results.forEach((result: BattleRoyaleResult) => {
        const stats = statsMap.get(result.player_id);
        if (!stats) return;

        // Update match-specific points
        if (result.match_number === 1) {
          stats.match1_points = result.total_match_points;
        } else if (result.match_number === 2) {
          stats.match2_points = result.total_match_points;
        } else if (result.match_number === 3) {
          stats.match3_points = result.total_match_points;
        }

        // Update cumulative stats
        stats.total_points += result.total_match_points;
        stats.matches_played += 1;
        stats.best_placement = Math.min(stats.best_placement, result.placement);
        stats.total_eliminations += result.eliminations;
      });

      // Convert to array and sort by total points (descending)
      const sortedStats = Array.from(statsMap.values())
        .map(stats => ({
          ...stats,
          best_placement: stats.best_placement === Infinity ? 0 : stats.best_placement
        }))
        .sort((a, b) => {
          // Primary sort: total points (descending)
          if (b.total_points !== a.total_points) {
            return b.total_points - a.total_points;
          }
          // Secondary sort: best placement (ascending, lower is better)
          if (a.best_placement !== b.best_placement) {
            return a.best_placement - b.best_placement;
          }
          // Tertiary sort: total eliminations (descending)
          return b.total_eliminations - a.total_eliminations;
        });

      setPlayerStats(sortedStats);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching battle royale results:', error);
      setError('Failed to load battle royale results');
      setIsLoading(false);
    }
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-600" />;
      default:
        return <Trophy className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1:
        return <Badge variant="warning" className="bg-yellow-500 text-white">1st</Badge>;
      case 2:
        return <Badge variant="secondary" className="bg-gray-400 text-white">2nd</Badge>;
      case 3:
        return <Badge variant="accent" className="bg-orange-500 text-white">3rd</Badge>;
      default:
        return <Badge variant="primary">{position}th</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-error-500">
        {error}
      </div>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 text-accent-500 mr-2" />
            Battle Royale Leaderboard
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {playerStats.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Trophy className="h-12 w-12 mx-auto mb-4" />
            <p>No battle royale results found</p>
            <p className="text-sm mt-2">Results will appear here after matches are completed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Match 1</TableHead>
                  <TableHead className="text-center">Match 2</TableHead>
                  <TableHead className="text-center">Match 3</TableHead>
                  <TableHead className="text-center">Total Points</TableHead>
                  <TableHead className="text-center">Best Placement</TableHead>
                  <TableHead className="text-center">Total Eliminations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerStats.map((stats, index) => (
                  <TableRow 
                    key={stats.player_id}
                    className={index < 3 ? 'bg-primary-900/10' : ''}
                  >
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        {index < 3 && getPositionIcon(index + 1)}
                        {index >= 3 && (
                          <span className="font-bold text-white">{index + 1}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-primary-400" />
                        <span className="font-medium text-white">{stats.username}</span>
                        {index < 3 && getPositionBadge(index + 1)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-mono ${stats.match1_points > 0 ? 'text-primary-400' : 'text-gray-500'}`}>
                        {stats.match1_points || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-mono ${stats.match2_points > 0 ? 'text-primary-400' : 'text-gray-500'}`}>
                        {stats.match2_points || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-mono ${stats.match3_points > 0 ? 'text-primary-400' : 'text-gray-500'}`}>
                        {stats.match3_points || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono font-bold text-success-400 text-lg">
                        {stats.total_points}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-accent-400">
                        {stats.best_placement > 0 ? `#${stats.best_placement}` : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-error-400">
                        {stats.total_eliminations}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BattleRoyaleLeaderboard;