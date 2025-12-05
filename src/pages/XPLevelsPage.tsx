import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, TrendingUp, Zap } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useGamificationStore } from '../store/gamificationStore';
import type { Database } from '../types/supabase';

type XPThreshold = Database['public']['Tables']['xp_thresholds']['Row'];
type XPThresholdInsert = Database['public']['Tables']['xp_thresholds']['Insert'];

export default function XPLevelsPage() {
  const { xpThresholds, isLoading, fetchXPThresholds, createXPThreshold, updateXPThreshold, deleteXPThreshold } = useGamificationStore();
  const [showModal, setShowModal] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<XPThreshold | null>(null);
  const [formData, setFormData] = useState<XPThresholdInsert>({
    level: 1,
    xp_required: 1000,
  });

  useEffect(() => {
    fetchXPThresholds();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingThreshold) {
        await updateXPThreshold(editingThreshold.level, formData);
      } else {
        await createXPThreshold(formData);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving threshold:', error);
    }
  };

  const handleEdit = (threshold: XPThreshold) => {
    setEditingThreshold(threshold);
    setFormData({
      level: threshold.level,
      xp_required: threshold.xp_required,
    });
    setShowModal(true);
  };

  const handleDelete = async (level: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce niveau ?')) {
      try {
        await deleteXPThreshold(level);
      } catch (error) {
        console.error('Error deleting threshold:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingThreshold(null);
    const nextLevel = xpThresholds.length > 0
      ? Math.max(...xpThresholds.map(t => t.level)) + 1
      : 1;
    setFormData({
      level: nextLevel,
      xp_required: nextLevel * 1000,
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const generateBulkLevels = async () => {
    const totalLevels = 100;
    const baseXP = 1000;

    if (window.confirm(`Créer ${totalLevels} niveaux automatiquement ? Cette action ne peut pas être annulée.`)) {
      try {
        for (let i = 1; i <= totalLevels; i++) {
          const xpRequired = Math.floor(baseXP * Math.pow(1.15, i - 1));
          await createXPThreshold({ level: i, xp_required: xpRequired });
        }
      } catch (error) {
        console.error('Error generating bulk levels:', error);
      }
    }
  };

  const sortedThresholds = [...xpThresholds].sort((a, b) => a.level - b.level);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-400" />
            Niveaux & XP
          </h1>
          <p className="mt-2 text-slate-400">
            Configurez la courbe de progression XP
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={generateBulkLevels}
            variant="secondary"
            className="flex items-center gap-2"
            disabled={xpThresholds.length > 0}
          >
            <Zap className="w-5 h-5" />
            Générer 100 Niveaux
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouveau Niveau
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Niveaux Totaux</p>
              <p className="text-3xl font-bold text-white mt-1">{xpThresholds.length}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Niveau Max</p>
              <p className="text-3xl font-bold text-white mt-1">
                {xpThresholds.length > 0 ? Math.max(...xpThresholds.map(t => t.level)) : 0}
              </p>
            </div>
            <Zap className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">XP Total</p>
              <p className="text-3xl font-bold text-white mt-1">
                {xpThresholds.length > 0
                  ? Math.max(...xpThresholds.map(t => t.xp_required)).toLocaleString()
                  : 0}
              </p>
            </div>
            <span className="text-3xl">⭐</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">XP Moyen/Niveau</p>
              <p className="text-3xl font-bold text-white mt-1">
                {xpThresholds.length > 0
                  ? Math.round(xpThresholds.reduce((sum, t) => sum + t.xp_required, 0) / xpThresholds.length).toLocaleString()
                  : 0}
              </p>
            </div>
            <span className="text-3xl">📊</span>
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Courbe de Progression</h2>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : sortedThresholds.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">Aucun niveau configuré</p>
              <Button onClick={generateBulkLevels}>Générer 100 Niveaux Automatiquement</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {sortedThresholds.map((threshold) => (
                <div
                  key={threshold.level}
                  className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-500/20 rounded">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      </div>
                      <span className="text-lg font-bold text-white">Nv. {threshold.level}</span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(threshold)}
                        className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-primary-400 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(threshold.level)}
                        className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-yellow-400">
                    {threshold.xp_required.toLocaleString()} XP
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingThreshold ? 'Modifier le niveau' : 'Nouveau niveau'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Numéro du niveau *
            </label>
            <Input
              type="number"
              required
              min="1"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
              disabled={!!editingThreshold}
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

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {editingThreshold ? 'Mettre à jour' : 'Créer le niveau'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
