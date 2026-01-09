import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface InlineDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  minDate?: string;
}

const InlineDatePicker: React.FC<InlineDatePickerProps> = ({
  value,
  onChange,
  onClose,
  minDate
}) => {
  const currentDate = value ? new Date(value) : new Date();
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth());
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);
  const [selectedHour, setSelectedHour] = useState(value ? new Date(value).getHours() : 12);
  const [selectedMinute, setSelectedMinute] = useState(value ? new Date(value).getMinutes() : 0);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(viewYear, viewMonth, i));
    }

    return days;
  }, [viewMonth, viewYear]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      const finalDate = new Date(selectedDate);
      finalDate.setHours(selectedHour, selectedMinute, 0, 0);
      onChange(finalDate.toISOString().slice(0, 16));
      onClose();
    }
  };

  const isDateDisabled = (date: Date): boolean => {
    if (!minDate) return false;
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < min;
  };

  const isSelectedDate = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="bg-dark-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-2 hover:bg-dark-300 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>
        <span className="text-sm font-medium text-white">
          {monthNames[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-2 hover:bg-dark-300 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((day) => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-xs font-medium text-gray-500"
          >
            {day}
          </div>
        ))}

        {daysInMonth.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-8" />;
          }

          const disabled = isDateDisabled(date);
          const selected = isSelectedDate(date);
          const today = isToday(date);

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => !disabled && handleDateSelect(date)}
              disabled={disabled}
              className={`
                h-8 w-8 flex items-center justify-center rounded-lg text-sm transition-all
                ${disabled
                  ? 'text-gray-600 cursor-not-allowed'
                  : selected
                    ? 'bg-primary-500 text-white font-medium'
                    : today
                      ? 'bg-dark-300 text-primary-400 font-medium hover:bg-primary-500/20'
                      : 'text-gray-300 hover:bg-dark-300'
                }
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="border-t border-dark-300 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Time</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(parseInt(e.target.value))}
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
              value={selectedMinute}
              onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
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
          disabled={!selectedDate}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  );
};

export default InlineDatePicker;
