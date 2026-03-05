import React from 'react';
import { Video } from 'lucide-react';

interface ConfigToggleProps {
  label: string;
  description?: string;
  isActive: boolean;
  onChange: (isActive: boolean) => void;
  disabled?: boolean;
  contentLinkCount?: number;
  onManageContent?: () => void;
}

const ConfigToggle: React.FC<ConfigToggleProps> = ({
  label,
  description,
  isActive,
  onChange,
  disabled = false,
  contentLinkCount = 0,
  onManageContent,
}) => {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-dark-200 rounded-lg border border-dark-100">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-white truncate">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onManageContent && (
          <button
            onClick={onManageContent}
            className="relative p-1.5 rounded-md text-gray-500 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
            title="Manage linked content"
          >
            <Video className="h-4 w-4" />
            {contentLinkCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary-500 text-white text-[10px] font-bold px-1">
                {contentLinkCount}
              </span>
            )}
          </button>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          disabled={disabled}
          onClick={() => onChange(!isActive)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-300 ${
            isActive ? 'bg-primary-500' : 'bg-dark-100'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isActive ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default ConfigToggle;
