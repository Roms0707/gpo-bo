import { useState, useEffect, useCallback } from 'react';
import {
  ProjectConfiguration,
  fetchConfigurationByDomain,
  fetchDefaultConfiguration,
  fetchProjectConfigurationByConfigId,
} from '../services/projectConfigService';
import { getCurrentDomain } from '../utils/domainValidation';

interface UseProjectConfigReturn {
  config: ProjectConfiguration | null;
  loading: boolean;
  error: Error | null;
  detectedDomain: string | null;
  refreshConfig: () => Promise<void>;
}

export function useProjectConfig(): UseProjectConfigReturn {
  const [config, setConfig] = useState<ProjectConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [detectedDomain, setDetectedDomain] = useState<string | null>(null);

  const loadConfiguration = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const currentDomain = getCurrentDomain();
      setDetectedDomain(currentDomain);
      const isDev = currentDomain === 'localhost' || currentDomain === '127.0.0.1' || currentDomain.endsWith('.webcontainer.io') || currentDomain.endsWith('.local-credentialless.webcontainer.io');

      if (isDev) {
        console.log('[useProjectConfig] Development mode detected');
        console.log('[useProjectConfig] Current domain:', currentDomain);

        const urlParams = new URLSearchParams(window.location.search);
        const urlConfigId = urlParams.get('config');

        if (urlConfigId) {
          console.log('[useProjectConfig] Using config from URL parameter:', urlConfigId);
          const result = await fetchProjectConfigurationByConfigId(urlConfigId);
          if (result.data) {
            console.log('[useProjectConfig] Loaded config:', result.data.config_name);
            setConfig(result.data);
            return;
          } else {
            console.warn('[useProjectConfig] Config from URL not found, falling back');
          }
        }

        const envConfigId = import.meta.env.VITE_PROJECT_CONFIG_ID;
        if (envConfigId && envConfigId !== 'default') {
          console.log('[useProjectConfig] Using config from env variable:', envConfigId);
          const result = await fetchProjectConfigurationByConfigId(envConfigId);
          if (result.data) {
            console.log('[useProjectConfig] Loaded config:', result.data.config_name);
            setConfig(result.data);
            return;
          } else {
            console.warn('[useProjectConfig] Config from env not found, falling back to default');
          }
        }

        console.log('[useProjectConfig] Loading default configuration');
        const defaultResult = await fetchDefaultConfiguration();
        if (defaultResult.error) throw defaultResult.error;
        if (defaultResult.data) {
          console.log('[useProjectConfig] Loaded default config:', defaultResult.data.config_name);
          setConfig(defaultResult.data);
        } else {
          throw new Error('No default configuration found');
        }
      } else {
        console.log('[useProjectConfig] Production mode');
        console.log('[useProjectConfig] Looking up domain:', currentDomain);

        if (currentDomain) {
          const domainResult = await fetchConfigurationByDomain(currentDomain);
          if (domainResult.error) throw domainResult.error;

          if (domainResult.data) {
            console.log('[useProjectConfig] Loaded config for domain:', domainResult.data.config_name);
            setConfig(domainResult.data);
            return;
          }
        }

        console.log('[useProjectConfig] No domain match, loading default configuration');
        const defaultResult = await fetchDefaultConfiguration();
        if (defaultResult.error) throw defaultResult.error;
        if (defaultResult.data) {
          console.log('[useProjectConfig] Loaded default config:', defaultResult.data.config_name);
          setConfig(defaultResult.data);
        } else {
          throw new Error('No default configuration found and no domain match');
        }
      }
    } catch (err) {
      console.error('[useProjectConfig] Error loading configuration:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  const refreshConfig = useCallback(async () => {
    await loadConfiguration();
  }, [loadConfiguration]);

  return {
    config,
    loading,
    error,
    detectedDomain,
    refreshConfig,
  };
}
