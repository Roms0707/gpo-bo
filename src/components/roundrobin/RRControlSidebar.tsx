import React from 'react';
import Button from '../ui/Button';
import {
  ChevronLeft,
  Play,
  Edit3,
  RotateCcw,
  Settings,
  X,
  Trophy
} from 'lucide-react';

interface RRControlSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isDraftMode: boolean;
  tournament: any;
  isUpdatingBracketStatus: boolean;
  groupStageComplete: boolean;
  qualifiedCount: number;
  onPushBracketLive: () => void;
  onEditBracket: () => void;
  onResetDraft: () => void;
  onGenerateKnockout?: () => void;
  isGeneratingKnockout?: boolean;
}

const RRControlSidebar: React.FC<RRControlSidebarProps> = ({
  isOpen,
  onToggle,
  isDraftMode,
  tournament,
  isUpdatingBracketStatus,
  groupStageComplete,
  qualifiedCount,
  onPushBracketLive,
  onEditBracket,
  onResetDraft,
  onGenerateKnockout,
  isGeneratingKnockout
}) => {
  return (
    <>
      <div
        className={`fixed left-0 top-0 bottom-0 z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '320px' }}
      >
        <div className="h-full bg-dark-300 border-r border-gray-700 shadow-2xl flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center">
                <Settings className="h-5 w-5 mr-2 text-primary-400" />
                Bracket Controls
              </h2>
              <p className="text-xs text-gray-400 mt-1">Round Robin management</p>
            </div>
            <button
              onClick={onToggle}
              className="p-2 hover:bg-dark-200 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {isDraftMode && (
              <div className="bg-primary-900/20 border border-primary-500/30 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <div className="bg-primary-500 rounded-full p-1 mt-0.5">
                    <Edit3 className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-primary-200">Draft Mode Active</p>
                    <p className="text-xs text-gray-300 mt-1">
                      You can swap players and make changes before pushing live.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Bracket Management
              </h3>

              {isDraftMode ? (
                <>
                  <Button
                    onClick={onResetDraft}
                    variant="ghost"
                    className="w-full justify-start text-warning-400 hover:bg-warning-900/20 border border-warning-500/30"
                    leftIcon={<RotateCcw size={16} />}
                  >
                    Reset Draft
                  </Button>
                  <Button
                    onClick={onPushBracketLive}
                    isLoading={isUpdatingBracketStatus}
                    className="w-full justify-start bg-success-600 hover:bg-success-700 text-white"
                    leftIcon={<Play size={16} />}
                  >
                    Push Bracket Live
                  </Button>
                </>
              ) : (
                <Button
                  onClick={onEditBracket}
                  isLoading={isUpdatingBracketStatus}
                  variant="secondary"
                  className="w-full justify-start"
                  leftIcon={<Edit3 size={16} />}
                >
                  Edit Bracket
                </Button>
              )}
            </div>

            {groupStageComplete && qualifiedCount >= 2 && onGenerateKnockout && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Knockout Stage
                </h3>

                <div className="bg-success-900/20 border border-success-500/30 rounded-lg p-3 mb-3">
                  <p className="text-xs text-success-300">
                    Group stage complete! {qualifiedCount} participants qualified for knockout.
                  </p>
                </div>

                <Button
                  onClick={onGenerateKnockout}
                  isLoading={isGeneratingKnockout}
                  className="w-full justify-start bg-primary-600 hover:bg-primary-700 text-white"
                  leftIcon={<Trophy size={16} />}
                >
                  Generate Knockout Stage
                </Button>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-700 bg-dark-400">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Tournament Status</span>
              <span className={`font-medium ${
                tournament?.bracket_status === 'live' ? 'text-success-400' : 'text-warning-400'
              }`}>
                {tournament?.bracket_status === 'live' ? 'Live' : 'Draft'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onToggle}
        className={`fixed z-40 bg-dark-300 border border-gray-700 shadow-lg transition-all duration-300 ease-in-out hover:bg-dark-200 ${
          isOpen
            ? 'left-[320px] top-4 rounded-r-lg'
            : 'left-0 top-1/2 -translate-y-1/2 rounded-r-lg'
        }`}
      >
        {isOpen ? (
          <ChevronLeft className="h-6 w-6 text-gray-400 m-2" />
        ) : (
          <div className="flex items-center py-3 px-2">
            <ChevronLeft className="h-5 w-5 text-gray-400 rotate-180" />
            <span className="text-xs text-gray-400 ml-1 writing-mode-vertical">Controls</span>
          </div>
        )}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default RRControlSidebar;
