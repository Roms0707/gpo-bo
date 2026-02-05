import React from 'react';
import { Crown, Trophy, User, Users, AlertTriangle, Zap } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';

interface SwissStandingsProps {
  sortedParticipants: any[];
  tournament: any;
  canGenerateNextRound: boolean;
  isGeneratingRound: boolean;
  currentRound: number;
  onGenerateNextRound: () => void;
  maxRounds: number;
  isGeneratingKnockout?: boolean;
  onGenerateKnockout?: () => void;
  canTransitionToKnockout?: boolean;
}

const SwissStandings: React.FC<SwissStandingsProps> = ({
  sortedParticipants,
  tournament,
  canGenerateNextRound,
  isGeneratingRound,
  currentRound,
  onGenerateNextRound,
  maxRounds,
  isGeneratingKnockout = false,
  onGenerateKnockout,
  canTransitionToKnockout = false
}) => {
  // Determine how many participants qualify for knockout stage
  const getKnockoutSize = (participantCount: number): number => {
    // Take at most half of the initial participants
    return Math.min(Math.floor(participantCount / 2), 16);
  };

  const knockoutSize = getKnockoutSize(sortedParticipants.length);
  
  // Count qualified and eliminated participants
  const qualifiedCount = sortedParticipants.filter(p => p.wins >= 3 || p.isQualified).length;
  const eliminatedCount = sortedParticipants.filter(p => p.losses >= 3 || p.isEliminated).length;
  const activeCount = sortedParticipants.length - qualifiedCount - eliminatedCount;
  
  // Check if 50% threshold is reached
  const fiftyPercentReached = qualifiedCount >= Math.ceil(sortedParticipants.length / 2);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Crown className="h-5 w-5 text-accent-500 mr-2" />
            Current Standings
          </span>
          <div className="flex items-center space-x-2">
            {currentRound >= maxRounds && (
              <div className="flex items-center text-xs bg-warning-900/20 text-warning-400 px-2 py-1 rounded border border-warning-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span>Max {maxRounds} rounds reached</span>
              </div>
            )}
            {fiftyPercentReached && (
              <div className="flex items-center text-xs bg-success-900/20 text-success-400 px-2 py-1 rounded border border-success-500/30">
                <Trophy className="h-3 w-3 mr-1" />
                <span>50% qualified</span>
              </div>
            )}
            {canGenerateNextRound && currentRound < maxRounds && !fiftyPercentReached && (
              <Button
                onClick={onGenerateNextRound}
                isLoading={isGeneratingRound}
                leftIcon={<Trophy size={16} />}
              >
                Generate Round {currentRound + 1}
              </Button>
            )}
            {canTransitionToKnockout && onGenerateKnockout && (
              <Button
                onClick={onGenerateKnockout}
                isLoading={isGeneratingKnockout}
                leftIcon={<Zap size={16} />}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                Start Knockout Stage
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-dark-200">
                <th className="text-left py-2 px-3">Rank</th>
                <th className="text-left py-2 px-3">{tournament.type === 'team' ? 'Team' : 'Player'}</th>
                <th className="text-center py-2 px-3">Points</th>
                <th className="text-center py-2 px-3">W-L</th>
                <th className="text-center py-2 px-3">ELO</th>
                <th className="text-center py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedParticipants.map((participant, index) => (
                <tr key={participant.id} className={`border-b border-gray-100 dark:border-dark-300 ${
                  participant.wins >= 3 ? 'bg-success-900/20' : 
                  participant.losses >= 3 ? 'bg-error-900/10' : 
                  index < knockoutSize && (fiftyPercentReached || currentRound >= maxRounds) ? 'bg-primary-900/10' : ''
                }`}>
                  <td className="py-2 px-3 font-bold text-white">
                    {index + 1}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center space-x-2">
                      {tournament.type === 'team' ? (
                        <Users className="h-4 w-4 text-secondary-400" />
                      ) : (
                        <User className="h-4 w-4 text-primary-400" />
                      )}
                      <span className="font-medium text-white">{participant.name}</span>
                      {participant.wins >= 3 && (
                        <Trophy className="h-4 w-4 text-yellow-500 ml-1" />
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-primary-400">
                    {participant.points || 0}
                  </td>
                  <td className="py-2 px-3 text-center text-white">
                    {participant.wins || 0}-{participant.losses || 0}
                  </td>
                  <td className="py-2 px-3 text-center text-gray-400">
                    {participant.elo || 1000}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {participant.wins >= 3 ? (
                      <span className="px-2 py-1 bg-success-900/30 text-success-300 rounded text-xs font-medium">
                        Qualified
                      </span>
                    ) : participant.losses >= 3 ? (
                      <span className="px-2 py-1 bg-error-900/30 text-error-300 rounded text-xs">
                        Eliminated
                      </span>
                    ) : index < knockoutSize && (fiftyPercentReached || currentRound >= maxRounds) ? (
                      <span className="px-2 py-1 bg-primary-900/30 text-primary-300 rounded text-xs font-medium">
                        Qualifying
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-900/30 text-gray-400 rounded text-xs">
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-success-900/20 border border-success-500/30 rounded-lg">
            <div className="text-xl font-bold text-success-400">{qualifiedCount}</div>
            <div className="text-sm text-success-300">Qualified</div>
          </div>
          
          <div className="p-3 bg-primary-900/20 border border-primary-500/30 rounded-lg">
            <div className="text-xl font-bold text-primary-400">{activeCount}</div>
            <div className="text-sm text-primary-300">Active</div>
          </div>
          
          <div className="p-3 bg-error-900/20 border border-error-500/30 rounded-lg">
            <div className="text-xl font-bold text-error-400">{eliminatedCount}</div>
            <div className="text-sm text-error-300">Eliminated</div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-dark-200 rounded-lg text-sm text-gray-300">
          <p className="flex items-center">
            <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
            <strong>Swiss Tournament Rules:</strong> Players with 3 wins qualify automatically. Players with 3 losses are eliminated. 
            The tournament advances to knockout stage when 50% of participants qualify or after 5 rounds.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SwissStandings;