import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Zap,
  GripVertical,
  Loader2,
  Trash2,
  Eye,
  Search,
  Sparkles,
  FileQuestion,
  ChevronDown,
  Settings2,
  Copy,
  Globe,
  Check,
  CheckCircle2,
  Filter,
  ClipboardList,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import QuizEditModal from '../../components/grindZoneQuiz/QuizEditModal';
import BatchQueuePanel from '../../components/grindZoneQuiz/BatchQueuePanel';
import QuizResultsTab from '../../components/grindZoneQuiz/QuizResultsTab';
import { supabase } from '../../lib/supabase';
import {
  fetchProjectConfigurations,
  type ProjectConfiguration,
} from '../../services/projectConfigService';
import {
  generateQuiz,
  fetchQuizzes,
  fetchQuizWithQuestions,
  deleteQuiz,
  duplicateQuizToConfigs,
  updateQuizStatus,
} from '../../services/grindZoneQuizService';
import type { GrindZoneQuiz, QuizWithQuestions, QuizLanguage, BatchQueueItem } from '../../types/grindZoneQuiz';
import { QUIZ_LANGUAGES } from '../../types/grindZoneQuiz';
import type { GalaxyRubricMapping } from '../../types/galaxyRubricMapping';
import toast from 'react-hot-toast';

const MAX_BATCH_SIZE = 10;

interface RubricWithGame extends GalaxyRubricMapping {
  game_name?: string;
}

interface DraggableRubricProps {
  mapping: RubricWithGame;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (mapping: RubricWithGame) => void;
  isBatchRunning: boolean;
  hasQuiz: boolean;
}

const DraggableRubric: React.FC<DraggableRubricProps> = ({
  mapping,
  isSelected,
  isDisabled,
  onToggle,
  isBatchRunning,
  hasQuiz,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `rubric-${mapping.id}`,
    data: { type: 'rubric', mapping },
    disabled: isBatchRunning,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${
        isDragging
          ? 'opacity-30 border-primary-500 bg-primary-500/10 scale-95'
          : isSelected
          ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/15'
          : 'border-gray-200 dark:border-dark-200 bg-white dark:bg-dark-300 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-sm'
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!isDisabled || isSelected) onToggle(mapping);
        }}
        disabled={isBatchRunning}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          isSelected
            ? 'bg-primary-500 border-primary-500 text-white'
            : isDisabled
            ? 'border-gray-200 dark:border-dark-100 opacity-40 cursor-not-allowed'
            : 'border-gray-300 dark:border-dark-100 hover:border-primary-400'
        }`}
      >
        {isSelected && <Check size={10} />}
      </button>
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex-shrink-0"
      >
        <GripVertical size={14} className="text-gray-400 dark:text-gray-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {mapping.rubric_name || mapping.rubric_id}
        </p>
        {mapping.game_name && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {mapping.game_name}
          </p>
        )}
      </div>
      {hasQuiz ? (
        <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
      ) : (
        <Zap size={12} className="text-amber-500 flex-shrink-0" />
      )}
    </div>
  );
};

interface DropZoneProps {
  isOver: boolean;
  selectedMapping: RubricWithGame | null;
  isGenerating: boolean;
  selectedLanguage: QuizLanguage;
  onLanguageChange: (lang: QuizLanguage) => void;
  onGenerate: () => void;
  onClear: () => void;
}

const DropZone: React.FC<DropZoneProps> = ({
  isOver,
  selectedMapping,
  isGenerating,
  selectedLanguage,
  onLanguageChange,
  onGenerate,
  onClear,
}) => {
  const { setNodeRef } = useDroppable({ id: 'quiz-drop-zone' });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed transition-all duration-200 ${
        isOver
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
          : selectedMapping
          ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/5'
          : 'border-gray-300 dark:border-dark-200 bg-gray-50 dark:bg-dark-400/50'
      } ${!selectedMapping && !isOver ? 'min-h-[140px]' : ''}`}
    >
      {!selectedMapping ? (
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${
            isOver ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-dark-300'
          }`}>
            <Sparkles size={20} className={isOver ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'} />
          </div>
          <p className={`text-sm font-medium ${isOver ? 'text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'}`}>
            {isOver ? 'Drop here to select' : 'Drag a rubric here or use checkboxes for batch'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            The AI will analyze the videos and create 4 questions
          </p>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {selectedMapping.rubric_name || selectedMapping.rubric_id}
              </p>
              {selectedMapping.game_name && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Game: {selectedMapping.game_name}
                </p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Rubric ID: {selectedMapping.rubric_id}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClear} disabled={isGenerating}>
              Clear
            </Button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              <Globe size={12} className="inline mr-1 -mt-0.5" />
              Quiz Language
            </label>
            <div className="flex gap-2">
              {QUIZ_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => onLanguageChange(lang.code)}
                  disabled={isGenerating}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${
                    selectedLanguage === lang.code
                      ? 'bg-primary-500 border-primary-500 text-white shadow-sm'
                      : 'border-gray-300 dark:border-dark-200 text-gray-600 dark:text-gray-400 hover:border-primary-400 dark:hover:border-primary-500 bg-white dark:bg-dark-300'
                  } disabled:opacity-50`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="accent"
            size="lg"
            fullWidth
            isLoading={isGenerating}
            onClick={onGenerate}
            leftIcon={<Sparkles size={18} />}
          >
            {isGenerating ? 'Generating Quiz...' : 'Generate Quiz with AI'}
          </Button>

          {isGenerating && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              Fetching videos and generating questions... This may take a moment.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

type ActiveTab = 'manager' | 'results';

const GrindZoneQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('manager');

  const [configs, setConfigs] = useState<ProjectConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ProjectConfiguration | null>(null);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);
  const [isConfigDropdownOpen, setIsConfigDropdownOpen] = useState(false);

  const [rubricMappings, setRubricMappings] = useState<RubricWithGame[]>([]);
  const [quizzes, setQuizzes] = useState<GrindZoneQuiz[]>([]);
  const [isLoadingMappings, setIsLoadingMappings] = useState(false);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideWithQuizzes, setHideWithQuizzes] = useState(false);

  const [selectedMapping, setSelectedMapping] = useState<RubricWithGame | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draggedMapping, setDraggedMapping] = useState<RubricWithGame | null>(null);
  const [isDropOver, setIsDropOver] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<QuizLanguage>('en');

  const [selectedQuiz, setSelectedQuiz] = useState<QuizWithQuestions | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<GrindZoneQuiz | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [quizToDuplicate, setQuizToDuplicate] = useState<GrindZoneQuiz | null>(null);
  const [selectedTargetConfigs, setSelectedTargetConfigs] = useState<Set<string>>(new Set());
  const [isDuplicating, setIsDuplicating] = useState(false);

  const [batchQueue, setBatchQueue] = useState<BatchQueueItem[]>([]);
  const [batchLanguage, setBatchLanguage] = useState<QuizLanguage>('en');
  const [autoPublish, setAutoPublish] = useState(true);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [isBatchDone, setIsBatchDone] = useState(false);
  const [newQuizIds, setNewQuizIds] = useState<Set<string>>(new Set());
  const stopBatchRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    if (!isBatchRunning) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isBatchRunning]);

  useEffect(() => {
    const loadConfigs = async () => {
      setIsLoadingConfigs(true);
      const { data } = await fetchProjectConfigurations({ isActive: true });
      const list = data || [];
      setConfigs(list);
      if (list.length === 1) {
        setSelectedConfig(list[0]);
      }
      setIsLoadingConfigs(false);
    };
    loadConfigs();
  }, []);

  const handleSelectConfig = (config: ProjectConfiguration) => {
    setSelectedConfig(config);
    setIsConfigDropdownOpen(false);
    setRubricMappings([]);
    setQuizzes([]);
    setSelectedMapping(null);
    setBatchQueue([]);
    setIsBatchDone(false);
    setNewQuizIds(new Set());
    const langCode = config.language_code;
    if (langCode && ['en', 'fr', 'es'].includes(langCode)) {
      setSelectedLanguage(langCode as QuizLanguage);
      setBatchLanguage(langCode as QuizLanguage);
    } else {
      setSelectedLanguage('en');
      setBatchLanguage('en');
    }
  };

  const loadMappings = useCallback(async () => {
    if (!selectedConfig) return;
    setIsLoadingMappings(true);
    try {
      const { data: mappings, error } = await supabase
        .from('galaxy_rubric_mappings')
        .select('*')
        .eq('project_config_id', selectedConfig.id)
        .eq('content_category', 'grind_zone')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const gameIds = [...new Set((mappings || []).map((m: GalaxyRubricMapping) => m.game_id).filter(Boolean))];
      let gameMap: Record<string, string> = {};

      if (gameIds.length > 0) {
        const { data: games } = await supabase
          .from('games')
          .select('id, name')
          .in('id', gameIds);

        if (games) {
          gameMap = Object.fromEntries(games.map((g: { id: string; name: string }) => [g.id, g.name]));
        }
      }

      const enriched: RubricWithGame[] = (mappings || []).map((m: GalaxyRubricMapping) => ({
        ...m,
        game_name: m.game_id ? gameMap[m.game_id] : undefined,
      }));

      setRubricMappings(enriched);
    } catch (err) {
      console.error('Error loading rubric mappings:', err);
      toast.error('Failed to load rubric mappings');
    } finally {
      setIsLoadingMappings(false);
    }
  }, [selectedConfig]);

  const loadQuizzes = useCallback(async () => {
    if (!selectedConfig) return;
    setIsLoadingQuizzes(true);
    const { data, error } = await fetchQuizzes(selectedConfig.id);
    if (error) {
      toast.error('Failed to load quizzes');
    } else {
      setQuizzes(data || []);
    }
    setIsLoadingQuizzes(false);
  }, [selectedConfig]);

  useEffect(() => {
    if (selectedConfig) {
      loadMappings();
      loadQuizzes();
    }
  }, [selectedConfig, loadMappings, loadQuizzes]);

  const handleToggleBatchItem = (mapping: RubricWithGame) => {
    setBatchQueue((prev) => {
      const exists = prev.some((i) => i.mappingId === mapping.id);
      if (exists) {
        return prev.filter((i) => i.mappingId !== mapping.id);
      }
      if (prev.length >= MAX_BATCH_SIZE) return prev;
      return [
        ...prev,
        {
          mappingId: mapping.id,
          rubricId: mapping.rubric_id,
          rubricName: mapping.rubric_name,
          gameId: mapping.game_id,
          gameName: mapping.game_name,
          status: 'pending',
        },
      ];
    });
    setIsBatchDone(false);
  };

  const handleRemoveBatchItem = (mappingId: string) => {
    setBatchQueue((prev) => prev.filter((i) => i.mappingId !== mappingId));
    setIsBatchDone(false);
  };

  const handleSelectAll = () => {
    const visible = filteredMappings.slice(0, MAX_BATCH_SIZE);
    const allSelected = visible.every((m) => batchQueue.some((q) => q.mappingId === m.id));

    if (allSelected) {
      const visibleIds = new Set(visible.map((m) => m.id));
      setBatchQueue((prev) => prev.filter((i) => !visibleIds.has(i.mappingId)));
    } else {
      setBatchQueue((prev) => {
        const existing = new Set(prev.map((i) => i.mappingId));
        const newItems: BatchQueueItem[] = [];
        let total = prev.length;
        for (const m of visible) {
          if (total >= MAX_BATCH_SIZE) break;
          if (!existing.has(m.id)) {
            newItems.push({
              mappingId: m.id,
              rubricId: m.rubric_id,
              rubricName: m.rubric_name,
              gameId: m.game_id,
              gameName: m.game_name,
              status: 'pending',
            });
            total++;
          }
        }
        return [...prev, ...newItems];
      });
    }
    setIsBatchDone(false);
  };

  const handleClearQueue = () => {
    setBatchQueue([]);
    setIsBatchDone(false);
    setNewQuizIds(new Set());
  };

  const handleGenerateAll = async () => {
    if (!selectedConfig || batchQueue.length === 0) return;
    setIsBatchRunning(true);
    setIsBatchDone(false);
    stopBatchRef.current = false;

    setBatchQueue((prev) => prev.map((i) => ({ ...i, status: 'pending' as const, error: undefined, quizId: undefined })));

    const generated: string[] = [];

    for (let idx = 0; idx < batchQueue.length; idx++) {
      if (stopBatchRef.current) break;

      const item = batchQueue[idx];

      setBatchQueue((prev) =>
        prev.map((q, i) => (i === idx ? { ...q, status: 'generating' as const } : q))
      );

      const { data, error } = await generateQuiz({
        config_id: selectedConfig.config_id,
        rubric_id: item.rubricId,
        rubric_name: item.rubricName || undefined,
        game_id: item.gameId || undefined,
        language: batchLanguage,
      });

      if (error) {
        setBatchQueue((prev) =>
          prev.map((q, i) =>
            i === idx ? { ...q, status: 'failed' as const, error: error.message || 'Generation failed' } : q
          )
        );
      } else if (data) {
        let publishFailed = false;
        if (autoPublish) {
          const { error: pubErr } = await updateQuizStatus(data.id, 'published');
          if (pubErr) publishFailed = true;
        }
        setBatchQueue((prev) =>
          prev.map((q, i) =>
            i === idx ? { ...q, status: 'done' as const, quizId: data.id } : q
          )
        );
        generated.push(data.id);
        if (publishFailed) {
          toast.error(`Quiz generated but failed to auto-publish: ${item.rubricName || item.rubricId}`);
        }
      }
    }

    setNewQuizIds((prev) => {
      const next = new Set(prev);
      generated.forEach((id) => next.add(id));
      return next;
    });

    setIsBatchRunning(false);
    setIsBatchDone(true);
    await loadQuizzes();

    const doneCount = generated.length;
    const total = batchQueue.length;
    if (doneCount === total) {
      toast.success(`Batch complete: ${doneCount} quizzes generated`);
    } else {
      toast(`Batch complete: ${doneCount} of ${total} quizzes generated`, { icon: '!' });
    }
  };

  const handleStopBatch = () => {
    stopBatchRef.current = true;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const mapping = event.active.data.current?.mapping as RubricWithGame;
    if (mapping) setDraggedMapping(mapping);
  };

  const handleDragOver = (event: DragEndEvent) => {
    setIsDropOver(event.over?.id === 'quiz-drop-zone');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDropOver(false);
    setDraggedMapping(null);
    if (event.over?.id === 'quiz-drop-zone') {
      const mapping = event.active.data.current?.mapping as RubricWithGame;
      if (mapping) setSelectedMapping(mapping);
    }
  };

  const handleGenerate = async () => {
    if (!selectedMapping || !selectedConfig) return;
    setIsGenerating(true);

    const { data, error } = await generateQuiz({
      config_id: selectedConfig.config_id,
      rubric_id: selectedMapping.rubric_id,
      rubric_name: selectedMapping.rubric_name || undefined,
      game_id: selectedMapping.game_id || undefined,
      language: selectedLanguage,
    });

    setIsGenerating(false);

    if (error) {
      toast.error(error.message || 'Failed to generate quiz');
    } else if (data) {
      toast.success('Quiz generated successfully!');
      setSelectedMapping(null);
      setSelectedQuiz(data);
      setIsEditModalOpen(true);
      loadQuizzes();
    }
  };

  const handleOpenQuiz = async (quiz: GrindZoneQuiz) => {
    const { data } = await fetchQuizWithQuestions(quiz.id);
    if (data) {
      setSelectedQuiz(data);
      setIsEditModalOpen(true);
    } else {
      toast.error('Failed to load quiz details');
    }
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    setIsDeleting(true);
    const { error } = await deleteQuiz(quizToDelete.id);
    setIsDeleting(false);
    if (error) {
      toast.error('Failed to delete quiz');
    } else {
      toast.success('Quiz deleted');
      setIsDeleteModalOpen(false);
      setQuizToDelete(null);
      loadQuizzes();
    }
  };

  const handleQuizUpdated = async () => {
    loadQuizzes();
    if (selectedQuiz) {
      const { data } = await fetchQuizWithQuestions(selectedQuiz.id);
      if (data) setSelectedQuiz(data);
    }
  };

  const handleOpenDuplicate = (quiz: GrindZoneQuiz) => {
    setQuizToDuplicate(quiz);
    setSelectedTargetConfigs(new Set());
    setIsDuplicateModalOpen(true);
  };

  const toggleTargetConfig = (configId: string) => {
    setSelectedTargetConfigs((prev) => {
      const next = new Set(prev);
      if (next.has(configId)) {
        next.delete(configId);
      } else {
        next.add(configId);
      }
      return next;
    });
  };

  const handleDuplicate = async () => {
    if (!quizToDuplicate || selectedTargetConfigs.size === 0) return;
    setIsDuplicating(true);
    const { data, error } = await duplicateQuizToConfigs({
      source_quiz_id: quizToDuplicate.id,
      target_config_ids: Array.from(selectedTargetConfigs),
    });
    setIsDuplicating(false);
    if (error) {
      toast.error(error.message || 'Failed to duplicate quiz');
    } else if (data) {
      toast.success(`Quiz duplicated to ${data.duplicated_count} configuration${data.duplicated_count > 1 ? 's' : ''}`);
      setIsDuplicateModalOpen(false);
      setQuizToDuplicate(null);
      loadQuizzes();
    }
  };

  const rubricIdsWithQuizzes = useMemo(() => {
    return new Set(quizzes.map((q) => q.rubric_id));
  }, [quizzes]);

  const filteredMappings = rubricMappings.filter((m) => {
    if (hideWithQuizzes && rubricIdsWithQuizzes.has(m.rubric_id)) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.rubric_name || '').toLowerCase().includes(q) ||
      m.rubric_id.toLowerCase().includes(q) ||
      (m.game_name || '').toLowerCase().includes(q)
    );
  });

  const selectedIds = new Set(batchQueue.map((i) => i.mappingId));
  const isAtMaxBatch = batchQueue.length >= MAX_BATCH_SIZE;
  const hasBatchQueue = batchQueue.length > 0;
  const visibleAllSelected = filteredMappings.length > 0 && filteredMappings.every((m) => selectedIds.has(m.id));

  if (isLoadingConfigs) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              leftIcon={<ArrowLeft size={16} />}
            >
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Grind Zone Quiz Generator
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Generate AI-powered quizzes from video content
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => !isBatchRunning && setIsConfigDropdownOpen(!isConfigDropdownOpen)}
              disabled={isBatchRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-200 bg-white dark:bg-dark-300 hover:border-primary-400 dark:hover:border-primary-500 transition-colors min-w-[220px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Settings2 size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1 text-left">
                {selectedConfig ? selectedConfig.config_name : 'Select configuration'}
              </span>
              <ChevronDown
                size={16}
                className={`text-gray-400 flex-shrink-0 transition-transform ${isConfigDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isConfigDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsConfigDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-72 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-dark-200 bg-white dark:bg-dark-300 shadow-lg">
                  {configs.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      No active configurations found
                    </div>
                  ) : (
                    configs.map((cfg) => (
                      <button
                        key={cfg.id}
                        onClick={() => handleSelectConfig(cfg)}
                        className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors ${
                          selectedConfig?.id === cfg.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {cfg.config_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {cfg.config_id}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {selectedConfig && (
          <div className="flex gap-1 border-b border-gray-200 dark:border-dark-200">
            <button
              onClick={() => setActiveTab('manager')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'manager'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-dark-100'
              }`}
            >
              <Sparkles size={15} />
              Quiz Manager
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'results'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-dark-100'
              }`}
            >
              <ClipboardList size={15} />
              Results
            </button>
          </div>
        )}

        {!selectedConfig ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-dark-300 flex items-center justify-center mb-4">
                  <Settings2 size={24} className="text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select a configuration
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                  Choose a project configuration from the dropdown above to manage its quizzes.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : activeTab === 'results' ? (
          <QuizResultsTab projectConfigId={selectedConfig.id} />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Grind Zone Rubrics</CardTitle>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Use checkboxes for batch or drag for single
                    </p>
                  </div>
                  {hasBatchQueue && (
                    <Badge variant="primary">{batchQueue.length} selected</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search rubrics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-dark-200 rounded-md bg-white dark:bg-dark-300 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                    <button
                      onClick={() => setHideWithQuizzes((v) => !v)}
                      title={hideWithQuizzes ? 'Show all rubrics' : 'Show only rubrics without quizzes'}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md border text-xs font-medium transition-all flex-shrink-0 ${
                        hideWithQuizzes
                          ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                          : 'border-gray-300 dark:border-dark-200 bg-white dark:bg-dark-300 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-dark-100'
                      }`}
                    >
                      <Filter size={13} />
                    </button>
                  </div>
                  {hideWithQuizzes && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-800/40">
                      <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        Showing only rubrics without quizzes ({rubricMappings.length - filteredMappings.length} hidden)
                      </span>
                    </div>
                  )}

                  {filteredMappings.length > 0 && !isBatchRunning && (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleSelectAll}
                        className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                      >
                        {visibleAllSelected ? 'Deselect all' : 'Select all'}
                      </button>
                      {isAtMaxBatch && (
                        <span className="text-[10px] font-medium text-warning-600 dark:text-warning-400">
                          Max {MAX_BATCH_SIZE} per batch
                        </span>
                      )}
                    </div>
                  )}

                  {isLoadingMappings ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-gray-400" />
                    </div>
                  ) : filteredMappings.length === 0 ? (
                    <div className="text-center py-8">
                      <FileQuestion size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {rubricMappings.length === 0
                          ? 'No grind zone rubrics mapped yet'
                          : hideWithQuizzes
                          ? 'All rubrics already have quizzes'
                          : 'No rubrics match your search'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {filteredMappings.map((mapping) => (
                        <DraggableRubric
                          key={mapping.id}
                          mapping={mapping}
                          isSelected={selectedIds.has(mapping.id)}
                          isDisabled={isAtMaxBatch && !selectedIds.has(mapping.id)}
                          onToggle={handleToggleBatchItem}
                          isBatchRunning={isBatchRunning}
                          hasQuiz={rubricIdsWithQuizzes.has(mapping.rubric_id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {hasBatchQueue ? (
              <BatchQueuePanel
                queue={batchQueue}
                language={batchLanguage}
                autoPublish={autoPublish}
                isBatchRunning={isBatchRunning}
                isBatchDone={isBatchDone}
                onLanguageChange={setBatchLanguage}
                onAutoPublishToggle={() => setAutoPublish((v) => !v)}
                onRemoveItem={handleRemoveBatchItem}
                onGenerateAll={handleGenerateAll}
                onStopBatch={handleStopBatch}
                onClearQueue={handleClearQueue}
              />
            ) : (
              <DropZone
                isOver={isDropOver}
                selectedMapping={selectedMapping}
                isGenerating={isGenerating}
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
                onGenerate={handleGenerate}
                onClear={() => setSelectedMapping(null)}
              />
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Quizzes</CardTitle>
                  <Badge>{quizzes.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingQuizzes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-gray-400" />
                  </div>
                ) : quizzes.length === 0 ? (
                  <div className="text-center py-8">
                    <FileQuestion size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No quizzes generated yet. Drag a rubric above to get started.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-dark-200">
                    {quizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {quiz.title}
                            </p>
                            {newQuizIds.has(quiz.id) && (
                              <Badge variant="accent">New</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={quiz.status === 'published' ? 'success' : 'warning'}>
                              {quiz.status}
                            </Badge>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400">
                              {quiz.language || 'en'}
                            </span>
                            {quiz.rubric_name && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {quiz.rubric_name}
                              </span>
                            )}
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {quiz.video_count} videos
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(quiz.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenQuiz(quiz)}
                            leftIcon={<Eye size={14} />}
                          >
                            View
                          </Button>
                          <button
                            onClick={() => handleOpenDuplicate(quiz)}
                            title="Duplicate to other configs"
                            className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:text-primary-400 dark:hover:bg-primary-900/20 transition-colors"
                          >
                            <Copy size={14} />
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setQuizToDelete(quiz);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-error-600 hover:text-error-700 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-900/20"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </div>

      <DragOverlay>
        {draggedMapping ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-primary-500 bg-white dark:bg-dark-300 shadow-lg opacity-90">
            <GripVertical size={14} className="text-primary-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {draggedMapping.rubric_name || draggedMapping.rubric_id}
              </p>
              {draggedMapping.game_name && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {draggedMapping.game_name}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {selectedQuiz && (
        <QuizEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedQuiz(null);
          }}
          quiz={selectedQuiz}
          onQuizUpdated={handleQuizUpdated}
        />
      )}

      <Modal
        isOpen={isDuplicateModalOpen}
        onClose={() => {
          setIsDuplicateModalOpen(false);
          setQuizToDuplicate(null);
        }}
        title="Duplicate Quiz"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDuplicateModalOpen(false);
                setQuizToDuplicate(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isDuplicating}
              disabled={selectedTargetConfigs.size === 0}
              onClick={handleDuplicate}
              leftIcon={<Copy size={16} />}
            >
              Duplicate to {selectedTargetConfigs.size} config{selectedTargetConfigs.size !== 1 ? 's' : ''}
            </Button>
          </div>
        }
      >
        {quizToDuplicate && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-400 border border-gray-100 dark:border-dark-200">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {quizToDuplicate.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-200 dark:bg-dark-200 text-gray-600 dark:text-gray-400">
                  {quizToDuplicate.language || 'en'}
                </span>
                {quizToDuplicate.rubric_name && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {quizToDuplicate.rubric_name}
                  </span>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select target configurations
              </p>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {configs
                  .filter((cfg) => cfg.id !== quizToDuplicate.project_config_id)
                  .map((cfg) => {
                    const isSelected = selectedTargetConfigs.has(cfg.id);
                    return (
                      <button
                        key={cfg.id}
                        onClick={() => toggleTargetConfig(cfg.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/15'
                            : 'border-gray-200 dark:border-dark-200 bg-white dark:bg-dark-300 hover:border-gray-300 dark:hover:border-dark-100'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-primary-500 text-white'
                            : 'border-2 border-gray-300 dark:border-dark-100'
                        }`}>
                          {isSelected && <Check size={12} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {cfg.config_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {cfg.config_id}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                {configs.filter((cfg) => cfg.id !== quizToDuplicate.project_config_id).length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No other configurations available
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setQuizToDelete(null);
        }}
        title="Delete Quiz"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setQuizToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={isDeleting}
              onClick={handleDeleteQuiz}
              leftIcon={<Trash2 size={16} />}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Are you sure you want to delete <strong>"{quizToDelete?.title}"</strong>? This will permanently remove the quiz and all its questions.
        </p>
      </Modal>
    </DndContext>
  );
};

export default GrindZoneQuizPage;
