import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Zap, Sliders, Trophy, Gift, Check, TrendingUp, Calendar } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import type { Database } from '../../types/supabase';

type BattlePassReward = Database['public']['Tables']['battle_pass_rewards']['Row'];

interface BattlePassWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: SeasonConfiguration) => Promise<void>;
  existingRewards: BattlePassReward[];
}

export interface SeasonConfiguration {
  season: {
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    premium_price: number;
    is_active: boolean;
  };
  tiers: {
    mode: 'quick' | 'custom';
    totalLevels: number;
    xpProgression: 'linear' | 'exponential' | 'custom';
    baseXP: number;
    xpMultiplier?: number;
    customXPFormula?: string;
  };
  rewards: {
    autoDistribute: boolean;
    freeRewardInterval: number;
    premiumRewardInterval: number;
    selectedFreeRewards: string[];
    selectedPremiumRewards: string[];
    specialTiers: { [key: number]: { free?: string[]; premium?: string[] } };
  };
}

const QUICK_TEMPLATES = [
  { name: 'Courte', levels: 25, duration: '1 mois', baseXP: 800 },
  { name: 'Moyenne', levels: 50, duration: '2 mois', baseXP: 1000 },
  { name: 'Longue', levels: 100, duration: '3 mois', baseXP: 1200 },
];

const XP_FORMULAS = [
  { value: 'linear', label: 'Linéaire', description: 'Même quantité XP par niveau' },
  { value: 'exponential', label: 'Exponentielle', description: 'Augmentation progressive (recommandé)' },
  { value: 'custom', label: 'Personnalisée', description: 'Formule manuelle' },
];

export default function BattlePassWizard({ isOpen, onClose, onComplete, existingRewards }: BattlePassWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [config, setConfig] = useState<SeasonConfiguration>({
    season: {
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      premium_price: 500,
      is_active: false,
    },
    tiers: {
      mode: 'quick',
      totalLevels: 50,
      xpProgression: 'exponential',
      baseXP: 1000,
      xpMultiplier: 1.1,
    },
    rewards: {
      autoDistribute: true,
      freeRewardInterval: 5,
      premiumRewardInterval: 3,
      selectedFreeRewards: [],
      selectedPremiumRewards: [],
      specialTiers: {},
    },
  });

  const totalSteps = config.tiers.mode === 'quick' ? 3 : 5;

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      resetConfig();
    }
  }, [isOpen]);

  const resetConfig = () => {
    setConfig({
      season: {
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        premium_price: 500,
        is_active: false,
      },
      tiers: {
        mode: 'quick',
        totalLevels: 50,
        xpProgression: 'exponential',
        baseXP: 1000,
        xpMultiplier: 1.1,
      },
      rewards: {
        autoDistribute: true,
        freeRewardInterval: 5,
        premiumRewardInterval: 3,
        selectedFreeRewards: [],
        selectedPremiumRewards: [],
        specialTiers: {},
      },
    });
  };

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

  const getTotalXP = (): number => {
    let total = 0;
    for (let i = 1; i <= config.tiers.totalLevels; i++) {
      total += calculateXP(i);
    }
    return total;
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(config);
      onClose();
    } catch (error) {
      console.error('Error completing wizard:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return config.season.name.trim() !== '' &&
               config.season.start_date !== '' &&
               config.season.end_date !== '';
      case 2:
        return config.tiers.totalLevels > 0 && config.tiers.baseXP > 0;
      case 3:
        return config.tiers.mode === 'quick' || true;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const applyQuickTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setConfig({
      ...config,
      tiers: {
        ...config.tiers,
        totalLevels: template.levels,
        baseXP: template.baseXP,
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Trophy className="w-7 h-7 text-purple-400" />
              Créer une Saison Battle Pass
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Étape {step} sur {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <React.Fragment key={idx}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                      idx + 1 === step
                        ? 'bg-purple-500 text-white scale-110'
                        : idx + 1 < step
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {idx + 1 < step ? <Check className="w-5 h-5" /> : idx + 1}
                  </div>
                  {idx < totalSteps - 1 && (
                    <div
                      className={`w-12 h-1 rounded transition-colors ${
                        idx + 1 < step ? 'bg-green-500' : 'bg-slate-700'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Informations de la Saison</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nom de la Saison *
                    </label>
                    <Input
                      type="text"
                      required
                      value={config.season.name}
                      onChange={(e) =>
                        setConfig({ ...config, season: { ...config.season, name: e.target.value } })
                      }
                      placeholder="Ex: Saison 1 - Renaissance"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={config.season.description}
                      onChange={(e) =>
                        setConfig({ ...config, season: { ...config.season, description: e.target.value } })
                      }
                      placeholder="Description de la saison..."
                      rows={3}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Date de Début *
                      </label>
                      <Input
                        type="date"
                        required
                        value={config.season.start_date}
                        onChange={(e) =>
                          setConfig({ ...config, season: { ...config.season, start_date: e.target.value } })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Date de Fin *
                      </label>
                      <Input
                        type="date"
                        required
                        value={config.season.end_date}
                        onChange={(e) =>
                          setConfig({ ...config, season: { ...config.season, end_date: e.target.value } })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Prix du Pass Premium (coins) *
                    </label>
                    <Input
                      type="number"
                      required
                      min="0"
                      value={config.season.premium_price}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          season: { ...config.season, premium_price: parseInt(e.target.value) || 0 },
                        })
                      }
                    />
                    <p className="text-xs text-slate-500 mt-1">Recommandé: 300-1000 coins</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active_wizard"
                      checked={config.season.is_active}
                      onChange={(e) =>
                        setConfig({ ...config, season: { ...config.season, is_active: e.target.checked } })
                      }
                      className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="is_active_wizard" className="text-sm text-slate-300">
                      Activer cette saison immédiatement
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Mode de Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Card
                    className={`cursor-pointer transition-all ${
                      config.tiers.mode === 'quick'
                        ? 'bg-purple-500/20 border-purple-500'
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                    onClick={() => setConfig({ ...config, tiers: { ...config.tiers, mode: 'quick' } })}
                  >
                    <div className="flex items-start gap-3">
                      <Zap className="w-6 h-6 text-purple-400 mt-1" />
                      <div>
                        <h4 className="font-semibold text-white mb-1">Mode Rapide</h4>
                        <p className="text-sm text-slate-400">
                          Templates prédéfinis avec configuration automatique des récompenses
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all ${
                      config.tiers.mode === 'custom'
                        ? 'bg-purple-500/20 border-purple-500'
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                    onClick={() => setConfig({ ...config, tiers: { ...config.tiers, mode: 'custom' } })}
                  >
                    <div className="flex items-start gap-3">
                      <Sliders className="w-6 h-6 text-blue-400 mt-1" />
                      <div>
                        <h4 className="font-semibold text-white mb-1">Mode Personnalisé</h4>
                        <p className="text-sm text-slate-400">
                          Contrôle total sur la progression XP et la distribution des récompenses
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {config.tiers.mode === 'quick' && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Choisir un Template</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {QUICK_TEMPLATES.map((template) => (
                        <Card
                          key={template.name}
                          className={`cursor-pointer transition-all ${
                            config.tiers.totalLevels === template.levels
                              ? 'bg-purple-500/20 border-purple-500'
                              : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                          }`}
                          onClick={() => applyQuickTemplate(template)}
                        >
                          <div className="text-center">
                            <Trophy className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                            <h5 className="font-semibold text-white mb-1">{template.name}</h5>
                            <p className="text-2xl font-bold text-purple-400 mb-1">{template.levels}</p>
                            <p className="text-xs text-slate-400">niveaux</p>
                            <p className="text-xs text-slate-500 mt-2">{template.duration}</p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {config.tiers.mode === 'custom' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Nombre Total de Niveaux *
                      </label>
                      <Input
                        type="number"
                        required
                        min="1"
                        max="200"
                        value={config.tiers.totalLevels}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            tiers: { ...config.tiers, totalLevels: parseInt(e.target.value) || 1 },
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">XP de Base *</label>
                      <Input
                        type="number"
                        required
                        min="100"
                        value={config.tiers.baseXP}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            tiers: { ...config.tiers, baseXP: parseInt(e.target.value) || 100 },
                          })
                        }
                      />
                      <p className="text-xs text-slate-500 mt-1">XP requis pour le premier niveau</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && config.tiers.mode === 'custom' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Progression XP</h3>
                <div className="space-y-4">
                  {XP_FORMULAS.map((formula) => (
                    <Card
                      key={formula.value}
                      className={`cursor-pointer transition-all ${
                        config.tiers.xpProgression === formula.value
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                      }`}
                      onClick={() =>
                        setConfig({ ...config, tiers: { ...config.tiers, xpProgression: formula.value as any } })
                      }
                    >
                      <div className="flex items-start gap-3">
                        <TrendingUp className="w-5 h-5 text-blue-400 mt-1" />
                        <div>
                          <h4 className="font-semibold text-white mb-1">{formula.label}</h4>
                          <p className="text-sm text-slate-400">{formula.description}</p>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {config.tiers.xpProgression === 'exponential' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Multiplicateur (1.0 - 2.0)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="2.0"
                        value={config.tiers.xpMultiplier}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            tiers: { ...config.tiers, xpMultiplier: parseFloat(e.target.value) || 1.1 },
                          })
                        }
                      />
                      <p className="text-xs text-slate-500 mt-1">1.1 = Progression modérée (recommandé)</p>
                    </div>
                  )}
                </div>

                <Card className="mt-6 bg-slate-700/30">
                  <h4 className="text-sm font-semibold text-white mb-3">Aperçu de la Progression</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-300">
                      <span>Niveau 1:</span>
                      <span className="text-purple-400">{calculateXP(1).toLocaleString()} XP</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Niveau {Math.floor(config.tiers.totalLevels / 2)}:</span>
                      <span className="text-purple-400">
                        {calculateXP(Math.floor(config.tiers.totalLevels / 2)).toLocaleString()} XP
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Niveau {config.tiers.totalLevels}:</span>
                      <span className="text-purple-400">{calculateXP(config.tiers.totalLevels).toLocaleString()} XP</span>
                    </div>
                    <div className="pt-2 border-t border-slate-600 flex justify-between font-semibold">
                      <span className="text-white">Total XP Requis:</span>
                      <span className="text-green-400">{getTotalXP().toLocaleString()} XP</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {((step === 3 && config.tiers.mode === 'quick') || (step === 4 && config.tiers.mode === 'custom')) && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Configuration des Récompenses</h3>

                <Card className="mb-6 bg-blue-500/10 border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Gift className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <h4 className="font-semibold text-white mb-1">Distribution Automatique</h4>
                      <p className="text-sm text-slate-400 mb-3">
                        Les récompenses seront automatiquement assignées selon les intervalles définis. Vous pourrez les
                        personnaliser plus tard.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="auto_distribute"
                          checked={config.rewards.autoDistribute}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              rewards: { ...config.rewards, autoDistribute: e.target.checked },
                            })
                          }
                          className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                        />
                        <label htmlFor="auto_distribute" className="text-sm text-slate-300">
                          Activer la distribution automatique
                        </label>
                      </div>
                    </div>
                  </div>
                </Card>

                {config.rewards.autoDistribute && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Récompense Gratuite tous les X niveaux
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={config.rewards.freeRewardInterval}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            rewards: { ...config.rewards, freeRewardInterval: parseInt(e.target.value) || 5 },
                          })
                        }
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Env. {Math.floor(config.tiers.totalLevels / config.rewards.freeRewardInterval)} récompenses
                        gratuites
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Récompense Premium tous les X niveaux
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={config.rewards.premiumRewardInterval}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            rewards: { ...config.rewards, premiumRewardInterval: parseInt(e.target.value) || 3 },
                          })
                        }
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Env. {Math.floor(config.tiers.totalLevels / config.rewards.premiumRewardInterval)} récompenses
                        premium
                      </p>
                    </div>
                  </div>
                )}

                {!config.rewards.autoDistribute && (
                  <Card className="bg-slate-700/30">
                    <p className="text-sm text-slate-400">
                      Tous les paliers seront créés sans récompenses. Vous pourrez les ajouter manuellement après la
                      création de la saison.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          )}

          {((step === 3 && config.tiers.mode === 'quick') || (step === 5 && config.tiers.mode === 'custom')) && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Récapitulatif</h3>
                <Card className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-400 mb-2">Saison</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-white font-medium">{config.season.name}</p>
                      {config.season.description && <p className="text-slate-400">{config.season.description}</p>}
                      <div className="flex items-center gap-4 text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(config.season.start_date).toLocaleDateString('fr-FR')} -{' '}
                          {new Date(config.season.end_date).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="text-yellow-400">{config.season.premium_price} coins</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-4">
                    <h4 className="text-sm font-semibold text-slate-400 mb-2">Structure</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Niveaux</p>
                        <p className="text-2xl font-bold text-white">{config.tiers.totalLevels}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">XP Total</p>
                        <p className="text-2xl font-bold text-green-400">{getTotalXP().toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Progression</p>
                        <p className="text-white capitalize">{config.tiers.xpProgression}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">XP de Base</p>
                        <p className="text-white">{config.tiers.baseXP}</p>
                      </div>
                    </div>
                  </div>

                  {config.rewards.autoDistribute && (
                    <div className="border-t border-slate-700 pt-4">
                      <h4 className="text-sm font-semibold text-slate-400 mb-2">Récompenses</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-green-400" />
                          <div>
                            <p className="text-slate-400">Gratuites</p>
                            <p className="text-white font-semibold">
                              ~{Math.floor(config.tiers.totalLevels / config.rewards.freeRewardInterval)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-yellow-400" />
                          <div>
                            <p className="text-slate-400">Premium</p>
                            <p className="text-white font-semibold">
                              ~{Math.floor(config.tiers.totalLevels / config.rewards.premiumRewardInterval)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-700">
          <Button
            type="button"
            variant="secondary"
            onClick={step === 1 ? onClose : handlePrevious}
            disabled={isSubmitting}
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            {step === 1 ? 'Annuler' : 'Précédent'}
          </Button>

          {step < totalSteps ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Suivant
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={!canProceed() || isSubmitting}>
              {isSubmitting ? 'Création en cours...' : 'Créer la Saison'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
