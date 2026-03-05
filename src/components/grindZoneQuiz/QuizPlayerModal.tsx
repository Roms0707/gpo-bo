import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Trophy,
  CheckCircle,
  XCircle,
  HelpCircle,
  Loader2,
  Send,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { fetchQuizWithQuestions } from '../../services/grindZoneQuizService';
import {
  fetchUserSubmission,
  startQuizAttempt,
  savePartialProgress,
  completeQuiz,
} from '../../services/grindZoneQuizSubmissionService';
import type {
  QuizWithQuestions,
  GrindZoneQuizQuestion,
  QuizAnswerEntry,
  GrindZoneQuizSubmission,
} from '../../types/grindZoneQuiz';
import toast from 'react-hot-toast';

interface QuizPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: string;
  userId: string;
  onCompleted?: (score: number, total: number) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const ProgressBar: React.FC<{
  totalSteps: number;
  currentStep: number;
  isComplete: boolean;
}> = ({ totalSteps, currentStep, isComplete }) => (
  <div className="space-y-2">
    <div className="flex gap-1.5">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i < currentStep || isComplete
              ? 'bg-accent-500'
              : i === currentStep && !isComplete
                ? 'bg-accent-400 animate-pulse'
                : 'bg-gray-200 dark:bg-dark-200'
          }`}
        />
      ))}
    </div>
    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
      {isComplete
        ? 'Quiz Complete'
        : `Question ${currentStep + 1} of ${totalSteps}`}
    </p>
  </div>
);

const OptionCard: React.FC<{
  label: string;
  text: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ label, text, isSelected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all duration-150 ${
      isSelected
        ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
        : 'border-gray-200 dark:border-dark-200 bg-gray-50 dark:bg-dark-400 hover:border-gray-300 dark:hover:border-dark-100'
    }`}
  >
    <span
      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold flex-shrink-0 transition-colors ${
        isSelected
          ? 'bg-accent-500 text-white'
          : 'bg-gray-200 dark:bg-dark-200 text-gray-600 dark:text-gray-400'
      }`}
    >
      {label}
    </span>
    <span
      className={`text-sm ${
        isSelected
          ? 'text-accent-700 dark:text-accent-300 font-medium'
          : 'text-gray-700 dark:text-gray-300'
      }`}
    >
      {text}
    </span>
  </button>
);

const ResultCard: React.FC<{
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
          <CheckCircle
            size={16}
            className="text-success-600 dark:text-success-400 flex-shrink-0"
          />
        )}
        {isWrong && (
          <XCircle
            size={16}
            className="text-error-600 dark:text-error-400 flex-shrink-0"
          />
        )}
        {!isGradable && (
          <HelpCircle
            size={16}
            className="text-gray-400 dark:text-gray-500 flex-shrink-0"
          />
        )}
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Question {index + 1}
        </span>
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
                    <CheckCircle
                      size={14}
                      className="text-success-600 dark:text-success-400 flex-shrink-0"
                    />
                  )}
                  {wasChosen && !isCorrectOption && (
                    <XCircle
                      size={14}
                      className="text-error-600 dark:text-error-400 flex-shrink-0"
                    />
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
              Your Answer
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
            <HelpCircle
              size={14}
              className="text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5"
            />
            <span className="text-xs text-blue-700 dark:text-blue-300">
              {question.explanation}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const QuizPlayerModal: React.FC<QuizPlayerModalProps> = ({
  isOpen,
  onClose,
  quizId,
  userId,
  onCompleted,
}) => {
  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswerEntry[]>([]);
  const [currentSelection, setCurrentSelection] = useState<number | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const totalQuestions = quiz?.questions.length ?? 0;

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    try {
      const [quizResult, submissionResult] = await Promise.all([
        fetchQuizWithQuestions(quizId),
        fetchUserSubmission(userId, quizId),
      ]);

      if (quizResult.error || !quizResult.data) {
        toast.error('Failed to load quiz');
        onClose();
        return;
      }

      const quizData = quizResult.data;
      setQuiz(quizData);

      const submission = submissionResult.data;
      if (submission && submission.is_completed) {
        setAnswers(submission.answers);
        setFinalScore(submission.score);
        setShowResults(true);
      } else if (submission && submission.answers.length > 0) {
        setAnswers(submission.answers);
        setCurrentStep(submission.answers.length);
        toast('Resuming where you left off', { icon: '↩' });
      } else {
        await startQuizAttempt(userId, quizId, quizData.questions.length);
        setAnswers([]);
        setCurrentStep(0);
        setShowResults(false);
      }
    } catch {
      toast.error('Something went wrong');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [quizId, userId, onClose]);

  useEffect(() => {
    if (isOpen) {
      setCurrentSelection(null);
      setCurrentText('');
      loadQuiz();
    }
  }, [isOpen, loadQuiz]);

  const currentQuestion: GrindZoneQuizQuestion | undefined =
    quiz?.questions[currentStep];

  const canProceed =
    currentQuestion?.question_type === 'open_ended'
      ? currentText.trim().length > 0
      : currentSelection !== null;

  const buildAnswer = (): QuizAnswerEntry => {
    if (!currentQuestion) throw new Error('No question');
    const isOpenEnded = currentQuestion.question_type === 'open_ended';
    return {
      question_id: currentQuestion.id,
      question_type: currentQuestion.question_type,
      selected_option_index: isOpenEnded ? null : currentSelection,
      answer_text: isOpenEnded ? currentText.trim() : null,
      is_correct: isOpenEnded
        ? false
        : currentQuestion.correct_answer_index === currentSelection,
    };
  };

  const goNext = async () => {
    const answer = buildAnswer();
    const updatedAnswers = [...answers, answer];
    setAnswers(updatedAnswers);
    setCurrentSelection(null);
    setCurrentText('');

    const isLast = currentStep === totalQuestions - 1;

    if (isLast) {
      setSubmitting(true);
      const { data, error } = await completeQuiz(userId, quizId, updatedAnswers);
      setSubmitting(false);

      if (error) {
        toast.error('Failed to submit quiz');
        return;
      }

      const score = data?.score ?? updatedAnswers.filter(
        (a) => a.question_type !== 'open_ended' && a.is_correct
      ).length;
      setFinalScore(score);
      setShowResults(true);
      onCompleted?.(score, totalQuestions);
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep <= 0) return;
    const prev = answers[answers.length - 1];
    setAnswers((a) => a.slice(0, -1));
    setCurrentStep((s) => s - 1);

    if (prev) {
      if (prev.question_type === 'open_ended') {
        setCurrentText(prev.answer_text || '');
        setCurrentSelection(null);
      } else {
        setCurrentSelection(prev.selected_option_index);
        setCurrentText('');
      }
    }
  };

  const handleClose = async () => {
    if (!showResults && answers.length > 0) {
      await savePartialProgress(userId, quizId, answers);
      toast('Progress saved', { icon: '💾' });
    }
    onClose();
  };

  const gradableCount = quiz
    ? quiz.questions.filter((q) => q.question_type !== 'open_ended').length
    : 0;

  const scoreVariant: 'success' | 'warning' | 'error' =
    finalScore === gradableCount
      ? 'success'
      : finalScore > 0
        ? 'warning'
        : 'error';

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-accent-500 mb-3" />
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Loading quiz...
      </p>
    </div>
  );

  const renderQuestion = () => {
    if (!currentQuestion) return null;
    const { question_type, question_text, options } = currentQuestion;

    return (
      <div className="space-y-5">
        <ProgressBar
          totalSteps={totalQuestions}
          currentStep={currentStep}
          isComplete={false}
        />

        <p className="text-base font-semibold text-gray-900 dark:text-white leading-relaxed">
          {question_text}
        </p>

        {question_type === 'multiple_choice' && options && (
          <div className="space-y-2.5">
            {options.map((opt, i) => (
              <OptionCard
                key={i}
                label={OPTION_LETTERS[i]}
                text={opt}
                isSelected={currentSelection === i}
                onClick={() => setCurrentSelection(i)}
              />
            ))}
          </div>
        )}

        {question_type === 'true_false' && options && (
          <div className="grid grid-cols-2 gap-3">
            {options.map((opt, i) => (
              <OptionCard
                key={i}
                label={OPTION_LETTERS[i]}
                text={opt}
                isSelected={currentSelection === i}
                onClick={() => setCurrentSelection(i)}
              />
            ))}
          </div>
        )}

        {question_type === 'open_ended' && (
          <div className="space-y-1.5">
            <textarea
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              rows={4}
              placeholder="Share your thoughts..."
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-dark-200 rounded-lg bg-white dark:bg-dark-300 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-shadow"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              There is no wrong answer here -- share your perspective.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderResults = () => {
    if (!quiz) return null;

    return (
      <div className="space-y-5">
        <ProgressBar
          totalSteps={totalQuestions}
          currentStep={totalQuestions}
          isComplete
        />

        <div className="flex flex-col items-center text-center py-4 space-y-2">
          <Trophy className="w-10 h-10 text-accent-500" />
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {finalScore} / {gradableCount}
            </span>
            <Badge variant={scoreVariant}>
              {finalScore === gradableCount
                ? 'Perfect'
                : finalScore > 0
                  ? 'Good try'
                  : 'Keep learning'}
            </Badge>
          </div>
          {quiz.questions.some((q) => q.question_type === 'open_ended') && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Open-ended answers are not auto-graded
            </p>
          )}
        </div>

        <div className="space-y-3">
          {quiz.questions.map((q, i) => {
            const answer = answers[i];
            if (!answer) return null;
            return (
              <ResultCard key={q.id} question={q} answer={answer} index={i} />
            );
          })}
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    if (loading) return null;

    if (showResults) {
      return (
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      );
    }

    const isLast = currentStep === totalQuestions - 1;

    return (
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          disabled={currentStep === 0}
          leftIcon={<ChevronLeft size={16} />}
        >
          Back
        </Button>
        <Button
          variant="accent"
          onClick={goNext}
          disabled={!canProceed}
          isLoading={submitting}
          rightIcon={
            isLast ? <Send size={16} /> : <ChevronRight size={16} />
          }
        >
          {isLast ? 'Submit Quiz' : 'Next'}
        </Button>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={quiz?.title || 'Quiz'}
      size="2xl"
      backdropBlur
      footer={renderFooter()}
    >
      {loading ? renderLoading() : showResults ? renderResults() : renderQuestion()}
    </Modal>
  );
};

export default QuizPlayerModal;
