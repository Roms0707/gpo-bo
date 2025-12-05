import { supabase } from '../lib/supabase';

export interface RoundTimer {
  id: string;
  tournament_id: string;
  round_number: number;
  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
  status: 'pending' | 'active' | 'completed' | 'paused' | 'expired';
  paused_at: string | null;
  paused_remaining_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface RoundTimerInsert {
  tournament_id: string;
  round_number: number;
  duration_minutes?: number;
  status?: 'pending' | 'active' | 'completed' | 'paused' | 'expired';
}

export interface RemainingTime {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  percentage: number;
}

/**
 * Initialize round timers for all rounds in a tournament
 * Creates timers with default duration (60 minutes) for each round
 */
export const initializeRoundTimers = async (
  tournamentId: string,
  totalRounds: number,
  defaultDuration: number = 60
): Promise<RoundTimer[] | null> => {
  try {
    const existingTimers = await getRoundTimers(tournamentId);

    if (existingTimers && existingTimers.length > 0) {
      console.log(`ℹ️ Round timers already exist for tournament ${tournamentId}`);
      return existingTimers;
    }

    const timers: RoundTimerInsert[] = [];

    for (let round = 1; round <= totalRounds; round++) {
      timers.push({
        tournament_id: tournamentId,
        round_number: round,
        duration_minutes: defaultDuration,
        status: 'pending'
      });
    }

    const { data, error } = await supabase
      .from('bracket_round_timers')
      .insert(timers)
      .select();

    if (error) throw error;

    console.log(`✅ Initialized ${data.length} round timers for tournament ${tournamentId}`);
    return data;
  } catch (error) {
    console.error('Error initializing round timers:', error);
    return null;
  }
};

/**
 * Get all round timers for a tournament
 */
export const getRoundTimers = async (tournamentId: string): Promise<RoundTimer[] | null> => {
  try {
    const { data, error } = await supabase
      .from('bracket_round_timers')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round_number', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching round timers:', error);
    return null;
  }
};

/**
 * Get the currently active round timer for a tournament
 */
export const getActiveRoundTimer = async (tournamentId: string): Promise<RoundTimer | null> => {
  try {
    const { data, error } = await supabase
      .from('bracket_round_timers')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching active round timer:', error);
    return null;
  }
};

/**
 * Get a specific round timer
 */
export const getRoundTimer = async (
  tournamentId: string,
  roundNumber: number
): Promise<RoundTimer | null> => {
  try {
    const { data, error } = await supabase
      .from('bracket_round_timers')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('round_number', roundNumber)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching round timer:', error);
    return null;
  }
};

/**
 * Update the duration of a round timer (only allowed in draft mode)
 */
export const updateRoundDuration = async (
  timerId: string,
  durationMinutes: number
): Promise<RoundTimer | null> => {
  try {
    const { data, error } = await supabase
      .from('bracket_round_timers')
      .update({ duration_minutes: durationMinutes })
      .eq('id', timerId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Updated timer ${timerId} duration to ${durationMinutes} minutes`);
    return data;
  } catch (error) {
    console.error('Error updating round duration:', error);
    return null;
  }
};

/**
 * Start a round timer
 * Calculates end_time based on duration_minutes
 */
export const startRoundTimer = async (
  tournamentId: string,
  roundNumber: number
): Promise<RoundTimer | null> => {
  try {
    // Get the timer
    const timer = await getRoundTimer(tournamentId, roundNumber);
    if (!timer) {
      console.error(`Timer not found for round ${roundNumber}`);
      return null;
    }

    // Calculate end time
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + timer.duration_minutes * 60 * 1000);

    const { data, error } = await supabase
      .from('bracket_round_timers')
      .update({
        status: 'active',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        paused_at: null,
        paused_remaining_seconds: null
      })
      .eq('id', timer.id)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Started timer for round ${roundNumber}, ends at ${endTime.toLocaleString()}`);
    return data;
  } catch (error) {
    console.error('Error starting round timer:', error);
    return null;
  }
};

/**
 * Pause a round timer
 * Saves remaining time for later resumption
 */
export const pauseRoundTimer = async (timerId: string): Promise<RoundTimer | null> => {
  try {
    // Get current timer state
    const { data: timer, error: fetchError } = await supabase
      .from('bracket_round_timers')
      .select('*')
      .eq('id', timerId)
      .single();

    if (fetchError) throw fetchError;
    if (!timer || timer.status !== 'active') {
      console.error('Timer is not active, cannot pause');
      return null;
    }

    // Calculate remaining time
    const remaining = getRemainingTimeForTimer(timer);
    if (remaining.isExpired) {
      console.error('Timer already expired, cannot pause');
      return null;
    }

    const { data, error } = await supabase
      .from('bracket_round_timers')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
        paused_remaining_seconds: remaining.totalSeconds
      })
      .eq('id', timerId)
      .select()
      .single();

    if (error) throw error;

    console.log(`⏸️ Paused timer ${timerId}, ${remaining.totalSeconds} seconds remaining`);
    return data;
  } catch (error) {
    console.error('Error pausing round timer:', error);
    return null;
  }
};

/**
 * Resume a paused round timer
 */
export const resumeRoundTimer = async (timerId: string): Promise<RoundTimer | null> => {
  try {
    // Get current timer state
    const { data: timer, error: fetchError } = await supabase
      .from('bracket_round_timers')
      .select('*')
      .eq('id', timerId)
      .single();

    if (fetchError) throw fetchError;
    if (!timer || timer.status !== 'paused') {
      console.error('Timer is not paused, cannot resume');
      return null;
    }

    if (!timer.paused_remaining_seconds) {
      console.error('No remaining time stored, cannot resume');
      return null;
    }

    // Calculate new end time based on remaining seconds
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + timer.paused_remaining_seconds * 1000);

    const { data, error } = await supabase
      .from('bracket_round_timers')
      .update({
        status: 'active',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        paused_at: null,
        paused_remaining_seconds: null
      })
      .eq('id', timerId)
      .select()
      .single();

    if (error) throw error;

    console.log(`▶️ Resumed timer ${timerId}, ends at ${endTime.toLocaleString()}`);
    return data;
  } catch (error) {
    console.error('Error resuming round timer:', error);
    return null;
  }
};

/**
 * Extend a round timer by adding additional minutes
 */
export const extendRoundTime = async (
  timerId: string,
  additionalMinutes: number
): Promise<RoundTimer | null> => {
  try {
    // Get current timer state
    const { data: timer, error: fetchError } = await supabase
      .from('bracket_round_timers')
      .select('*')
      .eq('id', timerId)
      .single();

    if (fetchError) throw fetchError;
    if (!timer || !timer.end_time) {
      console.error('Timer not found or has no end time');
      return null;
    }

    // Extend end time
    const currentEndTime = new Date(timer.end_time);
    const newEndTime = new Date(currentEndTime.getTime() + additionalMinutes * 60 * 1000);

    const { data, error } = await supabase
      .from('bracket_round_timers')
      .update({
        end_time: newEndTime.toISOString(),
        duration_minutes: timer.duration_minutes + additionalMinutes
      })
      .eq('id', timerId)
      .select()
      .single();

    if (error) throw error;

    console.log(`⏱️ Extended timer ${timerId} by ${additionalMinutes} minutes`);
    return data;
  } catch (error) {
    console.error('Error extending round time:', error);
    return null;
  }
};

/**
 * Complete a round timer
 */
export const completeRoundTimer = async (
  tournamentId: string,
  roundNumber: number
): Promise<RoundTimer | null> => {
  try {
    const timer = await getRoundTimer(tournamentId, roundNumber);
    if (!timer) {
      console.error(`Timer not found for round ${roundNumber}`);
      return null;
    }

    const { data, error } = await supabase
      .from('bracket_round_timers')
      .update({ status: 'completed' })
      .eq('id', timer.id)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Completed timer for round ${roundNumber}`);
    return data;
  } catch (error) {
    console.error('Error completing round timer:', error);
    return null;
  }
};

/**
 * Mark a round timer as expired
 */
export const expireRoundTimer = async (timerId: string): Promise<RoundTimer | null> => {
  try {
    const { data, error } = await supabase
      .from('bracket_round_timers')
      .update({ status: 'expired' })
      .eq('id', timerId)
      .select()
      .single();

    if (error) throw error;

    console.log(`⏰ Expired timer ${timerId}`);
    return data;
  } catch (error) {
    console.error('Error expiring round timer:', error);
    return null;
  }
};

/**
 * Delete all timers for a tournament (used when resetting bracket)
 */
export const deleteTimersForTournament = async (tournamentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('bracket_round_timers')
      .delete()
      .eq('tournament_id', tournamentId);

    if (error) throw error;

    console.log(`🗑️ Deleted all timers for tournament ${tournamentId}`);
    return true;
  } catch (error) {
    console.error('Error deleting timers:', error);
    return false;
  }
};

/**
 * Calculate remaining time for a timer object
 */
export const getRemainingTimeForTimer = (timer: RoundTimer): RemainingTime => {
  if (!timer.end_time || timer.status !== 'active') {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: true,
      percentage: 0
    };
  }

  const now = new Date();
  const endTime = new Date(timer.end_time);
  const startTime = timer.start_time ? new Date(timer.start_time) : now;

  const totalDuration = endTime.getTime() - startTime.getTime();
  const remaining = endTime.getTime() - now.getTime();

  if (remaining <= 0) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: true,
      percentage: 0
    };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const percentage = totalDuration > 0 ? (remaining / totalDuration) * 100 : 0;

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired: false,
    percentage: Math.max(0, Math.min(100, percentage))
  };
};

/**
 * Calculate remaining time for a specific round
 */
export const getRemainingTime = async (
  tournamentId: string,
  roundNumber: number
): Promise<RemainingTime | null> => {
  try {
    const timer = await getRoundTimer(tournamentId, roundNumber);
    if (!timer) return null;

    return getRemainingTimeForTimer(timer);
  } catch (error) {
    console.error('Error calculating remaining time:', error);
    return null;
  }
};

/**
 * Get the color class based on remaining time percentage
 */
export const getTimerColorClass = (percentage: number): string => {
  if (percentage > 50) return 'text-green-400 border-green-500';
  if (percentage > 10) return 'text-orange-400 border-orange-500';
  return 'text-red-400 border-red-500';
};

/**
 * Get the progress bar color class based on remaining time percentage
 */
export const getProgressBarColorClass = (percentage: number): string => {
  if (percentage > 50) return 'bg-green-500';
  if (percentage > 10) return 'bg-orange-500';
  return 'bg-red-500';
};

/**
 * Format time as HH:MM:SS
 */
export const formatTime = (hours: number, minutes: number, seconds: number): string => {
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Subscribe to real-time timer updates for a tournament
 */
export const subscribeToTimerUpdates = (
  tournamentId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`timers:${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bracket_round_timers',
        filter: `tournament_id=eq.${tournamentId}`
      },
      callback
    )
    .subscribe();
};
