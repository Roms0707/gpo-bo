import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { 
  TowerControl as GameController, 
  User, 
  Users, 
  ArrowLeft, 
  Search,
  Filter
} from 'lucide-react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
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
  winRate: number;
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
  winRate: number;
}

const GameLeaderboardPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { games, fetchGames } = useGameStore();
  
  const [playerRankings, setPlayerRankings] = useState<PlayerRanking[]>([]);
  const [teamRankings, setTeamRankings] = useState<TeamRanking[]>([]);
  const [viewMode, setViewMode] = useState<'players' | 'teams'>('players');
  const [searchTerm, setSearchTerm] = useState('');
  const [rankFilter, setRankFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<any | null>(null);
  
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);
  
  useEffect(() => {
    if (!gameId || !games.length) return;
    
    const currentGame = games.find(g => g.id === gameId);
    setGame(currentGame);
    
    const fetchLeaderboardData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch player rankings for this game
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
          .eq('game_id', gameId)
          .order('elo_rating', { ascending: false });
        
        if (playerError) throw playerError;
        
        // Calculate win rates and format data
        const formattedPlayerData = playerData.map(player => ({
          ...player,
          winRate: player.wins + player.losses > 0 
            ? Math.round((player.wins / (player.wins + player.losses)) * 100) 
            : 0
        }));
        
        setPlayerRankings(formattedPlayerData);
        
        // Fetch team rankings for this game
        const { data: teamData, error: teamError } = await supabase
          .from('team_rankings')
          .select(`
            *,
            team:team_id(
              name
            )
          `)
          .eq('game_id', gameId)
          .order('elo_rating', { ascending: false });
        
        if (teamError) throw teamError;
        
        // Calculate win rates and format data
        const formattedTeamData = teamData.map(team => ({
          ...team,
          winRate: team.wins + team.losses > 0 
            ? Math.round((team.wins / (team.wins + team.losses)) * 100) 
            : 0
        }));
        
        setTeamRankings(formattedTeamData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
        setError('Failed to load leaderboard data');
        setIsLoading(false);
      }
    };
    
    fetchLeaderboardData();
  }, [gameId, games]);
  
  // Apply filters to player rankings
  const filteredPlayerRankings = playerRankings.filter(player => {
    const playerName = player.user?.username || player.user?.email || '';
    const matchesSearch = playerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRank = !rankFilter || player.rank_tier.includes(rankFilter);
    return matchesSearch && matchesRank;
  });
  
  // Apply filters to team rankings
  const filteredTeamRankings = teamRankings.filter(team => {
    const teamName = team.team?.name || '';
    const matchesSearch = teamName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRank = !rankFilter || team.rank_tier.includes(rankFilter);
    return matchesSearch && matchesRank;
  });
  
  // Get unique rank tiers for filtering
  const getUniqueTiers = () => {
    const tiers = new Set<string>();
    
    if (viewMode === 'players') {
      playerRankings.forEach(player => {
        if (player.rank_tier) {
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
  
  // Get the appropriate badge color for a rank
  const getRankBadgeColor = (rank: string) => {
    const rankLower = rank.toLowerCase();
    if (rankLower.includes('iron')) return 'bg-gray-600 text-white';
    if (rankLower.includes('bronze')) return 'bg-orange-700 text-white';
    if (rankLower.includes('silver')) return 'bg-gray-400 text-gray-900';
    if (rankLower.includes('gold')) return 'bg-yellow-500 text-gray-900';
    if (rankLower.includes('platinum')) return 'bg-teal-500 text-white';
    if (rankLower.includes('diamond')) return 'bg-blue-500 text-white';
    if (rankLower.includes('emerald')) return 'bg-emerald-500 text-white';
    if (rankLower.includes('master')) return 'bg-purple-600 text-white';
    if (rankLower.includes('grandmaster')) return 'bg-red-600 text-white';
    if (rankLower.includes('challenger') || rankLower.includes('radiant')) return 'bg-red-500 text-white';
    return 'bg-gray-500 text-white';
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Game not found
        </p>
        <Button onClick={() => navigate('/leaderboards')} leftIcon={<ArrowLeft size={16} />}>
          Back to Leaderboards
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/leaderboards')}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back
        </Button>
        <h1 className="text-2xl font-bold text-white">{game.name} Leaderboard</h1>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex space-x-3">
          <Button
            size="sm"
            variant={viewMode === 'players' ? 'primary' : 'ghost'}
            onClick={() => setViewMode('players')}
          >
            <User className="h-4 w-4 mr-1" />
            Player Rankings
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'teams' ? 'primary' : 'ghost'}
            onClick={() => setViewMode('teams')}
          >
            <Users className="h-4 w-4 mr-1" />
            Team Rankings
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3">
          <div className="w-full md:w-48">
            <Input
              placeholder={`Search ${viewMode === 'players' ? 'players' : 'teams'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-5 w-5 text-gray-400" />}
            />
          </div>
          
          <div className="w-full md:w-40">
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
              leftIcon={<Filter className="h-5 w-5 text-gray-400" />}
            />
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            {viewMode === 'players' ? (
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
          {error ? (
            <div className="text-center py-8 text-error-500">
              {error}
            </div>
          ) : viewMode === 'players' ? (
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
                            <Users className="h-4 w-4" />
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
  );
};

export default GameLeaderboardPage;