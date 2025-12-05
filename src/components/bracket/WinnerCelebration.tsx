import React from 'react';
import { Trophy, Star, Crown, Sparkles, Users } from 'lucide-react';
import Button from '../ui/Button';
import { Player, Team } from './types';

interface WinnerCelebrationProps {
  show: boolean;
  winner: Player | Team | null;
  tournament: any;
  onContinue: () => void;
  onBackToRegistrations: () => void;
}

const WinnerCelebration: React.FC<WinnerCelebrationProps> = ({
  show,
  winner,
  tournament,
  onContinue,
  onBackToRegistrations
}) => {
  if (!show || !winner) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="text-center p-8 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-3xl border border-yellow-400/30 backdrop-blur-md shadow-2xl max-w-2xl mx-4">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Trophy className="h-24 w-24 text-yellow-400 animate-bounce" />
            <div className="absolute -top-2 -right-2">
              <Star className="h-8 w-8 text-yellow-300 animate-spin" />
            </div>
            <div className="absolute -bottom-2 -left-2">
              <Sparkles className="h-6 w-6 text-orange-400 animate-pulse" />
            </div>
          </div>
        </div>
        
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-4 animate-pulse">
          CHAMPION!
        </h1>
        
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-white mb-2">
            {winner.name}
          </h2>
          <div className="flex items-center justify-center space-x-4 text-lg text-yellow-300">
            {tournament?.type === 'team' ? (
              <div className="flex items-center space-x-1">
                <Users className="h-5 w-5" />
                <span>{(winner as Team).memberCount || 0} members</span>
              </div>
            ) : (
              <>
                {(winner as Player).seed && (
                  <div className="flex items-center space-x-1">
                    <Crown className="h-5 w-5" />
                    <span>Seed #{(winner as Player).seed}</span>
                  </div>
                )}
                {(winner as Player).elo && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-5 w-5" />
                    <span>{(winner as Player).elo} ELO</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="text-2xl font-semibold text-yellow-200 mb-6">
          🏆 {tournament?.title} Winner 🏆
        </div>
        
        <div className="flex justify-center space-x-4">
          <Button
            onClick={onContinue}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold px-8 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            Continue
          </Button>
          <Button
            variant="ghost"
            onClick={onBackToRegistrations}
            className="text-white border-white/30 hover:bg-white/10 px-8 py-3 rounded-full"
          >
            Back to Brackets
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WinnerCelebration;