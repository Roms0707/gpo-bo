import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, Award, Trophy, Star, CheckCircle, XCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useGamificationStore } from '../store/gamificationStore';
import type { Database } from '../types/supabase';

type Achievement = Database['public']['Tables']['achievements']['Row'];
type AchievementInsert = Database['public']['Tables']['achievements']['Insert'];

const ACHIEVEMENT_CATEGORIES = [
  { value: 'tournament', label: 'Tournois' },
  { value: 'social', label: 'Social' },
  { value: 'progression', label: 'Progression' },
  { value: 'special', label: 'Spécial' },
  { value: 'seasonal', label: 'Saisonnier' },
];

export default function AchievementsManagementPage() {
  const { achievements, isLoading, fetchAchievements, createAchievement, updateAchievement, deleteAchievement } = useGamificationStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [formData, setFormData] = useState<AchievementInsert>({
    name: '',
    description: '',
    category: 'tournament',
    xp_reward: 500,
    badge_icon: '',
    unlock_criteria: {},
    is_hidden: false,
    is_active: true,
  });

  useEffect(() => {
    fetchAchievements();
  }, []);

  const filteredAchievements = achievements.filter((achievement) => {
    const matchesSearch =
      achievement.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      achievement.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || achievement.category === filterCategory;
    const matchesActive =
      filterActive === 'all' ||
      (filterActive === 'active' && achievement.is_active) ||
      (filterActive === 'inactive' && !achievement.is_active);
    return matchesSearch && matchesCategory && matchesActive;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAchievement) {
        await updateAchievement(editingAchievement.id, formData);
      } else {
        await createAchievement(formData);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving achievement:', error);
    }
  };

  const handleEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setFormData({
      name: achievement.name,
      description: achievement.description,
      category: achievement.category,
      xp_reward: achievement.xp_reward,
      badge_icon: achievement.badge_icon,
      unlock_criteria: achievement.unlock_criteria,
      is_hidden: achievement.is_hidden,
      is_active: achievement.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet achievement ?')) {
      try {
        await deleteAchievement(id);
      } catch (error) {
        console.error('Error deleting achievement:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingAchievement(null);
    setFormData({
      name: '',
      description: '',
      category: 'tournament',
      xp_reward: 500,
      badge_icon: '',
      unlock_criteria: {},
      is_hidden: false,
      is_active: true,
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const achievementsByCategory = ACHIEVEMENT_CATEGORIES.map(cat => ({
    ...cat,
    count: achievements.filter(a => a.category === cat.value).length,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Award className="w-8 h-8 text-yellow-400" />
            Gestion des Achievements
          </h1>
          <p className="mt-2 text-slate-400">
            Créez et gérez les badges et accomplissements
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
          Nouvel Achievement
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-600/10 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total</p>
              <p className="text-3xl font-bold text-white mt-1">{achievements.length}</p>
            </div>
            <Award className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Actifs</p>
              <p className="text-3xl font-bold text-white mt-1">
                {achievements.filter((a) => a.is_active).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Cachés</p>
              <p className="text-3xl font-bold text-white mt-1">
                {achievements.filter((a) => a.is_hidden).length}
              </p>
            </div>
            <Star className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">XP Moyen</p>
              <p className="text-3xl font-bold text-white mt-1">
                {achievements.length > 0
                  ? Math.round(achievements.reduce((sum, a) => sum + a.xp_reward, 0) / achievements.length)
                  : 0}
              </p>
            </div>
            <Trophy className="w-8 h-8 text-blue-400" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {achievementsByCategory.map((cat) => (
          <Card key={cat.value} className="bg-slate-700/50">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">{cat.label}</p>
              <p className="text-2xl font-bold text-white">{cat.count}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Rechercher un achievement..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Toutes les catégories</option>
                {ACHIEVEMENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : filteredAchievements.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Aucun achievement trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{achievement.badge_icon || '🏆'}</div>
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          {ACHIEVEMENT_CATEGORIES.find((c) => c.value === achievement.category)?.label}
                        </span>
                        {achievement.is_hidden && (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                            Caché
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {achievement.is_active ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2">{achievement.name}</h3>
                  <p className="text-slate-400 text-sm mb-3">{achievement.description}</p>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-600">
                    <span className="text-yellow-400 flex items-center gap-1">
                      ⭐ {achievement.xp_reward} XP
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(achievement)}
                        className="p-2 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-primary-400 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(achievement.id)}
                        className="p-2 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
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
        title={editingAchievement ? 'Modifier l\'achievement' : 'Nouvel achievement'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nom de l'achievement *
            </label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Premier Tournoi Gagné"
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
              placeholder="Description de l'achievement..."
              rows={3}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Catégorie *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {ACHIEVEMENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
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
              Icône du badge (emoji)
            </label>
            <Input
              type="text"
              value={formData.badge_icon || ''}
              onChange={(e) => setFormData({ ...formData, badge_icon: e.target.value })}
              placeholder="🏆"
              maxLength={2}
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_hidden}
                onChange={(e) => setFormData({ ...formData, is_hidden: e.target.checked })}
                className="w-4 h-4 text-primary-600 bg-slate-700 border-slate-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-slate-300">Achievement caché</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 bg-slate-700 border-slate-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-slate-300">Actif</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {editingAchievement ? 'Mettre à jour' : 'Créer l\'achievement'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
