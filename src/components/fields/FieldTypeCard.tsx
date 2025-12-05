import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FieldTypeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  example?: string;
  value: string;
  selected: boolean;
  onClick: () => void;
}

const FieldTypeCard: React.FC<FieldTypeCardProps> = ({
  icon: Icon,
  title,
  description,
  example,
  value,
  selected,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative w-full p-4 rounded-lg border-2 text-left transition-all
        ${selected
          ? 'border-primary-500 bg-primary-500/10 shadow-md'
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-200 hover:border-primary-400 dark:hover:border-primary-400 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-start space-x-3">
        <div className={`
          flex-shrink-0 p-2 rounded-md
          ${selected
            ? 'bg-primary-500 text-white'
            : 'bg-gray-100 dark:bg-dark-300 text-gray-600 dark:text-gray-400'
          }
        `}>
          <Icon size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={`
            text-sm font-semibold mb-1
            ${selected
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-900 dark:text-white'
            }
          `}>
            {title}
          </h4>

          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            {description}
          </p>

          {example && (
            <p className="text-xs text-gray-500 dark:text-gray-500 italic">
              Example: {example}
            </p>
          )}
        </div>
      </div>

      {selected && (
        <div className="absolute top-2 right-2">
          <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
};

export default FieldTypeCard;
