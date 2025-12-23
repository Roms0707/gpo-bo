import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Settings,
  Bell,
  X,
  FastForward,
  RefreshCw
} from 'lucide-react';
import { RoundTimer } from '../../services/roundTimerService';
import { Match } from './types';

interface BracketControlSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isDraftMode: boolean;
  tournament: any;
  byesByRound: Map<number, Match[]>;
  roundTimers: RoundTimer[];
  canResetBrackets: boolean;
  isUpdatingBracketStatus: boolean;
  isRepairingByes: boolean;
  isRegeneratingBracket?: boolean;
  bracketAlreadyGenerated: boolean;
  activeTimer: RoundTimer | null;
  onPushBracketLive: () => void;
  onEditBracket: () => void;
  onResetDraft: () => void;
  onShowByePanel: () => void;
  onRepairByes: () => void;
  onResetBracket: () => void;
  onRegenerateBracket?: () => void;
  onLoadTimers: () => void;
  onInitializeTimers?: () => void;
  onResendNotifications?: () => void;
  onOpenTimerModal?: () => void;
  onForceProgression?: () => void;
  nextRoundTimer?: RoundTimer | null;
  currentRoundNumber?: number;
  totalRounds?: number;
  isForcingProgression?: boolean;
  matches: Match[];
}

const BracketControlSidebar: React.FC<BracketControlSidebarProps> = ({
  isOpen,
  onToggle,
  isDraftMode,
  tournament,
  byesByRound,
  roundTimers,
  canResetBrackets,
  isUpdatingBracketStatus,
  isRepairingByes,
  isRegeneratingBracket,
  bracketAlreadyGenerated,
  activeTimer,
  onPushBracketLive,
  onEditBracket,
  onResetDraft,
  onShowByePanel,
  onRepairByes,
  onResetBracket,
  onRegenerateBracket,
  onLoadTimers,
  onInitializeTimers,
  onResendNotifications,
  onOpenTimerModal,
  onForceProgression,
  nextRoundTimer,
  currentRoundNumber,
  totalRounds,
  isForcingProgression,
  matches
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const totalByes = Array.from(byesByRound.values()).reduce((acc, matches) => acc + matches.length, 0);
  const hasProblematicByes = Array.from(byesByRound.keys()).some(round => round > 1);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        className={`fixed left-64 top-0 bottom-0 z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '320px' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={sidebarRef}
          className="h-full bg-dark-300 border-r border-gray-700 shadow-2xl flex flex-col"
        >
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center">
                <Settings className="h-5 w-5 mr-2 text-primary-400" />
                Bracket Controls
              </h2>
              <p className="text-xs text-gray-400 mt-1">Quick actions and configurations</p>
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

              {!isDraftMode && activeTimer && onResendNotifications && (
                <Button
                  onClick={onResendNotifications}
                  variant="ghost"
                  className="w-full justify-start text-blue-400 hover:bg-blue-900/20 border border-blue-500/30"
                  leftIcon={<Bell size={16} />}
                >
                  Resend Notifications
                </Button>
              )}
            </div>

            {!isDraftMode && activeTimer && nextRoundTimer && onForceProgression && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Round Management
                </h3>

                <div className="bg-dark-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Current Round</span>
                    <span className="text-sm font-medium text-white">
                      {currentRoundNumber} / {totalRounds}
                    </span>
                  </div>
                  {activeTimer.end_time && (
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-400">Time Remaining</span>
                      <span className="text-sm font-medium text-primary-400">
                        {(() => {
                          const endTime = new Date(activeTimer.end_time).getTime();
                          const now = Date.now();
                          const remaining = Math.max(0, endTime - now);
                          const mins = Math.floor(remaining / 60000);
                          const secs = Math.floor((remaining % 60000) / 1000);
                          return `${mins}:${secs.toString().padStart(2, '0')}`;
                        })()}
                      </span>
                    </div>
                  )}
                  <Button
                    onClick={onForceProgression}
                    isLoading={isForcingProgression}
                    variant="ghost"
                    className="w-full justify-start text-orange-400 hover:bg-orange-900/20 border border-orange-500/30"
                    leftIcon={<FastForward size={16} />}
                  >
                    Force Round Progression
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Skip to Round {(currentRoundNumber || 0) + 1}. Incomplete matches will be forfeited.
                  </p>
                </div>
              </div>
            )}

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

            {isDraftMode && matches.length > 0 && roundTimers.length === 0 && onInitializeTimers && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Round Timers
                </h3>
                <Button
                  onClick={onInitializeTimers}
                  variant="ghost"
                  className="w-full justify-start text-blue-400 hover:bg-blue-900/20 border border-blue-500/30"
                  leftIcon={<Clock size={16} />}
                >
                  Initialize Timers
                </Button>
              </div>
            )}

            {isDraftMode && roundTimers.length > 0 && onOpenTimerModal && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Round Timers
                </h3>

                <div className="bg-dark-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-white font-medium">
                        {roundTimers.length} rounds
                      </p>
                      <p className="text-xs text-gray-400">
                        Total: {(() => {
                          const totalMinutes = roundTimers.reduce((sum, t) => sum + t.duration_minutes, 0);
                          const hours = Math.floor(totalMinutes / 60);
                          const mins = totalMinutes % 60;
                          if (hours > 0 && mins > 0) return `${hours}h ${mins}min`;
                          if (hours > 0) return `${hours}h`;
                          return `${mins}min`;
                        })()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onOpenTimerModal}
                    leftIcon={<Settings size={14} />}
                    className="w-full"
                  >
                    Configure Timers
                  </Button>
                </div>
              </div>
            )}

            {canResetBrackets && bracketAlreadyGenerated && (
              <div className="space-y-3 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-semibold text-error-400 uppercase tracking-wider">
                  Danger Zone
                </h3>

                {isDraftMode && onRegenerateBracket && (
                  <>
                    <Button
                      onClick={onRegenerateBracket}
                      isLoading={isRegeneratingBracket}
                      variant="ghost"
                      className="w-full justify-start text-orange-400 hover:bg-orange-900/20 border border-orange-500/30"
                      leftIcon={<RefreshCw size={16} />}
                    >
                      Regenerate Bracket
                    </Button>
                    <p className="text-xs text-gray-500 px-2">
                      Re-creates the bracket with correct power-of-2 structure and BYE distribution.
                    </p>
                  </>
                )}

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

      <button
        onClick={onToggle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed z-40 bg-dark-300 border border-gray-700 shadow-lg transition-all duration-300 ease-in-out hover:bg-dark-200 ${
          isOpen
            ? 'left-[calc(16rem+320px)] top-4 rounded-r-lg'
            : 'left-64 top-1/2 -translate-y-1/2 rounded-r-lg'
        }`}
      >
        {isOpen ? (
          <ChevronLeft className="h-6 w-6 text-gray-400 m-2" />
        ) : (
          <div className="flex items-center py-3 px-2">
            <ChevronRight className="h-5 w-5 text-gray-400" />
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

export default BracketControlSidebar;
