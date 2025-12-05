import { useState, useEffect, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  PlayerMatchNotification,
  getPlayerNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToPlayerNotifications
} from '../services/playerMatchNotificationService';

interface UseMatchNotificationsOptions {
  userId?: string;
  tournamentId?: string;
  autoSubscribe?: boolean;
}

interface UseMatchNotificationsReturn {
  notifications: PlayerMatchNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useMatchNotifications = (
  options: UseMatchNotificationsOptions = {}
): UseMatchNotificationsReturn => {
  const { userId, tournamentId, autoSubscribe = true } = options;

  const [notifications, setNotifications] = useState<PlayerMatchNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [notificationsData, unreadCountData] = await Promise.all([
        getPlayerNotifications(userId, tournamentId),
        getUnreadNotificationCount(userId, tournamentId)
      ]);

      if (notificationsData) {
        setNotifications(notificationsData);
      }

      setUnreadCount(unreadCountData);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Erreur lors du chargement des notifications');
    } finally {
      setIsLoading(false);
    }
  }, [userId, tournamentId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const success = await markNotificationAsRead(notificationId);
    if (success) {
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    const success = await markAllNotificationsAsRead(userId, tournamentId);
    if (success) {
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    }
  }, [userId, tournamentId]);

  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!userId || !autoSubscribe) {
      return;
    }

    const newChannel = subscribeToPlayerNotifications(userId, (payload) => {
      console.log('Notification update received:', payload);

      if (payload.eventType === 'INSERT') {
        const newNotification = payload.new as PlayerMatchNotification;

        if (!tournamentId || newNotification.tournament_id === tournamentId) {
          setNotifications(prev => [newNotification, ...prev]);

          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      } else if (payload.eventType === 'UPDATE') {
        const updatedNotification = payload.new as PlayerMatchNotification;

        if (!tournamentId || updatedNotification.tournament_id === tournamentId) {
          setNotifications(prev =>
            prev.map(notif =>
              notif.id === updatedNotification.id ? updatedNotification : notif
            )
          );

          if (updatedNotification.is_read && !payload.old.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      } else if (payload.eventType === 'DELETE') {
        const deletedNotification = payload.old as PlayerMatchNotification;

        setNotifications(prev =>
          prev.filter(notif => notif.id !== deletedNotification.id)
        );

        if (!deletedNotification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    });

    setChannel(newChannel);

    return () => {
      if (newChannel) {
        newChannel.unsubscribe();
      }
    };
  }, [userId, tournamentId, autoSubscribe]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh
  };
};
