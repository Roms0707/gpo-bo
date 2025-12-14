import { useState, useEffect } from 'react';
import { Globe, Building2, ChevronDown, AlertCircle } from 'lucide-react';
import { fetchProjectConfigurations, ProjectConfiguration } from '../../services/projectConfigService';

interface ProjectConfigSelectorProps {
  value: string | null;
  onChange: (configId: string | null, configName: string | null) => void;
  disabled?: boolean;
  showWorldwideOption?: boolean;
  label?: string;
  helpText?: string;
  error?: string;
}

export function ProjectConfigSelector({
  value,
  onChange,
  disabled = false,
  showWorldwideOption = true,
  label = 'Project Configuration',
  helpText,
  error,
}: ProjectConfigSelectorProps) {
  const [configs, setConfigs] = useState<ProjectConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadConfigs = async () => {
      setLoading(true);
      const result = await fetchProjectConfigurations({ isActive: true });
      if (result.data) {
        setConfigs(result.data);
      }
      setLoading(false);
    };
    loadConfigs();
  }, []);

  const selectedConfig = value ? configs.find(c => c.config_id === value) : null;

  const handleSelect = (configId: string | null) => {
    const config = configId ? configs.find(c => c.config_id === configId) : null;
    onChange(configId, config?.config_name || null);
    setIsOpen(false);
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled || loading}
          className={`
            w-full flex items-center justify-between px-4 py-3 rounded-lg border
            transition-all duration-200 text-left
            ${disabled || loading
              ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
              : 'bg-white dark:bg-gray-900 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer'
            }
            ${error
              ? 'border-red-300 dark:border-red-600'
              : isOpen
                ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20'
                : 'border-gray-300 dark:border-gray-600'
            }
          `}
        >
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="animate-pulse flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded" />
                <div className="w-32 h-4 bg-gray-300 dark:bg-gray-600 rounded" />
              </div>
            ) : value === null ? (
              <>
                <Globe className="w-5 h-5 text-blue-500" />
                <span className="text-gray-900 dark:text-white font-medium">
                  Worldwide (All Projects)
                </span>
              </>
            ) : selectedConfig ? (
              <>
                <Building2 className="w-5 h-5 text-emerald-500" />
                <div className="flex flex-col">
                  <span className="text-gray-900 dark:text-white font-medium">
                    {selectedConfig.brand_name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedConfig.config_id}
                  </span>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">
                  Unknown Configuration ({value})
                </span>
              </>
            )}
          </div>

          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-200
              ${isOpen ? 'rotate-180' : ''}
            `}
          />
        </button>

        {isOpen && !disabled && !loading && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {showWorldwideOption && (
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left
                    transition-colors duration-150
                    ${value === null
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white'
                    }
                  `}
                >
                  <Globe className={`w-5 h-5 ${value === null ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div className="flex flex-col">
                    <span className="font-medium">Worldwide (All Projects)</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Tournament visible on all frontends
                    </span>
                  </div>
                </button>
              )}

              {configs.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-800">
                  {configs.map((config) => (
                    <button
                      key={config.config_id}
                      type="button"
                      onClick={() => handleSelect(config.config_id)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 text-left
                        transition-colors duration-150
                        ${value === config.config_id
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white'
                        }
                      `}
                    >
                      <Building2
                        className={`w-5 h-5 ${value === config.config_id ? 'text-emerald-500' : 'text-gray-400'}`}
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium truncate">{config.brand_name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {config.config_id} - {config.config_name}
                        </span>
                      </div>
                      {config.is_default && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                          Default
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {configs.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No active project configurations found
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {helpText && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}
