import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle, Users } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { fetchTrendingTopics, fetchAnalyticsSummary } from '../../services/coachingAnalyticsService';
import type { TrendingTopic, AnalyticsSummary } from '../../types/coaching';

interface InsightsPanelProps {
  className?: string;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ className = '' }) => {
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const [trendingResult, summaryResult] = await Promise.all([
        fetchTrendingTopics(5),
        fetchAnalyticsSummary(),
      ]);

      if (trendingResult.data) setTrendingTopics(trendingResult.data);
      if (summaryResult.data) setSummary(summaryResult.data);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (trend: TrendingTopic['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-success-400" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-error-400" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendBadgeClass = (trend: TrendingTopic['trend']) => {
    switch (trend) {
      case 'up':
        return 'bg-success-500/10 text-success-400 border-success-500/20';
      case 'down':
        return 'bg-error-500/10 text-error-400 border-error-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const underservedTopics = trendingTopics
    .filter((t) => t.currentCount >= 5 && t.trend === 'up')
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-32 bg-dark-200 rounded-lg mb-4"></div>
          <div className="h-48 bg-dark-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Insights</h3>
        <Button variant="ghost" size="sm" onClick={loadInsights}>
          <RefreshCw size={14} />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">
            Trending Topics This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendingTopics.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Not enough data to show trends
            </p>
          ) : (
            <div className="space-y-3">
              {trendingTopics.map((topic) => (
                <div
                  key={topic.topic}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getTrendIcon(topic.trend)}
                    <span className="text-sm text-white truncate">
                      {topic.topic}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {topic.currentCount}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getTrendBadgeClass(
                        topic.trend
                      )}`}
                    >
                      {topic.trend === 'up' && '+'}
                      {topic.percentageChange}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {underservedTopics.length > 0 && (
        <Card className="border-warning-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-warning-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              High-Demand Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">
              These topics are trending up and may need more coverage:
            </p>
            <div className="space-y-2">
              {underservedTopics.map((topic) => (
                <div
                  key={topic.topic}
                  className="flex items-center justify-between p-2 bg-dark-300 rounded-lg"
                >
                  <span className="text-sm text-white">{topic.topic}</span>
                  <span className="text-xs text-warning-400">
                    {topic.currentCount} questions
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Session Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-2">
              <p className="text-3xl font-bold text-white">
                {summary.avgQuestionsPerSession}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Average questions per session
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-dark-100 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold text-white">
                  {summary.questionsThisWeek}
                </p>
                <p className="text-xs text-gray-500">This week</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  {summary.uniqueTopics}
                </p>
                <p className="text-xs text-gray-500">Topics covered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InsightsPanel;
