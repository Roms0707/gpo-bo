import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, X, Trash2, GripVertical } from 'lucide-react';
import InlineDatePicker from './InlineDatePicker';

interface MilestoneCardProps {
  id: string;
  label: string;
  sublabel: string;
  value: string;
  onChange: (value: string) => void;
  required: boolean;
  color: string;
  isFirst: boolean;
  isLast: boolean;
  hasError: boolean;
  errorMessage?: string;
  minDate?: string;
  durationFromPrevious?: string;
  isCustom?: boolean;
  onDelete?: () => void;
  isDraggable?: boolean;
}

const MilestoneCard: React.FC<MilestoneCardProps> = ({
  id,
  label,
  sublabel,
  value,
  onChange,
  required,
  color,
  isFirst,
  isLast,
  hasError,
  errorMessage,
  minDate,
  durationFromPrevious,
  isCustom = false,
  onDelete,
  isDraggable = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDateDisplay = (dateString: string): string => {
    if (!dateString) return 'Click to set date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getColorClasses = () => {
    if (hasError) {
      return {
        dot: 'bg-red-500',
        line: 'bg-red-500/30',
        border: 'border-red-500/50',
        bg: 'bg-red-500/5',
        text: 'text-red-400',
        badge: 'bg-red-500/20 text-red-400'
      };
    }

    const colors: Record<string, { dot: string; line: string; border: string; bg: string; text: string; badge: string }> = {
      emerald: {
        dot: 'bg-emerald-500',
        line: 'bg-emerald-500/30',
        border: 'border-emerald-500/50',
        bg: 'bg-emerald-500/5',
        text: 'text-emerald-400',
        badge: 'bg-emerald-500/20 text-emerald-400'
      },
      amber: {
        dot: 'bg-amber-500',
        line: 'bg-amber-500/30',
        border: 'border-amber-500/50',
        bg: 'bg-amber-500/5',
        text: 'text-amber-400',
        badge: 'bg-amber-500/20 text-amber-400'
      },
      blue: {
        dot: 'bg-blue-500',
        line: 'bg-blue-500/30',
        border: 'border-blue-500/50',
        bg: 'bg-blue-500/5',
        text: 'text-blue-400',
        badge: 'bg-blue-500/20 text-blue-400'
      },
      rose: {
        dot: 'bg-rose-500',
        line: 'bg-rose-500/30',
        border: 'border-rose-500/50',
        bg: 'bg-rose-500/5',
        text: 'text-rose-400',
        badge: 'bg-rose-500/20 text-rose-400'
      },
      purple: {
        dot: 'bg-purple-500',
        line: 'bg-purple-500/30',
        border: 'border-purple-500/50',
        bg: 'bg-purple-500/5',
        text: 'text-purple-400',
        badge: 'bg-purple-500/20 text-purple-400'
      }
    };

    return colors[color] || colors.blue;
  };

  const colorClasses = getColorClasses();

  const handleClear = () => {
    onChange('');
    setIsExpanded(false);
  };

  return (
    <div className="relative">
      {durationFromPrevious && !isFirst && (
        <div className="flex items-center gap-2 ml-4 mb-2">
          <div className={`w-0.5 h-6 ${colorClasses.line}`} />
          <span className="text-xs text-gray-500 bg-dark-300 px-2 py-0.5 rounded-full">
            {durationFromPrevious}
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className={`
            w-4 h-4 rounded-full flex-shrink-0 transition-all duration-200
            ${value ? colorClasses.dot : 'bg-dark-200 border-2 border-dashed border-gray-600'}
            ${required && !value ? 'ring-2 ring-red-500/50 ring-offset-2 ring-offset-dark-300' : ''}
          `} />
          {!isLast && (
            <div className={`w-0.5 flex-1 mt-2 ${value ? colorClasses.line : 'bg-dark-200'}`} />
          )}
        </div>

        <div className="flex-1 pb-4">
          <div
            className={`
              rounded-xl border transition-all duration-200 overflow-hidden
              ${isExpanded
                ? `${colorClasses.border} ${colorClasses.bg}`
                : 'border-dark-200 hover:border-gray-600 bg-dark-300/50'
              }
              ${hasError ? 'border-red-500/50' : ''}
            `}
          >
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {isDraggable && (
                    <GripVertical className="w-4 h-4 text-gray-500 mt-1 cursor-grab" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`font-medium ${value ? colorClasses.text : 'text-white'}`}>
                        {label}
                        {required && <span className="text-red-400 ml-1">*</span>}
                      </h4>
                      {isCustom && (
                        <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{sublabel}</p>

                    <div className={`
                      mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                      ${value ? colorClasses.badge : 'bg-dark-200 text-gray-400'}
                    `}>
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateDisplay(value)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCustom && onDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-dark-200' : ''}`}>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3">
                <InlineDatePicker
                  value={value}
                  onChange={(newValue) => {
                    onChange(newValue);
                    setIsExpanded(false);
                  }}
                  onClose={() => setIsExpanded(false)}
                  minDate={minDate}
                />

                {value && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-red-400 bg-dark-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear Date
                  </button>
                )}
              </div>
            )}
          </div>

          {hasError && errorMessage && (
            <p className="mt-2 text-xs text-red-400">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MilestoneCard;
