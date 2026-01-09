import React from 'react';
import { Brackets, Repeat, Shuffle, Crosshair } from 'lucide-react';

type TournamentFormat = 'Single Elimination' | 'Round Robin' | 'Swiss' | 'Battle Royale';

interface FormatOption {
  value: TournamentFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface TournamentFormatSelectorProps {
  selectedFormat: string;
  onFormatSelect: (format: TournamentFormat) => void;
}

const formatOptions: FormatOption[] = [
  {
    value: 'Single Elimination',
    label: 'Single Elimination',
    description: 'Classic bracket tournament',
    icon: <Brackets className="w-6 h-6" />
  },
  {
    value: 'Round Robin',
    label: 'Round Robin',
    description: 'Everyone plays everyone',
    icon: <Repeat className="w-6 h-6" />
  },
  {
    value: 'Swiss',
    label: 'Swiss System',
    description: 'Skill-based matchmaking',
    icon: <Shuffle className="w-6 h-6" />
  },
  {
    value: 'Battle Royale',
    label: 'Battle Royale',
    description: 'Placement-based scoring',
    icon: <Crosshair className="w-6 h-6" />
  }
];

const TournamentFormatSelector: React.FC<TournamentFormatSelectorProps> = ({
  selectedFormat,
  onFormatSelect
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {formatOptions.map((format) => {
        const isSelected = selectedFormat === format.value;

        return (
          <button
            key={format.value}
            type="button"
            onClick={() => onFormatSelect(format.value)}
            className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 ${
              isSelected
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                : 'border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-200 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md'
            }`}
          >
            <div className={`mb-2 p-2 rounded-lg transition-colors ${
              isSelected
                ? 'bg-primary-100 dark:bg-primary-800/30 text-primary-600 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400'
            }`}>
              {format.icon}
            </div>
            <span className={`text-sm font-semibold text-center leading-tight ${
              isSelected
                ? 'text-primary-700 dark:text-primary-300'
                : 'text-gray-800 dark:text-gray-200'
            }`}>
              {format.label}
            </span>
            <span className={`mt-1 text-xs text-center leading-tight ${
              isSelected
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {format.description}
            </span>
            {isSelected && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-500" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TournamentFormatSelector;
