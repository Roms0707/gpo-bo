import { supabase } from '../lib/supabase';

export interface RoundNotification {
  id: string;
  tournament_id: string;
  round_number: number;
  notification_type: 'round_started' | 'round_completed' | 'round_expired' | 'round_extended' | 'round_paused' | 'round_resumed';
  message: string;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface RoundNotificationInsert {
  tournament_id: string;
  round_number: number;
  notification_type: 'round_started' | 'round_completed' | 'round_expired' | 'round_extended' | 'round_paused' | 'round_resumed';
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Create a notification for round events
 * These notifications are stored in Supabase for front-service consumption
 */
export const createRoundNotification = async (
  notification: RoundNotificationInsert
): Promise<RoundNotification | null> => {
  try {
    const { data, error } = await supabase
      .from('bracket_round_notifications')
      .insert([notification])
      .select()
      .single();

    if (error) throw error;

    console.log(`📢 Created ${notification.notification_type} notification for round ${notification.round_number}`);
    return data;
  } catch (error) {
    console.error('Error creating round notification:', error);
    return null;
  }
};

/**
 * Create a notification when a round starts
 */
export const notifyRoundStarted = async (
  tournamentId: string,
  tournamentTitle: string,
  roundNumber: number,
  roundName: string,
  durationMinutes: number
): Promise<RoundNotification | null> => {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  let timeString = '';
  if (hours > 0 && minutes > 0) {
    timeString = `${hours}h${minutes}min`;
  } else if (hours > 0) {
    timeString = `${hours}h`;
  } else {
    timeString = `${minutes}min`;
  }

  const message = `Le ${roundName} du tournoi "${tournamentTitle}" commence maintenant ! Temps alloué : ${timeString}`;

  return createRoundNotification({
    tournament_id: tournamentId,
    round_number: roundNumber,
    notification_type: 'round_started',
    message,
    metadata: {
      tournament_title: tournamentTitle,
      round_name: roundName,
      duration_minutes: durationMinutes,
      duration_display: timeString
    }
  });
};

/**
 * Create a notification when a round is completed
 */
export const notifyRoundCompleted = async (
  tournamentId: string,
  tournamentTitle: string,
  roundNumber: number,
  roundName: string,
  nextRoundNumber?: number,
  nextRoundName?: string
): Promise<RoundNotification | null> => {
  let message = `Le ${roundName} du tournoi "${tournamentTitle}" est terminé !`;

  if (nextRoundNumber && nextRoundName) {
    message += ` Le ${nextRoundName} va commencer.`;
  } else {
    message += ' Le tournoi est terminé.';
  }

  return createRoundNotification({
    tournament_id: tournamentId,
    round_number: roundNumber,
    notification_type: 'round_completed',
    message,
    metadata: {
      tournament_title: tournamentTitle,
      round_name: roundName,
      next_round_number: nextRoundNumber,
      next_round_name: nextRoundName
    }
  });
};

/**
 * Create a notification when a round timer expires
 */
export const notifyRoundExpired = async (
  tournamentId: string,
  tournamentTitle: string,
  roundNumber: number,
  roundName: string,
  incompleteMatches: number
): Promise<RoundNotification | null> => {
  const message = `Le temps alloué pour le ${roundName} du tournoi "${tournamentTitle}" est écoulé ! ${incompleteMatches} match(s) en attente.`;

  return createRoundNotification({
    tournament_id: tournamentId,
    round_number: roundNumber,
    notification_type: 'round_expired',
    message,
    metadata: {
      tournament_title: tournamentTitle,
      round_name: roundName,
      incomplete_matches: incompleteMatches
    }
  });
};

/**
 * Create a notification when a round timer is extended
 */
export const notifyRoundExtended = async (
  tournamentId: string,
  tournamentTitle: string,
  roundNumber: number,
  roundName: string,
  additionalMinutes: number,
  newTotalMinutes: number
): Promise<RoundNotification | null> => {
  const message = `Le temps du ${roundName} du tournoi "${tournamentTitle}" a été prolongé de ${additionalMinutes} minutes. Nouvelle durée totale : ${newTotalMinutes} minutes.`;

  return createRoundNotification({
    tournament_id: tournamentId,
    round_number: roundNumber,
    notification_type: 'round_extended',
    message,
    metadata: {
      tournament_title: tournamentTitle,
      round_name: roundName,
      additional_minutes: additionalMinutes,
      new_total_minutes: newTotalMinutes
    }
  });
};

/**
 * Create a notification when a round timer is paused
 */
export const notifyRoundPaused = async (
  tournamentId: string,
  tournamentTitle: string,
  roundNumber: number,
  roundName: string,
  remainingMinutes: number
): Promise<RoundNotification | null> => {
  const message = `Le ${roundName} du tournoi "${tournamentTitle}" a été mis en pause. Temps restant : ${remainingMinutes} minutes.`;

  return createRoundNotification({
    tournament_id: tournamentId,
    round_number: roundNumber,
    notification_type: 'round_paused',
    message,
    metadata: {
      tournament_title: tournamentTitle,
      round_name: roundName,
      remaining_minutes: remainingMinutes
    }
  });
};

/**
 * Create a notification when a round timer is resumed
 */
export const notifyRoundResumed = async (
  tournamentId: string,
  tournamentTitle: string,
  roundNumber: number,
  roundName: string,
  remainingMinutes: number
): Promise<RoundNotification | null> => {
  const message = `Le ${roundName} du tournoi "${tournamentTitle}" a repris. Temps restant : ${remainingMinutes} minutes.`;

  return createRoundNotification({
    tournament_id: tournamentId,
    round_number: roundNumber,
    notification_type: 'round_resumed',
    message,
    metadata: {
      tournament_title: tournamentTitle,
      round_name: roundName,
      remaining_minutes: remainingMinutes
    }
  });
};

/**
 * Get all notifications for a tournament
 */
export const getRoundNotifications = async (
  tournamentId: string,
  unreadOnly: boolean = false
): Promise<RoundNotification[] | null> => {
  try {
    let query = supabase
      .from('bracket_round_notifications')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching round notifications:', error);
    return null;
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('bracket_round_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Mark all notifications for a tournament as read
 */
export const markAllNotificationsAsRead = async (tournamentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('bracket_round_notifications')
      .update({ is_read: true })
      .eq('tournament_id', tournamentId)
      .eq('is_read', false);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

/**
 * Delete all notifications for a tournament (used when resetting bracket)
 */
export const deleteNotificationsForTournament = async (tournamentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('bracket_round_notifications')
      .delete()
      .eq('tournament_id', tournamentId);

    if (error) throw error;

    console.log(`🗑️ Deleted all notifications for tournament ${tournamentId}`);
    return true;
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return false;
  }
};

/**
 * Get unread notification count for a tournament
 */
export const getUnreadNotificationCount = async (tournamentId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('bracket_round_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
};

/**
 * Subscribe to real-time notification updates for a tournament
 */
export const subscribeToNotificationUpdates = (
  tournamentId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`notifications:${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bracket_round_notifications',
        filter: `tournament_id=eq.${tournamentId}`
      },
      callback
    )
    .subscribe();
};

/**
 * Helper function to get round name based on round number and total rounds
 */
export const getRoundName = (roundNumber: number, totalRounds: number): string => {
  if (roundNumber === 1) return 'Round 1';
  if (roundNumber === totalRounds) return 'Finale';
  if (roundNumber === totalRounds - 1) return 'Demi-finale';
  if (roundNumber === totalRounds - 2) return 'Quart de finale';
  return `Round ${roundNumber}`;
};
