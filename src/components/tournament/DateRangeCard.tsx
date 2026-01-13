import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, X, Trash2, ArrowRight } from 'lucide-react';
import DateRangePicker from './DateRangePicker';

interface DateRangeCardProps {
  id: string;
  label: string;
  sublabel: string;
  startDate: string;
  endDate: string;
  onRangeChange: (startDate: string, endDate: string) => void;
  startLabel: string;
  endLabel: string;
  required: boolean;
  color: string;
  isFirst: boolean;
  isLast: boolean;
  hasError: boolean;
  errorMessage?: string;
  minDate?: string;
  durationLabel?: string;
  isCustom?: boolean;
  onDelete?: () => void;
}

const DateRangeCard: React.FC<DateRangeCardProps> = ({
  label,
  sublabel,
  startDate,
  endDate,
  onRangeChange,
  startLabel,
  endLabel,
  required,
  color,
  isFirst,
  isLast,
  hasError,
  errorMessage,
  minDate,
  durationLabel,
  isCustom = false,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDateDisplay = (dateString: string): string => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (): string | undefined => {
    if (!startDate || !endDate) return undefined;
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
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

  const getColorClasses = () => {
    if (hasError) {
      return {
        dot: 'bg-red-500',
        line: 'bg-red-500/30',
        border: 'border-red-500/50',
        bg: 'bg-red-500/5',
        text: 'text-red-400',
        badge: 'bg-red-500/20 text-red-400',
        startBadge: 'bg-red-500/20 text-red-400',
        endBadge: 'bg-red-500/20 text-red-400'
      };
    }

    const colors: Record<string, { dot: string; line: string; border: string; bg: string; text: string; badge: string; startBadge: string; endBadge: string }> = {
      emerald: {
        dot: 'bg-emerald-500',
        line: 'bg-emerald-500/30',
        border: 'border-emerald-500/50',
        bg: 'bg-emerald-500/5',
        text: 'text-emerald-400',
        badge: 'bg-emerald-500/20 text-emerald-400',
        startBadge: 'bg-emerald-500/20 text-emerald-400',
        endBadge: 'bg-amber-500/20 text-amber-400'
      },
      blue: {
        dot: 'bg-blue-500',
        line: 'bg-blue-500/30',
        border: 'border-blue-500/50',
        bg: 'bg-blue-500/5',
        text: 'text-blue-400',
        badge: 'bg-blue-500/20 text-blue-400',
        startBadge: 'bg-blue-500/20 text-blue-400',
        endBadge: 'bg-rose-500/20 text-rose-400'
      },
      cyan: {
        dot: 'bg-cyan-500',
        line: 'bg-cyan-500/30',
        border: 'border-cyan-500/50',
        bg: 'bg-cyan-500/5',
        text: 'text-cyan-400',
        badge: 'bg-cyan-500/20 text-cyan-400',
        startBadge: 'bg-cyan-500/20 text-cyan-400',
        endBadge: 'bg-cyan-500/20 text-cyan-400'
      }
    };

    return colors[color] || colors.blue;
  };

  const colorClasses = getColorClasses();
  const duration = calculateDuration();
  const hasValues = startDate && endDate;

  const handleClear = () => {
    onRangeChange('', '');
    setIsExpanded(false);
  };

  return (
    <div className="relative">
      {durationLabel && !isFirst && (
        <div className="flex items-center gap-2 ml-4 mb-2">
          <div className={`w-0.5 h-6 ${colorClasses.line}`} />
          <span className="text-xs text-gray-500 bg-dark-300 px-2 py-0.5 rounded-full">
            {durationLabel}
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className={`
            w-4 h-4 rounded-full flex-shrink-0 transition-all duration-200
            ${hasValues ? colorClasses.dot : 'bg-dark-200 border-2 border-dashed border-gray-600'}
            ${required && !hasValues ? 'ring-2 ring-red-500/50 ring-offset-2 ring-offset-dark-300' : ''}
          `} />
          {!isLast && (
            <div className={`w-0.5 flex-1 mt-2 ${hasValues ? colorClasses.line : 'bg-dark-200'}`} />
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
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${hasValues ? colorClasses.text : 'text-white'}`}>
                      {label}
                      {required && <span className="text-red-400 ml-1">*</span>}
                    </h4>
                    {isCustom && (
                      <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full">
                        Custom
                      </span>
                    )}
                    {duration && (
                      <span className="text-xs px-2 py-0.5 bg-dark-200 text-gray-400 rounded-full">
                        {duration}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{sublabel}</p>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <div className={`
                      inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                      ${startDate ? colorClasses.startBadge : 'bg-dark-200 text-gray-400'}
                    `}>
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs text-gray-500 mr-1">{startLabel}:</span>
                      <span>{formatDateDisplay(startDate)}</span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-gray-500" />

                    <div className={`
                      inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                      ${endDate ? colorClasses.endBadge : 'bg-dark-200 text-gray-400'}
                    `}>
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs text-gray-500 mr-1">{endLabel}:</span>
                      <span>{formatDateDisplay(endDate)}</span>
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
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onRangeChange={(start, end) => {
                    onRangeChange(start, end);
                    setIsExpanded(false);
                  }}
                  onClose={() => setIsExpanded(false)}
                  minDate={minDate}
                  startLabel={startLabel}
                  endLabel={endLabel}
                />

                {hasValues && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-red-400 bg-dark-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear Dates
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

export default DateRangeCard;
