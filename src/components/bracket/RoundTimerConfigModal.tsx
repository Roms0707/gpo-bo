import React, { useState, useEffect } from 'react';
import { Clock, Check, Edit2, Save, X, Play, CheckCircle, Pause, AlertCircle, ChevronDown } from 'lucide-react';
import { RoundTimer, updateRoundDuration } from '../../services/roundTimerService';
import { getRoundName } from '../../services/roundNotificationService';
import Button from '../ui/Button';
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

const DURATION_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1h', value: 60 },
  { label: '1h 30min', value: 90 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
  { label: '4h', value: 240 },
  { label: '6h', value: 360 },
  { label: '12h', value: 720 },
  { label: '24h', value: 1440 }
];

const RoundTimerConfigModal: React.FC<RoundTimerConfigModalProps> = ({
  isOpen,
  onClose,
  timers,
  totalRounds,
  onTimersUpdated
}) => {
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(60);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customValue, setCustomValue] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [localTimers, setLocalTimers] = useState<RoundTimer[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLocalTimers([...timers]);
      setPendingChanges(new Map());
      setEditingTimerId(null);
      setIsCustomDuration(false);
      setCustomValue('');
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
    const value = pending ? pending.newValue : timer.duration_minutes;
    setEditingTimerId(timer.id);
    setEditValue(value);
    const isPreset = DURATION_OPTIONS.some(opt => opt.value === value);
    setIsCustomDuration(!isPreset);
    setCustomValue(!isPreset ? value.toString() : '');
  };

  const handleCancelEdit = () => {
    setEditingTimerId(null);
    setEditValue(60);
    setIsCustomDuration(false);
    setCustomValue('');
  };

  const handleDropdownChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomDuration(true);
      setCustomValue(editValue.toString());
    } else {
      setIsCustomDuration(false);
      setEditValue(parseInt(value));
    }
  };

  const handleCustomValueChange = (value: string) => {
    setCustomValue(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 5 && numValue <= 1440) {
      setEditValue(numValue);
    }
  };

  const handleSaveRowEdit = async (timerId: string) => {
    const finalValue = isCustomDuration ? parseInt(customValue) : editValue;

    if (isNaN(finalValue) || finalValue < 5 || finalValue > 1440) {
      toast.error('Duration must be between 5 and 1440 minutes');
      return;
    }

    setIsUpdating(true);
    const result = await updateRoundDuration(timerId, finalValue);

    if (result) {
      toast.success('Duration updated successfully');
      setEditingTimerId(null);
      setIsCustomDuration(false);
      setCustomValue('');
      setLocalTimers(prev => prev.map(t =>
        t.id === timerId ? { ...t, duration_minutes: finalValue } : t
      ));
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.delete(timerId);
        return next;
      });
      onTimersUpdated();
    } else {
      toast.error('Error updating duration');
    }

    setIsUpdating(false);
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
      toast.success(`${duration} minutes applied to all pending rounds`);
      setLocalTimers(prev => prev.map(t =>
        t.status === 'pending' ? { ...t, duration_minutes: duration } : t
      ));
      setPendingChanges(new Map());
      onTimersUpdated();
    } else {
      toast.error(`Error: ${successCount}/${pendingCount} rounds updated`);
    }

    setIsUpdating(false);
  };

  const handleSaveAllChanges = async () => {
    if (pendingChanges.size === 0) {
      toast('No changes to save', { icon: 'i' });
      return;
    }

    setIsUpdating(true);
    let successCount = 0;

    for (const change of pendingChanges.values()) {
      const result = await updateRoundDuration(change.timerId, change.newValue);
      if (result) successCount++;
    }

    if (successCount === pendingChanges.size) {
      toast.success(`${successCount} change(s) saved successfully`);
      setPendingChanges(new Map());
      onTimersUpdated();
    } else {
      toast.error(`Error: ${successCount}/${pendingChanges.size} changes saved`);
    }

    setIsUpdating(false);
  };

  const handleClose = () => {
    if (pendingChanges.size > 0) {
      setPendingChanges(new Map());
      setLocalTimers([...timers]);
    }
    setEditingTimerId(null);
    setIsCustomDuration(false);
    setCustomValue('');
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
          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded whitespace-nowrap">
            <Clock size={12} />
            Pending
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded border border-green-500/30 whitespace-nowrap">
            <Play size={12} className="animate-pulse" />
            Active
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-success-900/30 text-success-400 rounded whitespace-nowrap">
            <CheckCircle size={12} />
            Completed
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-orange-900/30 text-orange-400 rounded whitespace-nowrap">
            <Pause size={12} />
            Paused
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-red-900/30 text-red-400 rounded whitespace-nowrap">
            <AlertCircle size={12} />
            Expired
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Round Timer Configuration" size="4xl">
      <div className="flex flex-col">
        <div className="flex items-center gap-3 pb-4 border-b border-dark-300">
          <div className="p-2 bg-primary-900/30 rounded-lg">
            <Clock className="h-6 w-6 text-primary-400" />
          </div>
          <div>
            <p className="text-sm text-gray-400">{localTimers.length} rounds | Total: {getTotalEstimatedTime()}</p>
          </div>
        </div>

        <div className="py-4">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1 min-w-0">
              <div className="mb-3 p-3 bg-dark-200 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Apply to all pending rounds:</p>
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

              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-dark-300">
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">Round</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300 hidden sm:table-cell">Name</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">Duration</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">Status</th>
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
                          <td className="py-3 px-3">
                            <span className="text-white">{timer.round_number}</span>
                            <span className="sm:hidden text-gray-400 text-sm ml-2">({roundName})</span>
                          </td>
                          <td className="py-3 px-3 text-gray-300 hidden sm:table-cell">{roundName}</td>
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                {isCustomDuration ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={5}
                                      max={1440}
                                      value={customValue}
                                      onChange={(e) => handleCustomValueChange(e.target.value)}
                                      className="w-20 px-2 py-1.5 bg-dark-300 border border-dark-200 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="min"
                                    />
                                    <button
                                      onClick={() => {
                                        setIsCustomDuration(false);
                                        setEditValue(60);
                                      }}
                                      className="text-xs text-gray-400 hover:text-white"
                                    >
                                      Preset
                                    </button>
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <select
                                      value={editValue}
                                      onChange={(e) => handleDropdownChange(e.target.value)}
                                      className="appearance-none w-32 px-3 py-1.5 pr-8 bg-dark-300 border border-dark-200 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                                    >
                                      {DURATION_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                      <option value="custom">Custom...</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className={`font-medium ${hasPendingChange ? 'text-primary-400' : 'text-white'}`}>
                                {formatDuration(timer.duration_minutes)}
                                {hasPendingChange && (
                                  <span className="ml-2 text-xs text-primary-400">(modified)</span>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {getStatusBadge(timer.status)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveRowEdit(timer.id)}
                                  disabled={isUpdating}
                                  leftIcon={<Save size={14} />}
                                >
                                  <span className="hidden sm:inline">Save</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                  disabled={isUpdating}
                                  leftIcon={<X size={14} />}
                                >
                                  <span className="hidden sm:inline">Cancel</span>
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
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:w-72 flex-shrink-0 space-y-4">
              <div className="p-4 bg-primary-900/20 border border-primary-500/30 rounded-lg">
                <p className="text-sm text-gray-300 mb-2">Total estimated time</p>
                <p className="text-2xl font-bold text-primary-400">{getTotalEstimatedTime()}</p>
              </div>

              <div className="p-4 bg-dark-200 rounded-lg">
                <p className="text-xs text-gray-400">
                  <strong>Note:</strong> Durations can only be modified for rounds that have not yet started.
                  Once a round is in progress, you can pause or extend it, but not modify its initial duration.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-dark-300">
          <div className="text-sm text-gray-400">
            {pendingChanges.size > 0 && (
              <span className="text-primary-400">{pendingChanges.size} unsaved change(s)</span>
            )}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isUpdating}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            {pendingChanges.size > 0 && (
              <Button
                onClick={handleSaveAllChanges}
                isLoading={isUpdating}
                leftIcon={<Check size={16} />}
                className="flex-1 sm:flex-none"
              >
                Save all ({pendingChanges.size})
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default RoundTimerConfigModal;
