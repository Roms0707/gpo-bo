import React, { useState, useEffect } from 'react';
import {
  Save,
  CheckCircle,
  XCircle,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  ListOrdered,
  MessageSquare,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import type {
  QuizWithQuestions,
  GrindZoneQuizQuestion,
  QuestionType,
  QuizLanguage,
} from '../../types/grindZoneQuiz';
import { QUIZ_LANGUAGES } from '../../types/grindZoneQuiz';
import {
  updateQuestion,
  updateQuizStatus,
  updateQuizTitle,
  updateQuizLanguage,
} from '../../services/grindZoneQuizService';
import toast from 'react-hot-toast';

interface QuizEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: QuizWithQuestions;
  onQuizUpdated: () => void;
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  open_ended: 'Open Ended',
};

const QUESTION_TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  multiple_choice: <ListOrdered size={16} />,
  true_false: <ToggleLeft size={16} />,
  open_ended: <MessageSquare size={16} />,
};

interface QuestionEditorProps {
  question: GrindZoneQuizQuestion;
  index: number;
  onSave: (questionId: string, updates: Partial<GrindZoneQuizQuestion>) => Promise<void>;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({ question, index, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editText, setEditText] = useState(question.question_text);
  const [editType, setEditType] = useState<QuestionType>(question.question_type);
  const [editOptions, setEditOptions] = useState<string[]>(question.options || []);
  const [editCorrectIndex, setEditCorrectIndex] = useState<number | null>(question.correct_answer_index);
  const [editCorrectText, setEditCorrectText] = useState(question.correct_answer_text || '');
  const [editExplanation, setEditExplanation] = useState(question.explanation || '');

  const handleTypeChange = (newType: QuestionType) => {
    setEditType(newType);
    if (newType === 'true_false') {
      setEditOptions(['True', 'False']);
      setEditCorrectIndex(0);
      setEditCorrectText('');
    } else if (newType === 'multiple_choice') {
      setEditOptions(editOptions.length >= 4 ? editOptions : ['', '', '', '']);
      setEditCorrectIndex(0);
      setEditCorrectText('');
    } else {
      setEditOptions([]);
      setEditCorrectIndex(null);
      setEditCorrectText(editCorrectText || '');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(question.id, {
        question_text: editText,
        question_type: editType,
        options: editType === 'open_ended' ? null : editOptions,
        correct_answer_index: editType === 'open_ended' ? null : editCorrectIndex,
        correct_answer_text: editType === 'open_ended' ? editCorrectText : null,
        explanation: editExplanation,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditText(question.question_text);
    setEditType(question.question_type);
    setEditOptions(question.options || []);
    setEditCorrectIndex(question.correct_answer_index);
    setEditCorrectText(question.correct_answer_text || '');
    setEditExplanation(question.explanation || '');
    setIsEditing(false);
  };

  return (
    <div className="border border-gray-200 dark:border-dark-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-dark-400">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold">
            {index + 1}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            {QUESTION_TYPE_ICONS[question.question_type]}
            {QUESTION_TYPE_LABELS[question.question_type]}
          </span>
        </div>
        {!isEditing ? (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSaving}
              onClick={handleSave}
              leftIcon={<Save size={14} />}
            >
              Save
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {isEditing ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Question Type
              </label>
              <select
                value={editType}
                onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-200 rounded-md bg-white dark:bg-dark-300 text-gray-900 dark:text-white"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="open_ended">Open Ended</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Question
              </label>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-200 rounded-md bg-white dark:bg-dark-300 text-gray-900 dark:text-white resize-none"
              />
            </div>

            {editType !== 'open_ended' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Options (select the correct one)
                </label>
                <div className="space-y-2">
                  {editOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${question.id}`}
                        checked={editCorrectIndex === i}
                        onChange={() => setEditCorrectIndex(i)}
                        className="text-primary-500"
                      />
                      <input
                        value={opt}
                        onChange={(e) => {
                          const next = [...editOptions];
                          next[i] = e.target.value;
                          setEditOptions(next);
                        }}
                        disabled={editType === 'true_false'}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-dark-200 rounded-md bg-white dark:bg-dark-300 text-gray-900 dark:text-white disabled:opacity-60"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editType === 'open_ended' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Expected Answer
                </label>
                <textarea
                  value={editCorrectText}
                  onChange={(e) => setEditCorrectText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-200 rounded-md bg-white dark:bg-dark-300 text-gray-900 dark:text-white resize-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Explanation
              </label>
              <textarea
                value={editExplanation}
                onChange={(e) => setEditExplanation(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-200 rounded-md bg-white dark:bg-dark-300 text-gray-900 dark:text-white resize-none"
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {question.question_text}
            </p>

            {question.options && question.options.length > 0 && (
              <div className="space-y-1.5">
                {question.options.map((opt, i) => {
                  const isCorrect = question.correct_answer_index === i;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                        isCorrect
                          ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800'
                          : 'bg-gray-50 dark:bg-dark-400 border border-gray-100 dark:border-dark-200'
                      }`}
                    >
                      {isCorrect ? (
                        <CheckCircle size={14} className="text-success-600 dark:text-success-400 flex-shrink-0" />
                      ) : (
                        <XCircle size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                      )}
                      <span className={isCorrect ? 'font-medium text-success-700 dark:text-success-300' : 'text-gray-700 dark:text-gray-300'}>
                        {opt}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {question.question_type === 'open_ended' && question.correct_answer_text && (
              <div className="px-3 py-2 rounded-md bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800">
                <span className="text-xs font-medium text-success-600 dark:text-success-400 block mb-0.5">
                  Expected Answer
                </span>
                <span className="text-sm text-success-700 dark:text-success-300">
                  {question.correct_answer_text}
                </span>
              </div>
            )}

            {question.explanation && (
              <div className="flex gap-2 px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <HelpCircle size={14} className="text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-blue-700 dark:text-blue-300">{question.explanation}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const QuizEditModal: React.FC<QuizEditModalProps> = ({
  isOpen,
  onClose,
  quiz,
  onQuizUpdated,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(quiz.title);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<QuizLanguage>(quiz.language || 'en');

  useEffect(() => {
    setTitleValue(quiz.title);
    setCurrentLanguage(quiz.language || 'en');
  }, [quiz.title, quiz.language]);

  const handleToggleStatus = async () => {
    setIsTogglingStatus(true);
    const newStatus = quiz.status === 'draft' ? 'published' : 'draft';
    const { error } = await updateQuizStatus(quiz.id, newStatus);
    setIsTogglingStatus(false);
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Quiz ${newStatus === 'published' ? 'published' : 'unpublished'}`);
      onQuizUpdated();
    }
  };

  const handleSaveTitle = async () => {
    if (!titleValue.trim()) return;
    const { error } = await updateQuizTitle(quiz.id, titleValue.trim());
    if (error) {
      toast.error('Failed to update title');
    } else {
      setIsEditingTitle(false);
      onQuizUpdated();
    }
  };

  const handleLanguageChange = async (lang: QuizLanguage) => {
    setCurrentLanguage(lang);
    const { error } = await updateQuizLanguage(quiz.id, lang);
    if (error) {
      toast.error('Failed to update language');
      setCurrentLanguage(quiz.language || 'en');
    } else {
      onQuizUpdated();
    }
  };

  const handleSaveQuestion = async (questionId: string, updates: Partial<GrindZoneQuizQuestion>) => {
    const { error } = await updateQuestion(questionId, updates);
    if (error) {
      toast.error('Failed to save question');
    } else {
      toast.success('Question saved');
      onQuizUpdated();
    }
  };

  const isPublished = quiz.status === 'published';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quiz Details" size="3xl">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  className="flex-1 px-3 py-1.5 text-lg font-semibold border border-gray-300 dark:border-dark-200 rounded-md bg-white dark:bg-dark-300 text-gray-900 dark:text-white"
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveTitle}>
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setIsEditingTitle(false); setTitleValue(quiz.title); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <h2
                className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit title"
              >
                {quiz.title}
              </h2>
            )}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <Badge variant={isPublished ? 'success' : 'warning'}>
                {isPublished ? 'Published' : 'Draft'}
              </Badge>
              <div className="flex items-center gap-1">
                {QUIZ_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded transition-all ${
                      currentLanguage === lang.code
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-dark-200 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-100'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
              {quiz.rubric_name && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Rubric: {quiz.rubric_name}
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {quiz.video_count} videos analyzed
              </span>
            </div>
          </div>
          <Button
            variant={isPublished ? 'secondary' : 'accent'}
            size="sm"
            isLoading={isTogglingStatus}
            onClick={handleToggleStatus}
            leftIcon={isPublished ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          >
            {isPublished ? 'Unpublish' : 'Publish'}
          </Button>
        </div>

        <div className="space-y-4">
          {quiz.questions
            .sort((a, b) => a.display_order - b.display_order)
            .map((q, idx) => (
              <QuestionEditor
                key={q.id}
                question={q}
                index={idx}
                onSave={handleSaveQuestion}
              />
            ))}
        </div>
      </div>
    </Modal>
  );
};

export default QuizEditModal;
