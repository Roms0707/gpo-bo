import React, { useState, useEffect } from 'react';
import { Clock, X, Check, Edit2, Save } from 'lucide-react';
import { RoundTimer, updateRoundDuration } from '../../services/roundTimerService';
import { getRoundName } from '../../services/roundNotificationService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';

interface RoundTimerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  timers: RoundTimer[];
  totalRounds: number;
  onTimersUpdated: () => void;
}

interface PendingChange {
  timerId: string;
  originalValue: number;
  newValue: number;
}

const RoundTimerConfigModal: React.FC<RoundTimerConfigModalProps> = ({
  isOpen,
  onClose,
  timers,
  totalRounds,
  onTimersUpdated
}) => {
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(60);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [localTimers, setLocalTimers] = useState<RoundTimer[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLocalTimers([...timers]);
      setPendingChanges(new Map());
      setEditingTimerId(null);
    }
  }, [isOpen, timers]);

  const presetDurations = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1h', value: 60 },
    { label: '2h', value: 120 },
    { label: '4h', value: 240 },
    { label: '24h', value: 1440 }
  ];

  const handleStartEdit = (timer: RoundTimer) => {
    const pending = pendingChanges.get(timer.id);
    setEditingTimerId(timer.id);
    setEditValue(pending ? pending.newValue : timer.duration_minutes);
  };

  const handleCancelEdit = () => {
    setEditingTimerId(null);
    setEditValue(60);
  };

  const handleSaveRowEdit = async (timerId: string) => {
    if (editValue < 5 || editValue > 1440) {
      toast.error('La duree doit etre entre 5 et 1440 minutes');
      return;
    }

    setIsUpdating(true);
    const result = await updateRoundDuration(timerId, editValue);

    if (result) {
      toast.success('Duree mise a jour avec succes');
      setEditingTimerId(null);
      setLocalTimers(prev => prev.map(t =>
        t.id === timerId ? { ...t, duration_minutes: editValue } : t
      ));
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.delete(timerId);
        return next;
      });
      onTimersUpdated();
    } else {
      toast.error('Erreur lors de la mise a jour');
    }

    setIsUpdating(false);
  };

  const handleMarkForChange = (timerId: string, originalValue: number) => {
    if (editValue < 5 || editValue > 1440) {
      toast.error('La duree doit etre entre 5 et 1440 minutes');
      return;
    }

    if (editValue === originalValue) {
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.delete(timerId);
        return next;
      });
    } else {
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.set(timerId, { timerId, originalValue, newValue: editValue });
        return next;
      });
      setLocalTimers(prev => prev.map(t =>
        t.id === timerId ? { ...t, duration_minutes: editValue } : t
      ));
    }
    setEditingTimerId(null);
  };

  const handleApplyToAll = async (duration: number) => {
    setIsUpdating(true);
    let successCount = 0;

    for (const timer of localTimers) {
      if (timer.status === 'pending') {
        const result = await updateRoundDuration(timer.id, duration);
        if (result) successCount++;
      }
    }

    const pendingCount = localTimers.filter(t => t.status === 'pending').length;
    if (successCount === pendingCount) {
      toast.success(`Duree de ${duration} minutes appliquee a tous les rounds en attente`);
      setLocalTimers(prev => prev.map(t =>
        t.status === 'pending' ? { ...t, duration_minutes: duration } : t
      ));
      setPendingChanges(new Map());
      onTimersUpdated();
    } else {
      toast.error(`Erreur: ${successCount}/${pendingCount} rounds mis a jour`);
    }

    setIsUpdating(false);
  };

  const handleSaveAllChanges = async () => {
    if (pendingChanges.size === 0) {
      toast.info('Aucune modification a sauvegarder');
      return;
    }

    setIsUpdating(true);
    let successCount = 0;

    for (const change of pendingChanges.values()) {
      const result = await updateRoundDuration(change.timerId, change.newValue);
      if (result) successCount++;
    }

    if (successCount === pendingChanges.size) {
      toast.success(`${successCount} modification(s) sauvegardee(s) avec succes`);
      setPendingChanges(new Map());
      onTimersUpdated();
    } else {
      toast.error(`Erreur: ${successCount}/${pendingChanges.size} modifications sauvegardees`);
    }

    setIsUpdating(false);
  };

  const handleClose = () => {
    if (pendingChanges.size > 0) {
      setPendingChanges(new Map());
      setLocalTimers([...timers]);
    }
    setEditingTimerId(null);
    onClose();
  };

  const getTotalEstimatedTime = (): string => {
    const totalMinutes = localTimers.reduce((sum, timer) => sum + timer.duration_minutes, 0);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
            A venir
          </span>
        );
      case 'active':
        return (
          <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded border border-green-500/30">
            En cours
          </span>
        );
      case 'completed':
        return (
          <span className="text-xs px-2 py-1 bg-success-900/30 text-success-400 rounded">
            Termine
          </span>
        );
      case 'paused':
        return (
          <span className="text-xs px-2 py-1 bg-orange-900/30 text-orange-400 rounded">
            Pause
          </span>
        );
      case 'expired':
        return (
          <span className="text-xs px-2 py-1 bg-red-900/30 text-red-400 rounded">
            Expire
          </span>
        );
      default:
        return null;
    }
  };

  if (localTimers.length === 0) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="lg">
      <div className="flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between pb-4 border-b border-dark-300">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-900/30 rounded-lg">
              <Clock className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Configuration des Timers de Round</h2>
              <p className="text-sm text-gray-400">{localTimers.length} rounds | Total: {getTotalEstimatedTime()}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-dark-200 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="mb-4 p-3 bg-dark-200 rounded-lg">
            <p className="text-sm text-gray-400 mb-2">Appliquer a tous les rounds en attente :</p>
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

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-300">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">Round</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">Nom</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">Duree</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">Statut</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {localTimers.map((timer) => {
                  const roundName = getRoundName(timer.round_number, totalRounds);
                  const isEditing = editingTimerId === timer.id;
                  const canEdit = timer.status === 'pending';
                  const hasPendingChange = pendingChanges.has(timer.id);

                  return (
                    <tr
                      key={timer.id}
                      className={`border-b border-dark-300 hover:bg-dark-200 ${hasPendingChange ? 'bg-primary-900/10' : ''}`}
                    >
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
                          <span className={`font-medium ${hasPendingChange ? 'text-primary-400' : 'text-white'}`}>
                            {formatDuration(timer.duration_minutes)}
                            {hasPendingChange && (
                              <span className="ml-2 text-xs text-primary-400">(modifie)</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {getStatusBadge(timer.status)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveRowEdit(timer.id)}
                              disabled={isUpdating}
                              leftIcon={<Save size={14} />}
                            >
                              Sauvegarder
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

          <div className="mt-4 p-3 bg-primary-900/20 border border-primary-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Temps total estime pour le tournoi :</span>
              <span className="text-lg font-bold text-primary-400">{getTotalEstimatedTime()}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-dark-200 rounded-lg">
            <p className="text-xs text-gray-400">
              <strong>Note :</strong> Les durees ne peuvent etre modifiees que pour les rounds
              qui n'ont pas encore commence. Une fois qu'un round est en cours, vous pouvez le mettre en pause
              ou l'etendre, mais pas modifier sa duree initiale.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-dark-300">
          <div className="text-sm text-gray-400">
            {pendingChanges.size > 0 && (
              <span className="text-primary-400">{pendingChanges.size} modification(s) non sauvegardee(s)</span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isUpdating}
            >
              Annuler
            </Button>
            {pendingChanges.size > 0 && (
              <Button
                onClick={handleSaveAllChanges}
                isLoading={isUpdating}
                leftIcon={<Check size={16} />}
              >
                Sauvegarder tout ({pendingChanges.size})
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default RoundTimerConfigModal;
