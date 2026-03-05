import { useState } from 'react';
import { X, Bell, Check, CheckCheck, Copy, Trophy, Users, GitBranch } from 'lucide-react';
import { useMatchNotifications } from '../../hooks/useMatchNotifications';
import {
  PlayerMatchNotification,
  formatGameIds
} from '../../services/playerMatchNotificationService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import Badge from '../ui/Badge';
import toast from 'react-hot-toast';
import { t, getLocale } from '../../utils/i18n';

interface MatchNotificationPanelProps {
  userId: string;
  tournamentId?: string;
}

function resolveMessage(notification: PlayerMatchNotification): string {
  if (notification.message.startsWith('notif.')) {
    return t(notification.message, notification.metadata);
  }
  return notification.message;
}

export const MatchNotificationPanel: React.FC<MatchNotificationPanelProps> = ({
  userId,
  tournamentId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead
  } = useMatchNotifications({ userId, tournamentId, autoSubscribe: true });

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('notif.copied', { label }));
    } catch (err) {
      toast.error(t('notif.copy_error'));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'match_starting':
        return <Users className="w-5 h-5 text-blue-400" />;
      case 'match_result':
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 'next_opponent':
        return <Users className="w-5 h-5 text-green-400" />;
      case 'bracket_ready':
        return <GitBranch className="w-5 h-5 text-cyan-400" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getResultBadge = (result: string | null) => {
    if (!result) return null;

    switch (result) {
      case 'won':
        return <Badge variant="success">{t('notif.result_won')}</Badge>;
      case 'lost':
        return <Badge variant="danger">{t('notif.result_lost')}</Badge>;
      case 'draw':
        return <Badge variant="warning">{t('notif.result_draw')}</Badge>;
      default:
        return null;
    }
  };

  const handleNotificationClick = async (notification: PlayerMatchNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    toast.success(t('notif.all_marked_read'));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={t('notif.panel_title')}
      >
        <Bell className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-96 max-h-[600px] z-50 overflow-hidden rounded-lg shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('notif.panel_title')}
                  </h3>
                  {unreadCount > 0 && (
                    <Badge variant="danger">{unreadCount}</Badge>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="flex items-center gap-2 px-4 pb-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('unread')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      filter === 'unread'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t('notif.filter_unread')}
                  </button>
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      filter === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t('notif.filter_all')}
                  </button>
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="ml-auto text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    <CheckCheck className="w-4 h-4" />
                    {t('notif.mark_all_read')}
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto max-h-[500px]">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500">{error}</div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>
                    {filter === 'unread'
                      ? t('notif.empty_unread')
                      : t('notif.empty_all')}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer transition-colors ${
                        !notification.is_read
                          ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.notification_type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className={`text-sm ${
                              !notification.is_read
                                ? 'font-semibold text-gray-900 dark:text-white'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {resolveMessage(notification)}
                            </p>
                            {!notification.is_read && (
                              <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1" />
                            )}
                          </div>

                          {notification.match_result && (
                            <div className="mb-2">
                              {getResultBadge(notification.match_result)}
                            </div>
                          )}

                          {notification.opponent_game_ids &&
                            Object.keys(notification.opponent_game_ids).length > 0 && (
                              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                  {t('notif.opponent_ids_label')}
                                </p>
                                <div className="space-y-1">
                                  {formatGameIds(notification.opponent_game_ids).map((gameId) => (
                                    <div
                                      key={gameId.label}
                                      className="flex items-center justify-between gap-2"
                                    >
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        {gameId.label}:
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-mono text-gray-900 dark:text-white">
                                          {gameId.value}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(gameId.value, gameId.label);
                                          }}
                                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                          aria-label={`Copy ${gameId.label}`}
                                        >
                                          <Copy className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {new Date(notification.created_at).toLocaleString(getLocale(), {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
