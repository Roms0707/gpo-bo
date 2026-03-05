import React from 'react';
import { GalaxyRubricMapping, ContentCategory } from '../../types/galaxyRubricMapping';
import RubricBrowser from './RubricBrowser';
import { Layers } from 'lucide-react';

interface ProjectMappingsTabProps {
  projectConfigId: string;
  campaignId: string;
  countryCode?: string | null;
  languageCode?: string | null;
  contentCategory: ContentCategory;
  allMappings: GalaxyRubricMapping[];
  onMappingsChange: () => Promise<void>;
}

const ProjectMappingsTab: React.FC<ProjectMappingsTabProps> = ({
  projectConfigId,
  campaignId,
  countryCode,
  languageCode,
  contentCategory,
  allMappings,
  onMappingsChange,
}) => {
  return (
    <div className="flex flex-col h-[600px] bg-dark-400 rounded-lg border border-dark-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-dark-200 bg-dark-300/50">
        <div className="w-9 h-9 rounded-md bg-dark-200 flex items-center justify-center flex-shrink-0">
          <Layers size={18} className="text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">Project-Level Rubrics</h3>
          <p className="text-xs text-gray-500">Mapped to the project config, not tied to a specific game</p>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        <RubricBrowser
          key={`project-${contentCategory}`}
          projectConfigId={projectConfigId}
          campaignId={campaignId}
          countryCode={countryCode}
          languageCode={languageCode}
          scope="project"
          gameId={null}
          contentCategory={contentCategory}
          mappings={allMappings}
          onMappingsChange={onMappingsChange}
        />
      </div>
    </div>
  );
};

export default ProjectMappingsTab;
