import React from 'react';
import { Trophy, Clock, Users, User } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';

interface SwissOverviewProps {
  tournament: any;
  participants: any[];
  waitingListParticipants: any[];
  currentRound: number;
  currentRoundMatches: any[];
  maxAllowed: number;
  maxRounds: number;
}

const SwissOverview: React.FC<SwissOverviewProps> = ({
  tournament,
  participants,
  waitingListParticipants,
  currentRound,
  currentRoundMatches,
  maxAllowed,
  maxRounds
}) => {
  const completedMatches = currentRoundMatches.filter(m => m.winner_id).length;
  const totalMatches = currentRoundMatches.length;
  const completionPercentage = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
  const tournamentCompletionPercentage = maxRounds > 0 ? (currentRound / maxRounds) * 100 : 0;

  return (
    <>
      {/* Tournament Overview */}
      <Card className="bg-dark-300 border-primary-500/30">
        <CardHeader>
          <CardTitle className="flex items-center text-primary-400 text-base">
            <Trophy className="h-4 w-4 mr-2" />
            Tournament Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{participants.length}</div>
              <div className="text-gray-400">Active {tournament.type === 'team' ? 'Teams' : 'Players'}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning-400">{waitingListParticipants.length}</div>
              <div className="text-gray-400">Waiting List</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-400">{currentRound} / {maxRounds}</div>
              <div className="text-gray-400">Current Round</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-400">{currentRoundMatches.length}</div>
              <div className="text-gray-400">Matches This Round</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success-400">
                {completedMatches} / {totalMatches}
              </div>
              <div className="text-gray-400">Completed Matches</div>
            </div>
          </div>

          {/* Progress bars */}
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-400">Current Round Progress</span>
                <span className="text-xs text-white">{completedMatches}/{totalMatches} matches</span>
              </div>
              <div className="w-full bg-dark-200 h-2 rounded-full">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-400">Tournament Progress</span>
                <span className="text-xs text-white">Round {currentRound}/{maxRounds}</span>
              </div>
              <div className="w-full bg-dark-200 h-2 rounded-full">
                <div
                  className="bg-success-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${tournamentCompletionPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {waitingListParticipants.length > 0 && (
            <div className="mt-4 p-3 bg-warning-900/20 border border-warning-500/30 rounded-lg">
              <p className="text-warning-300 text-sm">
                <strong>Swiss Tournament Limit:</strong> Maximum {maxAllowed} {tournament.type === 'team' ? 'teams' : 'players'} can participate.
                {waitingListParticipants.length} {tournament.type === 'team' ? 'teams' : 'players'} are on the waiting list.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waiting List */}
      {waitingListParticipants.length > 0 && (
        <Card className="bg-warning-900/20 border-warning-500/30">
          <CardHeader>
            <CardTitle className="flex items-center text-warning-400 text-base">
              <Clock className="h-4 w-4 mr-2" />
              Waiting List ({waitingListParticipants.length} {tournament.type === 'team' ? 'teams' : 'players'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-warning-300 mb-3">
              These {tournament.type === 'team' ? 'teams' : 'players'} exceeded the Swiss tournament limit of {maxAllowed} participants:
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {waitingListParticipants.map((participant, index) => (
                <div key={participant.id} className="flex items-center space-x-2 bg-warning-900/30 p-2 rounded">
                  {tournament.type === 'team' ? (
                    <Users className="h-4 w-4 text-warning-400" />
                  ) : (
                    <User className="h-4 w-4 text-warning-400" />
                  )}
                  <span className="text-warning-200 text-sm truncate">
                    #{participants.length + index + 1} {participant.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default SwissOverview;
