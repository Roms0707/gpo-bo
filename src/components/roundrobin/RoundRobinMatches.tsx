import React, { useEffect, useRef } from 'react';
import { Trophy, Users } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Match, Player, Team, Tournament } from './types';
import HighlightText from '../bracket/HighlightText';

interface RoundRobinMatchesProps {
  tournament: Tournament;
  matches: Match[];
  players: Player[];
  teams: Team[];
  onWinnerSelected: (matchId: string, winnerId: string) => void;
  isEditable?: boolean;
  onMatchUpdate?: (matchId: string) => void;
  searchQuery?: string;
}

const RoundRobinMatches: React.FC<RoundRobinMatchesProps> = ({
  tournament,
  matches,
  players,
  teams,
  onWinnerSelected,
  isEditable = false,
  onMatchUpdate,
  searchQuery = ''
}) => {
  const getParticipantName = (participantId: string | null) => {
    if (!participantId) return 'TBD';
    
    if (tournament?.type === 'team') {
      const team = teams.find(t => t.captain_id === participantId);
      return team ? team.name : 'Unknown Team';
    } else {
      const player = players.find(p => p.id === participantId);
      return player ? player.name : 'Unknown Player';
    }
  };

  const sortedMatches = [...matches].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.position - b.position;
  });

  const matchNumberMap = new Map<string, number>();
  sortedMatches.forEach((match, index) => {
    matchNumberMap.set(match.id, index + 1);
  });

  const filteredMatches = searchQuery
    ? matches.filter((match) => {
        const matchNumber = matchNumberMap.get(match.id) || 0;
        const player1Name = getParticipantName(match.player1_id).toLowerCase();
        const player2Name = getParticipantName(match.player2_id).toLowerCase();
        const query = searchQuery.toLowerCase();

        return (
          matchNumber.toString().includes(query) ||
          player1Name.includes(query) ||
          player2Name.includes(query)
        );
      })
    : matches;

  const groupedMatches = filteredMatches.reduce((groups: Record<number, Match[]>, match) => {
    const round = match.round;
    if (!groups[round]) {
      groups[round] = [];
    }
    groups[round].push(match);
    return groups;
  }, {});

  const firstMatchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery && filteredMatches.length > 0 && firstMatchRef.current) {
      firstMatchRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [searchQuery, filteredMatches.length]);

  if (Object.keys(groupedMatches).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Round Robin Bracket - {tournament?.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Generating Bracket...
            </h3>
            <p className="text-gray-400 text-sm">
              Setting up Round Robin matches for complete groups.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Round Robin Bracket - {tournament?.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {searchQuery && (
          <div className="mb-4 text-sm text-gray-400">
            Showing {filteredMatches.length} of {matches.length} matches
          </div>
        )}
        <div className="space-y-8">
          {Object.entries(groupedMatches).map(([round, roundMatches]) => (
            <div key={round} className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Users className="h-5 w-5 mr-2 text-primary-400" />
                Group {round}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roundMatches.map((match, matchIndex) => {
                  const matchNumber = matchNumberMap.get(match.id) || 0;
                  const isHighlighted = searchQuery && filteredMatches.includes(match);
                  const isFirstMatch = searchQuery && filteredMatches.length > 0 && match.id === filteredMatches[0].id;

                  return (
                    <div
                      key={match.id}
                      ref={isFirstMatch ? firstMatchRef : null}
                      className={`bg-dark-200 rounded-lg p-4 border relative ${
                        isHighlighted
                          ? 'border-primary-500 ring-2 ring-primary-500/20'
                          : 'border-dark-100'
                      }`}
                    >
                      <div className="absolute -top-2 -left-2 z-10">
                        <span className="bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                          #{matchNumber}
                        </span>
                      </div>
                    {/* Swap Button for Draft Mode */}
                    {isEditable && match.player1_id && match.player2_id && !match.winner_id && onMatchUpdate && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <button
                          onClick={() => onMatchUpdate(match.id)}
                          className="bg-primary-500 hover:bg-primary-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                          title="Swap players"
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        </button>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {/* Player 1 */}
                      <div
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all ${
                          match.winner_id === match.player1_id
                            ? 'bg-success-900/30 border border-success-500/50'
                            : !isEditable && match.player1_id && match.player2_id && !match.winner_id
                              ? 'hover:bg-primary-900/20 border border-transparent hover:border-primary-500/30'
                              : 'border border-transparent'
                        }`}
                        onClick={() => {
                          if (!match.winner_id && match.player1_id && !isEditable) {
                            onWinnerSelected(match.id, match.player1_id);
                          }
                        }}
                      >
                        <HighlightText
                          text={getParticipantName(match.player1_id)}
                          searchQuery={searchQuery}
                          className="font-medium text-white"
                        />
                        {match.winner_id === match.player1_id && (
                          <Trophy className="h-4 w-4 text-success-500" />
                        )}
                      </div>
                      
                      <div className="text-center text-gray-400 text-sm">vs</div>
                      
                      {/* Player 2 */}
                      <div
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all ${
                          match.winner_id === match.player2_id
                            ? 'bg-success-900/30 border border-success-500/50'
                            : !isEditable && match.player1_id && match.player2_id && !match.winner_id
                              ? 'hover:bg-primary-900/20 border border-transparent hover:border-primary-500/30'
                              : 'border border-transparent'
                        }`}
                        onClick={() => {
                          if (!match.winner_id && match.player2_id && !isEditable) {
                            onWinnerSelected(match.id, match.player2_id);
                          }
                        }}
                      >
                        <HighlightText
                          text={getParticipantName(match.player2_id)}
                          searchQuery={searchQuery}
                          className="font-medium text-white"
                        />
                        {match.winner_id === match.player2_id && (
                          <Trophy className="h-4 w-4 text-success-500" />
                        )}
                      </div>
                    </div>
                    
                      {match.winner_id && (
                        <div className="mt-3 text-center">
                          <span className="text-xs text-success-400 bg-success-900/20 px-2 py-1 rounded">
                            Winner: {getParticipantName(match.winner_id)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RoundRobinMatches;