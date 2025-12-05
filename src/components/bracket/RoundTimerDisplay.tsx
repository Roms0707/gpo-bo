import React, { useEffect, useState } from 'react';
import { Clock, Play, Pause, AlertCircle, FastForward } from 'lucide-react';
import {
  RoundTimer,
  getRemainingTimeForTimer,
  getTimerColorClass,
  getProgressBarColorClass,
  formatTime,
  RemainingTime
} from '../../services/roundTimerService';
import { getRoundName } from '../../services/roundNotificationService';
import ManualRoundProgressionButton from './ManualRoundProgressionButton';
import Button from '../ui/Button';

interface RoundTimerDisplayProps {
  timer: RoundTimer | null;
  totalRounds: number;
  onTimerExpired?: () => void;
  isCurrentRoundComplete?: boolean;
  nextRoundTimer?: RoundTimer | null;
  onManualProgression?: () => Promise<void>;
  onForceProgression?: () => void;
  compact?: boolean;
}

const RoundTimerDisplay: React.FC<RoundTimerDisplayProps> = ({
  timer,
  totalRounds,
  onTimerExpired,
  isCurrentRoundComplete = false,
  nextRoundTimer = null,
  onManualProgression,
  onForceProgression,
  compact = false
}) => {
  const [remaining, setRemaining] = useState<RemainingTime | null>(null);
  const [shouldBlink, setShouldBlink] = useState(false);

  useEffect(() => {
    if (!timer || timer.status !== 'active') {
      setRemaining(null);
      setShouldBlink(false);
      return;
    }

    // Initial calculation
    const updateRemaining = () => {
      const time = getRemainingTimeForTimer(timer);
      setRemaining(time);

      // Blink if less than 10% remaining
      setShouldBlink(time.percentage < 10 && !time.isExpired);

      // Call onTimerExpired when timer expires
      if (time.isExpired && onTimerExpired) {
        onTimerExpired();
      }
    };

    updateRemaining();

    // Update every second
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [timer, onTimerExpired]);

  if (!timer || timer.status === 'pending') {
    return null;
  }

  const roundName = getRoundName(timer.round_number, totalRounds);
  const colorClass = remaining ? getTimerColorClass(remaining.percentage) : 'text-gray-400 border-gray-500';
  const progressColorClass = remaining ? getProgressBarColorClass(remaining.percentage) : 'bg-gray-500';

  // Show different displays based on status
  if (timer.status === 'completed') {
    return (
      <div className="bg-gradient-to-r from-green-900/30 to-green-800/20 border-2 border-green-500/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-green-500/20 rounded-full p-2">
              <Clock className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-400">{roundName} - Terminé</h3>
              <p className="text-sm text-gray-300">Ce round est complété</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-green-400">✓ Complété</div>
          </div>
        </div>
      </div>
    );
  }

  if (timer.status === 'paused') {
    return (
      <div className="bg-gradient-to-r from-orange-900/30 to-orange-800/20 border-2 border-orange-500/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-500/20 rounded-full p-2">
              <Pause className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-orange-400">{roundName} - En Pause</h3>
              <p className="text-sm text-gray-300">
                Temps restant : {timer.paused_remaining_seconds ?
                  Math.floor(timer.paused_remaining_seconds / 60) : 0} minutes
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-orange-400">⏸ Pause</div>
          </div>
        </div>
      </div>
    );
  }

  if (timer.status === 'expired') {
    return (
      <div className="bg-gradient-to-r from-red-900/30 to-red-800/20 border-2 border-red-500/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-red-500/20 rounded-full p-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-400">{roundName} - Temps Écoulé</h3>
              <p className="text-sm text-gray-300">Le temps alloué pour ce round est expiré</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-red-400">⏰ Expiré</div>
          </div>
        </div>
      </div>
    );
  }

  // Active timer display
  if (!remaining) {
    return null;
  }

  const timeDisplay = formatTime(remaining.hours, remaining.minutes, remaining.seconds);
  const blinkClass = shouldBlink ? 'animate-pulse' : '';

  // Check if we can show manual progression button
  const canShowManualProgression =
    isCurrentRoundComplete &&
    nextRoundTimer &&
    nextRoundTimer.status === 'pending' &&
    onManualProgression &&
    timer.round_number < totalRounds;

  return (
    <div className={compact ? "flex items-center space-x-3" : "space-y-4 mb-6"}>
      <div className={`bg-gradient-to-r from-dark-100 to-dark-200 border-2 ${colorClass} rounded-lg ${
        compact ? 'px-4 py-2 flex items-center space-x-4' : 'p-4'
      } ${blinkClass}`}>
        <div className={`flex items-center ${
          compact ? 'space-x-3' : 'justify-between mb-3'
        }`}>
          {!compact && (
            <div className="flex items-center space-x-3">
              <div className={`bg-current/20 rounded-full p-2`}>
                <Play className={`h-5 w-5 ${colorClass.split(' ')[0]}`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${colorClass.split(' ')[0]}`}>
                  {roundName} en cours
                </h3>
                <p className="text-sm text-gray-400">
                  Round {timer.round_number} / {totalRounds}
                </p>
              </div>
            </div>
          )}
          {compact && (
            <div className="flex items-center space-x-2">
              <Clock className={`h-4 w-4 ${colorClass.split(' ')[0]}`} />
              <span className={`text-sm font-medium ${colorClass.split(' ')[0]}`}>
                {roundName}
              </span>
            </div>
          )}
          <div className={compact ? '' : 'text-right'}>
            <div className={`${compact ? 'text-xl' : 'text-3xl'} font-bold font-mono ${colorClass.split(' ')[0]}`}>
              {timeDisplay}
            </div>
            {!compact && (
              <div className="text-xs text-gray-400 mt-1">
                {remaining.percentage.toFixed(0)}% restant
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!compact && (
          <>
            <div className="w-full bg-dark-300 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${progressColorClass} transition-all duration-1000 ease-linear`}
                style={{ width: `${remaining.percentage}%` }}
              />
            </div>

            {/* Duration info */}
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>Durée configurée : {timer.duration_minutes} minutes</span>
              {remaining.isExpired && (
                <span className="text-red-400 font-semibold flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Temps écoulé
                </span>
              )}
            </div>
          </>
        )}
        {compact && (
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-dark-300 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full ${progressColorClass} transition-all duration-1000 ease-linear`}
                style={{ width: `${remaining.percentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {remaining.percentage.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Manual progression button - shown when all matches are complete */}
      {!compact && canShowManualProgression && (
        <ManualRoundProgressionButton
          currentRound={timer.round_number}
          nextRound={nextRoundTimer.round_number}
          totalRounds={totalRounds}
          nextRoundDuration={nextRoundTimer.duration_minutes}
          onProceed={onManualProgression}
        />
      )}

      {/* Force progression button - always shown during active timer if next round exists */}
      {!canShowManualProgression &&
        nextRoundTimer &&
        nextRoundTimer.status === 'pending' &&
        onForceProgression &&
        timer.round_number < totalRounds && (
        <Button
          onClick={onForceProgression}
          className={`${
            compact
              ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 border border-orange-500/50 px-4 py-2'
              : 'w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 border-2 border-orange-500/50'
          }`}
          size={compact ? 'sm' : 'lg'}
        >
          <div className="flex items-center justify-center space-x-2">
            <FastForward className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
            <span className={compact ? 'text-sm font-medium' : 'font-semibold'}>
              {compact ? 'Passer au Round Suivant' : 'Passer au Round Suivant (Forcer)'}
            </span>
          </div>
        </Button>
      )}
    </div>
  );
};

export default RoundTimerDisplay;
