import React, { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Gamepad2,
  FileText,
  Target,
  ListOrdered,
  ToggleLeft,
  ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import ConfigToggle from '../../components/coaching/ConfigToggle';
import DraggableTopicItem from '../../components/coaching/DraggableTopicItem';
import PromptPreview from '../../components/coaching/PromptPreview';
import {
  fetchCoachingConfigs,
  fetchCoachingConfigsByKey,
  createCoachingConfig,
  updateCoachingConfig,
  deleteCoachingConfig,
  toggleCoachingConfigActive,
  updateTopicPriorityOrder,
  assembleSystemPromptPreview,
} from '../../services/coachingConfigService';
import { supabase } from '../../lib/supabase';
import type { CoachingConfig, ConfigKeyType } from '../../types/coaching';
import toast from 'react-hot-toast';

interface Game {
  id: string;
  name: string;
  image_url: string | null;
}

const CoachingConfigPage: React.FC = () => {
  const navigate = useNavigate();

  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const [promptSections, setPromptSections] = useState<CoachingConfig[]>([]);
  const [emphasisAreas, setEmphasisAreas] = useState<CoachingConfig[]>([]);
  const [topicPriorities, setTopicPriorities] = useState<CoachingConfig[]>([]);
  const [behaviorToggles, setBehaviorToggles] = useState<CoachingConfig[]>([]);
  const [allConfigs, setAllConfigs] = useState<CoachingConfig[]>([]);

  const [isAddPromptModalOpen, setIsAddPromptModalOpen] = useState(false);
  const [isEditPromptModalOpen, setIsEditPromptModalOpen] = useState(false);
  const [isAddEmphasisModalOpen, setIsAddEmphasisModalOpen] = useState(false);
  const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
  const [isAddToggleModalOpen, setIsAddToggleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedConfig, setSelectedConfig] = useState<CoachingConfig | null>(null);
  const [newPromptText, setNewPromptText] = useState('');
  const [newEmphasisText, setNewEmphasisText] = useState('');
  const [newTopicText, setNewTopicText] = useState('');
  const [newToggleText, setNewToggleText] = useState('');
  const [configToDelete, setConfigToDelete] = useState<CoachingConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadConfigs();
    }
  }, [selectedGameId]);

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('id, name, image_url, sort_priority')
        .order('sort_priority')
        .order('name');

      if (error) throw error;

      setGames((data as Game[]) || []);
      if (data && data.length > 0) {
        setSelectedGameId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading games:', error);
      toast.error('Failed to load games');
    } finally {
      setIsLoading(false);
    }
  };

  const loadConfigs = async () => {
    if (!selectedGameId) return;

    setIsLoading(true);
    try {
      const [promptsResult, emphasisResult, topicsResult, togglesResult, allResult] =
        await Promise.all([
          fetchCoachingConfigsByKey(selectedGameId, 'custom_prompt_section'),
          fetchCoachingConfigsByKey(selectedGameId, 'emphasis_areas'),
          fetchCoachingConfigsByKey(selectedGameId, 'topic_priority'),
          fetchCoachingConfigsByKey(selectedGameId, 'behavior_toggle'),
          fetchCoachingConfigs(selectedGameId),
        ]);

      setPromptSections(promptsResult.data);
      setEmphasisAreas(emphasisResult.data);
      setTopicPriorities(topicsResult.data);
      setBehaviorToggles(togglesResult.data);
      setAllConfigs(allResult.data);
    } catch (error) {
      console.error('Error loading configs:', error);
      toast.error('Failed to load configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPromptSection = async () => {
    if (!newPromptText.trim() || !selectedGameId) return;

    setIsSaving(true);
    try {
      const result = await createCoachingConfig({
        game_id: selectedGameId,
        config_key: 'custom_prompt_section',
        config_value: newPromptText.trim(),
      });

      if (result.error) throw result.error;

      toast.success('Prompt section added');
      setIsAddPromptModalOpen(false);
      setNewPromptText('');
      loadConfigs();
    } catch (error) {
      console.error('Error adding prompt section:', error);
      toast.error('Failed to add prompt section');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPromptSection = async () => {
    if (!newPromptText.trim() || !selectedConfig) return;

    setIsSaving(true);
    try {
      const result = await updateCoachingConfig({
        id: selectedConfig.id,
        config_value: newPromptText.trim(),
      });

      if (result.error) throw result.error;

      toast.success('Prompt section updated');
      setIsEditPromptModalOpen(false);
      setSelectedConfig(null);
      setNewPromptText('');
      loadConfigs();
    } catch (error) {
      console.error('Error updating prompt section:', error);
      toast.error('Failed to update prompt section');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEmphasis = async () => {
    if (!newEmphasisText.trim() || !selectedGameId) return;

    setIsSaving(true);
    try {
      const result = await createCoachingConfig({
        game_id: selectedGameId,
        config_key: 'emphasis_areas',
        config_value: newEmphasisText.trim(),
      });

      if (result.error) throw result.error;

      toast.success('Emphasis area added');
      setIsAddEmphasisModalOpen(false);
      setNewEmphasisText('');
      loadConfigs();
    } catch (error) {
      console.error('Error adding emphasis area:', error);
      toast.error('Failed to add emphasis area');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTopic = async () => {
    if (!newTopicText.trim() || !selectedGameId) return;

    setIsSaving(true);
    try {
      const result = await createCoachingConfig({
        game_id: selectedGameId,
        config_key: 'topic_priority',
        config_value: newTopicText.trim(),
      });

      if (result.error) throw result.error;

      toast.success('Topic priority added');
      setIsAddTopicModalOpen(false);
      setNewTopicText('');
      loadConfigs();
    } catch (error) {
      console.error('Error adding topic priority:', error);
      toast.error('Failed to add topic priority');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToggle = async () => {
    if (!newToggleText.trim() || !selectedGameId) return;

    setIsSaving(true);
    try {
      const result = await createCoachingConfig({
        game_id: selectedGameId,
        config_key: 'behavior_toggle',
        config_value: newToggleText.trim(),
      });

      if (result.error) throw result.error;

      toast.success('Behavior toggle added');
      setIsAddToggleModalOpen(false);
      setNewToggleText('');
      loadConfigs();
    } catch (error) {
      console.error('Error adding behavior toggle:', error);
      toast.error('Failed to add behavior toggle');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleConfig = useCallback(
    async (id: string, isActive: boolean) => {
      try {
        const result = await toggleCoachingConfigActive(id, isActive);
        if (result.error) throw result.error;

        setAllConfigs((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_active: isActive } : c))
        );
        setPromptSections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_active: isActive } : c))
        );
        setEmphasisAreas((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_active: isActive } : c))
        );
        setTopicPriorities((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_active: isActive } : c))
        );
        setBehaviorToggles((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_active: isActive } : c))
        );
      } catch (error) {
        console.error('Error toggling config:', error);
        toast.error('Failed to update');
      }
    },
    []
  );

  const handleDeleteConfig = async () => {
    if (!configToDelete) return;

    setIsSaving(true);
    try {
      const result = await deleteCoachingConfig(configToDelete.id);
      if (result.error) throw result.error;

      toast.success('Configuration deleted');
      setIsDeleteModalOpen(false);
      setConfigToDelete(null);
      loadConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      toast.error('Failed to delete configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = topicPriorities.findIndex((t) => t.id === active.id);
      const newIndex = topicPriorities.findIndex((t) => t.id === over.id);

      const newOrder = arrayMove(topicPriorities, oldIndex, newIndex);
      setTopicPriorities(newOrder);

      try {
        const orderedIds = newOrder.map((t) => t.id);
        const result = await updateTopicPriorityOrder(selectedGameId, orderedIds);
        if (result.error) throw result.error;
      } catch (error) {
        console.error('Error updating order:', error);
        toast.error('Failed to save order');
        loadConfigs();
      }
    }
  };

  const openEditPromptModal = (config: CoachingConfig) => {
    setSelectedConfig(config);
    setNewPromptText(config.config_value);
    setIsEditPromptModalOpen(true);
  };

  const openDeleteModal = (config: CoachingConfig) => {
    setConfigToDelete(config);
    setIsDeleteModalOpen(true);
  };

  const selectedGame = games.find((g) => g.id === selectedGameId);
  const previewContent = assembleSystemPromptPreview(allConfigs);

  if (isLoading && games.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/coaching-analytics')}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Analytics
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Behavior Configuration</h1>
            <p className="text-gray-400 mt-1">
              Customize how the AI coach responds for each game
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 bg-dark-200 rounded-lg border border-dark-100">
        <Gamepad2 className="h-5 w-5 text-primary-400" />
        <Select
          label=""
          value={selectedGameId}
          onChange={(e) => setSelectedGameId(e.target.value)}
          options={games.map((g) => ({ value: g.id, label: g.name }))}
          className="flex-1 max-w-xs"
        />
        {selectedGame && selectedGame.image_url && (
          <img
            src={selectedGame.image_url}
            alt={selectedGame.name}
            className="h-10 w-10 rounded-lg object-cover"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />
                Custom Prompt Sections
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setIsAddPromptModalOpen(true)}
                leftIcon={<Plus size={14} />}
              >
                Add Section
              </Button>
            </CardHeader>
            <CardContent>
              {promptSections.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">
                  No custom prompt sections added yet
                </p>
              ) : (
                <div className="space-y-3">
                  {promptSections.map((section) => (
                    <div
                      key={section.id}
                      className={`p-4 bg-dark-300 rounded-lg border border-dark-100 ${
                        !section.is_active ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-gray-300 whitespace-pre-wrap flex-1">
                          {section.config_value}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleConfig(section.id, !section.is_active)}
                            className={`p-1.5 rounded-md transition-colors ${
                              section.is_active
                                ? 'text-success-400 hover:bg-success-500/10'
                                : 'text-gray-500 hover:bg-gray-500/10'
                            }`}
                            title={section.is_active ? 'Disable' : 'Enable'}
                          >
                            <ToggleLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditPromptModal(section)}
                            className="p-1.5 rounded-md text-gray-500 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(section)}
                            className="p-1.5 rounded-md text-gray-500 hover:text-error-400 hover:bg-error-500/10 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-accent-500" />
                Emphasis Areas
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setIsAddEmphasisModalOpen(true)}
                leftIcon={<Plus size={14} />}
              >
                Add Area
              </Button>
            </CardHeader>
            <CardContent>
              {emphasisAreas.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">
                  No emphasis areas defined yet
                </p>
              ) : (
                <div className="space-y-2">
                  {emphasisAreas.map((area) => (
                    <ConfigToggle
                      key={area.id}
                      label={area.config_value}
                      isActive={area.is_active}
                      onChange={(isActive) => handleToggleConfig(area.id, isActive)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-secondary-500" />
                Topic Priorities
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setIsAddTopicModalOpen(true)}
                leftIcon={<Plus size={14} />}
              >
                Add Topic
              </Button>
            </CardHeader>
            <CardContent>
              {topicPriorities.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">
                  No topic priorities set yet. Drag to reorder.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={topicPriorities.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {topicPriorities.map((topic) => (
                        <DraggableTopicItem
                          key={topic.id}
                          config={topic}
                          onToggle={handleToggleConfig}
                          onDelete={(id) => {
                            const config = topicPriorities.find((t) => t.id === id);
                            if (config) openDeleteModal(config);
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="h-5 w-5 text-warning-500" />
                Behavior Toggles
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setIsAddToggleModalOpen(true)}
                leftIcon={<Plus size={14} />}
              >
                Add Toggle
              </Button>
            </CardHeader>
            <CardContent>
              {behaviorToggles.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">
                  No behavior toggles configured yet
                </p>
              ) : (
                <div className="space-y-2">
                  {behaviorToggles.map((toggle) => (
                    <ConfigToggle
                      key={toggle.id}
                      label={toggle.config_value}
                      isActive={toggle.is_active}
                      onChange={(isActive) => handleToggleConfig(toggle.id, isActive)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <PromptPreview content={previewContent} />
          </div>
        </div>
      </div>

      <Modal
        isOpen={isAddPromptModalOpen}
        onClose={() => {
          setIsAddPromptModalOpen(false);
          setNewPromptText('');
        }}
        title="Add Prompt Section"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddPromptModalOpen(false);
                setNewPromptText('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPromptSection}
              isLoading={isSaving}
              leftIcon={<Plus size={16} />}
            >
              Add Section
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Custom Instructions
            </label>
            <textarea
              value={newPromptText}
              onChange={(e) => setNewPromptText(e.target.value)}
              placeholder="Enter custom instructions for the AI coach..."
              rows={6}
              className="w-full px-3 py-2 bg-dark-200 border border-dark-100 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditPromptModalOpen}
        onClose={() => {
          setIsEditPromptModalOpen(false);
          setSelectedConfig(null);
          setNewPromptText('');
        }}
        title="Edit Prompt Section"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditPromptModalOpen(false);
                setSelectedConfig(null);
                setNewPromptText('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditPromptSection}
              isLoading={isSaving}
              leftIcon={<Save size={16} />}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Custom Instructions
            </label>
            <textarea
              value={newPromptText}
              onChange={(e) => setNewPromptText(e.target.value)}
              placeholder="Enter custom instructions for the AI coach..."
              rows={6}
              className="w-full px-3 py-2 bg-dark-200 border border-dark-100 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddEmphasisModalOpen}
        onClose={() => {
          setIsAddEmphasisModalOpen(false);
          setNewEmphasisText('');
        }}
        title="Add Emphasis Area"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddEmphasisModalOpen(false);
                setNewEmphasisText('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddEmphasis}
              isLoading={isSaving}
              leftIcon={<Plus size={16} />}
            >
              Add Area
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Emphasis Area"
            value={newEmphasisText}
            onChange={(e) => setNewEmphasisText(e.target.value)}
            placeholder="e.g., Positioning and map awareness"
          />
        </div>
      </Modal>

      <Modal
        isOpen={isAddTopicModalOpen}
        onClose={() => {
          setIsAddTopicModalOpen(false);
          setNewTopicText('');
        }}
        title="Add Topic Priority"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddTopicModalOpen(false);
                setNewTopicText('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTopic}
              isLoading={isSaving}
              leftIcon={<Plus size={16} />}
            >
              Add Topic
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Topic Name"
            value={newTopicText}
            onChange={(e) => setNewTopicText(e.target.value)}
            placeholder="e.g., Character builds"
          />
          <p className="text-xs text-gray-500">
            Topics can be reordered by dragging after creation.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={isAddToggleModalOpen}
        onClose={() => {
          setIsAddToggleModalOpen(false);
          setNewToggleText('');
        }}
        title="Add Behavior Toggle"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddToggleModalOpen(false);
                setNewToggleText('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddToggle}
              isLoading={isSaving}
              leftIcon={<Plus size={16} />}
            >
              Add Toggle
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Behavior Description"
            value={newToggleText}
            onChange={(e) => setNewToggleText(e.target.value)}
            placeholder="e.g., Use encouraging language"
          />
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setConfigToDelete(null);
        }}
        title="Delete Configuration"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setConfigToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfig}
              isLoading={isSaving}
              leftIcon={<Trash2 size={16} />}
            >
              Delete
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete this configuration?
          </p>
          {configToDelete && (
            <div className="p-3 bg-dark-300 rounded-lg text-sm text-gray-400">
              {configToDelete.config_value}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CoachingConfigPage;
