import React, { useState } from 'react';
import { X, Wand2, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import type { Database } from '../../types/supabase';

type BattlePassReward = Database['public']['Tables']['battle_pass_rewards']['Row'];

interface BulkTierEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (config: BulkEditConfig) => Promise<void>;
  existingRewards: BattlePassReward[];
  totalTiers: number;
}

export interface BulkEditConfig {
  startTier: number;
  endTier: number;
  operation: 'set-free' | 'set-premium' | 'clear-free' | 'clear-premium' | 'set-xp' | 'adjust-xp';
  rewardIds?: string[];
  xpValue?: number;
  xpMultiplier?: number;
}

export default function BulkTierEditor({
  isOpen,
  onClose,
  onApply,
  existingRewards,
  totalTiers,
}: BulkTierEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [config, setConfig] = useState<BulkEditConfig>({
    startTier: 1,
    endTier: totalTiers,
    operation: 'set-free',
  });
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onApply({
        ...config,
        rewardIds: selectedRewards.length > 0 ? selectedRewards : undefined,
      });
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error applying bulk edit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setConfig({
      startTier: 1,
      endTier: totalTiers,
      operation: 'set-free',
    });
    setSelectedRewards([]);
  };

  const toggleReward = (rewardId: string) => {
    setSelectedRewards((prev) =>
      prev.includes(rewardId) ? prev.filter((id) => id !== rewardId) : [...prev, rewardId]
    );
  };

  const affectedTiers = config.endTier - config.startTier + 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Wand2 className="w-7 h-7 text-purple-400" />
              Édition en Masse
            </h2>
            <p className="text-sm text-slate-400 mt-1">Modifier plusieurs paliers simultanément</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-300">
                  Sélectionnez une plage de paliers et choisissez l'opération à effectuer. Cette action modifiera{' '}
                  <span className="font-semibold text-white">{affectedTiers}</span> palier(s).
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Palier de Début</label>
              <Input
                type="number"
                min={1}
                max={totalTiers}
                value={config.startTier}
                onChange={(e) =>
                  setConfig({ ...config, startTier: Math.max(1, Math.min(totalTiers, parseInt(e.target.value) || 1)) })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Palier de Fin</label>
              <Input
                type="number"
                min={1}
                max={totalTiers}
                value={config.endTier}
                onChange={(e) =>
                  setConfig({ ...config, endTier: Math.max(1, Math.min(totalTiers, parseInt(e.target.value) || 1)) })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Opération</label>
            <div className="space-y-2">
              {[
                { value: 'set-free', label: 'Définir Récompenses Gratuites', requiresRewards: true },
                { value: 'set-premium', label: 'Définir Récompenses Premium', requiresRewards: true },
                { value: 'clear-free', label: 'Supprimer Récompenses Gratuites', requiresRewards: false },
                { value: 'clear-premium', label: 'Supprimer Récompenses Premium', requiresRewards: false },
                { value: 'set-xp', label: 'Définir XP Fixe', requiresRewards: false },
                { value: 'adjust-xp', label: 'Ajuster XP (Multiplicateur)', requiresRewards: false },
              ].map((op) => (
                <label
                  key={op.value}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    config.operation === op.value
                      ? 'bg-purple-500/20 border-2 border-purple-500'
                      : 'bg-slate-700/50 border-2 border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="operation"
                    value={op.value}
                    checked={config.operation === op.value}
                    onChange={(e) => setConfig({ ...config, operation: e.target.value as any })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm text-white">{op.label}</span>
                </label>
              ))}
            </div>
          </div>

          {(config.operation === 'set-free' || config.operation === 'set-premium') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Sélectionner Récompenses (max 3 par palier)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 bg-slate-900/50 rounded-lg border border-slate-700">
                {existingRewards.map((reward) => (
                  <label
                    key={reward.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      selectedRewards.includes(reward.id)
                        ? 'bg-purple-500/20 border border-purple-500'
                        : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRewards.includes(reward.id)}
                      onChange={() => toggleReward(reward.id)}
                      disabled={!selectedRewards.includes(reward.id) && selectedRewards.length >= 3}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-sm text-white truncate">{reward.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">{selectedRewards.length}/3 récompenses sélectionnées</p>
            </div>
          )}

          {config.operation === 'set-xp' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Valeur XP Fixe</label>
              <Input
                type="number"
                min={100}
                value={config.xpValue || 1000}
                onChange={(e) => setConfig({ ...config, xpValue: parseInt(e.target.value) || 1000 })}
                placeholder="1000"
              />
              <p className="text-xs text-slate-500 mt-1">
                Tous les paliers sélectionnés auront cette valeur XP exacte
              </p>
            </div>
          )}

          {config.operation === 'adjust-xp' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Multiplicateur XP</label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="5"
                value={config.xpMultiplier || 1.5}
                onChange={(e) => setConfig({ ...config, xpMultiplier: parseFloat(e.target.value) || 1.5 })}
                placeholder="1.5"
              />
              <p className="text-xs text-slate-500 mt-1">
                Multiplier l'XP actuel de chaque palier (ex: 1.5 = +50%, 0.5 = -50%)
              </p>
            </div>
          )}

          <Card className="bg-slate-700/30">
            <h4 className="text-sm font-semibold text-white mb-3">Résumé</h4>
            <div className="space-y-1 text-sm">
              <p className="text-slate-400">
                Paliers: <span className="text-white font-medium">{config.startTier} à {config.endTier}</span>
              </p>
              <p className="text-slate-400">
                Total affecté: <span className="text-white font-medium">{affectedTiers} palier(s)</span>
              </p>
              {(config.operation === 'set-free' || config.operation === 'set-premium') && (
                <p className="text-slate-400">
                  Récompenses: <span className="text-white font-medium">{selectedRewards.length}</span>
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              config.startTier > config.endTier ||
              ((config.operation === 'set-free' || config.operation === 'set-premium') && selectedRewards.length === 0)
            }
          >
            {isSubmitting ? 'Application...' : 'Appliquer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
