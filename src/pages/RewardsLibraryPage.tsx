import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, Gift, Sparkles, Image as ImageIcon } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { Database } from '../types/supabase';

type BattlePassReward = Database['public']['Tables']['battle_pass_rewards']['Row'];
type BattlePassRewardInsert = Database['public']['Tables']['battle_pass_rewards']['Insert'];

const REWARD_TYPES = [
  { value: 'xp_boost', label: 'Boost XP', icon: '⚡' },
  { value: 'avatar', label: 'Avatar', icon: '🎭' },
  { value: 'profile_banner', label: 'Bannière Profil', icon: '🖼️' },
  { value: 'profile_frame', label: 'Cadre Profil', icon: '🖼️' },
  { value: 'profile_badge', label: 'Badge Profil', icon: '🏅' },
  { value: 'other', label: 'Autre', icon: '🎁' },
];

const RARITY_LEVELS = [
  { value: 'common', label: 'Commun', color: 'text-slate-400 bg-slate-500/20 border-slate-500/30' },
  { value: 'rare', label: 'Rare', color: 'text-blue-400 bg-blue-500/20 border-blue-500/30' },
  { value: 'epic', label: 'Épique', color: 'text-purple-400 bg-purple-500/20 border-purple-500/30' },
  { value: 'legendary', label: 'Légendaire', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' },
];

export default function RewardsLibraryPage() {
  const [rewards, setRewards] = useState<BattlePassReward[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRarity, setFilterRarity] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<BattlePassReward | null>(null);
  const [formData, setFormData] = useState<BattlePassRewardInsert>({
    name: '',
    description: '',
    reward_type: 'avatar',
    image_url: '',
    metadata: {},
    rarity: 'common',
  });

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('battle_pass_rewards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRewards(data || []);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des récompenses');
      console.error('Error loading rewards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRewards = rewards.filter((reward) => {
    const matchesSearch =
      reward.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reward.description && reward.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || reward.reward_type === filterType;
    const matchesRarity = filterRarity === 'all' || reward.rarity === filterRarity;
    return matchesSearch && matchesType && matchesRarity;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingReward) {
        const { error } = await supabase
          .from('battle_pass_rewards')
          .update(formData)
          .eq('id', editingReward.id);

        if (error) throw error;
        toast.success('Récompense mise à jour');
      } else {
        const { error } = await supabase
          .from('battle_pass_rewards')
          .insert(formData);

        if (error) throw error;
        toast.success('Récompense créée avec succès');
      }

      setShowModal(false);
      resetForm();
      loadRewards();
    } catch (error: any) {
      toast.error('Erreur lors de la sauvegarde');
      console.error('Error saving reward:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (reward: BattlePassReward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description,
      reward_type: reward.reward_type,
      image_url: reward.image_url,
      metadata: reward.metadata,
      rarity: reward.rarity,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette récompense ?')) {
      try {
        const { error } = await supabase
          .from('battle_pass_rewards')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Récompense supprimée');
        loadRewards();
      } catch (error: any) {
        toast.error('Erreur lors de la suppression');
        console.error('Error deleting reward:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingReward(null);
    setFormData({
      name: '',
      description: '',
      reward_type: 'avatar',
      image_url: '',
      metadata: {},
      rarity: 'common',
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const getTypeIcon = (type: string) => {
    return REWARD_TYPES.find(t => t.value === type)?.icon || '🎁';
  };

  const getRarityStyle = (rarity: string) => {
    return RARITY_LEVELS.find(r => r.value === rarity)?.color || RARITY_LEVELS[0].color;
  };

  const rewardsByType = REWARD_TYPES.map(type => ({
    ...type,
    count: rewards.filter(r => r.reward_type === type.value).length,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Gift className="w-8 h-8 text-pink-400" />
            Bibliothèque de Récompenses
          </h1>
          <p className="mt-2 text-slate-400">
            Gérez tous les items disponibles pour le Battle Pass et les achievements
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
          Nouvelle Récompense
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {rewardsByType.map((type) => (
          <Card key={type.value} className="bg-gradient-to-br from-slate-700/50 to-slate-800/50">
            <div className="text-center">
              <div className="text-3xl mb-2">{type.icon}</div>
              <p className="text-sm text-slate-400">{type.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{type.count}</p>
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
                  placeholder="Rechercher une récompense..."
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
                {REWARD_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
              <select
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Toutes les raretés</option>
                {RARITY_LEVELS.map((rarity) => (
                  <option key={rarity.value} value={rarity.value}>
                    {rarity.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : filteredRewards.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Aucune récompense trouvée</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getTypeIcon(reward.reward_type)}</span>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getRarityStyle(reward.rarity)}`}>
                        {RARITY_LEVELS.find(r => r.value === reward.rarity)?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(reward)}
                        className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-primary-400 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(reward.id)}
                        className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {reward.image_url && (
                    <div className="mb-3 aspect-square bg-slate-800 rounded-lg overflow-hidden">
                      <img
                        src={reward.image_url}
                        alt={reward.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <h3 className="font-semibold text-white mb-1">{reward.name}</h3>
                  <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                    {reward.description || 'Aucune description'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="px-2 py-1 bg-slate-800 rounded">
                      {REWARD_TYPES.find(t => t.value === reward.reward_type)?.label}
                    </span>
                    <span className="text-xs text-slate-600">ID: {reward.id.substring(0, 8)}...</span>
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
        title={editingReward ? 'Modifier la récompense' : 'Nouvelle récompense'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nom de la récompense *
            </label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Avatar Guerrier Légendaire"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de la récompense..."
              rows={3}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Type de récompense *
              </label>
              <select
                required
                value={formData.reward_type}
                onChange={(e) => setFormData({ ...formData, reward_type: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {REWARD_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Rareté *
              </label>
              <select
                required
                value={formData.rarity}
                onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {RARITY_LEVELS.map((rarity) => (
                  <option key={rarity.value} value={rarity.value}>
                    {rarity.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              URL de l'image
            </label>
            <Input
              type="text"
              value={formData.image_url || ''}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/image.png"
            />
            <p className="text-xs text-slate-500 mt-1">
              URL vers l'image de la récompense
            </p>
          </div>

          {formData.reward_type === 'xp_boost' && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-3">
              <h4 className="text-sm font-semibold text-blue-400">Configuration Boost XP</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Pourcentage de boost
                  </label>
                  <Input
                    type="number"
                    placeholder="50"
                    value={(formData.metadata as any)?.boost_percentage || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, boost_percentage: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Durée (heures)
                  </label>
                  <Input
                    type="number"
                    placeholder="24"
                    value={(formData.metadata as any)?.duration_hours || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, duration_hours: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {editingReward ? 'Mettre à jour' : 'Créer la récompense'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
