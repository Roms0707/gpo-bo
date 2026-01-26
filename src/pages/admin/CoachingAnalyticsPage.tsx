import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart3,
  MessageSquare,
  TrendingUp,
  Hash,
  Users,
  Calendar,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Table, {
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import TopicBadge from '../../components/coaching/TopicBadge';
import QuestionCard from '../../components/coaching/QuestionCard';
import {
  fetchAnalyticsSummary,
  fetchQuestionsPerDay,
  fetchTopTopics,
  fetchFrequentlyAskedQuestions,
  fetchFilteredQuestions,
  fetchAllDetectedTopics,
} from '../../services/coachingAnalyticsService';
import { supabase } from '../../lib/supabase';
import type {
  AnalyticsSummary,
  DailyQuestionCount,
  TopicStats,
  QuestionGroup,
  CoachingQuestion,
  AnalyticsFilters,
} from '../../types/coaching';
import toast from 'react-hot-toast';

interface Game {
  id: string;
  name: string;
}

const CoachingAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [dailyCounts, setDailyCounts] = useState<DailyQuestionCount[]>([]);
  const [topTopics, setTopTopics] = useState<TopicStats[]>([]);
  const [frequentQuestions, setFrequentQuestions] = useState<QuestionGroup[]>([]);
  const [questions, setQuestions] = useState<CoachingQuestion[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [games, setGames] = useState<Game[]>([]);
  const [allTopics, setAllTopics] = useState<string[]>([]);

  const [filters, setFilters] = useState<AnalyticsFilters>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return {
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      gameId: null,
      topic: null,
    };
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const totalPages = Math.ceil(totalQuestions / pageSize);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadFilteredQuestions();
  }, [filters, page, pageSize]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [
        summaryResult,
        dailyResult,
        topicsResult,
        faqResult,
        gamesResult,
        allTopicsResult,
      ] = await Promise.all([
        fetchAnalyticsSummary(),
        fetchQuestionsPerDay(30),
        fetchTopTopics(10),
        fetchFrequentlyAskedQuestions(20),
        supabase.from('games').select('id, name, sort_priority').order('sort_priority').order('name'),
        fetchAllDetectedTopics(),
      ]);

      if (summaryResult.data) setSummary(summaryResult.data);
      if (dailyResult.data) setDailyCounts(dailyResult.data);
      if (topicsResult.data) setTopTopics(topicsResult.data);
      if (faqResult.data) setFrequentQuestions(faqResult.data);
      if (gamesResult.data) setGames(gamesResult.data as Game[]);
      if (allTopicsResult.data) setAllTopics(allTopicsResult.data);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFilteredQuestions = async () => {
    const result = await fetchFilteredQuestions(filters, page, pageSize);
    if (result.data) {
      setQuestions(result.data);
      setTotalQuestions(result.total);
    }
  };

  const handleRefresh = () => {
    loadInitialData();
    loadFilteredQuestions();
  };

  const handleResetFilters = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    setFilters({
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      gameId: null,
      topic: null,
    });
    setPage(1);
  };

  const maxDailyCount = useMemo(
    () => Math.max(...dailyCounts.map((d) => d.count), 1),
    [dailyCounts]
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Coaching Analytics</h1>
          <p className="text-gray-400 mt-1">
            Monitor coaching questions, topics, and usage patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/coaching-config')}
          >
            Configure AI Behavior
          </Button>
          <Button onClick={handleRefresh} leftIcon={<RefreshCw size={16} />}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-500/10 rounded-lg">
                <MessageSquare className="h-6 w-6 text-primary-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {summary?.totalQuestions.toLocaleString() || 0}
                </p>
                <p className="text-sm text-gray-400">Total Questions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-success-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {summary?.questionsThisWeek.toLocaleString() || 0}
                </p>
                <p className="text-sm text-gray-400">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent-500/10 rounded-lg">
                <Hash className="h-6 w-6 text-accent-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {summary?.uniqueTopics || 0}
                </p>
                <p className="text-sm text-gray-400">Unique Topics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary-500/10 rounded-lg">
                <Users className="h-6 w-6 text-secondary-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {summary?.avgQuestionsPerSession || 0}
                </p>
                <p className="text-sm text-gray-400">Avg per Session</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-500" />
            Questions Over Time (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-end gap-1">
            {dailyCounts.map((day, index) => {
              const height = maxDailyCount > 0 ? (day.count / maxDailyCount) * 100 : 0;
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center group"
                >
                  <div className="relative w-full">
                    <div
                      className="w-full bg-primary-500 rounded-t transition-all duration-200 hover:bg-primary-400"
                      style={{ height: `${Math.max(height, 2)}%`, minHeight: '2px' }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-dark-100 px-2 py-1 rounded text-xs text-white whitespace-nowrap z-10">
                      {day.count} questions
                      <br />
                      {formatDate(day.date)}
                    </div>
                  </div>
                  {index % 5 === 0 && (
                    <span className="text-[10px] text-gray-500 mt-1 transform -rotate-45 origin-left whitespace-nowrap">
                      {formatDate(day.date)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-accent-500" />
              Top 10 Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topTopics.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No topics detected yet
                </p>
              ) : (
                topTopics.map((topic, index) => (
                  <div key={topic.topic} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-4">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white truncate">
                          {topic.topic}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {topic.count}
                        </span>
                      </div>
                      <div className="h-2 bg-dark-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
                          style={{ width: `${topic.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-secondary-500" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {frequentQuestions.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No repeated questions found yet
                </p>
              ) : (
                frequentQuestions.map((group) => (
                  <div
                    key={group.normalizedText}
                    className="border border-dark-100 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedGroup(
                          expandedGroup === group.normalizedText
                            ? null
                            : group.normalizedText
                        )
                      }
                      className="w-full flex items-center justify-between p-3 hover:bg-dark-200 transition-colors text-left"
                    >
                      <span className="text-sm text-white line-clamp-1 flex-1">
                        {group.examples[0].question_text}
                      </span>
                      <span className="ml-2 px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs font-medium rounded">
                        {group.count}x
                      </span>
                    </button>
                    {expandedGroup === group.normalizedText && (
                      <div className="px-3 pb-3 border-t border-dark-100 bg-dark-300">
                        <p className="text-xs text-gray-500 mt-2 mb-2">
                          Example occurrences:
                        </p>
                        <div className="space-y-2">
                          {group.examples.slice(0, 3).map((example) => (
                            <div
                              key={example.id}
                              className="text-xs text-gray-400 p-2 bg-dark-200 rounded"
                            >
                              <p className="truncate">{example.question_text}</p>
                              <p className="text-gray-600 mt-1">
                                {new Date(example.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary-500" />
              Recent Questions
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              <X size={14} className="mr-1" />
              Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Input
              type="date"
              label="Start Date"
              value={filters.dateRange.startDate}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, startDate: e.target.value },
                })
              }
            />
            <Input
              type="date"
              label="End Date"
              value={filters.dateRange.endDate}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, endDate: e.target.value },
                })
              }
            />
            <Select
              label="Game"
              value={filters.gameId || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  gameId: e.target.value || null,
                })
              }
              options={[
                { value: '', label: 'All Games' },
                ...games.map((g) => ({ value: g.id, label: g.name })),
              ]}
            />
            <Select
              label="Topic"
              value={filters.topic || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  topic: e.target.value || null,
                })
              }
              options={[
                { value: '', label: 'All Topics' },
                ...allTopics.map((t) => ({ value: t, label: t })),
              ]}
            />
          </div>

          <div className="space-y-3">
            {questions.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No questions found for the selected filters</p>
              </div>
            ) : (
              questions.map((question) => (
                <QuestionCard key={question.id} question={question} showResponse />
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-dark-100">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Show</span>
                <Select
                  value={pageSize.toString()}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  options={[
                    { value: '10', label: '10' },
                    { value: '25', label: '25' },
                    { value: '50', label: '50' },
                  ]}
                  className="w-20"
                />
                <span className="text-sm text-gray-400">per page</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CoachingAnalyticsPage;
