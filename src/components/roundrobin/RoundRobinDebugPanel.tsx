import React from 'react';
import { Database } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Player, Team, Tournament } from './types';

interface RoundRobinDebugPanelProps {
  show: boolean;
  tournament: Tournament;
  participants: (Player | Team)[];
  qualifiedParticipants: (Player | Team)[];
  unassignedParticipants: (Player | Team)[];
  groupSize: number;
  numberOfCompleteGroups: number;
  matches: any[];
  completedMatches: number;
  bracketGenerated: boolean;
  groupStageComplete: boolean;
  validUserIds: Set<string>;
  sqlQuery: string;
}

const RoundRobinDebugPanel: React.FC<RoundRobinDebugPanelProps> = ({
  show,
  tournament,
  participants,
  qualifiedParticipants,
  unassignedParticipants,
  groupSize,
  numberOfCompleteGroups,
  matches,
  completedMatches,
  bracketGenerated,
  groupStageComplete,
  validUserIds,
  sqlQuery
}) => {
  if (!show) return null;

  const groupedMatches = matches.reduce((groups: Record<number, any[]>, match) => {
    const round = match.round;
    if (!groups[round]) {
      groups[round] = [];
    }
    groups[round].push(match);
    return groups;
  }, {});

  return (
    <Card className="bg-dark-300 border-yellow-500/30">
      <CardHeader>
        <CardTitle className="flex items-center text-yellow-400 text-base">
          <Database className="h-4 w-4 mr-2" />
          Round Robin Debug Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-gray-300 mb-2">
          <p>Total participants: <span className="font-mono">{participants.length}</span></p>
          <p>Group size: <span className="font-mono">{groupSize}</span></p>
          <p>Complete groups: <span className="font-mono">{numberOfCompleteGroups}</span></p>
          <p>Participants in complete groups: <span className="font-mono">{numberOfCompleteGroups * groupSize}</span></p>
          <p>Unassigned participants: <span className="font-mono">{unassignedParticipants.length}</span></p>
          <p>Total matches: <span className="font-mono">{matches.length}</span></p>
          <p>Completed matches: <span className="font-mono">{completedMatches}</span></p>
          <p>Groups with matches: <span className="font-mono">{Object.keys(groupedMatches).length}</span></p>
          <p>Bracket generated state: <span className="font-mono">{bracketGenerated.toString()}</span></p>
          <p>Group stage complete: <span className="font-mono">{groupStageComplete.toString()}</span></p>
          <p>Qualified participants: <span className="font-mono">{qualifiedParticipants.length}</span></p>
          <p>Valid user IDs count: <span className="font-mono">{validUserIds.size}</span></p>
        </div>

        <div className="mt-3">
          <h4 className="font-semibold text-yellow-400 mb-1 text-xs">Valid User IDs:</h4>
          <div className="bg-dark-400 p-2 rounded-md overflow-x-auto max-h-32">
            <pre className="text-xs text-green-400 whitespace-pre-wrap">{Array.from(validUserIds).join(', ')}</pre>
          </div>
        </div>

        {sqlQuery && (
          <div className="mt-3">
            <h4 className="font-semibold text-yellow-400 mb-1 text-xs">SQL Query:</h4>
            <div className="bg-dark-400 p-3 rounded-md overflow-x-auto">
              <pre className="text-xs text-green-400 whitespace-pre-wrap">{sqlQuery}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RoundRobinDebugPanel;
