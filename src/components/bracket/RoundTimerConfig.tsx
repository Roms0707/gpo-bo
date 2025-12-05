import React, { useState, useEffect } from 'react';
import { Clock, Edit2, Check, X, Settings } from 'lucide-react';
import { RoundTimer, updateRoundDuration } from '../../services/roundTimerService';
import { getRoundName } from '../../services/roundNotificationService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import toast from 'react-hot-toast';

interface RoundTimerConfigProps {
  timers: RoundTimer[];
  totalRounds: number;
  onTimersUpdated: () => void;
}

const RoundTimerConfig: React.FC<RoundTimerConfigProps> = ({
  timers,
  totalRounds,
  onTimersUpdated
}) => {
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(60);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const presetDurations = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1h', value: 60 },
    { label: '2h', value: 120 },
    { label: '4h', value: 240 },
    { label: '24h', value: 1440 }
  ];

  const handleStartEdit = (timer: RoundTimer) => {
    setEditingTimerId(timer.id);
    setEditValue(timer.duration_minutes);
  };

  const handleCancelEdit = () => {
    setEditingTimerId(null);
    setEditValue(60);
  };

  const handleSaveEdit = async (timerId: string) => {
    if (editValue < 5 || editValue > 1440) {
      toast.error('La durée doit être entre 5 et 1440 minutes');
      return;
    }

    setIsUpdating(true);
    const result = await updateRoundDuration(timerId, editValue);

    if (result) {
      toast.success('Durée mise à jour avec succès');
      setEditingTimerId(null);
      onTimersUpdated();
    } else {
      toast.error('Erreur lors de la mise à jour');
    }

    setIsUpdating(false);
  };

  const handleApplyToAll = async (duration: number) => {
    setIsUpdating(true);
    let successCount = 0;

    for (const timer of timers) {
      const result = await updateRoundDuration(timer.id, duration);
      if (result) successCount++;
    }

    if (successCount === timers.length) {
      toast.success(`Durée de ${duration} minutes appliquée à tous les rounds`);
      onTimersUpdated();
    } else {
      toast.error(`Erreur: ${successCount}/${timers.length} rounds mis à jour`);
    }

    setIsUpdating(false);
  };

  const getTotalEstimatedTime = (): string => {
    const totalMinutes = timers.reduce((sum, timer) => sum + timer.duration_minutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}min`;
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}min`;
    }
  };

  if (timers.length === 0) {
    return null;
  }

  return (
    <div className="bg-dark-100 border border-dark-300 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-white">Configuration des Timers de Round</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowConfig(!showConfig)}
          leftIcon={<Settings size={16} />}
        >
          {showConfig ? 'Masquer' : 'Configurer'}
        </Button>
      </div>

      {showConfig && (
        <>
          {/* Preset buttons */}
          <div className="mb-4 p-3 bg-dark-200 rounded-lg">
            <p className="text-sm text-gray-400 mb-2">Appliquer à tous les rounds :</p>
            <div className="flex flex-wrap gap-2">
              {presetDurations.map((preset) => (
                <Button
                  key={preset.value}
                  size="sm"
                  variant="secondary"
                  onClick={() => handleApplyToAll(preset.value)}
                  disabled={isUpdating}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Timer table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-300">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">Round</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">Nom</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">Durée</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">Statut</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {timers.map((timer) => {
                  const roundName = getRoundName(timer.round_number, totalRounds);
                  const isEditing = editingTimerId === timer.id;
                  const canEdit = timer.status === 'pending';

                  return (
                    <tr key={timer.id} className="border-b border-dark-300 hover:bg-dark-200">
                      <td className="py-3 px-3 text-white">{timer.round_number}</td>
                      <td className="py-3 px-3 text-gray-300">{roundName}</td>
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              min={5}
                              max={1440}
                              value={editValue}
                              onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                              className="w-24"
                            />
                            <span className="text-sm text-gray-400">min</span>
                          </div>
                        ) : (
                          <span className="text-white font-medium">
                            {formatDuration(timer.duration_minutes)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {timer.status === 'pending' && (
                          <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                            À venir
                          </span>
                        )}
                        {timer.status === 'active' && (
                          <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded border border-green-500/30">
                            En cours
                          </span>
                        )}
                        {timer.status === 'completed' && (
                          <span className="text-xs px-2 py-1 bg-success-900/30 text-success-400 rounded">
                            Terminé
                          </span>
                        )}
                        {timer.status === 'paused' && (
                          <span className="text-xs px-2 py-1 bg-orange-900/30 text-orange-400 rounded">
                            Pause
                          </span>
                        )}
                        {timer.status === 'expired' && (
                          <span className="text-xs px-2 py-1 bg-red-900/30 text-red-400 rounded">
                            Expiré
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(timer.id)}
                              disabled={isUpdating}
                              leftIcon={<Check size={14} />}
                            >
                              Enregistrer
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              disabled={isUpdating}
                              leftIcon={<X size={14} />}
                            >
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(timer)}
                            disabled={!canEdit}
                            leftIcon={<Edit2 size={14} />}
                          >
                            Modifier
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-4 p-3 bg-primary-900/20 border border-primary-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Temps total estimé pour le tournoi :</span>
              <span className="text-lg font-bold text-primary-400">{getTotalEstimatedTime()}</span>
            </div>
          </div>

          {/* Help text */}
          <div className="mt-4 p-3 bg-dark-200 rounded-lg">
            <p className="text-xs text-gray-400">
              <strong>Note :</strong> Les durées ne peuvent être modifiées qu'en mode draft et pour les rounds
              qui n'ont pas encore commencé. Une fois qu'un round est en cours, vous pouvez le mettre en pause
              ou l'étendre, mais pas modifier sa durée initiale.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default RoundTimerConfig;
