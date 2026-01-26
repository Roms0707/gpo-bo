import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, Trophy, Target, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import toast from 'react-hot-toast';
import {
  getPlacementPoints,
  getEliminationPoints,
  calculateTotalMatchPoints,
  getBattleRoyaleGameInfo,
  isValidPlacement
} from '../utils/battleRoyalePoints';

interface Tournament {
  id: string;
  title: string;
  type: 'solo' | 'team';
  game_id: string;
  max_nb_players: number;
  game: {
    name: string;
  };
}

interface Player {
  id: string;
  username: string | null;
  email: string;
}

interface MatchResult {
  player_id: string;
  placement: number;
  eliminations: number;
  placement_points: number;
  elimination_points: number;
  total_match_points: number;
}

interface ExistingResult {
  id: string;
  player_id: string;
  placement: number;
  eliminations: number;
  placement_points: number;
  elimination_points: number;
  total_match_points: number;
}

const BattleRoyaleMatchEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<number>(1);
  const [results, setResults] = useState<Record<string, MatchResult>>({});
  const [existingResults, setExistingResults] = useState<Record<number, ExistingResult[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [gameInfo, setGameInfo] = useState<any>(null);

  useEffect(() => {
    fetchTournamentAndPlayers();
  }, [id]);

  useEffect(() => {
    if (tournament && tournament.game) {
      const info = getBattleRoyaleGameInfo(tournament.game.name);
      setGameInfo(info);
    }
  }, [tournament]);

  useEffect(() => {
    if (tournament) {
      fetchExistingResults();
    }
  }, [tournament, selectedMatch]);

  const fetchTournamentAndPlayers = async () => {
    if (!id) return;

    try {
      setIsLoading(true);

      // Fetch tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select(`
          id,
          title,
          type,
          game_id,
          max_nb_players,
          game:game_id (
            name
          )
        `)
        .eq('id', id)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData as Tournament);

      // Fetch approved players for this tournament
      const { data: registrations, error: registrationsError } = await supabase
        .from('tournament_registrations')
        .select(`
          user_id,
          user:user_id (
            id,
            username,
            email
          )
        `)
        .eq('tournament_id', id)
        .eq('status', 'approved');

      if (registrationsError) throw registrationsError;

      const approvedPlayers = registrations
        .filter(reg => reg.user)
        .map(reg => ({
          id: reg.user.id,
          username: reg.user.username,
          email: reg.user.email
        }));

      setPlayers(approvedPlayers);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      toast.error('Failed to load tournament data');
      setIsLoading(false);
    }
  };

  const fetchExistingResults = async () => {
    if (!tournament) return;

    try {
      const { data, error } = await supabase
        .from('battle_royale_results')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('match_number', { ascending: true });

      if (error) throw error;

      // Group results by match number
      const groupedResults: Record<number, ExistingResult[]> = {};
      data.forEach(result => {
        if (!groupedResults[result.match_number]) {
          groupedResults[result.match_number] = [];
        }
        groupedResults[result.match_number].push(result);
      });

      setExistingResults(groupedResults);

      // If viewing an existing match, populate the form
      if (groupedResults[selectedMatch]) {
        const matchResults: Record<string, MatchResult> = {};
        groupedResults[selectedMatch].forEach(result => {
          matchResults[result.player_id] = {
            player_id: result.player_id,
            placement: result.placement,
            eliminations: result.eliminations,
            placement_points: result.placement_points,
            elimination_points: result.elimination_points,
            total_match_points: result.total_match_points
          };
        });
        setResults(matchResults);
      } else {
        setResults({});
      }
    } catch (error) {
      console.error('Error fetching existing results:', error);
      toast.error('Failed to load existing results');
    }
  };

  const updatePlayerResult = (playerId: string, field: 'placement' | 'eliminations', value: string) => {
    if (!tournament || !gameInfo) return;

    const numValue = parseInt(value) || 0;

    // Validate placement
    if (field === 'placement' && numValue > 0 && !isValidPlacement(numValue, gameInfo.maxPlayers)) {
      toast.error(`Placement must be between 1 and ${gameInfo.maxPlayers}`);
      return;
    }

    const currentResult = results[playerId] || {
      player_id: playerId,
      placement: 0,
      eliminations: 0,
      placement_points: 0,
      elimination_points: 0,
      total_match_points: 0
    };

    const updatedResult = {
      ...currentResult,
      [field]: numValue
    };

    // Recalculate points
    if (updatedResult.placement > 0) {
      updatedResult.placement_points = getPlacementPoints(
        tournament.game.name,
        gameInfo.maxPlayers,
        updatedResult.placement
      );
    } else {
      updatedResult.placement_points = 0;
    }

    updatedResult.elimination_points = getEliminationPoints(
      tournament.game.name,
      updatedResult.eliminations
    );

    updatedResult.total_match_points = updatedResult.placement_points + updatedResult.elimination_points;

    setResults(prev => ({
      ...prev,
      [playerId]: updatedResult
    }));
  };

  const saveResults = async () => {
    if (!tournament) return;

    try {
      setIsSaving(true);

      // Validate that all players have valid placements
      const playerResults = Object.values(results);
      const validResults = playerResults.filter(result => result.placement > 0);

      if (validResults.length === 0) {
        toast.error('Please enter at least one player result');
        return;
      }

      // Check for duplicate placements
      const placements = validResults.map(r => r.placement);
      const uniquePlacements = new Set(placements);
      if (placements.length !== uniquePlacements.size) {
        toast.error('Each player must have a unique placement');
        return;
      }

      // Delete existing results for this match
      const { error: deleteError } = await supabase
        .from('battle_royale_results')
        .delete()
        .eq('tournament_id', tournament.id)
        .eq('match_number', selectedMatch);

      if (deleteError) throw deleteError;

      // Insert new results
      const insertData = validResults.map(result => ({
        tournament_id: tournament.id,
        game_id: tournament.game_id,
        match_number: selectedMatch,
        player_id: result.player_id,
        placement: result.placement,
        eliminations: result.eliminations,
        placement_points: result.placement_points,
        elimination_points: result.elimination_points,
        total_match_points: result.total_match_points
      }));

      const { error: insertError } = await supabase
        .from('battle_royale_results')
        .insert(insertData);

      if (insertError) throw insertError;

      toast.success(`Match ${selectedMatch} results saved successfully!`);
      fetchExistingResults(); // Refresh the data
    } catch (error) {
      console.error('Error saving results:', error);
      toast.error('Failed to save results');
    } finally {
      setIsSaving(false);
    }
  };

  const getPlayerName = (player: Player) => {
    return player.username || player.email.split('@')[0];
  };

  const getMatchStatus = (matchNumber: number) => {
    return existingResults[matchNumber] && existingResults[matchNumber].length > 0;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="h-12 w-12 text-error-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Tournament not found</h2>
        <Button onClick={() => navigate('/brackets')} leftIcon={<ArrowLeft size={16} />}>
          Back to Brackets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(`/tournaments/${id}`)}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back to Tournament
        </Button>

        <div className="flex items-center space-x-2">
          <Badge variant="accent">Battle Royale</Badge>
          <Badge variant="primary">{tournament.game.name}</Badge>
        </div>
      </div>

      {/* Tournament Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 text-accent-500 mr-2" />
            {tournament.title} - Battle Royale Results Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{players.length}</div>
              <div className="text-gray-400">Registered Players</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-400">{gameInfo?.maxPlayers || 0}</div>
              <div className="text-gray-400">Max Players per Match</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-400">{gameInfo?.eliminationPointsPerKill || 0}</div>
              <div className="text-gray-400">Points per Elimination</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success-400">3</div>
              <div className="text-gray-400">Total Matches</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Match</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            {[1, 2, 3].map(matchNumber => (
              <Button
                key={matchNumber}
                variant={selectedMatch === matchNumber ? 'primary' : 'ghost'}
                onClick={() => setSelectedMatch(matchNumber)}
                className="flex items-center space-x-2"
              >
                <span>Match {matchNumber}</span>
                {getMatchStatus(matchNumber) && (
                  <CheckCircle className="h-4 w-4 text-success-500" />
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results Entry */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 text-primary-500 mr-2" />
            Match {selectedMatch} Results
          </CardTitle>
          <Button
            onClick={saveResults}
            isLoading={isSaving}
            leftIcon={<Save size={16} />}
            disabled={Object.keys(results).length === 0}
          >
            Save Results
          </Button>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <p>No approved players found for this tournament</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Placement</TableHead>
                  <TableHead className="text-center">Eliminations</TableHead>
                  <TableHead className="text-center">Placement Points</TableHead>
                  <TableHead className="text-center">Elimination Points</TableHead>
                  <TableHead className="text-center">Total Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map(player => {
                  const result = results[player.id];
                  return (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">
                        {getPlayerName(player)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="1"
                          max={gameInfo?.maxPlayers || 100}
                          value={result?.placement || ''}
                          onChange={(e) => updatePlayerResult(player.id, 'placement', e.target.value)}
                          placeholder="Position"
                          className="w-20 text-center"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="0"
                          value={result?.eliminations || ''}
                          onChange={(e) => updatePlayerResult(player.id, 'eliminations', e.target.value)}
                          placeholder="Kills"
                          className="w-20 text-center"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-primary-400">
                          {result?.placement_points || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-accent-400">
                          {result?.elimination_points || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono font-bold text-success-400">
                          {result?.total_match_points || 0}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-dark-200 border-primary-500/30">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium text-primary-400 mb-3">Instructions</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• Enter the final placement (1-{gameInfo?.maxPlayers || 100}) for each player</li>
            <li>• Enter the number of eliminations (kills) for each player</li>
            <li>• Points are calculated automatically based on the game's scoring system</li>
            <li>• You can save and edit results for each match separately</li>
            <li>• Final rankings will be based on cumulative points across all 3 matches</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default BattleRoyaleMatchEntryPage;
