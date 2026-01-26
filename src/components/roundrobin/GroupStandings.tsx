import React from 'react';
import { Trophy, User, Users } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Player, Team, Tournament } from './types';

interface GroupStandingsProps {
  tournament: Tournament;
  participants: (Player | Team)[];
}

const GroupStandings: React.FC<GroupStandingsProps> = ({
  tournament,
  participants
}) => {
  const participantsInGroups = participants.filter(p => p.groupId);

  if (participantsInGroups.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trophy className="h-5 w-5 text-accent-500 mr-2" />
          Group Standings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-dark-200">
                <th className="text-left py-2 px-3">Pos</th>
                <th className="text-left py-2 px-3">{tournament.type === 'team' ? 'Team' : 'Player'}</th>
                <th className="text-center py-2 px-3">Group</th>
                <th className="text-center py-2 px-3">W</th>
                <th className="text-center py-2 px-3">L</th>
                <th className="text-center py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {participantsInGroups
                .sort((a, b) => {
                  // Sort by group first, then by position within group
                  if (a.groupId !== b.groupId) {
                    return (a.groupId || '').localeCompare(b.groupId || '');
                  }
                  return (a.groupPosition || 0) - (b.groupPosition || 0);
                })
                .map((participant) => (
                  <tr
                    key={participant.id}
                    className={`border-b border-gray-100 dark:border-dark-300 ${
                      participant.isQualified ? 'bg-success-900/10' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-medium">
                      {participant.groupPosition}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center space-x-2">
                        {tournament.type === 'team' ? (
                          <Users className="h-4 w-4 text-secondary-400" />
                        ) : (
                          <User className="h-4 w-4 text-primary-400" />
                        )}
                        <span className="font-medium text-white">{participant.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-1 bg-primary-900/30 text-primary-300 rounded text-xs">
                        {participant.groupId?.replace('group-', 'G')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-success-400">
                      {participant.wins || 0}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-error-400">
                      {participant.losses || 0}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {participant.isQualified ? (
                        <span className="px-2 py-1 bg-success-900/30 text-success-300 rounded text-xs font-medium">
                          Qualified
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-900/30 text-gray-400 rounded text-xs">
                          Eliminated
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupStandings;
