import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2,
  Search,
  Users,
  CheckCircle2,
  Clock,
  BarChart3,
  FileQuestion,
  User,
  ChevronDown,
} from 'lucide-react';
import Card, { CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import SubmissionDetailModal from './SubmissionDetailModal';
import { fetchAdminSubmissions } from '../../services/grindZoneQuizSubmissionService';
import type { AdminQuizSubmissionView } from '../../types/grindZoneQuiz';
import toast from 'react-hot-toast';

interface QuizResultsTabProps {
  projectConfigId: string;
}

type StatusFilter = 'all' | 'completed' | 'in_progress';

const QuizResultsTab: React.FC<QuizResultsTabProps> = ({ projectConfigId }) => {
  const [submissions, setSubmissions] = useState<AdminQuizSubmissionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [quizFilter, setQuizFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<AdminQuizSubmissionView | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchAdminSubmissions(projectConfigId);
    if (error) {
      toast.error('Failed to load submissions');
    } else {
      setSubmissions(data || []);
    }
    setLoading(false);
  }, [projectConfigId]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const quizOptions = useMemo(() => {
    const map = new Map<string, string>();
    submissions.forEach((s) => {
      if (!map.has(s.quiz_id)) {
        map.set(s.quiz_id, s.quiz.title);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [submissions]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (quizFilter !== 'all' && s.quiz_id !== quizFilter) return false;
      if (statusFilter === 'completed' && !s.is_completed) return false;
      if (statusFilter === 'in_progress' && s.is_completed) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchUser =
          (s.user.username || '').toLowerCase().includes(q) ||
          s.user.email.toLowerCase().includes(q);
        const matchQuiz = s.quiz.title.toLowerCase().includes(q);
        if (!matchUser && !matchQuiz) return false;
      }
      return true;
    });
  }, [submissions, quizFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = submissions.length;
    const completed = submissions.filter((s) => s.is_completed).length;
    const inProgress = total - completed;
    const avgPct =
      completed > 0
        ? Math.round(
            submissions
              .filter((s) => s.is_completed && s.total_questions > 0)
              .reduce((acc, s) => acc + (s.score / s.total_questions) * 100, 0) /
              completed
          )
        : 0;
    return { total, completed, inProgress, avgPct };
  }, [submissions]);

  const handleOpenDetail = (s: AdminQuizSubmissionView) => {
    setSelectedSubmission(s);
    setIsDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={18} className="text-blue-500" />}
          label="Total Submissions"
          value={stats.total}
          bg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          icon={<CheckCircle2 size={18} className="text-emerald-500" />}
          label="Completed"
          value={stats.completed}
          bg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          icon={<BarChart3 size={18} className="text-amber-500" />}
          label="Average Score"
          value={`${stats.avgPct}%`}
          bg="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          icon={<Clock size={18} className="text-gray-500" />}
          label="In Progress"
          value={stats.inProgress}
          bg="bg-gray-50 dark:bg-gray-800/20"
        />
      </div>

      <Card>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by user or quiz title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-dark-200 rounded-md bg-white dark:bg-dark-300 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
              <div className="relative">
                <select
                  value={quizFilter}
                  onChange={(e) => setQuizFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-dark-200 rounded-md bg-white dark:bg-dark-300 text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="all">All Quizzes</option>
                  {quizOptions.map(([id, title]) => (
                    <option key={id} value={id}>{title}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-dark-200 rounded-md bg-white dark:bg-dark-300 text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <FileQuestion size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {submissions.length === 0
                    ? 'No quiz submissions yet'
                    : 'No submissions match your filters'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {submissions.length === 0
                    ? 'Submissions will appear here once users start taking quizzes.'
                    : 'Try adjusting your search or filter criteria.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <button
                          onClick={() => handleOpenDetail(s)}
                          className="flex items-center gap-2.5 min-w-0 text-left"
                        >
                          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-dark-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {s.user.avatar_url ? (
                              <img src={s.user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User size={13} className="text-gray-500 dark:text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {s.user.username || s.user.email}
                            </p>
                            {s.user.username && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {s.user.email}
                              </p>
                            )}
                          </div>
                        </button>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleOpenDetail(s)}
                          className="text-left min-w-0"
                        >
                          <p className="text-sm text-gray-900 dark:text-white truncate max-w-[200px]">
                            {s.quiz.title}
                          </p>
                          {s.quiz.rubric_name && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                              {s.quiz.rubric_name}
                            </p>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <button onClick={() => handleOpenDetail(s)} className="text-left">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {s.score}/{s.total_questions}
                          </span>
                          {s.is_completed && s.total_questions > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1.5">
                              ({Math.round((s.score / s.total_questions) * 100)}%)
                            </span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <button onClick={() => handleOpenDetail(s)}>
                          <Badge variant={s.is_completed ? 'success' : 'warning'}>
                            {s.is_completed ? 'Completed' : 'In Progress'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell>
                        <button onClick={() => handleOpenDetail(s)} className="text-left">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(s.started_at).toLocaleDateString()}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <button onClick={() => handleOpenDetail(s)} className="text-left">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {s.completed_at
                              ? new Date(s.completed_at).toLocaleDateString()
                              : '--'}
                          </span>
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {filtered.length > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                Showing {filtered.length} of {submissions.length} submissions
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <SubmissionDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedSubmission(null);
        }}
        submission={selectedSubmission}
      />
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  bg: string;
}> = ({ icon, label, value, bg }) => (
  <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 dark:border-dark-200 ${bg}`}>
    <div className="flex-shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{label}</p>
    </div>
  </div>
);

export default QuizResultsTab;
