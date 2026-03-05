import { createContext, useContext, useEffect, ReactNode } from 'react';
import { ProjectConfiguration } from '../services/projectConfigService';
import { useProjectConfig } from '../hooks/useProjectConfig';
import { updateFavicon } from '../utils/favicon';

interface ProjectConfigContextValue {
  config: ProjectConfiguration | null;
  loading: boolean;
  error: Error | null;
  refreshConfig: () => Promise<void>;
}

const ProjectConfigContext = createContext<ProjectConfigContextValue | undefined>(undefined);

interface ProjectConfigProviderProps {
  children: ReactNode;
}

export function ProjectConfigProvider({ children }: ProjectConfigProviderProps) {
  const { config, loading, error, refreshConfig } = useProjectConfig();

  useEffect(() => {
    if (!config) return;

    document.title = config.brand_name;

    updateFavicon(config.favicon_path);

    const root = document.documentElement;
    root.style.setProperty('--color-primary', config.primary_color);
    root.style.setProperty('--color-secondary', config.secondary_color);

    console.log('[ProjectConfigContext] Applied configuration:', config.config_name);
  }, [config]);

  return (
    <ProjectConfigContext.Provider value={{ config, loading, error, refreshConfig }}>
      {children}
    </ProjectConfigContext.Provider>
  );
}

export function useProjectConfigContext() {
  const context = useContext(ProjectConfigContext);
  if (context === undefined) {
    throw new Error('useProjectConfigContext must be used within ProjectConfigProvider');
  }
  return context;
}
