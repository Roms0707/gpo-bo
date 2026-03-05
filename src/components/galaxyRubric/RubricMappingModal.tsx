import React, { useState } from 'react';
import { X, AlertCircle, Gamepad2, Layers, Lightbulb, GraduationCap, Flame, FileText } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import GameMappingsTab from './GameMappingsTab';
import ProjectMappingsTab from './ProjectMappingsTab';
import { useRubricMappingData } from './useRubricMappingData';
import { ProjectConfiguration } from '../../types/projectConfig';
import { ContentCategory, CONTENT_CATEGORIES } from '../../types/galaxyRubricMapping';

interface RubricMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectConfig: ProjectConfiguration;
}

type ScopeTab = 'games' | 'project';

const CATEGORY_ICONS: Record<ContentCategory, React.ReactNode> = {
  tips: <Lightbulb size={14} className="md:w-4 md:h-4" />,
  masterclass: <GraduationCap size={14} className="md:w-4 md:h-4" />,
  grind_zone: <Flame size={14} className="md:w-4 md:h-4" />,
  article: <FileText size={14} className="md:w-4 md:h-4" />,
};

const RubricMappingModal: React.FC<RubricMappingModalProps> = ({
  isOpen,
  onClose,
  projectConfig,
}) => {
  const [scopeTab, setScopeTab] = useState<ScopeTab>('games');

  const data = useRubricMappingData(projectConfig.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rubric Mappings - ${projectConfig.config_name}`}
      size="full"
      maxWidth="max-w-7xl"
    >
      <div className="space-y-4">
        <div className="bg-dark-300 rounded-lg p-3 md:p-4 border border-dark-200">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs md:text-sm">
            <div>
              <span className="text-gray-400">Config ID:</span>
              <p className="text-white font-mono text-xs truncate">{projectConfig.config_id}</p>
            </div>
            <div>
              <span className="text-gray-400">Brand:</span>
              <p className="text-white truncate">{projectConfig.brand_name}</p>
            </div>
            <div>
              <span className="text-gray-400">Campaign ID:</span>
              <p className="text-white font-mono text-xs truncate">
                {projectConfig.campaign_id || (
                  <span className="text-warning-500">Not configured</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Product ID:</span>
              <p className="text-white font-mono text-xs truncate">
                {projectConfig.product_id || '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Country:</span>
              <p className="text-white font-mono text-xs truncate">
                {projectConfig.country_code || (
                  <span className="text-gray-500">-</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Language:</span>
              <p className="text-white font-mono text-xs truncate">
                {projectConfig.language_code || (
                  <span className="text-gray-500">-</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-dark-200 overflow-x-auto">
          {CONTENT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => data.setContentCategory(cat.id)}
              className={`px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                data.contentCategory === cat.id
                  ? 'text-primary-500 border-b-2 border-primary-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {CATEGORY_ICONS[cat.id]}
              {cat.label}
              {data.categoryCounts[cat.id] > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold leading-none rounded-full bg-dark-200 text-gray-300">
                  {data.categoryCounts[cat.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {!projectConfig.campaign_id ? (
          <div className="bg-warning-500/10 border border-warning-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="flex-shrink-0 text-warning-500 mt-0.5" size={20} />
              <div>
                <p className="text-warning-500 font-medium">Campaign ID Required</p>
                <p className="text-gray-300 text-sm mt-1">
                  This project configuration does not have a campaign ID configured. Please add
                  a campaign ID to enable rubric mapping functionality.
                </p>
              </div>
            </div>
          </div>
        ) : data.isInitialLoading ? (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-0">
              <button
                onClick={() => setScopeTab('games')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  scopeTab === 'games'
                    ? 'bg-dark-200 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-dark-300'
                }`}
              >
                <Gamepad2 size={13} />
                Game Mappings
                {data.gameMappingCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold leading-none rounded-full bg-dark-100 text-gray-300">
                    {data.gameMappingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setScopeTab('project')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  scopeTab === 'project'
                    ? 'bg-dark-200 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-dark-300'
                }`}
              >
                <Layers size={13} />
                Project Mappings
                {data.projectMappingCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold leading-none rounded-full bg-dark-100 text-gray-300">
                    {data.projectMappingCount}
                  </span>
                )}
              </button>
            </div>

            {scopeTab === 'games' && (
              <GameMappingsTab
                projectConfigId={projectConfig.id}
                campaignId={projectConfig.campaign_id}
                countryCode={projectConfig.country_code}
                languageCode={projectConfig.language_code}
                contentCategory={data.contentCategory}
                allGames={data.allGames}
                linkedGames={data.linkedGames}
                allMappings={data.filteredMappings}
                linkedGameIds={data.linkedGameIds}
                isLinking={data.isLinking}
                showLinkPopover={data.showLinkPopover}
                setShowLinkPopover={data.setShowLinkPopover}
                onLinkGame={data.handleLinkGame}
                onUnlinkGame={data.handleUnlinkGame}
                onReorder={data.handleReorder}
                onMappingsChange={data.handleMappingsChange}
                selectedGame={data.selectedGame}
                onSelectGame={data.setSelectedGame}
              />
            )}
            {scopeTab === 'project' && (
              <ProjectMappingsTab
                projectConfigId={projectConfig.id}
                campaignId={projectConfig.campaign_id}
                countryCode={projectConfig.country_code}
                languageCode={projectConfig.language_code}
                contentCategory={data.contentCategory}
                allMappings={data.filteredMappings}
                onMappingsChange={data.handleMappingsChange}
              />
            )}
          </>
        )}

        <div className="flex justify-end pt-3 md:pt-4 border-t border-dark-200">
          <Button onClick={onClose} leftIcon={<X size={16} />} size="sm">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RubricMappingModal;
