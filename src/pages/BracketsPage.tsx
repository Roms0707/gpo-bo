import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Trophy, Users, Calendar, Eye, Gamepad2, TowerControl as GameController } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

interface Tournament {
  id: string;
  title: string;
  type: 'solo' | 'team';
  tournament_format?: string;
  status: string;
  start_date: string;
  end_date: string;
  header_url?: string;
  icon_url?: string;
  game_id?: string;
  game?: {
    name: string;
  };
}

const BracketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveTournaments();
  }, []);

  const fetchActiveTournaments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          id,
          title,
          type,
          tournament_format,
          status,
          start_date,
          end_date,
          header_url,
          icon_url,
          game_id,
          game:game_id (
            name
          )
        `)
        .eq('status', 'active')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching active tournaments:', error);
      setError('Failed to load tournaments');
    } finally {
      setIsLoading(false);
    }
  };

  const getBracketLink = (tournament: Tournament) => {
    if (!tournament.tournament_format) return `/tournaments/${tournament.id}/bracket`;

    if (tournament.tournament_format.includes('Swiss')) {
      return `/tournaments/${tournament.id}/swiss-bracket`;
    } else if (tournament.tournament_format.includes('Round Robin')) {
      return `/tournaments/${tournament.id}/rr-bracket`;
    } else {
      return `/tournaments/${tournament.id}/bracket`;
    }
  };

  const getFormatBadge = (format: string | undefined) => {
    if (!format) return null;

    if (format.includes('Swiss')) {
      return <Badge variant="primary" className="text-xs">Swiss</Badge>;
    } else if (format.includes('Round Robin')) {
      return <Badge variant="secondary" className="text-xs">Round Robin</Badge>;
    } else if (format.includes('Single Elimination')) {
      return <Badge variant="accent" className="text-xs">Single Elimination</Badge>;
    }

    return <Badge variant="primary" className="text-xs">{format}</Badge>;
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
        <Trophy className="h-12 w-12 text-error-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">{error}</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tournament Brackets</h1>
          <p className="text-gray-400 mt-1">
            {tournaments.length} active tournament{tournaments.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Active Tournaments</h3>
            <p className="text-gray-400 mb-6">
              There are currently no active tournaments with brackets available.
            </p>
            <Button onClick={() => navigate('/')}>
              View All Tournaments
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <Card
              key={tournament.id}
              className="group hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => navigate(getBracketLink(tournament))}
            >
              <div className="relative h-40 bg-gradient-to-r from-dark-300 to-dark-100 rounded-t-lg overflow-hidden">
                {tournament.header_url ? (
                  <img
                    src={tournament.header_url}
                    alt={tournament.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                    <Trophy className="h-16 w-16 text-white opacity-50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Tournament Icon */}
                <div className="absolute bottom-4 left-4 flex items-center space-x-3">
                  {tournament.icon_url ? (
                    <img
                      src={tournament.icon_url}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-lg"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary-600 flex items-center justify-center border-2 border-white shadow-lg">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight">
                      {tournament.title}
                    </h3>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <Badge variant="success" className="bg-success-500 text-white">
                    Active
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant={tournament.type === 'solo' ? 'accent' : 'secondary'} className="text-xs">
                    {tournament.type === 'solo' ? (
                      <>
                        <Users className="h-3 w-3 mr-1" />
                        Solo
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3 mr-1" />
                        Team
                      </>
                    )}
                  </Badge>

                  {getFormatBadge(tournament.tournament_format)}

                  {tournament.game && (
                    <Badge variant="primary" className="text-xs">
                      <GameController className="h-3 w-3 mr-1" />
                      {tournament.game.name}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Started: {formatDate(tournament.start_date)}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Ends: {formatDate(tournament.end_date)}</span>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    leftIcon={<Eye size={16} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(getBracketLink(tournament));
                    }}
                  >
                    View Bracket
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BracketsPage;
