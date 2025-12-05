import React, { useState } from 'react';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { fetchConfigurationByDomain, fetchDefaultConfiguration, ProjectConfiguration } from '../../services/projectConfigService';
import { normalizeDomain } from '../../utils/domainValidation';
import toast from 'react-hot-toast';

export default function DomainTestTool() {
  const [testDomain, setTestDomain] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    found: boolean;
    config: ProjectConfiguration | null;
    isDefault: boolean;
  } | null>(null);

  const handleTest = async () => {
    if (!testDomain.trim()) {
      toast.error('Please enter a domain to test');
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const normalized = normalizeDomain(testDomain.trim());
      const domainResult = await fetchConfigurationByDomain(normalized);

      if (domainResult.error) {
        throw domainResult.error;
      }

      if (domainResult.data) {
        setResult({
          found: true,
          config: domainResult.data,
          isDefault: false,
        });
      } else {
        const defaultResult = await fetchDefaultConfiguration();
        if (defaultResult.data) {
          setResult({
            found: true,
            config: defaultResult.data,
            isDefault: true,
          });
        } else {
          setResult({
            found: false,
            config: null,
            isDefault: false,
          });
        }
      }
    } catch (error) {
      console.error('Error testing domain:', error);
      toast.error('Failed to test domain');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Test Domain Routing
          </h2>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Test which configuration would be loaded for a given domain.
        </p>

        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <Input
              placeholder="partner-a.example.com"
              value={testDomain}
              onChange={(e) => setTestDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTest();
                }
              }}
            />
          </div>
          <Button
            onClick={handleTest}
            isLoading={testing}
            leftIcon={<Search size={16} />}
          >
            Test
          </Button>
        </div>

        {result && (
          <div className="border border-gray-200 dark:border-dark-200 rounded-lg p-4 bg-gray-50 dark:bg-dark-400">
            {result.found ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={20} className="text-success-500" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Configuration Found
                  </span>
                  {result.isDefault && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                      Fallback to Default
                    </span>
                  )}
                </div>

                {result.config && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Config Name
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {result.config.config_name}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Brand Name
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {result.config.brand_name}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Domain
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {result.config.domain || (result.config.is_default ? 'Default' : 'None')}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Status
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {result.config.is_active ? (
                            <span className="text-success-500">Active</span>
                          ) : (
                            <span className="text-error-500">Inactive</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Logo Preview
                      </div>
                      <img
                        src={result.config.logo_path}
                        alt={result.config.logo_alt_text}
                        className="h-12 w-auto object-contain"
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Colors
                      </div>
                      <div className="flex gap-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded border border-gray-300 dark:border-dark-200"
                            style={{ backgroundColor: result.config.primary_color }}
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Primary: {result.config.primary_color}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded border border-gray-300 dark:border-dark-200"
                            style={{ backgroundColor: result.config.secondary_color }}
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Secondary: {result.config.secondary_color}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle size={20} className="text-error-500" />
                <span className="font-medium text-gray-900 dark:text-white">
                  No configuration found for this domain and no default configuration exists
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
