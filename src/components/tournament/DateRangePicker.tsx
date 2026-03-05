import React, { useEffect, useRef, useState } from 'react';
import Litepicker from 'litepicker';
import { Clock } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onRangeChange: (startDate: string, endDate: string) => void;
  onClose: () => void;
  minDate?: string;
  startLabel?: string;
  endLabel?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onRangeChange,
  onClose,
  minDate,
  startLabel = 'Start',
  endLabel = 'End'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<Litepicker | null>(null);

  const parseTime = (dateStr: string) => {
    if (!dateStr) return { hour: 12, minute: 0 };
    const date = new Date(dateStr);
    return { hour: date.getHours(), minute: date.getMinutes() };
  };

  const [startTime, setStartTime] = useState(parseTime(startDate));
  const [endTime, setEndTime] = useState(parseTime(endDate));
  const [selectedStart, setSelectedStart] = useState<Date | null>(startDate ? new Date(startDate) : null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(endDate ? new Date(endDate) : null);

  useEffect(() => {
    if (!containerRef.current) return;

    pickerRef.current = new Litepicker({
      element: containerRef.current,
      inlineMode: true,
      singleMode: false,
      numberOfMonths: 1,
      numberOfColumns: 1,
      showTooltip: true,
      minDate: minDate ? new Date(minDate) : undefined,
      startDate: selectedStart || undefined,
      endDate: selectedEnd || undefined,
      buttonText: {
        previousMonth: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
        nextMonth: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>'
      },
      setup: (picker) => {
        picker.on('selected', (start, end) => {
          setSelectedStart(start ? start.dateInstance : null);
          setSelectedEnd(end ? end.dateInstance : null);
        });
      }
    });

    return () => {
      if (pickerRef.current) {
        pickerRef.current.destroy();
      }
    };
  }, [minDate]);

  const handleConfirm = () => {
    if (selectedStart && selectedEnd) {
      const finalStart = new Date(selectedStart);
      finalStart.setHours(startTime.hour, startTime.minute, 0, 0);

      const finalEnd = new Date(selectedEnd);
      finalEnd.setHours(endTime.hour, endTime.minute, 0, 0);

      onRangeChange(
        finalStart.toISOString().slice(0, 16),
        finalEnd.toISOString().slice(0, 16)
      );
      onClose();
    }
  };

  const formatSelectedDate = (date: Date | null) => {
    if (!date) return 'Not selected';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-dark-200 rounded-xl p-4 space-y-4">
      <div className="litepicker-container" ref={containerRef} />

      <div className="border-t border-dark-300 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-400">{startLabel}</span>
              <span className="text-xs text-gray-500">{formatSelectedDate(selectedStart)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <select
                value={startTime.hour}
                onChange={(e) => setStartTime({ ...startTime, hour: parseInt(e.target.value) })}
                className="bg-dark-300 border border-dark-300 rounded-lg px-3 py-1.5 text-sm text-white focus:border-primary-500 focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
              <span className="text-gray-400">:</span>
              <select
                value={startTime.minute}
                onChange={(e) => setStartTime({ ...startTime, minute: parseInt(e.target.value) })}
                className="bg-dark-300 border border-dark-300 rounded-lg px-3 py-1.5 text-sm text-white focus:border-primary-500 focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                  <option key={minute} value={minute}>
                    {minute.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-rose-400">{endLabel}</span>
              <span className="text-xs text-gray-500">{formatSelectedDate(selectedEnd)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <select
                value={endTime.hour}
                onChange={(e) => setEndTime({ ...endTime, hour: parseInt(e.target.value) })}
                className="bg-dark-300 border border-dark-300 rounded-lg px-3 py-1.5 text-sm text-white focus:border-primary-500 focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
              <span className="text-gray-400">:</span>
              <select
                value={endTime.minute}
                onChange={(e) => setEndTime({ ...endTime, minute: parseInt(e.target.value) })}
                className="bg-dark-300 border border-dark-300 rounded-lg px-3 py-1.5 text-sm text-white focus:border-primary-500 focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                  <option key={minute} value={minute}>
                    {minute.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-dark-300 hover:bg-dark-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedStart || !selectedEnd}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  );
};

export default DateRangePicker;
