import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import {
  TowerControl as GameController,
  ArrowLeft,
  Trophy,
  User,
  Shield,
  Users,
  Gamepad,
  Filter,
  Search
} from 'lucide-react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { formatDate } from '../utils/dateUtils';

interface PlayerRanking {
  id: string;
  user_id: string;
  game_id: string;
  elo_rating: number;
  wins: number;
  losses: number;
  rank_tier: string;
  last_updated: string;
  user: {
    email: string;
    username: string | null;
    avatar_url: string | null;
  };
  winRate: number; // calculated field
}

interface TeamRanking {
  id: string;
  team_id: string;
  game_id: string;
  elo_rating: number;
  wins: number;
  losses: number;
  rank_tier: string;
  last_updated: string;
  team: {
    name: string;
  };
  winRate: number; // calculated field
}

interface MatchResult {
  id: string;
  tournament_id: string | null;
  game_id: string;
  match_date: string;
  is_team_match: boolean;
  winner_team_id: string | null;
  loser_team_id: string | null;
  winner_player_id: string | null;
  loser_player_id: string | null;
  score_winner: number | null;
  score_loser: number | null;
  elo_change: number;
  winner_name: string; // calculated field
  loser_name: string; // calculated field
}

const LeaderboardsPage: React.FC = () => {
  const { gameId } = useParams<{ gameId?: string }>();
  const navigate = useNavigate();
  const { games, fetchGames, isLoading: gamesLoading } = useGameStore();

  const [playerRankings, setPlayerRankings] = useState<PlayerRanking[]>([]);
  const [teamRankings, setTeamRankings] = useState<TeamRanking[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchResult[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | undefined>(gameId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rankFilter, setRankFilter] = useState('');
  const [viewType, setViewType] = useState<'players' | 'teams'>('players');

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    if (games.length > 0 && !selectedGame) {
      // Set default game to the first one if none selected
      setSelectedGame(games[0]?.id);
    }
  }, [games, selectedGame]);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      if (!selectedGame) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch player rankings
        const { data: playerData, error: playerError } = await supabase
          .from('player_rankings')
          .select(`
            *,
            user:user_id(
              email,
              username,
              avatar_url
            )
          `)
          .eq('game_id', selectedGame)
          .order('elo_rating', { ascending: false });

        if (playerError) throw playerError;

        // Calculate win rate and format data
        const formattedPlayerData = playerData.map(player => ({
          ...player,
          winRate: player.wins + player.losses > 0
            ? Math.round((player.wins / (player.wins + player.losses)) * 100)
            : 0
        }));

        setPlayerRankings(formattedPlayerData);

        // Fetch team rankings
        const { data: teamData, error: teamError } = await supabase
          .from('team_rankings')
          .select(`
            *,
            team:team_id(
              name
            )
          `)
          .eq('game_id', selectedGame)
          .order('elo_rating', { ascending: false });

        if (teamError) throw teamError;

        // Calculate win rate and format data
        const formattedTeamData = teamData.map(team => ({
          ...team,
          winRate: team.wins + team.losses > 0
            ? Math.round((team.wins / (team.wins + team.losses)) * 100)
            : 0
        }));

        setTeamRankings(formattedTeamData);

        // Fetch recent matches
        const { data: matchData, error: matchError } = await supabase
          .from('match_results')
          .select(`
            *,
            winner_team:winner_team_id(name),
            loser_team:loser_team_id(name),
            winner_player:winner_player_id(email, username),
            loser_player:loser_player_id(email, username),
            tournament:tournament_id(title)
          `)
          .eq('game_id', selectedGame)
          .order('match_date', { ascending: false })
          .limit(10);

        if (matchError) throw matchError;

        // Format match data to include winner/loser names
        const formattedMatchData = matchData.map(match => {
          let winner_name = '';
          let loser_name = '';

          if (match.is_team_match) {
            winner_name = match.winner_team?.name || 'Unknown Team';
            loser_name = match.loser_team?.name || 'Unknown Team';
          } else {
            winner_name = match.winner_player?.username || match.winner_player?.email.split('@')[0] || 'Unknown Player';
            loser_name = match.loser_player?.username || match.loser_player?.email.split('@')[0] || 'Unknown Player';
          }

          return {
            ...match,
            winner_name,
            loser_name
          };
        });

        setRecentMatches(formattedMatchData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        setError('Failed to load leaderboard data');
        setIsLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [selectedGame]);

  // Apply filters to rankings
  const filteredPlayerRankings = playerRankings.filter(player => {
    const playerName = player.user?.username || player.user?.email || '';
    const matchesSearch = playerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRank = !rankFilter || player.rank_tier.includes(rankFilter);
    return matchesSearch && matchesRank;
  });

  const filteredTeamRankings = teamRankings.filter(team => {
    const teamName = team.team?.name || '';
    const matchesSearch = teamName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRank = !rankFilter || team.rank_tier.includes(rankFilter);
    return matchesSearch && matchesRank;
  });

  // Get unique rank tiers for filter
  const getUniqueTiers = () => {
    const tiers = new Set<string>();

    if (viewType === 'players') {
      playerRankings.forEach(player => {
        if (player.rank_tier) {
          // Extract the main rank (e.g., "GOLD" from "GOLD NOVA I")
          const mainRank = player.rank_tier.split(' ')[0];
          tiers.add(mainRank);
        }
      });
    } else {
      teamRankings.forEach(team => {
        if (team.rank_tier) {
          const mainRank = team.rank_tier.split(' ')[0];
          tiers.add(mainRank);
        }
      });
    }

    return Array.from(tiers).sort();
  };

  const getRankBadgeColor = (rank: string) => {
    const rankLower = rank.toLowerCase();
    if (rankLower.includes('iron') || rankLower.includes('bronze')) return 'bg-orange-700 text-white';
    if (rankLower.includes('silver')) return 'bg-gray-400 text-gray-900';
    if (rankLower.includes('gold')) return 'bg-yellow-500 text-gray-900';
    if (rankLower.includes('platinum') || rankLower.includes('guardian')) return 'bg-teal-500 text-white';
    if (rankLower.includes('diamond')) return 'bg-blue-500 text-white';
    if (rankLower.includes('master')) return 'bg-purple-600 text-white';
    if (rankLower.includes('grand') || rankLower.includes('elite') || rankLower.includes('challenger')) return 'bg-red-600 text-white';
    if (rankLower.includes('emerald')) return 'bg-emerald-500 text-white';
    return 'bg-gray-500 text-white';
  };

  const getGameName = (id: string) => {
    return games.find(game => game.id === id)?.name || 'Unknown Game';
  };

  const handleGameChange = (gameId: string) => {
    setSelectedGame(gameId);
    navigate(`/leaderboards/${gameId}`);
  };

  if (gamesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Game Leaderboards</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {games.map(game => (
          <Card
            key={game.id}
            className={`cursor-pointer transition-all ${
              selectedGame === game.id ? 'border-primary-500 shadow-glow' : ''
            }`}
            onClick={() => handleGameChange(game.id)}
          >
            <CardContent className="p-4 flex items-center">
              {game.image_url ? (
                <img
                  src={game.image_url}
                  alt={game.name}
                  className="w-12 h-12 object-cover rounded-md mr-3"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 dark:bg-dark-200 rounded-md mr-3 flex items-center justify-center">
                  <GameController className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-white">{game.name}</h3>
                {game.publisher && (
                  <p className="text-xs text-gray-400">{game.publisher}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Game Leaderboard */}
      {selectedGame && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white">
              {getGameName(selectedGame)} Leaderboard
            </h2>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant={viewType === 'players' ? 'primary' : 'ghost'}
                  onClick={() => setViewType('players')}
                >
                  <User className="h-4 w-4 mr-1" />
                  Players
                </Button>
                <Button
                  size="sm"
                  variant={viewType === 'teams' ? 'primary' : 'ghost'}
                  onClick={() => setViewType('teams')}
                >
                  <Users className="h-4 w-4 mr-1" />
                  Teams
                </Button>
              </div>

              <div className="flex gap-2">
                <div className="w-48">
                  <Input
                    placeholder={`Search ${viewType === 'players' ? 'players' : 'teams'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftIcon={<Search className="h-4 w-4 text-gray-400" />}
                  />
                </div>

                <div className="w-40">
                  <Select
                    value={rankFilter}
                    onChange={(e) => setRankFilter(e.target.value)}
                    options={[
                      { value: '', label: 'All Ranks' },
                      ...getUniqueTiers().map(tier => ({
                        value: tier,
                        label: tier.charAt(0) + tier.slice(1).toLowerCase()
                      }))
                    ]}
                    leftIcon={<Filter className="h-4 w-4 text-gray-400" />}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    {viewType === 'players' ? (
                      <>
                        <User className="h-5 w-5 text-primary-400 mr-2" />
                        Player Rankings
                      </>
                    ) : (
                      <>
                        <Users className="h-5 w-5 text-primary-400 mr-2" />
                        Team Rankings
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
                    </div>
                  ) : error ? (
                    <div className="text-center py-8 text-error-500">
                      {error}
                    </div>
                  ) : viewType === 'players' ? (
                    // Player Rankings Table
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>Player</TableHead>
                          <TableHead>Rank</TableHead>
                          <TableHead className="text-center">ELO</TableHead>
                          <TableHead className="text-center">W/L</TableHead>
                          <TableHead className="text-center">Win Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlayerRankings.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                              No player rankings found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPlayerRankings.map((player, index) => (
                            <TableRow key={player.id}>
                              <TableCell className="text-center font-bold text-white">
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-full bg-primary-900 flex items-center justify-center mr-2 text-primary-300">
                                    {(player.user?.username?.[0] || player.user?.email?.[0] || '?').toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-medium text-white">
                                      {player.user?.username || player.user?.email.split('@')[0] || 'Unknown Player'}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRankBadgeColor(player.rank_tier)}`}>
                                  {player.rank_tier}
                                </span>
                              </TableCell>
                              <TableCell className="text-center font-medium text-white">
                                {player.elo_rating}
                              </TableCell>
                              <TableCell className="text-center text-white">
                                {player.wins} - {player.losses}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="inline-flex items-center">
                                  <span className={
                                    player.winRate >= 60 ? 'text-success-400' :
                                    player.winRate >= 45 ? 'text-gray-300' :
                                    'text-error-400'
                                  }>
                                    {player.winRate}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    // Team Rankings Table
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Rank</TableHead>
                          <TableHead className="text-center">ELO</TableHead>
                          <TableHead className="text-center">W/L</TableHead>
                          <TableHead className="text-center">Win Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTeamRankings.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                              No team rankings found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTeamRankings.map((team, index) => (
                            <TableRow key={team.id}>
                              <TableCell className="text-center font-bold text-white">
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-md bg-secondary-900 flex items-center justify-center mr-2 text-secondary-300">
                                    <Shield className="h-4 w-4" />
                                  </div>
                                  <div className="font-medium text-white">
                                    {team.team?.name || 'Unknown Team'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRankBadgeColor(team.rank_tier)}`}>
                                  {team.rank_tier}
                                </span>
                              </TableCell>
                              <TableCell className="text-center font-medium text-white">
                                {team.elo_rating}
                              </TableCell>
                              <TableCell className="text-center text-white">
                                {team.wins} - {team.losses}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="inline-flex items-center">
                                  <span className={
                                    team.winRate >= 60 ? 'text-success-400' :
                                    team.winRate >= 45 ? 'text-gray-300' :
                                    'text-error-400'
                                  }>
                                    {team.winRate}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Trophy className="h-5 w-5 text-accent-400 mr-2" />
                    Recent Matches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    </div>
                  ) : recentMatches.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No recent matches found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentMatches.map(match => (
                        <div
                          key={match.id}
                          className="p-3 bg-dark-200 rounded-lg border border-dark-200 hover:border-dark-100"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant={match.is_team_match ? 'secondary' : 'accent'} className="text-xs">
                              {match.is_team_match ? 'Team Match' : 'Solo Match'}
                            </Badge>
                            <div className="text-xs text-gray-400">
                              {formatDate(match.match_date)}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm text-primary-300 font-medium">{match.winner_name}</div>
                            </div>

                            <div className="mx-2 text-xs px-1.5 py-0.5 bg-dark-300 rounded text-white font-mono">
                              {match.score_winner}-{match.score_loser}
                            </div>

                            <div className="flex-1 text-right">
                              <div className="text-sm text-gray-400">{match.loser_name}</div>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                            <span>+{match.elo_change} ELO</span>
                            {match.tournament_id && (
                              <span className="text-accent-400">Tournament Match</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                {recentMatches.length > 0 && (
                  <CardFooter>
                    <Button size="sm" variant="ghost" fullWidth>
                      View All Matches
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardsPage;
