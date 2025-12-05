import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, Target, CheckCircle, XCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useGamificationStore } from '../store/gamificationStore';
import type { Database } from '../types/supabase';

type Quest = Database['public']['Tables']['quests']['Row'];
type QuestInsert = Database['public']['Tables']['quests']['Insert'];

const QUEST_TYPES = [
  { value: 'profile_completion', label: 'Complétion du profil' },
  { value: 'tournament_participation', label: 'Participation tournoi' },
  { value: 'tournament_victory', label: 'Victoire tournoi' },
  { value: 'daily_login', label: 'Connexion quotidienne' },
  { value: 'social_share', label: 'Partage social' },
  { value: 'friend_invite', label: 'Invitation ami' },
  { value: 'match_played', label: 'Matches joués' },
  { value: 'achievement_unlock', label: 'Déverrouiller achievement' },
  { value: 'custom', label: 'Personnalisée' },
];

export default function QuestsManagementPage() {
  const { quests, isLoading, fetchQuests, createQuest, updateQuest, deleteQuest } = useGamificationStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [formData, setFormData] = useState<QuestInsert>({
    name: '',
    description: '',
    xp_reward: 100,
    quest_type: 'profile_completion',
    target_value: '100',
    is_repeatable: false,
    is_active: true,
  });

  useEffect(() => {
    fetchQuests();
  }, []);

  const filteredQuests = quests.filter((quest) => {
    const matchesSearch =
      quest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quest.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || quest.quest_type === filterType;
    const matchesActive =
      filterActive === 'all' ||
      (filterActive === 'active' && quest.is_active) ||
      (filterActive === 'inactive' && !quest.is_active);
    return matchesSearch && matchesType && matchesActive;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuest) {
        await updateQuest(editingQuest.id, formData);
      } else {
        await createQuest(formData);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving quest:', error);
    }
  };

  const handleEdit = (quest: Quest) => {
    setEditingQuest(quest);
    setFormData({
      name: quest.name,
      description: quest.description,
      xp_reward: quest.xp_reward,
      quest_type: quest.quest_type,
      target_value: quest.target_value,
      is_repeatable: quest.is_repeatable,
      is_active: quest.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette quête ?')) {
      try {
        await deleteQuest(id);
      } catch (error) {
        console.error('Error deleting quest:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingQuest(null);
    setFormData({
      name: '',
      description: '',
      xp_reward: 100,
      quest_type: 'profile_completion',
      target_value: '100',
      is_repeatable: false,
      is_active: true,
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-blue-400" />
            Gestion des Quêtes
          </h1>
          <p className="mt-2 text-slate-400">
            Créez et gérez les missions et objectifs pour vos utilisateurs
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Quête
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Quêtes</p>
              <p className="text-3xl font-bold text-white mt-1">{quests.length}</p>
            </div>
            <Target className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Actives</p>
              <p className="text-3xl font-bold text-white mt-1">
                {quests.filter((q) => q.is_active).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Répétables</p>
              <p className="text-3xl font-bold text-white mt-1">
                {quests.filter((q) => q.is_repeatable).length}
              </p>
            </div>
            <Target className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">XP Moyen</p>
              <p className="text-3xl font-bold text-white mt-1">
                {quests.length > 0
                  ? Math.round(quests.reduce((sum, q) => sum + q.xp_reward, 0) / quests.length)
                  : 0}
              </p>
            </div>
            <span className="text-2xl">⭐</span>
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Rechercher une quête..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tous les types</option>
                {QUEST_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actives</option>
                <option value="inactive">Inactives</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : filteredQuests.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Aucune quête trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuests.map((quest) => (
                <div
                  key={quest.id}
                  className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{quest.name}</h3>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          {QUEST_TYPES.find((t) => t.value === quest.quest_type)?.label || quest.quest_type}
                        </span>
                        {quest.is_repeatable && (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                            Répétable
                          </span>
                        )}
                        {quest.is_active ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mb-3">{quest.description}</p>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-yellow-400 flex items-center gap-1">
                          ⭐ {quest.xp_reward} XP
                        </span>
                        <span className="text-slate-500">
                          Objectif: {quest.target_value}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(quest)}
                        className="p-2 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-primary-400 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(quest.id)}
                        className="p-2 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingQuest ? 'Modifier la quête' : 'Nouvelle quête'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nom de la quête *
            </label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Compléter votre profil"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de la quête..."
              rows={3}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Type de quête *
              </label>
              <select
                required
                value={formData.quest_type}
                onChange={(e) => setFormData({ ...formData, quest_type: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {QUEST_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Récompense XP *
              </label>
              <Input
                type="number"
                required
                min="0"
                value={formData.xp_reward}
                onChange={(e) => setFormData({ ...formData, xp_reward: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Valeur cible *
            </label>
            <Input
              type="text"
              required
              value={formData.target_value}
              onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
              placeholder="Ex: 100 (pourcentage, nombre, etc.)"
            />
            <p className="text-xs text-slate-500 mt-1">
              Peut être un nombre, pourcentage, ou autre valeur selon le type de quête
            </p>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_repeatable}
                onChange={(e) => setFormData({ ...formData, is_repeatable: e.target.checked })}
                className="w-4 h-4 text-primary-600 bg-slate-700 border-slate-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-slate-300">Quête répétable</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 bg-slate-700 border-slate-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-slate-300">Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {editingQuest ? 'Mettre à jour' : 'Créer la quête'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
