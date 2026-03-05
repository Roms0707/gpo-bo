/*
  # Update all notification trigger functions for i18n support

  1. Modified Functions (12 total)
    - `create_tournament_status_notification` - stores i18n key "notif.tournament_status_updated"
    - `create_tournament_start_notification` - stores i18n key "notif.tournament_starting_soon"
    - `create_tournament_join_now_notification` - stores i18n key "notif.tournament_live"
    - `create_bracket_update_notification` - stores i18n keys "notif.bracket_advance" / "notif.bracket_eliminated"
    - `create_friend_request_notification` - stores i18n key "notif.friend_request"
    - `create_friend_accepted_notification` - stores i18n key "notif.friend_accepted"
    - `create_team_application_notification` - stores i18n keys "notif.team_app_accepted" / "notif.team_app_rejected" / "notif.team_member_joined"
    - `create_team_application_received_notification` - stores i18n key "notif.team_app_received"
    - `create_registration_status_notification` - stores i18n key "notif.registration_status"
    - `create_channel_invitation_notification` - stores i18n key "notif.channel_invitation"
    - `create_new_ticket_notification` - stores i18n key "notif.new_ticket"
    - `create_ticket_message_notification` - stores i18n keys "notif.support_admin_reply" / "notif.support_user_message"

  2. How it works
    - `title` now stores an i18n translation key instead of French text
    - `metadata` stores a JSON object with dynamic values for interpolation
    - `message` still stores the French text as a backward-compatible fallback
    - The frontend uses the i18n key + metadata to render in the user's language

  3. Important Notes
    - All functions use CREATE OR REPLACE so existing triggers remain intact
    - The `message` field is kept as the French fallback for old clients / email digests
*/

-- 1. create_tournament_status_notification
CREATE OR REPLACE FUNCTION public.create_tournament_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  t_title TEXT;
BEGIN
  IF OLD.status <> NEW.status THEN
    SELECT title INTO t_title FROM tournaments WHERE id = NEW.id;

    INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date, metadata)
    SELECT
      user_id,
      'notif.tournament_status_updated',
      'Le tournoi "' || t_title || '" est maintenant ' ||
      CASE
        WHEN NEW.status = 'upcoming' THEN 'à venir'
        WHEN NEW.status = 'active' THEN 'en cours'
        WHEN NEW.status = 'past' THEN 'terminé'
        ELSE NEW.status
      END,
      'tournament_update',
      '/tournaments/' || NEW.id,
      NEW.id,
      NEW.start_date,
      jsonb_build_object(
        'tournament_title', t_title,
        'status', NEW.status
      )
    FROM tournament_registrations
    WHERE tournament_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. create_tournament_start_notification
CREATE OR REPLACE FUNCTION public.create_tournament_start_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date, metadata)
  SELECT
    user_id,
    'notif.tournament_starting_soon',
    'Le tournoi "' || NEW.title || '" va commencer bientôt. Préparez-vous !',
    'tournament_start',
    '/tournaments/' || NEW.id,
    NEW.id,
    NEW.start_date,
    jsonb_build_object('tournament_title', NEW.title)
  FROM tournament_registrations
  WHERE tournament_id = NEW.id AND status = 'approved';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. create_tournament_join_now_notification
CREATE OR REPLACE FUNCTION public.create_tournament_join_now_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link, related_id, metadata)
  SELECT
    tr.user_id,
    'notif.tournament_live',
    'Le tournoi "' || NEW.title || '" est maintenant en direct. Cliquez pour rejoindre !',
    'tournament_join_now',
    '/tournaments/' || NEW.id,
    NEW.id,
    jsonb_build_object('tournament_title', NEW.title)
  FROM public.tournament_registrations tr
  WHERE tr.tournament_id = NEW.id
    AND tr.status = 'approved';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. create_bracket_update_notification
CREATE OR REPLACE FUNCTION public.create_bracket_update_notification()
RETURNS TRIGGER AS $$
DECLARE
  tournament_type TEXT;
  loser_user_id UUID;
  winner_team_id UUID;
  loser_team_id UUID;
  tournament_title TEXT;
  tournament_start_date TIMESTAMPTZ;
BEGIN
  IF NEW.winner_id IS NULL OR (OLD.winner_id IS NOT NULL AND OLD.winner_id = NEW.winner_id) THEN
    RETURN NEW;
  END IF;

  IF NEW.winner_id = NEW.player1_id THEN
    loser_user_id := NEW.player2_id;
  ELSE
    loser_user_id := NEW.player1_id;
  END IF;

  SELECT type, title, start_date
  INTO tournament_type, tournament_title, tournament_start_date
  FROM public.tournaments
  WHERE id = NEW.tournament_id;

  IF tournament_type = 'solo' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date, metadata)
    VALUES (
      NEW.winner_id,
      'notif.bracket_advance',
      'Félicitations ! Vous avez gagné votre match dans le tournoi "' || tournament_title || '".',
      'bracket_advance',
      '/tournaments/' || NEW.tournament_id || '?tab=bracket',
      NEW.tournament_id,
      tournament_start_date,
      jsonb_build_object('tournament_title', tournament_title, 'is_team', false)
    );
  ELSIF tournament_type = 'team' THEN
    SELECT id INTO winner_team_id
    FROM public.teams
    WHERE captain_id = NEW.winner_id AND tournament_id = NEW.tournament_id;

    IF winner_team_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date, metadata)
      SELECT
        tm.user_id,
        'notif.bracket_advance',
        'Félicitations ! Votre équipe a gagné son match dans le tournoi "' || tournament_title || '".',
        'bracket_advance',
        '/tournaments/' || NEW.tournament_id || '?tab=bracket',
        NEW.tournament_id,
        tournament_start_date,
        jsonb_build_object('tournament_title', tournament_title, 'is_team', true)
      FROM public.team_members tm
      WHERE tm.team_id = winner_team_id;
    END IF;
  END IF;

  IF loser_user_id IS NOT NULL THEN
    IF tournament_type = 'solo' THEN
      INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date, metadata)
      VALUES (
        loser_user_id,
        'notif.bracket_eliminated',
        'Dommage ! Vous avez été éliminé du tournoi "' || tournament_title || '".',
        'bracket_eliminated',
        '/tournaments/' || NEW.tournament_id || '?tab=bracket',
        NEW.tournament_id,
        tournament_start_date,
        jsonb_build_object('tournament_title', tournament_title, 'is_team', false)
      );
    ELSIF tournament_type = 'team' THEN
      SELECT id INTO loser_team_id
      FROM public.teams
      WHERE captain_id = loser_user_id AND tournament_id = NEW.tournament_id;

      IF loser_team_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date, metadata)
        SELECT
          tm.user_id,
          'notif.bracket_eliminated',
          'Dommage ! Votre équipe a été éliminée du tournoi "' || tournament_title || '".',
          'bracket_eliminated',
          '/tournaments/' || NEW.tournament_id || '?tab=bracket',
          NEW.tournament_id,
          tournament_start_date,
          jsonb_build_object('tournament_title', tournament_title, 'is_team', true)
        FROM public.team_members tm
        WHERE tm.team_id = loser_team_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. create_friend_request_notification
CREATE OR REPLACE FUNCTION public.create_friend_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_username TEXT;
  sender_avatar_url TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  SELECT username, avatar_url INTO sender_username, sender_avatar_url
  FROM users
  WHERE id = NEW.user_id_1;

  INSERT INTO public.notifications (user_id, title, message, type, link, related_id, read, metadata)
  VALUES (
    NEW.user_id_2,
    'notif.friend_request',
    sender_username || ' vous a envoyé une demande d''ami',
    'friend_request',
    '/profile/friends?tab=requests',
    NEW.id,
    false,
    jsonb_build_object('sender_username', sender_username)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. create_friend_accepted_notification
CREATE OR REPLACE FUNCTION public.create_friend_accepted_notification()
RETURNS TRIGGER AS $$
DECLARE
  acceptor_username TEXT;
  acceptor_avatar_url TEXT;
BEGIN
  IF NOT (OLD.status = 'pending' AND NEW.status = 'accepted') THEN
    RETURN NEW;
  END IF;

  SELECT username, avatar_url INTO acceptor_username, acceptor_avatar_url
  FROM users
  WHERE id = NEW.user_id_2;

  INSERT INTO public.notifications (user_id, title, message, type, link, related_id, read, metadata)
  VALUES (
    NEW.user_id_1,
    'notif.friend_accepted',
    acceptor_username || ' a accepté votre demande d''ami',
    'friend_accepted',
    '/profile/friends',
    NEW.id,
    false,
    jsonb_build_object('acceptor_username', acceptor_username)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. create_team_application_notification
CREATE OR REPLACE FUNCTION public.create_team_application_notification()
RETURNS TRIGGER AS $$
DECLARE
  tournament_start_date TIMESTAMPTZ;
  team_name TEXT;
  applicant_username TEXT;
BEGIN
  SELECT start_date INTO tournament_start_date
  FROM tournaments
  WHERE id = NEW.tournament_id;

  SELECT name INTO team_name FROM teams WHERE id = NEW.team_id;
  SELECT username INTO applicant_username FROM users WHERE id = NEW.user_id;

  IF OLD.status <> NEW.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date, metadata)
    VALUES (
      NEW.user_id,
      CASE
        WHEN NEW.status = 'accepted' THEN 'notif.team_app_accepted'
        WHEN NEW.status = 'rejected' THEN 'notif.team_app_rejected'
        ELSE 'notif.team_app_status_updated'
      END,
      CASE
        WHEN NEW.status = 'accepted' THEN 'Votre candidature pour rejoindre l''équipe "' || team_name || '" a été acceptée'
        WHEN NEW.status = 'rejected' THEN 'Votre candidature pour rejoindre l''équipe "' || team_name || '" a été refusée'
        ELSE 'Le statut de votre candidature a été mis à jour'
      END,
      CASE
        WHEN NEW.status = 'accepted' THEN 'team_accepted'
        WHEN NEW.status = 'rejected' THEN 'team_rejected'
        ELSE 'team_application'
      END,
      '/tournaments/' || NEW.tournament_id,
      NEW.team_id,
      tournament_start_date,
      jsonb_build_object('team_name', team_name)
    );

    IF NEW.status = 'accepted' THEN
      INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date, metadata)
      SELECT
        captain_id,
        'notif.team_member_joined',
        applicant_username || ' a rejoint votre équipe "' || teams.name || '"',
        'team_member_joined',
        '/tournaments/' || NEW.tournament_id,
        teams.id,
        tournament_start_date,
        jsonb_build_object('username', applicant_username, 'team_name', teams.name)
      FROM teams
      WHERE id = NEW.team_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. create_team_application_received_notification
CREATE OR REPLACE FUNCTION public.create_team_application_received_notification()
RETURNS TRIGGER AS $$
DECLARE
  team_record RECORD;
  tournament_record RECORD;
  applicant_username TEXT;
  applicant_message TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  SELECT id, name, captain_id, tournament_id, is_looking_for_players
  INTO team_record
  FROM teams
  WHERE id = NEW.team_id;

  IF team_record.is_looking_for_players = false THEN
    RETURN NEW;
  END IF;

  SELECT id, title, start_date
  INTO tournament_record
  FROM tournaments
  WHERE id = NEW.tournament_id;

  SELECT username INTO applicant_username
  FROM users
  WHERE id = NEW.user_id;

  applicant_message := CASE
    WHEN NEW.message IS NULL THEN ''
    WHEN LENGTH(NEW.message) > 50 THEN SUBSTRING(NEW.message FROM 1 FOR 47) || '...'
    ELSE NEW.message
  END;

  INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date, read, metadata)
  VALUES (
    team_record.captain_id,
    'notif.team_app_received',
    applicant_username || ' a postulé pour rejoindre votre équipe "' || team_record.name ||
    CASE WHEN applicant_message <> '' THEN '" avec le message: "' || applicant_message || '"'
    ELSE '"' END,
    'team_application',
    '/tournaments/' || tournament_record.id || '?tab=lfp',
    team_record.id,
    tournament_record.start_date,
    false,
    jsonb_build_object(
      'applicant_username', applicant_username,
      'team_name', team_record.name,
      'applicant_message', applicant_message
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. create_registration_status_notification
CREATE OR REPLACE FUNCTION public.create_registration_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  tournament_title TEXT;
  tournament_start_date TIMESTAMPTZ;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT title, start_date INTO tournament_title, tournament_start_date
  FROM tournaments
  WHERE id = NEW.tournament_id;

  INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date, metadata)
  VALUES (
    NEW.user_id,
    'notif.registration_status',
    'Votre inscription au tournoi "' || tournament_title || '" est maintenant ' ||
    CASE
      WHEN NEW.status = 'pending' THEN 'en attente de validation'
      WHEN NEW.status = 'approved' THEN 'approuvée'
      WHEN NEW.status = 'rejected' THEN 'refusée'
      ELSE NEW.status
    END,
    'registration_status',
    '/tournaments/' || NEW.tournament_id,
    NEW.tournament_id,
    tournament_start_date,
    jsonb_build_object('tournament_title', tournament_title, 'status', NEW.status)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. create_channel_invitation_notification
CREATE OR REPLACE FUNCTION public.create_channel_invitation_notification()
RETURNS TRIGGER AS $$
DECLARE
  ch_name TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT name INTO ch_name FROM channels WHERE id = NEW.channel_id;

    INSERT INTO public.notifications (user_id, title, message, type, link, related_id, metadata)
    VALUES (
      NEW.user_id,
      'notif.channel_invitation',
      'Vous avez été invité à rejoindre le canal ' || ch_name,
      'channel_invitation',
      '/communities',
      NEW.channel_id,
      jsonb_build_object('channel_name', ch_name)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. create_new_ticket_notification
CREATE OR REPLACE FUNCTION public.create_new_ticket_notification()
RETURNS TRIGGER AS $$
DECLARE
  ticket_creator_name TEXT;
BEGIN
  SELECT username INTO ticket_creator_name
  FROM users
  WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, title, message, type, link, related_id, metadata)
  SELECT
    users.id,
    'notif.new_ticket',
    ticket_creator_name || ' a créé un nouveau ticket: ' || NEW.subject,
    'new_ticket',
    '/admin/support/' || NEW.id,
    NEW.id,
    jsonb_build_object('creator_username', ticket_creator_name, 'ticket_subject', NEW.subject)
  FROM users
  WHERE users.type = 'admin';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. create_ticket_message_notification
CREATE OR REPLACE FUNCTION public.create_ticket_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  ticket_owner_id UUID;
  message_sender_name TEXT;
  ticket_subject TEXT;
BEGIN
  SELECT user_id, subject INTO ticket_owner_id, ticket_subject
  FROM support_tickets
  WHERE id = NEW.ticket_id;

  SELECT username INTO message_sender_name
  FROM users
  WHERE id = NEW.user_id;

  IF NEW.is_admin_message = true AND ticket_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, title, message, type, link, related_id, metadata)
    VALUES (
      ticket_owner_id,
      'notif.support_admin_reply',
      'Un administrateur a répondu à votre ticket: ' || ticket_subject,
      'support_message',
      '/profile/support/' || NEW.ticket_id,
      NEW.ticket_id,
      jsonb_build_object('ticket_subject', ticket_subject)
    );
  ELSIF NEW.is_admin_message = false THEN
    INSERT INTO notifications (user_id, title, message, type, link, related_id, metadata)
    SELECT
      users.id,
      'notif.support_user_message',
      message_sender_name || ' a envoyé un message sur le ticket: ' || ticket_subject,
      'support_message',
      '/admin/support/' || NEW.ticket_id,
      NEW.ticket_id,
      jsonb_build_object('sender_username', message_sender_name, 'ticket_subject', ticket_subject)
    FROM users
    WHERE users.type = 'admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
