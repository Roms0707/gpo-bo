import { supabase } from '../lib/supabase';
import { t } from '../utils/i18n';

export type NotificationType = 'match_starting' | 'match_result' | 'next_opponent' | 'bracket_ready';

export interface PlayerMatchNotification {
  id: string;
  user_id: string;
  tournament_id: string;
  match_id: string | null;
  round_number: number;
  notification_type: NotificationType;
  opponent_id: string | null;
  opponent_game_ids: Record<string, string>;
  match_result: 'won' | 'lost' | 'draw' | null;
  message: string;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface PlayerMatchNotificationInsert {
  user_id: string;
  tournament_id: string;
  match_id?: string | null;
  round_number: number;
  notification_type: NotificationType;
  opponent_id?: string | null;
  opponent_game_ids?: Record<string, string>;
  match_result?: 'won' | 'lost' | 'draw' | null;
  message: string;
  metadata?: Record<string, any>;
}

export interface OpponentGameIds {
  username?: string;
  steam_id?: string;
  freefire_nickname?: string;
  ow2_battle_net_id?: string;
  fc26_ea_id?: string;
  apex_legends_ea_id?: string;
  fortnite_epic_id?: string;
  rocket_league_epic_id?: string;
  warzone_activision_id?: string;
  r6_ubisoft_id?: string;
  riot_game_name?: string;
  riot_tagline?: string;
  discord_handle?: string;
  [key: string]: string | undefined;
}

/**
 * Récupère les identifiants de jeu d'un utilisateur
 * Combine les données de la table users et game_publisher_id_for_users
 */
export const getOpponentGameIds = async (
  userId: string,
  gameId?: string
): Promise<OpponentGameIds> => {
  try {
    const gameIds: OpponentGameIds = {};

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username, steam_id, freefire_nickname, ow2_battle_net_id, fc26_ea_id, apex_legends_ea_id, fortnite_epic_id, rocket_league_epic_id, warzone_activision_id, r6_ubisoft_id, riot_game_name, riot_tagline, discord_handle')
      .eq('id', userId)
      .maybeSingle();

    if (userError) throw userError;

    if (userData) {
      if (userData.username) gameIds.username = userData.username;
      if (userData.steam_id) gameIds.steam_id = userData.steam_id;
      if (userData.freefire_nickname) gameIds.freefire_nickname = userData.freefire_nickname;
      if (userData.ow2_battle_net_id) gameIds.ow2_battle_net_id = userData.ow2_battle_net_id;
      if (userData.fc26_ea_id) gameIds.fc26_ea_id = userData.fc26_ea_id;
      if (userData.apex_legends_ea_id) gameIds.apex_legends_ea_id = userData.apex_legends_ea_id;
      if (userData.fortnite_epic_id) gameIds.fortnite_epic_id = userData.fortnite_epic_id;
      if (userData.rocket_league_epic_id) gameIds.rocket_league_epic_id = userData.rocket_league_epic_id;
      if (userData.warzone_activision_id) gameIds.warzone_activision_id = userData.warzone_activision_id;
      if (userData.r6_ubisoft_id) gameIds.r6_ubisoft_id = userData.r6_ubisoft_id;
      if (userData.riot_game_name) gameIds.riot_game_name = userData.riot_game_name;
      if (userData.riot_tagline) gameIds.riot_tagline = userData.riot_tagline;
      if (userData.discord_handle) gameIds.discord_handle = userData.discord_handle;
    }

    if (gameId) {
      const { data: publisherIds, error: publisherError } = await supabase
        .from('game_publisher_id_for_users')
        .select(`
          game_publisher_id,
          value,
          game_publisher_ids (
            id_name,
            label
          )
        `)
        .eq('user_id', userId)
        .eq('game_id', gameId)
        .eq('is_validated', true);

      if (publisherError) throw publisherError;

      if (publisherIds && publisherIds.length > 0) {
        publisherIds.forEach((entry: any) => {
          if (entry.game_publisher_ids && entry.value) {
            const idName = entry.game_publisher_ids.id_name;
            gameIds[idName] = entry.value;
          }
        });
      }
    }

    return gameIds;
  } catch (error) {
    console.error('Error fetching opponent game IDs:', error);
    return {};
  }
};

/**
 * Crée une notification pour un joueur
 */
export const createPlayerNotification = async (
  notification: PlayerMatchNotificationInsert
): Promise<PlayerMatchNotification | null> => {
  try {
    const { data, error } = await supabase
      .from('player_match_notifications')
      .insert([notification])
      .select()
      .single();

    if (error) throw error;

    console.log(`📢 Created ${notification.notification_type} notification for user ${notification.user_id}`);
    return data;
  } catch (error) {
    console.error('Error creating player notification:', error);
    return null;
  }
};

/**
 * Crée des notifications de début de match pour les deux joueurs
 */
export const notifyMatchStarting = async (
  tournamentId: string,
  tournamentTitle: string,
  matchId: string,
  roundNumber: number,
  roundName: string,
  player1Id: string,
  player2Id: string,
  gameId?: string
): Promise<void> => {
  try {
    const player1GameIds = await getOpponentGameIds(player2Id, gameId);
    const player2GameIds = await getOpponentGameIds(player1Id, gameId);

    const player1Username = player1GameIds.username || 'Opponent';
    const player2Username = player2GameIds.username || 'Opponent';

    await createPlayerNotification({
      user_id: player1Id,
      tournament_id: tournamentId,
      match_id: matchId,
      round_number: roundNumber,
      notification_type: 'match_starting',
      opponent_id: player2Id,
      opponent_game_ids: player2GameIds,
      message: 'notif.match_starting',
      metadata: {
        tournament_title: tournamentTitle,
        round_name: roundName,
        opponent_username: player2Username
      }
    });

    await createPlayerNotification({
      user_id: player2Id,
      tournament_id: tournamentId,
      match_id: matchId,
      round_number: roundNumber,
      notification_type: 'match_starting',
      opponent_id: player1Id,
      opponent_game_ids: player1GameIds,
      message: 'notif.match_starting',
      metadata: {
        tournament_title: tournamentTitle,
        round_name: roundName,
        opponent_username: player1Username
      }
    });

    console.log(`✅ Match starting notifications sent for match ${matchId}`);
  } catch (error) {
    console.error('Error notifying match starting:', error);
  }
};

/**
 * Crée des notifications de résultat de match
 */
export const notifyMatchResult = async (
  tournamentId: string,
  tournamentTitle: string,
  matchId: string,
  roundNumber: number,
  roundName: string,
  winnerId: string,
  loserId: string,
  isDraw: boolean = false,
  gameId?: string
): Promise<void> => {
  try {
    if (isDraw) {
      const player1GameIds = await getOpponentGameIds(loserId, gameId);
      const player2GameIds = await getOpponentGameIds(winnerId, gameId);

      const player1Username = player1GameIds.username || 'Opponent';
      const player2Username = player2GameIds.username || 'Opponent';

      await createPlayerNotification({
        user_id: winnerId,
        tournament_id: tournamentId,
        match_id: matchId,
        round_number: roundNumber,
        notification_type: 'match_result',
        opponent_id: loserId,
        opponent_game_ids: player1GameIds,
        match_result: 'draw',
        message: 'notif.match_result_draw',
        metadata: {
          tournament_title: tournamentTitle,
          round_name: roundName,
          opponent_username: player1Username
        }
      });

      await createPlayerNotification({
        user_id: loserId,
        tournament_id: tournamentId,
        match_id: matchId,
        round_number: roundNumber,
        notification_type: 'match_result',
        opponent_id: winnerId,
        opponent_game_ids: player2GameIds,
        match_result: 'draw',
        message: 'notif.match_result_draw',
        metadata: {
          tournament_title: tournamentTitle,
          round_name: roundName,
          opponent_username: player2Username
        }
      });
    } else {
      const winnerGameIds = await getOpponentGameIds(loserId, gameId);
      const loserGameIds = await getOpponentGameIds(winnerId, gameId);

      const winnerOpponentUsername = winnerGameIds.username || 'Opponent';
      const loserOpponentUsername = loserGameIds.username || 'Opponent';

      await createPlayerNotification({
        user_id: winnerId,
        tournament_id: tournamentId,
        match_id: matchId,
        round_number: roundNumber,
        notification_type: 'match_result',
        opponent_id: loserId,
        opponent_game_ids: winnerGameIds,
        match_result: 'won',
        message: 'notif.match_result_won',
        metadata: {
          tournament_title: tournamentTitle,
          round_name: roundName,
          opponent_username: winnerOpponentUsername
        }
      });

      await createPlayerNotification({
        user_id: loserId,
        tournament_id: tournamentId,
        match_id: matchId,
        round_number: roundNumber,
        notification_type: 'match_result',
        opponent_id: winnerId,
        opponent_game_ids: loserGameIds,
        match_result: 'lost',
        message: 'notif.match_result_lost',
        metadata: {
          tournament_title: tournamentTitle,
          round_name: roundName,
          opponent_username: loserOpponentUsername
        }
      });
    }

    console.log(`✅ Match result notifications sent for match ${matchId}`);
  } catch (error) {
    console.error('Error notifying match result:', error);
  }
};

/**
 * Crée une notification pour informer un joueur de son prochain adversaire
 */
export const notifyNextOpponent = async (
  tournamentId: string,
  tournamentTitle: string,
  playerId: string,
  nextMatchId: string,
  nextRoundNumber: number,
  nextRoundName: string,
  opponentId: string,
  gameId?: string
): Promise<void> => {
  try {
    const opponentGameIds = await getOpponentGameIds(opponentId, gameId);
    const opponentUsername = opponentGameIds.username || 'Opponent';

    await createPlayerNotification({
      user_id: playerId,
      tournament_id: tournamentId,
      match_id: nextMatchId,
      round_number: nextRoundNumber,
      notification_type: 'next_opponent',
      opponent_id: opponentId,
      opponent_game_ids: opponentGameIds,
      message: 'notif.next_opponent',
      metadata: {
        tournament_title: tournamentTitle,
        round_name: nextRoundName,
        opponent_username: opponentUsername
      }
    });

    console.log(`✅ Next opponent notification sent to user ${playerId}`);
  } catch (error) {
    console.error('Error notifying next opponent:', error);
  }
};

/**
 * Récupère toutes les notifications d'un joueur pour un tournoi
 */
export const getPlayerNotifications = async (
  userId: string,
  tournamentId?: string,
  unreadOnly: boolean = false
): Promise<PlayerMatchNotification[] | null> => {
  try {
    let query = supabase
      .from('player_match_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (tournamentId) {
      query = query.eq('tournament_id', tournamentId);
    }

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching player notifications:', error);
    return null;
  }
};

/**
 * Marque une notification comme lue
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('player_match_notifications')
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
 * Marque toutes les notifications d'un joueur comme lues
 */
export const markAllNotificationsAsRead = async (
  userId: string,
  tournamentId?: string
): Promise<boolean> => {
  try {
    let query = supabase
      .from('player_match_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (tournamentId) {
      query = query.eq('tournament_id', tournamentId);
    }

    const { error } = await query;

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

/**
 * Compte les notifications non lues d'un joueur
 */
export const getUnreadNotificationCount = async (
  userId: string,
  tournamentId?: string
): Promise<number> => {
  try {
    let query = supabase
      .from('player_match_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (tournamentId) {
      query = query.eq('tournament_id', tournamentId);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
};

/**
 * Supprime toutes les notifications d'un tournoi
 */
export const deleteNotificationsForTournament = async (tournamentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('player_match_notifications')
      .delete()
      .eq('tournament_id', tournamentId);

    if (error) throw error;

    console.log(`🗑️ Deleted all player notifications for tournament ${tournamentId}`);
    return true;
  } catch (error) {
    console.error('Error deleting player notifications:', error);
    return false;
  }
};

/**
 * S'abonne aux notifications en temps réel pour un joueur
 */
export const subscribeToPlayerNotifications = (
  userId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`player_notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'player_match_notifications',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

/**
 * Helper pour formater les identifiants de jeu pour l'affichage
 */
export const formatGameIds = (gameIds: OpponentGameIds): Array<{ label: string; value: string }> => {
  const formatted: Array<{ label: string; value: string }> = [];

  const labelMap: Record<string, string> = {
    username: t('notif.label_username'),
    steam_id: 'Steam ID',
    freefire_nickname: 'Free Fire',
    ow2_battle_net_id: 'Overwatch 2 Battle.net',
    fc26_ea_id: 'FC 26 EA ID',
    apex_legends_ea_id: 'Apex Legends EA ID',
    fortnite_epic_id: 'Fortnite Epic ID',
    rocket_league_epic_id: 'Rocket League Epic ID',
    warzone_activision_id: 'Warzone Activision ID',
    r6_ubisoft_id: 'Rainbow Six Ubisoft ID',
    riot_game_name: 'Riot Game Name',
    riot_tagline: 'Riot Tagline',
    discord_handle: 'Discord'
  };

  Object.entries(gameIds).forEach(([key, value]) => {
    if (value && labelMap[key]) {
      formatted.push({
        label: labelMap[key],
        value: value
      });
    }
  });

  return formatted;
};
