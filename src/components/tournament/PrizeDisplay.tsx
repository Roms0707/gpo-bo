import React, { useEffect, useState } from 'react';
import { Trophy, Award, Medal, Crown, Gift, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';

interface Prize {
  id: string;
  position: number;
  title: string;
  description: string;
  image_url: string | null;
  prize_type: 'monetary' | 'physical_digital';
  monetary_amount: number | null;
  currency: string | null;
  redemption_code: string | null;
}

interface PrizeDisplayProps {
  tournamentId: string;
  showTitle?: boolean;
  layout?: 'grid' | 'list' | 'compact';
  maxPrizes?: number;
}

const PrizeDisplay: React.FC<PrizeDisplayProps> = ({
  tournamentId,
  showTitle = true,
  layout = 'grid',
  maxPrizes
}) => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPrizes();
  }, [tournamentId]);

  const fetchPrizes = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('tournament_prizes')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('position', { ascending: true });

      if (maxPrizes) {
        query = query.limit(maxPrizes);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Map the database fields to our display format
      const formattedPrizes = (data || []).map(prize => ({
        id: prize.id,
        position: prize.position,
        title: prize.title,
        description: prize.prize_name, // Map prize_name to description for display
        image_url: prize.image_url,
        prize_type: prize.prize_type || 'physical_digital',
        monetary_amount: prize.monetary_amount,
        currency: prize.currency,
        redemption_code: prize.redemption_code
      }));
      
      setPrizes(formattedPrizes);
    } catch (error) {
      console.error('Error fetching prizes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-orange-600" />;
      default:
        return <Trophy className="h-6 w-6 text-blue-500" />;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return 'from-yellow-400 to-yellow-600';
      case 2:
        return 'from-gray-300 to-gray-500';
      case 3:
        return 'from-orange-400 to-orange-600';
      default:
        return 'from-blue-400 to-blue-600';
    }
  };

  const formatMonetaryAmount = (amount: number | null, currency: string | null) => {
    if (!amount || !currency) return '';

    const formattedAmount = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return `${formattedAmount} ${currency}`;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-dark-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-dark-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (prizes.length === 0) {
    return null;
  }

  const renderCompactLayout = () => (
    <div className="space-y-2">
      {prizes.map((prize) => (
        <div
          key={prize.id}
          className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-dark-200 rounded-lg"
        >
          {getPositionIcon(prize.position)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                {prize.title}
              </h4>
              <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                prize.prize_type === 'monetary'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              }`}>
                {prize.prize_type === 'monetary' ? (
                  <div className="flex items-center space-x-1">
                    <DollarSign className="w-3 h-3" />
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <Gift className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>
            {prize.prize_type === 'monetary' ? (
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                {formatMonetaryAmount(prize.monetary_amount, prize.currency)}
              </p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {prize.description}
              </p>
            )}
          </div>
          {prize.prize_type === 'physical_digital' && prize.image_url && (
            <img
              src={prize.image_url}
              alt={prize.title}
              className="h-12 w-16 object-cover rounded-md"
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderListLayout = () => (
    <div className="space-y-4">
      {prizes.map((prize) => (
        <div
          key={prize.id}
          className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-dark-200 rounded-lg"
        >
          <div className={`p-3 rounded-full bg-gradient-to-br ${getPositionColor(prize.position)}`}>
            {getPositionIcon(prize.position)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {prize.title}
              </h4>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                prize.prize_type === 'monetary'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              }`}>
                {prize.prize_type === 'monetary' ? (
                  <div className="flex items-center space-x-1">
                    <DollarSign className="w-3 h-3" />
                    <span>Cash</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <Gift className="w-3 h-3" />
                    <span>Goods</span>
                  </div>
                )}
              </div>
            </div>
            {prize.prize_type === 'monetary' ? (
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatMonetaryAmount(prize.monetary_amount, prize.currency)}
              </p>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                {prize.description}
              </p>
            )}
          </div>
          {prize.prize_type === 'physical_digital' && prize.image_url && (
            <img
              src={prize.image_url}
              alt={prize.title}
              className="h-20 w-28 object-cover rounded-lg"
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderGridLayout = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {prizes.map((prize) => (
        <Card
          key={prize.id}
          className={`relative overflow-hidden ${
            prize.position === 1 ? 'ring-2 ring-yellow-400 shadow-lg' : ''
          }`}
        >
          {prize.prize_type === 'physical_digital' && prize.image_url && (
            <div className="h-32 overflow-hidden">
              <img
                src={prize.image_url}
                alt={prize.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full bg-gradient-to-br ${getPositionColor(prize.position)}`}>
                  {getPositionIcon(prize.position)}
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {prize.title}
                </h4>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                prize.prize_type === 'monetary'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              }`}>
                {prize.prize_type === 'monetary' ? (
                  <div className="flex items-center space-x-1">
                    <DollarSign className="w-3 h-3" />
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <Gift className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>

            {prize.prize_type === 'monetary' ? (
              <div className="text-center py-4">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatMonetaryAmount(prize.monetary_amount, prize.currency)}
                </p>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                {prize.description}
              </p>
            )}
          </CardContent>

          {prize.position === 1 && (
            <div className="absolute top-2 right-2">
              <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                Winner
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );

  return (
    <div>
      {showTitle && (
        <div className="flex items-center space-x-2 mb-4">
          <Gift className="h-5 w-5 text-accent-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tournament Prizes
          </h3>
        </div>
      )}
      
      {layout === 'compact' && renderCompactLayout()}
      {layout === 'list' && renderListLayout()}
      {layout === 'grid' && renderGridLayout()}
    </div>
  );
};

export default PrizeDisplay;