import React, { useState } from 'react';
import { X, AlertCircle, Activity } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import RubricMappingManager from './RubricMappingManager';
import GalaxyApiLogsViewer from './GalaxyApiLogsViewer';
import { ProjectConfiguration } from '../../types/projectConfig';

interface RubricMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectConfig: ProjectConfiguration;
}

const RubricMappingModal: React.FC<RubricMappingModalProps> = ({
  isOpen,
  onClose,
  projectConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'mappings' | 'logs'>('mappings');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rubric Mappings - ${projectConfig.config_name}`}
      size="5xl"
    >
      <div className="space-y-4">
        <div className="bg-dark-300 rounded-lg p-3 md:p-4 border border-dark-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs md:text-sm">
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
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-dark-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('mappings')}
            className={`px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-colors whitespace-nowrap ${
              activeTab === 'mappings'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Rubric Mappings
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Activity size={14} className="md:w-4 md:h-4" />
            API Logs
          </button>
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
        ) : (
          <>
            {activeTab === 'mappings' && (
              <RubricMappingManager
                projectConfigId={projectConfig.id}
                campaignId={projectConfig.campaign_id}
              />
            )}
            {activeTab === 'logs' && (
              <GalaxyApiLogsViewer
                campaignId={projectConfig.campaign_id}
                projectConfigId={projectConfig.id}
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
