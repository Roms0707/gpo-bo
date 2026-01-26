import React from 'react';
import { Bug } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';

interface SwissDebugPanelProps {
  show: boolean;
  tournament: any;
  participants: any[];
  waitingListParticipants: any[];
  currentRound: number;
  currentRoundMatches: any[];
  maxAllowed: number;
  totalParticipants: number;
  validUserIds: Set<string>;
  isGeneratingRound: boolean;
  sqlQuery: string;
  maxRounds: number;
}

const SwissDebugPanel: React.FC<SwissDebugPanelProps> = ({
  show,
  tournament,
  participants,
  waitingListParticipants,
  currentRound,
  currentRoundMatches,
  maxAllowed,
  totalParticipants,
  validUserIds,
  isGeneratingRound,
  sqlQuery,
  maxRounds
}) => {
  if (!show) return null;

  // Calculate the number of participants for knockout stage
  const getKnockoutSize = (participantCount: number): number => {
    // Take at most half of the initial participants
    return Math.min(Math.floor(participantCount / 2), 16);
  };

  const knockoutSize = getKnockoutSize(participants.length);

  // Count qualified and eliminated participants
  const qualifiedCount = participants.filter(p => p.wins >= 3 || p.isQualified).length;
  const eliminatedCount = participants.filter(p => p.losses >= 3 || p.isEliminated).length;
  const activeCount = participants.length - qualifiedCount - eliminatedCount;

  // Check if 50% threshold is reached
  const fiftyPercentReached = qualifiedCount >= Math.ceil(participants.length / 2);

  return (
    <Card className="bg-dark-300 border-yellow-500/30">
      <CardHeader>
        <CardTitle className="flex items-center text-yellow-400 text-base">
          <Bug className="h-4 w-4 mr-2" />
          Swiss Tournament Debug Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-gray-300 mb-2">
          <p>Tournament ID: <span className="font-mono">{tournament.id}</span></p>
          <p>Tournament Type: <span className="font-mono">{tournament.type}</span></p>
          <p>Current Round: <span className="font-mono">{currentRound}</span></p>
          <p>Max Rounds: <span className="font-mono">{maxRounds}</span></p>
          <p>Active Participants: <span className="font-mono">{participants.length}</span></p>
          <p>Waiting List: <span className="font-mono">{waitingListParticipants.length}</span></p>
          <p>Total Participants: <span className="font-mono">{totalParticipants}</span></p>
          <p>Max Allowed: <span className="font-mono">{maxAllowed}</span></p>
          <p>Current Round Matches: <span className="font-mono">{currentRoundMatches.length}</span></p>
          <p>Completed Matches: <span className="font-mono">{currentRoundMatches.filter(m => m.winner_id).length}</span></p>
          <p>Valid User IDs: <span className="font-mono">{validUserIds.size}</span></p>
          <p>Is Generating Round: <span className="font-mono">{isGeneratingRound.toString()}</span></p>
          <p>Knockout Stage Size: <span className="font-mono">{knockoutSize}</span></p>
          <p>Qualified Participants: <span className="font-mono">{qualifiedCount}</span></p>
          <p>Eliminated Participants: <span className="font-mono">{eliminatedCount}</span></p>
          <p>Active Participants: <span className="font-mono">{activeCount}</span></p>
          <p>50% Threshold Reached: <span className="font-mono">{fiftyPercentReached.toString()}</span></p>
        </div>

        <div className="mt-3">
          <h4 className="font-semibold text-yellow-400 mb-1 text-xs">Swiss Tournament Rules:</h4>
          <ul className="text-xs text-gray-300 list-disc pl-4 space-y-1">
            <li>Maximum 5 rounds for Swiss stage</li>
            <li>Players with 3 wins automatically qualify</li>
            <li>Players with 3 losses are automatically eliminated</li>
            <li>Tournament advances to knockout when 50% of participants qualify or after 5 rounds</li>
            <li>Maximum knockout size is 16 participants</li>
          </ul>
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

export default SwissDebugPanel;
