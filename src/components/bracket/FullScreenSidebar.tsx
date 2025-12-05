import React from 'react';
import Button from '../ui/Button';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Edit3,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Wrench,
  Clock,
  Settings
} from 'lucide-react';
import RoundTimerConfig from './RoundTimerConfig';
import { RoundTimer } from '../../services/roundTimerService';

interface FullScreenSidebarProps {
  isOpen: boolean;
  isDraftMode: boolean;
  tournament: any;
  byesByRound: Map<number, any[]>;
  roundTimers: RoundTimer[];
  canResetBrackets: boolean;
  isUpdatingBracketStatus: boolean;
  isRepairingByes: boolean;
  onToggleSidebar: () => void;
  onPushBracketLive: () => void;
  onEditBracket: () => void;
  onResetDraft: () => void;
  onShowByePanel: () => void;
  onRepairByes: () => void;
  onResetBracket: () => void;
  onLoadTimers: () => void;
  tournamentId: string;
}

const FullScreenSidebar: React.FC<FullScreenSidebarProps> = ({
  isOpen,
  isDraftMode,
  tournament,
  byesByRound,
  roundTimers,
  canResetBrackets,
  isUpdatingBracketStatus,
  isRepairingByes,
  onToggleSidebar,
  onPushBracketLive,
  onEditBracket,
  onResetDraft,
  onShowByePanel,
  onRepairByes,
  onResetBracket,
  onLoadTimers,
  tournamentId
}) => {
  const totalByes = Array.from(byesByRound.values()).reduce((acc, matches) => acc + matches.length, 0);
  const hasProblematicByes = Array.from(byesByRound.keys()).some(round => round > 1);

  return (
    <>
      <div
        className={`fixed left-0 top-[60px] bottom-0 bg-dark-300 border-r border-gray-700 shadow-2xl transition-transform duration-300 ease-in-out z-20 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '320px' }}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white flex items-center">
              <Settings className="h-5 w-5 mr-2 text-primary-400" />
              Bracket Controls
            </h2>
            <p className="text-xs text-gray-400 mt-1">Quick actions and configurations</p>
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
                      You can reorganize matches and make changes before pushing live.
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

            {totalByes > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  BYE Management
                </h3>

                <Button
                  onClick={onShowByePanel}
                  variant="ghost"
                  className={`w-full justify-start ${
                    hasProblematicByes
                      ? 'text-orange-400 hover:bg-orange-900/20 border border-orange-500/30'
                      : 'text-green-400 hover:bg-green-900/20 border border-green-500/30'
                  }`}
                  leftIcon={<AlertTriangle size={16} />}
                >
                  View BYE Details ({totalByes})
                  {hasProblematicByes && (
                    <span className="ml-auto h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
                  )}
                </Button>

                {hasProblematicByes && (
                  <Button
                    onClick={onRepairByes}
                    isLoading={isRepairingByes}
                    variant="ghost"
                    className="w-full justify-start text-blue-400 hover:bg-blue-900/20 border border-blue-500/30"
                    leftIcon={<Wrench size={16} />}
                  >
                    Repair BYE Issues
                  </Button>
                )}
              </div>
            )}

            {isDraftMode && roundTimers.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Round Timer Configuration
                </h3>

                <div className="bg-dark-200 rounded-lg p-3">
                  <RoundTimerConfig
                    timers={roundTimers}
                    totalRounds={Math.max(...roundTimers.map(t => t.round_number))}
                    onTimersUpdated={onLoadTimers}
                  />
                </div>
              </div>
            )}

            {canResetBrackets && (
              <div className="space-y-3 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Danger Zone
                </h3>

                <Button
                  onClick={onResetBracket}
                  variant="ghost"
                  className="w-full justify-start text-error-400 hover:bg-error-900/20 border border-error-500/30"
                  leftIcon={<Trash2 size={16} />}
                >
                  Reset Bracket
                </Button>

                <p className="text-xs text-gray-500 px-2">
                  This will permanently delete all bracket data and cannot be undone.
                </p>
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

      {isOpen && (
        <div
          className="fixed top-[60px] left-[320px] z-30 bg-dark-300 border border-gray-700 rounded-r-lg shadow-lg cursor-pointer hover:bg-dark-200 transition-colors"
          onClick={onToggleSidebar}
        >
          <ChevronLeft className="h-6 w-6 text-gray-400 m-1" />
        </div>
      )}

      {!isOpen && (
        <div
          className="fixed top-[60px] left-0 z-30 bg-dark-300 border border-gray-700 rounded-r-lg shadow-lg cursor-pointer hover:bg-dark-200 transition-colors"
          onClick={onToggleSidebar}
        >
          <ChevronRight className="h-6 w-6 text-gray-400 m-1" />
        </div>
      )}
    </>
  );
};

export default FullScreenSidebar;
