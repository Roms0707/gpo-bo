import React from 'react';
import { Clock, User, Users } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Player, Team, Tournament } from './types';

interface WaitingListProps {
  tournament: Tournament;
  unassignedParticipants: (Player | Team)[];
  groupSize: number;
}

const WaitingList: React.FC<WaitingListProps> = ({
  tournament,
  unassignedParticipants,
  groupSize
}) => {
  if (unassignedParticipants.length === 0) {
    return null;
  }

  return (
    <Card className="bg-warning-900/20 border-warning-500/30">
      <CardHeader>
        <CardTitle className="flex items-center text-warning-400 text-base">
          <Clock className="h-4 w-4 mr-2" />
          Waiting List ({unassignedParticipants.length} {tournament.type === 'team' ? 'teams' : 'players'})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-warning-300 mb-3">
          These {tournament.type === 'team' ? 'teams' : 'players'} could not be placed in complete groups of {groupSize} and are on the waiting list:
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {unassignedParticipants.map((participant) => (
            <div key={participant.id} className="flex items-center space-x-2 bg-warning-900/30 p-2 rounded">
              {tournament.type === 'team' ? (
                <Users className="h-4 w-4 text-warning-400" />
              ) : (
                <User className="h-4 w-4 text-warning-400" />
              )}
              <span className="text-warning-200 text-sm truncate">
                {tournament.type === 'team' ? (participant as Team).name : (participant as Player).name}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default WaitingList;