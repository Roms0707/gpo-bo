import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Trophy, Calendar, Users, TrendingUp, Star, Clock } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import BattlePassWizard, { SeasonConfiguration } from '../components/battlepass/BattlePassWizard';
import { useGamificationStore } from '../store/gamificationStore';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { Database } from '../types/supabase';

type BattlePassSeason = Database['public']['Tables']['battle_pass_seasons']['Row'];
type BattlePassSeasonInsert = Database['public']['Tables']['battle_pass_seasons']['Insert'];

export default function BattlePassManagementPage() {
  const navigate = useNavigate();
  const { battlePassSeasons, isLoading, fetchBattlePassSeasons, createBattlePassSeason, updateBattlePassSeason, deleteBattlePassSeason, createBattlePassTier } = useGamificationStore();
  const [showModal, setShowModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingSeason, setEditingSeason] = useState<BattlePassSeason | null>(null);
  const [rewards, setRewards] = useState<Database['public']['Tables']['battle_pass_rewards']['Row'][]>([]);
  const [formData, setFormData] = useState<BattlePassSeasonInsert>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    premium_price: 500,
    is_active: false,
  });

  useEffect(() => {
    fetchBattlePassSeasons();
    loadRewards();
  }, []);

  const loadRewards = async () => {
    const { data } = await supabase
      .from('battle_pass_rewards')
      .select('*')
      .order('created_at', { ascending: false });
    setRewards(data || []);
  };

  const activeSeason = battlePassSeasons.find(s => s.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (new Date(formData.end_date!) <= new Date(formData.start_date!)) {
      toast.error('La date de fin doit être après la date de début');
      return;
    }

    if (formData.is_active && activeSeason && (!editingSeason || editingSeason.id !== activeSeason.id)) {
      toast.error('Une saison est déjà active. Désactivez-la d\'abord.');
      return;
    }

    try {
      if (editingSeason) {
        await updateBattlePassSeason(editingSeason.id, formData);
      } else {
        await createBattlePassSeason(formData);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving season:', error);
    }
  };

  const handleEdit = (season: BattlePassSeason) => {
    setEditingSeason(season);
    setFormData({
      name: season.name,
      description: season.description,
      start_date: season.start_date.split('T')[0],
      end_date: season.end_date.split('T')[0],
      premium_price: season.premium_price,
      is_active: season.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette saison Battle Pass ?')) {
      try {
        await deleteBattlePassSeason(id);
      } catch (error) {
        console.error('Error deleting season:', error);
      }
    }
  };

  const toggleActive = async (season: BattlePassSeason) => {
    if (!season.is_active && activeSeason) {
      toast.error('Désactivez d\'abord la saison active');
      return;
    }
    try {
      await updateBattlePassSeason(season.id, { is_active: !season.is_active });
    } catch (error) {
      console.error('Error toggling season:', error);
    }
  };

  const resetForm = () => {
    setEditingSeason(null);
    setFormData({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      premium_price: 500,
      is_active: false,
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleWizardComplete = async (config: SeasonConfiguration) => {
    try {
      if (new Date(config.season.end_date) <= new Date(config.season.start_date)) {
        toast.error('La date de fin doit être après la date de début');
        return;
      }

      if (config.season.is_active && activeSeason) {
        toast.error('Une saison est déjà active. Désactivez-la d\'abord.');
        return;
      }

      const { data: seasonData, error: seasonError } = await supabase
        .from('battle_pass_seasons')
        .insert(config.season)
        .select()
        .single();

      if (seasonError) throw seasonError;

      const calculateXP = (level: number): number => {
        const { xpProgression, baseXP, xpMultiplier } = config.tiers;
        switch (xpProgression) {
          case 'linear':
            return baseXP;
          case 'exponential':
            return Math.floor(baseXP * Math.pow(xpMultiplier || 1.1, level - 1));
          case 'custom':
            return baseXP * level;
          default:
            return baseXP;
        }
      };

      const tiersToCreate = [];
      for (let i = 1; i <= config.tiers.totalLevels; i++) {
        const xpRequired = calculateXP(i);

        let freeRewards: string[] | null = null;
        let premiumRewards: string[] | null = null;

        if (config.rewards.autoDistribute) {
          if (i % config.rewards.freeRewardInterval === 0 && rewards.length > 0) {
            const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
            freeRewards = [randomReward.id];
          }

          if (i % config.rewards.premiumRewardInterval === 0 && rewards.length > 0) {
            const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
            premiumRewards = [randomReward.id];
          }
        }

        tiersToCreate.push({
          season_id: seasonData.id,
          tier_number: i,
          xp_required: xpRequired,
          free_rewards: freeRewards,
          premium_rewards: premiumRewards,
        });
      }

      for (const tier of tiersToCreate) {
        await createBattlePassTier(tier);
      }

      await fetchBattlePassSeasons();
      toast.success(`Saison "${config.season.name}" créée avec ${config.tiers.totalLevels} paliers!`);
      setShowWizard(false);
    } catch (error) {
      console.error('Error creating season with wizard:', error);
      toast.error('Erreur lors de la création de la saison');
      throw error;
    }
  };

  const getSeasonStatus = (season: BattlePassSeason) => {
    const now = new Date();
    const start = new Date(season.start_date);
    const end = new Date(season.end_date);

    if (season.is_active && now >= start && now <= end) {
      return { label: 'Active', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    } else if (now < start) {
      return { label: 'À venir', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    } else if (now > end) {
      return { label: 'Terminée', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
    }
    return { label: 'Inactive', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            Battle Pass Management
          </h1>
          <p className="mt-2 text-slate-400">
            Gérez les saisons et paliers du Battle Pass
          </p>
        </div>
        <Button
          onClick={() => {
            setShowWizard(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Saison
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Saisons</p>
              <p className="text-3xl font-bold text-white mt-1">{battlePassSeasons.length}</p>
            </div>
            <Trophy className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Saison Active</p>
              <p className="text-3xl font-bold text-white mt-1">{activeSeason ? '1' : '0'}</p>
            </div>
            <Star className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Prix Premium</p>
              <p className="text-3xl font-bold text-white mt-1">
                {activeSeason?.premium_price || 0}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Utilisateurs</p>
              <p className="text-3xl font-bold text-white mt-1">-</p>
            </div>
            <Users className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>
      </div>

      {activeSeason && (
        <Card className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Star className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                Saison Active: {activeSeason.name}
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                {activeSeason.description}
              </p>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(activeSeason.start_date)} - {formatDate(activeSeason.end_date)}
                </span>
                <span className="text-green-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {activeSeason.premium_price} coins
                </span>
              </div>
            </div>
            <Button
              onClick={() => navigate(`/gamification/battle-pass/${activeSeason.id}/tiers`)}
              variant="primary"
            >
              Gérer les Paliers
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Toutes les Saisons</h2>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : battlePassSeasons.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Aucune saison Battle Pass créée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {battlePassSeasons.map((season) => {
                const status = getSeasonStatus(season);
                return (
                  <div
                    key={season.id}
                    className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{season.name}</h3>
                          <span className={`px-3 py-1 text-xs rounded-full border ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm mb-3">{season.description}</p>
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(season.start_date)}
                          </span>
                          <span className="text-slate-500">-</span>
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(season.end_date)}
                          </span>
                          <span className="text-yellow-400 flex items-center gap-1">
                            💰 {season.premium_price} coins
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => navigate(`/gamification/battle-pass/${season.id}/tiers`)}
                          variant="secondary"
                          size="sm"
                        >
                          Paliers
                        </Button>
                        <button
                          onClick={() => toggleActive(season)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            season.is_active
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                          }`}
                        >
                          {season.is_active ? 'Active' : 'Activer'}
                        </button>
                        <button
                          onClick={() => handleEdit(season)}
                          className="p-2 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-primary-400 transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(season.id)}
                          className="p-2 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
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
        title={editingSeason ? 'Modifier la saison' : 'Nouvelle saison Battle Pass'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nom de la saison *
            </label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Saison 1 - Renaissance"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de la saison..."
              rows={3}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Date de début *
              </label>
              <Input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Date de fin *
              </label>
              <Input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Prix du Pass Premium (en coins virtuels) *
            </label>
            <Input
              type="number"
              required
              min="0"
              value={formData.premium_price || 0}
              onChange={(e) => setFormData({ ...formData, premium_price: parseInt(e.target.value) })}
            />
            <p className="text-xs text-slate-500 mt-1">
              Prix abordable recommandé: 300-1000 coins
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary-600 bg-slate-700 border-slate-600 rounded focus:ring-primary-500"
            />
            <label htmlFor="is_active" className="text-sm text-slate-300">
              Activer cette saison immédiatement
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {editingSeason ? 'Mettre à jour' : 'Créer la saison'}
            </Button>
          </div>
        </form>
      </Modal>

      <BattlePassWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handleWizardComplete}
        existingRewards={rewards}
      />
    </div>
  );
}
