import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  HelpCircle,
  Loader2,
  User,
  Globe,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { fetchQuizWithQuestions } from '../../services/grindZoneQuizService';
import type {
  AdminQuizSubmissionView,
  GrindZoneQuizQuestion,
  QuizAnswerEntry,
} from '../../types/grindZoneQuiz';

interface SubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: AdminQuizSubmissionView | null;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const AnswerCard: React.FC<{
  question: GrindZoneQuizQuestion;
  answer: QuizAnswerEntry;
  index: number;
}> = ({ question, answer, index }) => {
  const isGradable = question.question_type !== 'open_ended';
  const isCorrect = isGradable && answer.is_correct;
  const isWrong = isGradable && !answer.is_correct;

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        isCorrect
          ? 'border-success-200 dark:border-success-800'
          : isWrong
            ? 'border-error-200 dark:border-error-800'
            : 'border-gray-200 dark:border-dark-200'
      }`}
    >
      <div
        className={`flex items-center gap-2 px-4 py-2.5 ${
          isCorrect
            ? 'bg-success-50 dark:bg-success-900/20'
            : isWrong
              ? 'bg-error-50 dark:bg-error-900/20'
              : 'bg-gray-50 dark:bg-dark-400'
        }`}
      >
        {isCorrect && (
          <CheckCircle size={16} className="text-success-600 dark:text-success-400 flex-shrink-0" />
        )}
        {isWrong && (
          <XCircle size={16} className="text-error-600 dark:text-error-400 flex-shrink-0" />
        )}
        {!isGradable && (
          <HelpCircle size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
        )}
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Question {index + 1}
        </span>
        <Badge variant={
          question.question_type === 'multiple_choice'
            ? 'primary'
            : question.question_type === 'true_false'
              ? 'warning'
              : 'default'
        }>
          {question.question_type === 'multiple_choice'
            ? 'MCQ'
            : question.question_type === 'true_false'
              ? 'True/False'
              : 'Open-ended'}
        </Badge>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {question.question_text}
        </p>

        {isGradable && question.options && (
          <div className="space-y-1.5">
            {question.options.map((opt, i) => {
              const wasChosen = answer.selected_option_index === i;
              const isCorrectOption = question.correct_answer_index === i;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                    isCorrectOption
                      ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800'
                      : wasChosen
                        ? 'bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800'
                        : 'bg-gray-50 dark:bg-dark-400 border border-gray-100 dark:border-dark-200'
                  }`}
                >
                  {isCorrectOption && (
                    <CheckCircle size={14} className="text-success-600 dark:text-success-400 flex-shrink-0" />
                  )}
                  {wasChosen && !isCorrectOption && (
                    <XCircle size={14} className="text-error-600 dark:text-error-400 flex-shrink-0" />
                  )}
                  {!isCorrectOption && !wasChosen && (
                    <span className="w-3.5 flex-shrink-0" />
                  )}
                  <span
                    className={
                      isCorrectOption
                        ? 'font-medium text-success-700 dark:text-success-300'
                        : wasChosen
                          ? 'text-error-700 dark:text-error-300'
                          : 'text-gray-600 dark:text-gray-400'
                    }
                  >
                    {OPTION_LETTERS[i]}. {opt}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {!isGradable && answer.answer_text && (
          <div className="px-3 py-2 rounded-md bg-gray-50 dark:bg-dark-400 border border-gray-200 dark:border-dark-200">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-0.5">
              User's Answer
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {answer.answer_text}
            </span>
          </div>
        )}

        {!isGradable && question.correct_answer_text && (
          <div className="px-3 py-2 rounded-md bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800">
            <span className="text-xs font-medium text-success-600 dark:text-success-400 block mb-0.5">
              Reference Answer
            </span>
            <span className="text-sm text-success-700 dark:text-success-300">
              {question.correct_answer_text}
            </span>
          </div>
        )}

        {question.explanation && (
          <div className="flex gap-2 px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <HelpCircle size={14} className="text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-blue-700 dark:text-blue-300">
              {question.explanation}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  isOpen,
  onClose,
  submission,
}) => {
  const [questions, setQuestions] = useState<GrindZoneQuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !submission) {
      setQuestions([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      const { data } = await fetchQuizWithQuestions(submission.quiz_id);
      setQuestions(data?.questions || []);
      setLoading(false);
    };
    load();
  }, [isOpen, submission]);

  if (!submission) return null;

  const { user, quiz, score, total_questions, is_completed, answers } = submission;
  const gradableCount = questions.filter((q) => q.question_type !== 'open_ended').length;
  const pct = gradableCount > 0 ? Math.round((score / gradableCount) * 100) : 0;

  const scoreVariant: 'success' | 'warning' | 'error' =
    score === gradableCount && gradableCount > 0
      ? 'success'
      : score > 0
        ? 'warning'
        : 'error';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submission Detail"
      size="2xl"
      backdropBlur
      footer={
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-dark-400 border border-gray-100 dark:border-dark-200">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={18} className="text-gray-500 dark:text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {user.username || user.email}
            </p>
            {user.username && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            )}
            {user.country && (
              <div className="flex items-center gap-1 mt-1">
                <Globe size={11} className="text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">{user.country}</span>
              </div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <Badge variant={is_completed ? 'success' : 'warning'}>
              {is_completed ? 'Completed' : 'In Progress'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="px-3 py-2.5 rounded-lg bg-white dark:bg-dark-300 border border-gray-200 dark:border-dark-200 text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{score}/{gradableCount || total_questions}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Score</p>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-white dark:bg-dark-300 border border-gray-200 dark:border-dark-200 text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              <Badge variant={scoreVariant}>{pct}%</Badge>
            </p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Accuracy</p>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-white dark:bg-dark-300 border border-gray-200 dark:border-dark-200 text-center">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={quiz.title}>{quiz.title}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Quiz</p>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-white dark:bg-dark-300 border border-gray-200 dark:border-dark-200 text-center">
            <p className="text-sm font-semibold text-gray-900 dark:text-white uppercase">{quiz.language}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Language</p>
          </div>
        </div>

        {quiz.rubric_name && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Rubric: {quiz.rubric_name}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-gray-400" />
          </div>
        ) : questions.length > 0 && answers.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Answer Breakdown
            </p>
            {questions.map((q, i) => {
              const answer = answers.find((a) => a.question_id === q.id) || answers[i];
              if (!answer) return null;
              return <AnswerCard key={q.id} question={q} answer={answer} index={i} />;
            })}
          </div>
        ) : answers.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
            No answers recorded yet.
          </p>
        ) : null}

        <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-dark-200">
          <span>Started: {new Date(submission.started_at).toLocaleString()}</span>
          {submission.completed_at && (
            <span>Completed: {new Date(submission.completed_at).toLocaleString()}</span>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SubmissionDetailModal;
