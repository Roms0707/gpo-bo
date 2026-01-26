import React from 'react';
import { Trophy, Users, Clock, Zap } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Player, Team, Tournament } from './types';

interface TournamentOverviewProps {
  tournament: Tournament;
  participants: (Player | Team)[];
  qualifiedParticipants: (Player | Team)[];
  unassignedParticipants: (Player | Team)[];
  groupSize: number;
  numberOfCompleteGroups: number;
  completedMatches: number;
  totalMatches: number;
}

const TournamentOverview: React.FC<TournamentOverviewProps> = ({
  tournament,
  participants,
  qualifiedParticipants,
  unassignedParticipants,
  groupSize,
  numberOfCompleteGroups,
  completedMatches,
  totalMatches
}) => {
  const completionPercentage = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

  return (
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
            <div className="text-gray-400">Total {tournament.type === 'team' ? 'Teams' : 'Players'}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-400">{numberOfCompleteGroups}</div>
            <div className="text-gray-400">Complete Groups</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-400">{groupSize}</div>
            <div className="text-gray-400">{tournament.type === 'team' ? 'Teams' : 'Players'} per Group</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success-400">{qualifiedParticipants.length}</div>
            <div className="text-gray-400">Qualified</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning-400">{unassignedParticipants.length}</div>
            <div className="text-gray-400">Waiting List</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Group Stage Progress</span>
            <span className="text-sm text-white">{completedMatches}/{totalMatches} matches</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-dark-200 h-2 rounded-full">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentOverview;
