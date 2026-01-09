import React, { useState } from 'react';
import { Calendar, Clock, Check, Plus, Zap } from 'lucide-react';
import MilestoneCard from './MilestoneCard';

interface ScheduleTimelineProps {
  registrationStartDate: string;
  setRegistrationStartDate: (date: string) => void;
  registrationEndDate: string;
  setRegistrationEndDate: (date: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
}

interface CustomMilestone {
  id: string;
  label: string;
  sublabel: string;
  value: string;
}

const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({
  registrationStartDate,
  setRegistrationStartDate,
  registrationEndDate,
  setRegistrationEndDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate
}) => {
  const [customMilestones, setCustomMilestones] = useState<CustomMilestone[]>([]);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneLabel, setNewMilestoneLabel] = useState('');
  const [newMilestoneSublabel, setNewMilestoneSublabel] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const calculateDuration = (date1: string, date2: string): string | undefined => {
    if (!date1 || !date2) return undefined;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffMs = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffDays >= 1) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffHours >= 1) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    }
    return undefined;
  };

  const getValidationErrors = (): Map<string, string> => {
    const errors = new Map<string, string>();
    const dates = {
      regStart: registrationStartDate ? new Date(registrationStartDate) : null,
      regEnd: registrationEndDate ? new Date(registrationEndDate) : null,
      tournStart: startDate ? new Date(startDate) : null,
      tournEnd: endDate ? new Date(endDate) : null
    };

    if (dates.regStart && dates.regEnd && dates.regStart >= dates.regEnd) {
      errors.set('regStart', 'Must be before registration closes');
      errors.set('regEnd', 'Must be after registration opens');
    }
    if (dates.regEnd && dates.tournStart && dates.regEnd > dates.tournStart) {
      errors.set('regEnd', 'Should close before tournament starts');
    }
    if (dates.tournStart && dates.tournEnd && dates.tournStart >= dates.tournEnd) {
      errors.set('tournStart', 'Must be before tournament ends');
      errors.set('tournEnd', 'Must be after tournament starts');
    }

    return errors;
  };

  const validationErrors = getValidationErrors();

  const defaultMilestones = [
    {
      id: 'regStart',
      label: 'Registration Opens',
      sublabel: 'When players can sign up for the tournament',
      value: registrationStartDate,
      setValue: setRegistrationStartDate,
      required: false,
      color: 'emerald'
    },
    {
      id: 'regEnd',
      label: 'Registration Closes',
      sublabel: 'Last opportunity for players to sign up',
      value: registrationEndDate,
      setValue: setRegistrationEndDate,
      required: false,
      color: 'amber'
    },
    {
      id: 'tournStart',
      label: 'Tournament Begins',
      sublabel: 'Competition officially starts',
      value: startDate,
      setValue: setStartDate,
      required: true,
      color: 'blue'
    },
    {
      id: 'tournEnd',
      label: 'Tournament Ends',
      sublabel: 'Finals conclude and winners announced',
      value: endDate,
      setValue: setEndDate,
      required: true,
      color: 'rose'
    }
  ];

  const handleAddCustomMilestone = () => {
    if (newMilestoneLabel.trim()) {
      const newMilestone: CustomMilestone = {
        id: `custom-${Date.now()}`,
        label: newMilestoneLabel.trim(),
        sublabel: newMilestoneSublabel.trim() || 'Custom milestone',
        value: ''
      };
      setCustomMilestones([...customMilestones, newMilestone]);
      setNewMilestoneLabel('');
      setNewMilestoneSublabel('');
      setShowAddMilestone(false);
    }
  };

  const handleDeleteCustomMilestone = (id: string) => {
    setCustomMilestones(customMilestones.filter(m => m.id !== id));
  };

  const handleCustomMilestoneChange = (id: string, value: string) => {
    setCustomMilestones(customMilestones.map(m =>
      m.id === id ? { ...m, value } : m
    ));
  };

  const applyPreset = (preset: { regDays: number; tournDays: number }) => {
    const now = new Date();
    const regStart = now;
    const regEnd = new Date(now.getTime() + preset.regDays * 24 * 60 * 60 * 1000);
    const tournStart = new Date(regEnd.getTime() + 24 * 60 * 60 * 1000);
    const tournEnd = new Date(tournStart.getTime() + preset.tournDays * 24 * 60 * 60 * 1000);

    setRegistrationStartDate(regStart.toISOString().slice(0, 16));
    setRegistrationEndDate(regEnd.toISOString().slice(0, 16));
    setStartDate(tournStart.toISOString().slice(0, 16));
    setEndDate(tournEnd.toISOString().slice(0, 16));
    setShowPresets(false);
  };

  const totalMilestones = defaultMilestones.length + customMilestones.length;
  const completedMilestones = defaultMilestones.filter(m => m.value).length +
    customMilestones.filter(m => m.value).length;
  const requiredComplete = defaultMilestones.filter(m => m.required && m.value).length ===
    defaultMilestones.filter(m => m.required).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-500/20 rounded-xl">
            <Calendar className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Tournament Schedule</h3>
            <p className="text-sm text-gray-400">Set key dates for your tournament</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 rounded-lg transition-colors"
          >
            <Zap className="w-4 h-4" />
            Quick Setup
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-200 rounded-lg">
            <span className={`text-sm font-medium ${requiredComplete ? 'text-emerald-400' : 'text-gray-400'}`}>
              {completedMilestones}/{totalMilestones}
            </span>
            {requiredComplete && (
              <div className="p-0.5 bg-emerald-500/20 rounded-full">
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      {showPresets && (
        <div className="p-4 bg-gradient-to-r from-primary-500/10 to-blue-500/10 border border-primary-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-medium text-white">Quick Setup Presets</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Quick Event', desc: '1 week reg, 1 day event', regDays: 7, tournDays: 1 },
              { label: 'Weekend Event', desc: '2 weeks reg, 3 day event', regDays: 14, tournDays: 3 },
              { label: 'Standard', desc: '3 weeks reg, 1 week event', regDays: 21, tournDays: 7 },
              { label: 'Major Event', desc: '1 month reg, 2 week event', regDays: 30, tournDays: 14 }
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="p-3 text-left bg-dark-200 hover:bg-dark-100 rounded-lg transition-colors group"
              >
                <p className="text-sm font-medium text-white group-hover:text-primary-300 transition-colors">
                  {preset.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{preset.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-0">
        {defaultMilestones.map((milestone, index) => {
          const prevMilestone = index > 0 ? defaultMilestones[index - 1] : null;
          const duration = prevMilestone
            ? calculateDuration(prevMilestone.value, milestone.value)
            : undefined;

          return (
            <MilestoneCard
              key={milestone.id}
              id={milestone.id}
              label={milestone.label}
              sublabel={milestone.sublabel}
              value={milestone.value}
              onChange={milestone.setValue}
              required={milestone.required}
              color={milestone.color}
              isFirst={index === 0}
              isLast={index === defaultMilestones.length - 1 && customMilestones.length === 0}
              hasError={validationErrors.has(milestone.id)}
              errorMessage={validationErrors.get(milestone.id)}
              minDate={prevMilestone?.value}
              durationFromPrevious={duration}
            />
          );
        })}

        {customMilestones.map((milestone, index) => {
          const prevValue = index === 0
            ? defaultMilestones[defaultMilestones.length - 1].value
            : customMilestones[index - 1].value;
          const duration = calculateDuration(prevValue, milestone.value);

          return (
            <MilestoneCard
              key={milestone.id}
              id={milestone.id}
              label={milestone.label}
              sublabel={milestone.sublabel}
              value={milestone.value}
              onChange={(value) => handleCustomMilestoneChange(milestone.id, value)}
              required={false}
              color="purple"
              isFirst={false}
              isLast={index === customMilestones.length - 1}
              hasError={false}
              minDate={prevValue}
              durationFromPrevious={duration}
              isCustom
              onDelete={() => handleDeleteCustomMilestone(milestone.id)}
            />
          );
        })}
      </div>

      {showAddMilestone ? (
        <div className="p-4 bg-dark-200 rounded-xl border border-dark-300 space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">Add Custom Milestone</span>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={newMilestoneLabel}
              onChange={(e) => setNewMilestoneLabel(e.target.value)}
              placeholder="Milestone name (e.g., 'Check-in Opens')"
              className="w-full px-3 py-2 bg-dark-300 border border-dark-300 rounded-lg text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none text-sm"
            />
            <input
              type="text"
              value={newMilestoneSublabel}
              onChange={(e) => setNewMilestoneSublabel(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 bg-dark-300 border border-dark-300 rounded-lg text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddMilestone(false);
                setNewMilestoneLabel('');
                setNewMilestoneSublabel('');
              }}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-dark-300 hover:bg-dark-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddCustomMilestone}
              disabled={!newMilestoneLabel.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Add Milestone
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddMilestone(true)}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-600 hover:border-purple-500 text-gray-400 hover:text-purple-400 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Add Custom Milestone</span>
        </button>
      )}

      <div className="p-4 bg-dark-200/50 rounded-xl border border-dark-300">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Quick Time Adjustments</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-2">Registration Period</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '1 Week', days: 7 },
                { label: '2 Weeks', days: 14 },
                { label: '1 Month', days: 30 }
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const regEnd = new Date(now.getTime() + preset.days * 24 * 60 * 60 * 1000);
                    setRegistrationStartDate(now.toISOString().slice(0, 16));
                    setRegistrationEndDate(regEnd.toISOString().slice(0, 16));
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-dark-300 hover:bg-dark-100 rounded-lg transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Tournament Duration</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '1 Day', days: 1 },
                { label: '3 Days', days: 3 },
                { label: '1 Week', days: 7 }
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    const baseDate = registrationEndDate
                      ? new Date(new Date(registrationEndDate).getTime() + 24 * 60 * 60 * 1000)
                      : new Date();
                    const tournEnd = new Date(baseDate.getTime() + preset.days * 24 * 60 * 60 * 1000);
                    setStartDate(baseDate.toISOString().slice(0, 16));
                    setEndDate(tournEnd.toISOString().slice(0, 16));
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-dark-300 hover:bg-dark-100 rounded-lg transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTimeline;
