import { supabase } from '../lib/supabase';
import type {
  CoachingQuestion,
  TopicStats,
  QuestionGroup,
  AnalyticsFilters,
  DailyQuestionCount,
  AnalyticsSummary,
  TrendingTopic,
} from '../types/coaching';

export const fetchTotalQuestionCount = async (): Promise<{
  count: number;
  error: Error | null;
}> => {
  try {
    const { count, error } = await supabase
      .from('coaching_question_analytics')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return { count: count || 0, error: null };
  } catch (error) {
    console.error('Error fetching total question count:', error);
    return { count: 0, error: error as Error };
  }
};

export const fetchQuestionsPerDay = async (
  days: number = 30
): Promise<{ data: DailyQuestionCount[]; error: Error | null }> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('coaching_question_analytics')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    const countsByDate: Record<string, number> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      countsByDate[dateStr] = 0;
    }

    data?.forEach((item) => {
      const dateStr = item.created_at.split('T')[0];
      if (countsByDate[dateStr] !== undefined) {
        countsByDate[dateStr]++;
      }
    });

    const dailyCounts: DailyQuestionCount[] = Object.entries(countsByDate).map(
      ([date, count]) => ({ date, count })
    );

    return { data: dailyCounts, error: null };
  } catch (error) {
    console.error('Error fetching questions per day:', error);
    return { data: [], error: error as Error };
  }
};

export const fetchTopTopics = async (
  limit: number = 10
): Promise<{ data: TopicStats[]; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('coaching_question_analytics')
      .select('detected_topics');

    if (error) throw error;

    const topicCounts: Record<string, number> = {};
    let totalTopics = 0;

    data?.forEach((item) => {
      if (item.detected_topics && Array.isArray(item.detected_topics)) {
        item.detected_topics.forEach((topic: string) => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          totalTopics++;
        });
      }
    });

    const sortedTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([topic, count]) => ({
        topic,
        count,
        percentage: totalTopics > 0 ? (count / totalTopics) * 100 : 0,
      }));

    return { data: sortedTopics, error: null };
  } catch (error) {
    console.error('Error fetching top topics:', error);
    return { data: [], error: error as Error };
  }
};

export const normalizeQuestionText = (text: string): string => {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
};

export const fetchFrequentlyAskedQuestions = async (
  limit: number = 20
): Promise<{ data: QuestionGroup[]; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('coaching_question_analytics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const questionGroups: Record<string, CoachingQuestion[]> = {};

    data?.forEach((question) => {
      const normalized = normalizeQuestionText(question.question_text);
      if (!questionGroups[normalized]) {
        questionGroups[normalized] = [];
      }
      questionGroups[normalized].push(question as CoachingQuestion);
    });

    const sortedGroups: QuestionGroup[] = Object.entries(questionGroups)
      .filter(([, questions]) => questions.length > 1)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, limit)
      .map(([normalizedText, examples]) => ({
        normalizedText,
        count: examples.length,
        examples,
      }));

    return { data: sortedGroups, error: null };
  } catch (error) {
    console.error('Error fetching frequently asked questions:', error);
    return { data: [], error: error as Error };
  }
};

export const fetchFilteredQuestions = async (
  filters: AnalyticsFilters,
  page: number = 1,
  pageSize: number = 10
): Promise<{
  data: CoachingQuestion[];
  total: number;
  error: Error | null;
}> => {
  try {
    let query = supabase
      .from('coaching_question_analytics')
      .select('*', { count: 'exact' });

    if (filters.dateRange.startDate) {
      query = query.gte('created_at', filters.dateRange.startDate);
    }

    if (filters.dateRange.endDate) {
      const endDate = new Date(filters.dateRange.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString());
    }

    if (filters.gameId) {
      query = query.eq('game_id', filters.gameId);
    }

    if (filters.topic) {
      query = query.contains('detected_topics', [filters.topic]);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;

    if (error) throw error;

    return {
      data: (data as CoachingQuestion[]) || [],
      total: count || 0,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching filtered questions:', error);
    return { data: [], total: 0, error: error as Error };
  }
};

export const fetchAnalyticsSummary = async (): Promise<{
  data: AnalyticsSummary | null;
  error: Error | null;
}> => {
  try {
    const [totalResult, weeklyResult, topicsResult, sessionsResult] =
      await Promise.all([
        supabase
          .from('coaching_question_analytics')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('coaching_question_analytics')
          .select('*', { count: 'exact', head: true })
          .gte(
            'created_at',
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          ),
        supabase.from('coaching_question_analytics').select('detected_topics'),
        supabase
          .from('coaching_question_analytics')
          .select('session_id, id')
          .order('session_id'),
      ]);

    if (totalResult.error) throw totalResult.error;
    if (weeklyResult.error) throw weeklyResult.error;
    if (topicsResult.error) throw topicsResult.error;
    if (sessionsResult.error) throw sessionsResult.error;

    const uniqueTopics = new Set<string>();
    topicsResult.data?.forEach((item) => {
      if (item.detected_topics && Array.isArray(item.detected_topics)) {
        item.detected_topics.forEach((topic: string) => uniqueTopics.add(topic));
      }
    });

    const sessionCounts: Record<string, number> = {};
    sessionsResult.data?.forEach((item) => {
      sessionCounts[item.session_id] = (sessionCounts[item.session_id] || 0) + 1;
    });

    const sessionValues = Object.values(sessionCounts);
    const avgQuestionsPerSession =
      sessionValues.length > 0
        ? sessionValues.reduce((a, b) => a + b, 0) / sessionValues.length
        : 0;

    return {
      data: {
        totalQuestions: totalResult.count || 0,
        questionsThisWeek: weeklyResult.count || 0,
        uniqueTopics: uniqueTopics.size,
        avgQuestionsPerSession: Math.round(avgQuestionsPerSession * 10) / 10,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return { data: null, error: error as Error };
  }
};

export const fetchTrendingTopics = async (
  limit: number = 5
): Promise<{ data: TrendingTopic[]; error: Error | null }> => {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [currentWeekResult, previousWeekResult] = await Promise.all([
      supabase
        .from('coaching_question_analytics')
        .select('detected_topics')
        .gte('created_at', oneWeekAgo.toISOString()),
      supabase
        .from('coaching_question_analytics')
        .select('detected_topics')
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', oneWeekAgo.toISOString()),
    ]);

    if (currentWeekResult.error) throw currentWeekResult.error;
    if (previousWeekResult.error) throw previousWeekResult.error;

    const countTopics = (
      data: { detected_topics: string[] | null }[]
    ): Record<string, number> => {
      const counts: Record<string, number> = {};
      data?.forEach((item) => {
        if (item.detected_topics && Array.isArray(item.detected_topics)) {
          item.detected_topics.forEach((topic) => {
            counts[topic] = (counts[topic] || 0) + 1;
          });
        }
      });
      return counts;
    };

    const currentCounts = countTopics(currentWeekResult.data || []);
    const previousCounts = countTopics(previousWeekResult.data || []);

    const allTopics = new Set([
      ...Object.keys(currentCounts),
      ...Object.keys(previousCounts),
    ]);

    const trendingTopics: TrendingTopic[] = Array.from(allTopics)
      .map((topic) => {
        const currentCount = currentCounts[topic] || 0;
        const previousCount = previousCounts[topic] || 0;

        let percentageChange = 0;
        if (previousCount > 0) {
          percentageChange =
            ((currentCount - previousCount) / previousCount) * 100;
        } else if (currentCount > 0) {
          percentageChange = 100;
        }

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (percentageChange > 10) trend = 'up';
        else if (percentageChange < -10) trend = 'down';

        return {
          topic,
          currentCount,
          previousCount,
          percentageChange: Math.round(percentageChange),
          trend,
        };
      })
      .filter((t) => t.currentCount > 0)
      .sort((a, b) => b.currentCount - a.currentCount)
      .slice(0, limit);

    return { data: trendingTopics, error: null };
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    return { data: [], error: error as Error };
  }
};

export const fetchAllDetectedTopics = async (): Promise<{
  data: string[];
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('coaching_question_analytics')
      .select('detected_topics');

    if (error) throw error;

    const uniqueTopics = new Set<string>();
    data?.forEach((item) => {
      if (item.detected_topics && Array.isArray(item.detected_topics)) {
        item.detected_topics.forEach((topic: string) => uniqueTopics.add(topic));
      }
    });

    return { data: Array.from(uniqueTopics).sort(), error: null };
  } catch (error) {
    console.error('Error fetching all detected topics:', error);
    return { data: [], error: error as Error };
  }
};
