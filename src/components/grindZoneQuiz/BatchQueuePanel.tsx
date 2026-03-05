import React from 'react';
import {
  X,
  Globe,
  Sparkles,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Square,
  Zap,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import type { BatchQueueItem, QuizLanguage } from '../../types/grindZoneQuiz';
import { QUIZ_LANGUAGES } from '../../types/grindZoneQuiz';

interface BatchQueuePanelProps {
  queue: BatchQueueItem[];
  language: QuizLanguage;
  autoPublish: boolean;
  isBatchRunning: boolean;
  isBatchDone: boolean;
  onLanguageChange: (lang: QuizLanguage) => void;
  onAutoPublishToggle: () => void;
  onRemoveItem: (mappingId: string) => void;
  onGenerateAll: () => void;
  onStopBatch: () => void;
  onClearQueue: () => void;
}

const StatusIcon: React.FC<{ status: BatchQueueItem['status'] }> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <Clock size={14} className="text-gray-400 dark:text-gray-500" />;
    case 'generating':
      return <Loader2 size={14} className="animate-spin text-primary-500" />;
    case 'done':
      return <CheckCircle size={14} className="text-success-500" />;
    case 'failed':
      return <XCircle size={14} className="text-error-500" />;
  }
};

const BatchQueuePanel: React.FC<BatchQueuePanelProps> = ({
  queue,
  language,
  autoPublish,
  isBatchRunning,
  isBatchDone,
  onLanguageChange,
  onAutoPublishToggle,
  onRemoveItem,
  onGenerateAll,
  onStopBatch,
  onClearQueue,
}) => {
  const doneCount = queue.filter((i) => i.status === 'done').length;
  const failedCount = queue.filter((i) => i.status === 'failed').length;
  const currentIndex = queue.findIndex((i) => i.status === 'generating');
  const processedCount = doneCount + failedCount;
  const progressPercent = queue.length > 0 ? Math.round((processedCount / queue.length) * 100) : 0;

  return (
    <div className="rounded-xl border-2 border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/5 overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-primary-200 dark:border-primary-800/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary-600 dark:text-primary-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Batch Generation
            </h3>
            <Badge variant="primary">{queue.length}</Badge>
          </div>
          {!isBatchRunning && (
            <Button variant="ghost" size="sm" onClick={onClearQueue}>
              Clear all
            </Button>
          )}
        </div>
      </div>

      <div className="px-5 py-3 space-y-3">
        <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
          {queue.map((item, idx) => (
            <div
              key={item.mappingId}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${
                item.status === 'generating'
                  ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/15 shadow-sm'
                  : item.status === 'done'
                  ? 'border-success-200 dark:border-success-800 bg-success-50/50 dark:bg-success-900/10'
                  : item.status === 'failed'
                  ? 'border-error-200 dark:border-error-800 bg-error-50/50 dark:bg-error-900/10'
                  : 'border-gray-200 dark:border-dark-200 bg-white dark:bg-dark-300'
              }`}
            >
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-dark-200 text-[10px] font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">
                {idx + 1}
              </span>
              <StatusIcon status={item.status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {item.rubricName || item.rubricId}
                </p>
                {item.gameName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {item.gameName}
                  </p>
                )}
                {item.status === 'failed' && item.error && (
                  <p className="text-xs text-error-600 dark:text-error-400 mt-0.5 truncate" title={item.error}>
                    {item.error}
                  </p>
                )}
              </div>
              {!isBatchRunning && item.status !== 'done' && (
                <button
                  onClick={() => onRemoveItem(item.mappingId)}
                  className="p-1 rounded text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors flex-shrink-0"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        {!isBatchRunning && !isBatchDone && (
          <div className="flex items-center gap-4 pt-1">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <Globe size={11} className="inline mr-1 -mt-0.5" />
                Language
              </label>
              <div className="flex gap-1.5">
                {QUIZ_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => onLanguageChange(lang.code)}
                    className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${
                      language === lang.code
                        ? 'bg-primary-500 border-primary-500 text-white shadow-sm'
                        : 'border-gray-300 dark:border-dark-200 text-gray-600 dark:text-gray-400 hover:border-primary-400 dark:hover:border-primary-500 bg-white dark:bg-dark-300'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Auto-publish
              </label>
              <button
                onClick={onAutoPublishToggle}
                className="flex items-center gap-2 group"
              >
                {autoPublish ? (
                  <ToggleRight size={22} className="text-success-500" />
                ) : (
                  <ToggleLeft size={22} className="text-gray-400 dark:text-gray-500" />
                )}
                <span className={`text-xs font-medium ${autoPublish ? 'text-success-600 dark:text-success-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {autoPublish ? 'On' : 'Off'}
                </span>
              </button>
            </div>
          </div>
        )}

        {isBatchRunning && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Generating {currentIndex >= 0 ? currentIndex + 1 : processedCount} / {queue.length}...
              </span>
              <span className="text-gray-500 dark:text-gray-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-dark-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {isBatchDone && (
          <div className="pt-1 space-y-2">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-dark-400 border border-gray-200 dark:border-dark-200">
              <CheckCircle size={16} className="text-success-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Batch complete: {doneCount} of {queue.length} quizzes generated
              </span>
              {failedCount > 0 && (
                <Badge variant="error">{failedCount} failed</Badge>
              )}
            </div>
          </div>
        )}

        <div className="pt-1">
          {!isBatchRunning && !isBatchDone && (
            <Button
              variant="accent"
              size="lg"
              fullWidth
              onClick={onGenerateAll}
              leftIcon={<Sparkles size={18} />}
            >
              Generate All ({queue.length} quizzes)
            </Button>
          )}
          {isBatchRunning && (
            <Button
              variant="danger"
              size="md"
              fullWidth
              onClick={onStopBatch}
              leftIcon={<Square size={14} />}
            >
              Stop Batch
            </Button>
          )}
          {isBatchDone && (
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={onClearQueue}
            >
              Clear Queue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchQueuePanel;
