import React from 'react';
import { Zap, Crown } from 'lucide-react';
import Card, { CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { Player, Team, Tournament } from './types';

interface KnockoutStageCardProps {
  tournament: Tournament;
  qualifiedParticipants: (Player | Team)[];
  isGeneratingKnockout: boolean;
  onGenerateKnockout: () => void;
}

const KnockoutStageCard: React.FC<KnockoutStageCardProps> = ({
  tournament,
  qualifiedParticipants,
  isGeneratingKnockout,
  onGenerateKnockout
}) => {
  return (
    <Card className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-500/30">
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-yellow-500/20 rounded-full">
              <Zap className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Group Stage Complete!</h3>
          <p className="text-gray-300 mb-4">
            {qualifiedParticipants.length} {tournament.type === 'team' ? 'teams' : 'players'} have qualified for the knockout stage.
          </p>
          <Button
            onClick={onGenerateKnockout}
            isLoading={isGeneratingKnockout}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold px-8 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-200"
            leftIcon={<Crown size={20} />}
          >
            Start Knockout Stage
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default KnockoutStageCard;