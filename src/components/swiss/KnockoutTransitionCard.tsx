import React from 'react';
import { Zap, Trophy, Users, User } from 'lucide-react';
import Card, { CardContent } from '../ui/Card';
import Button from '../ui/Button';

interface KnockoutTransitionCardProps {
  tournament: any;
  qualifiedParticipants: any[];
  isGeneratingKnockout: boolean;
  onGenerateKnockout: () => void;
}

const KnockoutTransitionCard: React.FC<KnockoutTransitionCardProps> = ({
  tournament,
  qualifiedParticipants,
  isGeneratingKnockout,
  onGenerateKnockout
}) => {
  // Count participants with 3 wins (auto-qualified)
  const autoQualifiedCount = qualifiedParticipants.filter(p => p.wins >= 3).length;

  // Count participants qualified by ranking
  const rankQualifiedCount = qualifiedParticipants.length - autoQualifiedCount;

  return (
    <Card className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-500/30">
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-yellow-500/20 rounded-full">
              <Zap className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Swiss Stage Complete!</h3>
          <p className="text-gray-300 mb-4">
            {qualifiedParticipants.length} {tournament.type === 'team' ? 'teams' : 'players'} have qualified for the knockout stage.
            {autoQualifiedCount > 0 && (
              <span className="block mt-1 text-success-300">
                {autoQualifiedCount} qualified with 3 wins
                {rankQualifiedCount > 0 && ` and ${rankQualifiedCount} by ranking`}
              </span>
            )}
          </p>

          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-2">
            {qualifiedParticipants.slice(0, 4).map((participant, index) => (
              <div key={participant.id} className="bg-dark-200 p-2 rounded-lg flex items-center space-x-2">
                {tournament.type === 'team' ? (
                  <Users className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                ) : (
                  <User className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                )}
                <div className="truncate text-sm">
                  <span className="text-yellow-400 font-medium">#{index + 1}</span>{' '}
                  <span className="text-white">{participant.name}</span>
                  {participant.wins >= 3 && (
                    <span className="ml-1 text-success-400">★</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={onGenerateKnockout}
            isLoading={isGeneratingKnockout}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold px-8 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-200"
            leftIcon={<Trophy size={20} />}
          >
            Start Knockout Stage
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default KnockoutTransitionCard;
