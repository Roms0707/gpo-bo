import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Trophy, Gift, Lock, Unlock, Zap, Wand2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import BulkTierEditor, { BulkEditConfig } from '../components/battlepass/BulkTierEditor';
import { useGamificationStore } from '../store/gamificationStore';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { Database } from '../types/supabase';

type BattlePassTier = Database['public']['Tables']['battle_pass_tiers']['Row'];
type BattlePassTierInsert = Database['public']['Tables']['battle_pass_tiers']['Insert'];
type BattlePassReward = Database['public']['Tables']['battle_pass_rewards']['Row'];

export default function BattlePassTiersPage() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const navigate = useNavigate();
  const { battlePassSeasons, battlePassTiers, isLoading, fetchBattlePassSeasons, fetchBattlePassTiers, createBattlePassTier, updateBattlePassTier, deleteBattlePassTier } = useGamificationStore();

  const [season, setSeason] = useState<any>(null);
  const [rewards, setRewards] = useState<BattlePassReward[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showBulkEditor, setShowBulkEditor] = useState(false);
  const [editingTier, setEditingTier] = useState<BattlePassTier | null>(null);
  const [formData, setFormData] = useState<BattlePassTierInsert>({
    season_id: seasonId || '',
    tier_number: 1,
    xp_required: 1000,
    free_rewards: null,
    premium_rewards: null,
  });

  useEffect(() => {
    if (seasonId) {
      loadData();
    }
  }, [seasonId]);

  const loadData = async () => {
    await fetchBattlePassSeasons();
    await fetchBattlePassTiers(seasonId!);

    const { data: seasonData } = await supabase
      .from('battle_pass_seasons')
      .select('*')
      .eq('id', seasonId)
      .single();

    setSeason(seasonData);

    const { data: rewardsData } = await supabase
      .from('battle_pass_rewards')
      .select('*')
      .order('name');

    setRewards(rewardsData || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTier) {
      const existingTier = battlePassTiers.find(
        t => t.tier_number === formData.tier_number && t.id !== editingTier.id
      );
      if (existingTier) {
        toast.error('Un palier avec ce numéro existe déjà');
        return;
      }
    } else {
      const existingTier = battlePassTiers.find(t => t.tier_number === formData.tier_number);
      if (existingTier) {
        toast.error('Un palier avec ce numéro existe déjà');
        return;
      }
    }

    try {
      if (editingTier) {
        await updateBattlePassTier(editingTier.id, formData);
      } else {
        await createBattlePassTier(formData);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving tier:', error);
    }
  };

  const handleEdit = (tier: BattlePassTier) => {
    setEditingTier(tier);
    setFormData({
      season_id: tier.season_id,
      tier_number: tier.tier_number,
      xp_required: tier.xp_required,
      free_rewards: tier.free_rewards,
      premium_rewards: tier.premium_rewards,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce palier ?')) {
      try {
        await deleteBattlePassTier(id);
      } catch (error) {
        console.error('Error deleting tier:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingTier(null);
    const nextTierNumber = battlePassTiers.length > 0
      ? Math.max(...battlePassTiers.map(t => t.tier_number)) + 1
      : 1;
    setFormData({
      season_id: seasonId || '',
      tier_number: nextTierNumber,
      xp_required: nextTierNumber * 1000,
      free_rewards: null,
      premium_rewards: null,
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const generateBulkTiers = async () => {
    const totalTiers = 50;
    const baseXP = 1000;

    if (window.confirm(`Créer ${totalTiers} paliers automatiquement ? Cette action ne peut pas être annulée.`)) {
      try {
        const tiersToCreate = [];
        for (let i = 1; i <= totalTiers; i++) {
          const xpRequired = Math.floor(baseXP * Math.pow(1.1, i - 1));
          tiersToCreate.push({
            season_id: seasonId!,
            tier_number: i,
            xp_required: xpRequired,
            free_rewards: null,
            premium_rewards: null,
          });
        }

        for (const tier of tiersToCreate) {
          await createBattlePassTier(tier);
        }

        toast.success(`${totalTiers} paliers créés avec succès`);
      } catch (error) {
        console.error('Error generating bulk tiers:', error);
        toast.error('Erreur lors de la création en masse');
      }
    }
  };

  const getRewardName = (rewardId: string) => {
    const reward = rewards.find(r => r.id === rewardId);
    return reward?.name || 'Récompense inconnue';
  };

  const handleBulkEdit = async (config: BulkEditConfig) => {
    try {
      const tiersToUpdate = battlePassTiers.filter(
        (tier) => tier.tier_number >= config.startTier && tier.tier_number <= config.endTier
      );

      for (const tier of tiersToUpdate) {
        let updates: any = {};

        switch (config.operation) {
          case 'set-free':
            updates.free_rewards = config.rewardIds || null;
            break;
          case 'set-premium':
            updates.premium_rewards = config.rewardIds || null;
            break;
          case 'clear-free':
            updates.free_rewards = null;
            break;
          case 'clear-premium':
            updates.premium_rewards = null;
            break;
          case 'set-xp':
            updates.xp_required = config.xpValue || 1000;
            break;
          case 'adjust-xp':
            updates.xp_required = Math.floor(tier.xp_required * (config.xpMultiplier || 1.5));
            break;
        }

        await updateBattlePassTier(tier.id, updates);
      }

      toast.success(`${tiersToUpdate.length} palier(s) mis à jour avec succès`);
      setShowBulkEditor(false);
    } catch (error) {
      console.error('Error applying bulk edit:', error);
      toast.error('Erreur lors de l\'édition en masse');
      throw error;
    }
  };

  const parseRewards = (rewardsData: any) => {
    if (!rewardsData) return [];
    if (Array.isArray(rewardsData)) return rewardsData;
    if (typeof rewardsData === 'string') {
      try {
        return JSON.parse(rewardsData);
      } catch {
        return [];
      }
    }
    return [];
  };

  const sortedTiers = [...battlePassTiers].sort((a, b) => a.tier_number - b.tier_number);

  if (!season) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/gamification/battle-pass')}
          className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-purple-400" />
            {season.name} - Paliers
          </h1>
          <p className="mt-2 text-slate-400">
            Configurez les récompenses pour chaque niveau
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/gamification/rewards')}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Gift className="w-5 h-5" />
            Gérer Récompenses
          </Button>
          <Button
            onClick={() => setShowBulkEditor(true)}
            variant="secondary"
            className="flex items-center gap-2"
            disabled={battlePassTiers.length === 0}
          >
            <Wand2 className="w-5 h-5" />
            Édition en Masse
          </Button>
          <Button
            onClick={generateBulkTiers}
            variant="secondary"
            className="flex items-center gap-2"
            disabled={battlePassTiers.length > 0}
          >
            <Zap className="w-5 h-5" />
            Générer 50 Paliers
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouveau Palier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Paliers</p>
              <p className="text-3xl font-bold text-white mt-1">{battlePassTiers.length}</p>
            </div>
            <Trophy className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">XP Max</p>
              <p className="text-3xl font-bold text-white mt-1">
                {battlePassTiers.length > 0 ? Math.max(...battlePassTiers.map(t => t.xp_required)).toLocaleString() : 0}
              </p>
            </div>
            <Zap className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Récompenses Gratuites</p>
              <p className="text-3xl font-bold text-white mt-1">
                {battlePassTiers.filter(t => t.free_rewards && parseRewards(t.free_rewards).length > 0).length}
              </p>
            </div>
            <Unlock className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Récompenses Premium</p>
              <p className="text-3xl font-bold text-white mt-1">
                {battlePassTiers.filter(t => t.premium_rewards && parseRewards(t.premium_rewards).length > 0).length}
              </p>
            </div>
            <Lock className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Structure des Paliers</h2>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : sortedTiers.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">Aucun palier créé pour cette saison</p>
              <Button onClick={generateBulkTiers}>Générer 50 Paliers Automatiquement</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedTiers.map((tier) => {
                const freeRewards = parseRewards(tier.free_rewards);
                const premiumRewards = parseRewards(tier.premium_rewards);

                return (
                  <div
                    key={tier.id}
                    className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                          <Trophy className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">Palier {tier.tier_number}</h3>
                          <p className="text-sm text-slate-400">{tier.xp_required.toLocaleString()} XP</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(tier)}
                          className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-primary-400 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tier.id)}
                          className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="p-2 bg-green-500/10 border border-green-500/20 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <Unlock className="w-4 h-4 text-green-400" />
                          <span className="text-xs font-semibold text-green-400">GRATUIT</span>
                        </div>
                        {freeRewards.length > 0 ? (
                          <ul className="text-xs text-slate-300 space-y-0.5">
                            {freeRewards.map((rewardId: string, idx: number) => (
                              <li key={idx}>• {getRewardName(rewardId)}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-500">Aucune récompense</p>
                        )}
                      </div>

                      <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <Lock className="w-4 h-4 text-yellow-400" />
                          <span className="text-xs font-semibold text-yellow-400">PREMIUM</span>
                        </div>
                        {premiumRewards.length > 0 ? (
                          <ul className="text-xs text-slate-300 space-y-0.5">
                            {premiumRewards.map((rewardId: string, idx: number) => (
                              <li key={idx}>• {getRewardName(rewardId)}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-500">Aucune récompense</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingTier ? 'Modifier le palier' : 'Nouveau palier'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Numéro du palier *
              </label>
              <Input
                type="number"
                required
                min="1"
                value={formData.tier_number}
                onChange={(e) => setFormData({ ...formData, tier_number: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                XP requis *
              </label>
              <Input
                type="number"
                required
                min="0"
                value={formData.xp_required}
                onChange={(e) => setFormData({ ...formData, xp_required: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Récompenses Gratuites (IDs séparés par des virgules)
            </label>
            <Input
              type="text"
              placeholder="reward-id-1, reward-id-2"
              value={parseRewards(formData.free_rewards).join(', ')}
              onChange={(e) => {
                const ids = e.target.value.split(',').map(id => id.trim()).filter(Boolean);
                setFormData({ ...formData, free_rewards: ids.length > 0 ? ids : null });
              }}
            />
            <p className="text-xs text-slate-500 mt-1">
              Visible sur /gamification/rewards. Laissez vide pour aucune récompense.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Récompenses Premium (IDs séparés par des virgules)
            </label>
            <Input
              type="text"
              placeholder="reward-id-1, reward-id-2"
              value={parseRewards(formData.premium_rewards).join(', ')}
              onChange={(e) => {
                const ids = e.target.value.split(',').map(id => id.trim()).filter(Boolean);
                setFormData({ ...formData, premium_rewards: ids.length > 0 ? ids : null });
              }}
            />
            <p className="text-xs text-slate-500 mt-1">
              Récompenses pour utilisateurs avec Pass Premium uniquement.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {editingTier ? 'Mettre à jour' : 'Créer le palier'}
            </Button>
          </div>
        </form>
      </Modal>

      <BulkTierEditor
        isOpen={showBulkEditor}
        onClose={() => setShowBulkEditor(false)}
        onApply={handleBulkEdit}
        existingRewards={rewards}
        totalTiers={battlePassTiers.length > 0 ? Math.max(...battlePassTiers.map(t => t.tier_number)) : 0}
      />
    </div>
  );
}
