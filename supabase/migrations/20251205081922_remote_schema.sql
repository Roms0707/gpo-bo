SET statement_timeout = 0
SET lock_timeout = 0
SET idle_in_transaction_session_timeout = 0
SET client_encoding = 'UTF8'
SET standard_conforming_strings = on
SELECT pg_catalog.set_config('search_path', '', false)
SET check_function_bodies = false
SET xmloption = content
SET client_min_messages = warning
SET row_security = off
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog"
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions"
COMMENT ON SCHEMA "public" IS 'standard public schema'
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions"
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql"
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions"
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions"
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault"
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions"
CREATE TYPE "public"."achievement_type" AS ENUM (
    'badge',
    'avatar',
    'title',
    'currency',
    'other'
)
ALTER TYPE "public"."achievement_type" OWNER TO "postgres"
CREATE TYPE "public"."admin_role_type" AS ENUM (
    'super_admin',
    'admin',
    'master_admin'
)
ALTER TYPE "public"."admin_role_type" OWNER TO "postgres"
CREATE TYPE "public"."quest_status" AS ENUM (
    'active',
    'completed',
    'failed'
)
ALTER TYPE "public"."quest_status" OWNER TO "postgres"
CREATE TYPE "public"."quest_type" AS ENUM (
    'profile_completion',
    'tournament_participation',
    'social_share',
    'win_match',
    'play_game',
    'daily',
    'weekly',
    'custom'
)
ALTER TYPE "public"."quest_type" OWNER TO "postgres"
CREATE TYPE "public"."unlock_condition_type" AS ENUM (
    'level_reached',
    'tournaments_completed',
    'profile_complete',
    'quest_completed',
    'custom_event',
    'win_tournament'
)
ALTER TYPE "public"."unlock_condition_type" OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."assign_starter_quests"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Attribuer les quêtes non-répétables aux nouveaux utilisateurs
    INSERT INTO public.user_quests (user_id, quest_id, status)
    SELECT NEW.id, q.id, 'active'
    FROM public.quests q
    WHERE q.is_active = true 
    AND q.is_repeatable = false
    AND q.quest_type IN ('profile_completion', 'tournament_participation', 'social_share');
    
    -- Débloquer automatiquement le premier achievement (Badge Novice)
    INSERT INTO public.user_achievements (user_id, achievement_id)
    SELECT NEW.id, a.id
    FROM public.achievements a
    WHERE a.unlock_condition_type = 'level_reached'
    AND a.unlock_condition_value = '1'
    AND a.type = 'badge'
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$
ALTER FUNCTION "public"."assign_starter_quests"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."award_xp_and_check_level"("target_user_id" "uuid", "xp_amount" integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_user_data RECORD;
    new_xp INTEGER;
    new_level INTEGER;
    old_level INTEGER;
    level_up BOOLEAN := FALSE;
    result JSON;
BEGIN
    -- Récupérer les données actuelles de l'utilisateur
    SELECT level, xp INTO current_user_data
    FROM public.users
    WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    old_level := current_user_data.level;
    new_xp := current_user_data.xp + xp_amount;
    new_level := public.calculate_level_from_xp(new_xp);
    
    -- Vérifier si l'utilisateur a monté de niveau
    IF new_level > old_level THEN
        level_up := TRUE;
    END IF;
    
    -- Mettre à jour l'utilisateur
    UPDATE public.users
    SET xp = new_xp, level = new_level
    WHERE id = target_user_id;
    
    -- Construire le résultat
    result := json_build_object(
        'success', true,
        'old_level', old_level,
        'new_level', new_level,
        'old_xp', current_user_data.xp,
        'new_xp', new_xp,
        'xp_gained', xp_amount,
        'level_up', level_up
    );
    
    RETURN result;
END;
$$
ALTER FUNCTION "public"."award_xp_and_check_level"("target_user_id" "uuid", "xp_amount" integer) OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."calculate_battle_royale_total_points"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.total_match_points = NEW.placement_points + NEW.elimination_points;
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."calculate_battle_royale_total_points"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."calculate_level_from_xp"("user_xp" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    calculated_level INTEGER := 1;
BEGIN
    SELECT COALESCE(MAX(level), 1)
    INTO calculated_level
    FROM public.xp_thresholds
    WHERE xp_required <= user_xp;
    
    RETURN calculated_level;
END;
$$
ALTER FUNCTION "public"."calculate_level_from_xp"("user_xp" integer) OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."check_and_unlock_achievements"("target_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_data RECORD;
    achievement_record RECORD;
    unlocked_achievements UUID[] := '{}';
    tournaments_count INTEGER;
    profile_completion_percentage INTEGER;
BEGIN
    -- Récupérer les données de l'utilisateur
    SELECT * INTO user_data FROM public.users WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Compter les tournois complétés
    SELECT COUNT(*) INTO tournaments_count
    FROM public.tournament_registrations tr
    JOIN public.tournaments t ON tr.tournament_id = t.id
    WHERE tr.user_id = target_user_id 
    AND tr.status = 'approved'
    AND t.status = 'past';
    
    -- Calculer le pourcentage de complétion du profil (simplifié)
    profile_completion_percentage := 0;
    IF user_data.username IS NOT NULL AND user_data.username != '' THEN
        profile_completion_percentage := profile_completion_percentage + 20;
    END IF;
    IF user_data.bio IS NOT NULL AND user_data.bio != '' THEN
        profile_completion_percentage := profile_completion_percentage + 20;
    END IF;
    IF user_data.country IS NOT NULL AND user_data.country != '' THEN
        profile_completion_percentage := profile_completion_percentage + 20;
    END IF;
    IF user_data.avatar_url IS NOT NULL AND user_data.avatar_url != '' THEN
        profile_completion_percentage := profile_completion_percentage + 20;
    END IF;
    IF user_data.discord_handle IS NOT NULL AND user_data.discord_handle != '' THEN
        profile_completion_percentage := profile_completion_percentage + 20;
    END IF;
    
    -- Parcourir tous les achievements actifs
    FOR achievement_record IN 
        SELECT * FROM public.achievements 
        WHERE is_active = true
        AND id NOT IN (
            SELECT achievement_id 
            FROM public.user_achievements 
            WHERE user_id = target_user_id
        )
    LOOP
        DECLARE
            should_unlock BOOLEAN := FALSE;
        BEGIN
            -- Vérifier les conditions de déblocage
            CASE achievement_record.unlock_condition_type
                WHEN 'level_reached' THEN
                    IF user_data.level >= achievement_record.unlock_condition_value::INTEGER THEN
                        should_unlock := TRUE;
                    END IF;
                WHEN 'tournaments_completed' THEN
                    IF tournaments_count >= achievement_record.unlock_condition_value::INTEGER THEN
                        should_unlock := TRUE;
                    END IF;
                WHEN 'profile_complete' THEN
                    IF profile_completion_percentage >= achievement_record.unlock_condition_value::INTEGER THEN
                        should_unlock := TRUE;
                    END IF;
                -- Ajouter d'autres conditions selon les besoins
                ELSE
                    -- Gérer les types de conditions non reconnus ou non implémentés
                    -- should_unlock reste FALSE par défaut
                    NULL; -- Ne fait rien, mais gère explicitement le cas
            END CASE;
            
            -- Débloquer l'achievement si les conditions sont remplies
            IF should_unlock THEN
                INSERT INTO public.user_achievements (user_id, achievement_id)
                VALUES (target_user_id, achievement_record.id)
                ON CONFLICT DO NOTHING;
                
                unlocked_achievements := array_append(unlocked_achievements, achievement_record.id);
            END IF;
        END;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'unlocked_achievements', unlocked_achievements,
        'total_unlocked', array_length(unlocked_achievements, 1)
    );
END;
$$
ALTER FUNCTION "public"."check_and_unlock_achievements"("target_user_id" "uuid") OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."cleanup_old_galaxy_api_logs"("retention_days" integer DEFAULT 90) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM galaxy_api_logs
  WHERE created_at < now() - (retention_days || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$
ALTER FUNCTION "public"."cleanup_old_galaxy_api_logs"("retention_days" integer) OWNER TO "postgres"
COMMENT ON FUNCTION "public"."cleanup_old_galaxy_api_logs"("retention_days" integer) IS 'Deletes logs older than specified retention period (default 90 days)'
CREATE OR REPLACE FUNCTION "public"."count_unread_messages"("user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  unread_count INT;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM messages
  WHERE receiver_id = user_id AND read = false;
  
  RETURN unread_count;
END;
$$
ALTER FUNCTION "public"."count_unread_messages"("user_id" "uuid") OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."create_bracket_update_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  tournament_type TEXT;
  loser_user_id UUID;
  winner_team_id UUID;
  loser_team_id UUID;
  tournament_title TEXT;
  tournament_start_date TIMESTAMPTZ;
BEGIN
  -- Only proceed if winner_id is set/updated and it's different from the old value
  IF NEW.winner_id IS NULL OR (OLD.winner_id IS NOT NULL AND OLD.winner_id = NEW.winner_id) THEN
    RETURN NEW;
  END IF;

  -- Determine the loser's ID
  IF NEW.winner_id = NEW.player1_id THEN
    loser_user_id := NEW.player2_id;
  ELSE
    loser_user_id := NEW.player1_id;
  END IF;

  -- Get tournament type, title, and start date
  SELECT type, title, start_date
  INTO tournament_type, tournament_title, tournament_start_date
  FROM public.tournaments
  WHERE id = NEW.tournament_id;

  -- Handle notifications for the winner
  IF tournament_type = 'solo' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date, read)
    VALUES (
      NEW.winner_id,
      'Avancement dans le bracket !',
      'Félicitations ! Vous avez gagné votre match dans le tournoi "' || tournament_title || '".',
      'bracket_advance',
      '/tournaments/' || NEW.tournament_id || '?tab=bracket',
      NEW.tournament_id,
      tournament_start_date,
      false
    );
  ELSIF tournament_type = 'team' THEN
    -- Find the winner's team ID (assuming winner_id is the captain_id)
    SELECT id INTO winner_team_id
    FROM public.teams
    WHERE captain_id = NEW.winner_id AND tournament_id = NEW.tournament_id;

    IF winner_team_id IS NOT NULL THEN
      -- Notify all members of the winning team
      INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date, read)
      SELECT
        tm.user_id,
        'Avancement dans le bracket !',
        'Félicitations ! Votre équipe a gagné son match dans le tournoi "' || tournament_title || '".',
        'bracket_advance',
        '/tournaments/' || NEW.tournament_id || '?tab=bracket',
        NEW.tournament_id,
        tournament_start_date,
        false
      FROM public.team_members tm
      WHERE tm.team_id = winner_team_id;
    END IF;
  END IF;

  -- Handle notifications for the loser (if exists)
  IF loser_user_id IS NOT NULL THEN
    IF tournament_type = 'solo' THEN
      INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date, read)
      VALUES (
        loser_user_id,
        'Élimination du tournoi',
        'Dommage ! Vous avez été éliminé du tournoi "' || tournament_title || '".',
        'bracket_eliminated',
        '/tournaments/' || NEW.tournament_id || '?tab=bracket',
        NEW.tournament_id,
        tournament_start_date,
        false
      );
    ELSIF tournament_type = 'team' THEN
      -- Find the loser's team ID (assuming loser_user_id is the captain_id)
      SELECT id INTO loser_team_id
      FROM public.teams
      WHERE captain_id = loser_user_id AND tournament_id = NEW.tournament_id;

      IF loser_team_id IS NOT NULL THEN
        -- Notify all members of the losing team
        INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date, read)
        SELECT
          tm.user_id,
          'Élimination du tournoi',
          'Dommage ! Votre équipe a été éliminée du tournoi "' || tournament_title || '".',
          'bracket_eliminated',
          '/tournaments/' || NEW.tournament_id || '?tab=bracket',
          NEW.tournament_id,
          tournament_start_date,
          false
        FROM public.team_members tm
        WHERE tm.team_id = loser_team_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."create_bracket_update_notification"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."create_channel_invitation_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      link,
      related_id
    )
    VALUES (
      NEW.user_id,
      'Invitation à un canal',
      (SELECT 'Vous avez été invité à rejoindre le canal ' || name FROM channels WHERE id = NEW.channel_id),
      'channel_invitation',
      '/communities',
      NEW.channel_id
    );
  END IF;
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."create_channel_invitation_notification"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."create_chat_attachments_bucket"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- This function will be executed by a separate script
  -- since we can't create buckets directly from SQL
  -- The script will use the Supabase JS client to create the bucket
  RAISE NOTICE 'Please run the following command to create the chat-attachments bucket:';
  RAISE NOTICE 'npx supabase storage create chat-attachments';
END;
$$
ALTER FUNCTION "public"."create_chat_attachments_bucket"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."create_friend_accepted_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  acceptor_username TEXT;
  acceptor_avatar_url TEXT;
BEGIN
  -- Only proceed if status changed from 'pending' to 'accepted'
  IF NOT (OLD.status = 'pending' AND NEW.status = 'accepted') THEN
    RETURN NEW;
  END IF;
  
  -- Get acceptor username and avatar
  SELECT username, avatar_url INTO acceptor_username, acceptor_avatar_url
  FROM users
  WHERE id = NEW.user_id_2;
  
  -- Create notification for the original sender
  INSERT INTO public.notifications (
    user_id, 
    title, 
    message, 
    type, 
    link, 
    related_id,
    read
  )
  VALUES (
    NEW.user_id_1,
    'Demande d''ami acceptée',
    acceptor_username || ' a accepté votre demande d''ami',
    'friend_accepted',
    '/profile/friends',
    NEW.id,
    false
  );
  
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."create_friend_accepted_notification"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."create_friend_request_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  sender_username TEXT;
  sender_avatar_url TEXT;
BEGIN
  -- Only proceed if this is a new relationship request (INSERT)
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Get sender username and avatar
  SELECT username, avatar_url INTO sender_username, sender_avatar_url
  FROM users
  WHERE id = NEW.user_id_1;
  
  -- Create notification for the recipient
  INSERT INTO public.notifications (
    user_id, 
    title, 
    message, 
    type, 
    link, 
    related_id,
    read
  )
  VALUES (
    NEW.user_id_2,
    'Nouvelle demande d''ami',
    sender_username || ' vous a envoyé une demande d''ami',
    'friend_request',
    '/profile/friends?tab=requests',
    NEW.id,
    false
  );
  
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."create_friend_request_notification"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."create_new_ticket_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  ticket_creator_name TEXT;
BEGIN
  -- Get the ticket creator's name
  SELECT username INTO ticket_creator_name
  FROM users
  WHERE id = NEW.user_id;
  
  -- Create notifications for all admins
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    link,
    related_id
  )
  SELECT 
    users.id,
    'Nouveau ticket de support',
    ticket_creator_name || ' a créé un nouveau ticket: ' || NEW.subject,
    'new_ticket',
    '/admin/support/' || NEW.id,
    NEW.id
  FROM users
  WHERE users.type = 'admin';
  
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."create_new_ticket_notification"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."create_registration_status_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  tournament_title TEXT;
  tournament_start_date TIMESTAMPTZ;
BEGIN
  -- Only proceed if status has changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get tournament information
  SELECT title, start_date INTO tournament_title, tournament_start_date
  FROM tournaments
  WHERE id = NEW.tournament_id;
  
  -- Create notification for the user
  INSERT INTO public.notifications (
    user_id, 
    title, 
    message, 
    type, 
    link, 
    related_id,
    start_date
  )
  VALUES (
    NEW.user_id,
    'Statut d''inscription modifié',
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
    tournament_start_date
  );
  
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."create_registration_status_notification"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."create_team_application_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  tournament_start_date TIMESTAMPTZ;
BEGIN
  -- Get tournament start date
  SELECT start_date INTO tournament_start_date
  FROM tournaments
  WHERE id = NEW.tournament_id;

  IF OLD.status <> NEW.status THEN
    -- Create notification for the applicant
    INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date)
    VALUES (
      NEW.user_id,
      CASE 
        WHEN NEW.status = 'accepted' THEN 'Candidature acceptée'
        WHEN NEW.status = 'rejected' THEN 'Candidature refusée'
        ELSE 'Statut de candidature mis à jour'
      END,
      CASE 
        WHEN NEW.status = 'accepted' THEN 'Votre candidature pour rejoindre l''équipe "' || (SELECT name FROM teams WHERE id = NEW.team_id) || '" a été acceptée'
        WHEN NEW.status = 'rejected' THEN 'Votre candidature pour rejoindre l''équipe "' || (SELECT name FROM teams WHERE id = NEW.team_id) || '" a été refusée'
        ELSE 'Le statut de votre candidature a été mis à jour'
      END,
      CASE 
        WHEN NEW.status = 'accepted' THEN 'team_accepted'
        WHEN NEW.status = 'rejected' THEN 'team_rejected'
        ELSE 'team_application'
      END,
      '/tournaments/' || NEW.tournament_id,
      NEW.team_id,
      tournament_start_date
    );
    
    -- If accepted, also create notification for team captain
    IF NEW.status = 'accepted' THEN
      INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date)
      SELECT 
        captain_id,
        'Nouveau membre dans l''équipe',
        (SELECT username FROM users WHERE id = NEW.user_id) || ' a rejoint votre équipe "' || teams.name || '"',
        'team_member_joined',
        '/tournaments/' || NEW.tournament_id,
        teams.id,
        tournament_start_date
      FROM teams
      WHERE id = NEW.team_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."create_team_application_notification"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."create_team_application_received_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  team_record RECORD;
  tournament_record RECORD;
  applicant_username TEXT;
  applicant_message TEXT;
BEGIN
  -- Only proceed if this is a new application (INSERT)
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Get team information including captain_id
  SELECT id, name, captain_id, tournament_id, is_looking_for_players 
  INTO team_record
  FROM teams
  WHERE id = NEW.team_id;
  
  -- Only send notification if team is looking for players
  IF team_record.is_looking_for_players = false THEN
    RETURN NEW;
  END IF;
  
  -- Get tournament information
  SELECT id, title, start_date 
  INTO tournament_record
  FROM tournaments
  WHERE id = NEW.tournament_id;
  
  -- Get applicant username
  SELECT username INTO applicant_username
  FROM users
  WHERE id = NEW.user_id;
  
  -- Get application message (truncate if too long)
  applicant_message := CASE 
    WHEN NEW.message IS NULL THEN ''
    WHEN LENGTH(NEW.message) > 50 THEN SUBSTRING(NEW.message FROM 1 FOR 47) || '...'
    ELSE NEW.message
  END;
  
  -- Create notification for the team captain
  INSERT INTO public.notifications (
    user_id, 
    title, 
    message, 
    type, 
    link, 
    related_id,
    start_date,
    read
  )
  VALUES (
    team_record.captain_id,
    'Nouvelle candidature',
    applicant_username || ' a postulé pour rejoindre votre équipe "' || team_record.name || 
    CASE WHEN applicant_message <> '' THEN '" avec le message: "' || applicant_message || '"'
    ELSE '"' END,
    'team_application',
    '/tournaments/' || tournament_record.id || '?tab=lfp',
    team_record.id,
    tournament_record.start_date,
    false
  );
  
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."create_team_application_received_notification"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."create_ticket_message_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  ticket_owner_id UUID;
  message_sender_name TEXT;
  ticket_subject TEXT;
BEGIN
  -- Get the ticket owner
  SELECT user_id, subject INTO ticket_owner_id, ticket_subject
  FROM support_tickets
  WHERE id = NEW.ticket_id;
  
  -- Get the message sender's name
  SELECT username INTO message_sender_name
  FROM users
  WHERE id = NEW.user_id;
  
  -- If the message is from an admin and the recipient is not the admin
  IF NEW.is_admin_message = true AND ticket_owner_id != NEW.user_id THEN
    -- Create notification for the ticket owner
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      link,
      related_id
    ) VALUES (
      ticket_owner_id,
      'Nouvelle réponse du support',
      'Un administrateur a répondu à votre ticket: ' || ticket_subject,
      'support_message',
      '/profile/support/' || NEW.ticket_id,
      NEW.ticket_id
    );
  -- If the message is from a user and not an admin message
  ELSIF NEW.is_admin_message = false THEN
    -- Create notifications for all admins
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      link,
      related_id
    )
    SELECT 
      users.id,
      'Nouveau message de support',
      message_sender_name || ' a envoyé un message sur le ticket: ' || ticket_subject,
      'support_message',
      '/admin/support/' || NEW.ticket_id,
      NEW.ticket_id
    FROM users
    WHERE users.type = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."create_ticket_message_notification"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."create_tournament_join_now_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Insert notifications for all approved users registered to this tournament
  INSERT INTO public.notifications (user_id, title, message, type, link, related_id)
  SELECT 
    tr.user_id,
    'Tournoi en direct ! 🎮',
    'Le tournoi "' || NEW.title || '" est maintenant en direct. Cliquez pour rejoindre !',
    'tournament_join_now',
    '/tournaments/' || NEW.id,
    NEW.id
  FROM public.tournament_registrations tr
  WHERE tr.tournament_id = NEW.id 
    AND tr.status = 'approved';

  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."create_tournament_join_now_notification"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."create_tournament_start_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- For each registered user with approved status, create a notification
  INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date)
  SELECT 
    user_id,
    'Tournoi commence bientôt',
    'Le tournoi "' || NEW.title || '" va commencer bientôt. Préparez-vous !',
    'tournament_start',
    '/tournaments/' || NEW.id,
    NEW.id,
    NEW.start_date
  FROM tournament_registrations
  WHERE tournament_id = NEW.id AND status = 'approved';
  
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."create_tournament_start_notification"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."create_tournament_status_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.status <> NEW.status THEN
    -- For each registered user, create a notification
    INSERT INTO public.notifications (user_id, title, message, type, link, related_id, start_date)
    SELECT 
      user_id,
      'Statut du tournoi mis à jour',
      'Le tournoi "' || (SELECT title FROM tournaments WHERE id = NEW.id) || '" est maintenant ' || 
      CASE 
        WHEN NEW.status = 'upcoming' THEN 'à venir'
        WHEN NEW.status = 'active' THEN 'en cours'
        WHEN NEW.status = 'past' THEN 'terminé'
        ELSE NEW.status
      END,
      'tournament_update',
      '/tournaments/' || NEW.id,
      NEW.id,
      NEW.start_date
    FROM tournament_registrations
    WHERE tournament_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."create_tournament_status_notification"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."enforce_single_default_config"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If setting a config to default, unset all others
  IF NEW.is_default = true THEN
    UPDATE project_configurations 
    SET is_default = false 
    WHERE id != NEW.id AND is_default = true;
  END IF;
  
  -- Ensure domain is null if is_default is true
  IF NEW.is_default = true AND NEW.domain IS NOT NULL THEN
    RAISE EXCEPTION 'Configuration cannot have both a domain and be set as default';
  END IF;
  
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."enforce_single_default_config"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."ensure_single_active_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
IF NEW.is_active = true THEN
UPDATE featured_events
SET is_active = false
WHERE id != NEW.id AND is_active = true;
END IF;
RETURN NEW;
END;
$$
ALTER FUNCTION "public"."ensure_single_active_event"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."execute_sql"("query" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result json;
BEGIN
  EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$$
ALTER FUNCTION "public"."execute_sql"("query" "text") OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."generate_share_token"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
token text;
exists boolean;
BEGIN
LOOP
token := encode(gen_random_bytes(24), 'base64');
token := regexp_replace(token, '[^a-zA-Z0-9]', '', 'g');
token := substring(token from 1 for 32);

SELECT EXISTS(SELECT 1 FROM report_shares WHERE share_token = token) INTO exists;

EXIT WHEN NOT exists;
END LOOP;

RETURN token;
END;
$$
ALTER FUNCTION "public"."generate_share_token"() OWNER TO "postgres"
SET default_tablespace = ''
SET default_table_access_method = "heap"
CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "receiver_id" "uuid",
    "content" "text" NOT NULL,
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "file_url" "text",
    "file_name" "text",
    "file_type" "text",
    "channel_id" "uuid",
    "type" "text" DEFAULT 'direct'::"text",
    CONSTRAINT "messages_type_check" CHECK (("type" = ANY (ARRAY['direct'::"text", 'channel'::"text"])))
)
ALTER TABLE "public"."messages" OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."get_chat_history"("user1_id" "uuid", "user2_id" "uuid", "page_size" integer, "page_number" integer) RETURNS SETOF "public"."messages"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM messages
  WHERE (sender_id = user1_id AND receiver_id = user2_id)
     OR (sender_id = user2_id AND receiver_id = user1_id)
  ORDER BY created_at DESC
  LIMIT page_size
  OFFSET (page_number - 1) * page_size;
END;
$$
ALTER FUNCTION "public"."get_chat_history"("user1_id" "uuid", "user2_id" "uuid", "page_size" integer, "page_number" integer) OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."get_config_by_domain"("domain_name" "text") RETURNS TABLE("id" "uuid", "config_id" character varying, "config_name" character varying, "is_active" boolean, "brand_name" character varying, "logo_path" character varying, "favicon_path" character varying, "logo_alt_text" character varying, "primary_color" character varying, "secondary_color" character varying, "product_id" character varying, "campaign_id" character varying, "domain" character varying, "is_default" boolean, "extra_metadata" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.config_id,
    pc.config_name,
    pc.is_active,
    pc.brand_name,
    pc.logo_path,
    pc.favicon_path,
    pc.logo_alt_text,
    pc.primary_color,
    pc.secondary_color,
    pc.product_id,
    pc.campaign_id,
    pc.domain,
    pc.is_default,
    pc.extra_metadata,
    pc.created_at,
    pc.updated_at
  FROM project_configurations pc
  WHERE pc.domain = LOWER(domain_name)
    AND pc.is_active = true
  LIMIT 1;
END;
$$
ALTER FUNCTION "public"."get_config_by_domain"("domain_name" "text") OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."get_default_config"() RETURNS TABLE("id" "uuid", "config_id" character varying, "config_name" character varying, "is_active" boolean, "brand_name" character varying, "logo_path" character varying, "favicon_path" character varying, "logo_alt_text" character varying, "primary_color" character varying, "secondary_color" character varying, "product_id" character varying, "campaign_id" character varying, "domain" character varying, "is_default" boolean, "extra_metadata" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.config_id,
    pc.config_name,
    pc.is_active,
    pc.brand_name,
    pc.logo_path,
    pc.favicon_path,
    pc.logo_alt_text,
    pc.primary_color,
    pc.secondary_color,
    pc.product_id,
    pc.campaign_id,
    pc.domain,
    pc.is_default,
    pc.extra_metadata,
    pc.created_at,
    pc.updated_at
  FROM project_configurations pc
  WHERE pc.is_default = true
    AND pc.is_active = true
  LIMIT 1;
END;
$$
ALTER FUNCTION "public"."get_default_config"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."get_eligible_lucky_losers"("p_tournament_id" "uuid", "p_round" integer) RETURNS TABLE("player_id" "uuid", "elo_at_elimination" integer, "eliminated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    be.player_id,
    be.elo_at_elimination,
    be.eliminated_at
  FROM bracket_eliminations be
  WHERE be.tournament_id = p_tournament_id
    AND be.eliminated_round = p_round
    AND be.reintegrated = false
  ORDER BY 
    be.elo_at_elimination DESC NULLS LAST,
    be.eliminated_at DESC
  LIMIT 1;
END;
$$
ALTER FUNCTION "public"."get_eligible_lucky_losers"("p_tournament_id" "uuid", "p_round" integer) OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."get_galaxy_api_stats"("p_campaign_id" "text" DEFAULT NULL::"text", "p_start_date" timestamp with time zone DEFAULT ("now"() - '7 days'::interval), "p_end_date" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("total_calls" bigint, "successful_calls" bigint, "failed_calls" bigint, "avg_duration_ms" numeric, "max_duration_ms" integer, "min_duration_ms" integer, "error_rate" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_calls,
    COUNT(*) FILTER (WHERE success = true)::bigint as successful_calls,
    COUNT(*) FILTER (WHERE success = false)::bigint as failed_calls,
    ROUND(AVG(duration_ms), 2) as avg_duration_ms,
    MAX(duration_ms) as max_duration_ms,
    MIN(duration_ms) as min_duration_ms,
    ROUND(
      (COUNT(*) FILTER (WHERE success = false)::numeric / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as error_rate
  FROM galaxy_api_logs
  WHERE created_at BETWEEN p_start_date AND p_end_date
    AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id);
END;
$$
ALTER FUNCTION "public"."get_galaxy_api_stats"("p_campaign_id" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres"
COMMENT ON FUNCTION "public"."get_galaxy_api_stats"("p_campaign_id" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) IS 'Returns aggregated statistics for Galaxy API calls within a date range'
CREATE OR REPLACE FUNCTION "public"."get_recent_galaxy_api_errors"("p_limit" integer DEFAULT 50, "p_campaign_id" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "endpoint" "text", "error_message" "text", "response_status" integer, "campaign_id" "text", "log_created_at" timestamp with time zone, "duration_ms" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.endpoint,
    l.error_message,
    l.response_status,
    l.campaign_id,
    l.created_at as log_created_at,
    l.duration_ms
  FROM galaxy_api_logs l
  WHERE l.success = false
    AND (p_campaign_id IS NULL OR l.campaign_id = p_campaign_id)
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$
ALTER FUNCTION "public"."get_recent_galaxy_api_errors"("p_limit" integer, "p_campaign_id" "text") OWNER TO "postgres"
COMMENT ON FUNCTION "public"."get_recent_galaxy_api_errors"("p_limit" integer, "p_campaign_id" "text") IS 'Returns the most recent failed API calls for debugging'
CREATE OR REPLACE FUNCTION "public"."get_user_tournament_status"("user_id" "uuid", "tournament_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  reg_status TEXT;
BEGIN
  SELECT status INTO reg_status
  FROM tournament_registrations
  WHERE user_id = $1 AND tournament_id = $2
  LIMIT 1;
  
  RETURN COALESCE(reg_status, 'not_registered');
END;
$_$
ALTER FUNCTION "public"."get_user_tournament_status"("user_id" "uuid", "tournament_id" "uuid") OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."handle_profile_update_xp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Vérifier si c'est la première fois que certains champs sont remplis
    IF OLD.bio IS NULL AND NEW.bio IS NOT NULL AND NEW.bio != '' THEN
        PERFORM public.award_xp_and_check_level(NEW.id, 25);
    END IF;
    
    IF OLD.avatar_url IS NULL AND NEW.avatar_url IS NOT NULL AND NEW.avatar_url != '' THEN
        PERFORM public.award_xp_and_check_level(NEW.id, 25);
    END IF;
    
    IF OLD.discord_handle IS NULL AND NEW.discord_handle IS NOT NULL AND NEW.discord_handle != '' THEN
        PERFORM public.award_xp_and_check_level(NEW.id, 15);
    END IF;
    
    -- Vérifier les achievements après mise à jour du profil
    PERFORM public.check_and_unlock_achievements(NEW.id);
    
    RETURN NEW;
END;
$$
ALTER FUNCTION "public"."handle_profile_update_xp"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."handle_tournament_registration_xp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Attribuer 50 XP pour l'inscription à un tournoi
    PERFORM public.award_xp_and_check_level(NEW.user_id, 50);
    
    -- Vérifier les achievements
    PERFORM public.check_and_unlock_achievements(NEW.user_id);
    
    RETURN NEW;
END;
$$
ALTER FUNCTION "public"."handle_tournament_registration_xp"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."mask_sensitive_params"("params" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  masked_params jsonb;
BEGIN
  masked_params := params;

  -- Mask API keys and secrets
  IF masked_params ? 'api_key' THEN
    masked_params := jsonb_set(masked_params, '{api_key}', '"***MASKED***"'::jsonb);
  END IF;

  IF masked_params ? 'api_secret_key' THEN
    masked_params := jsonb_set(masked_params, '{api_secret_key}', '"***MASKED***"'::jsonb);
  END IF;

  IF masked_params ? 'secret' THEN
    masked_params := jsonb_set(masked_params, '{secret}', '"***MASKED***"'::jsonb);
  END IF;

  IF masked_params ? 'password' THEN
    masked_params := jsonb_set(masked_params, '{password}', '"***MASKED***"'::jsonb);
  END IF;

  RETURN masked_params;
END;
$$
ALTER FUNCTION "public"."mask_sensitive_params"("params" "jsonb") OWNER TO "postgres"
COMMENT ON FUNCTION "public"."mask_sensitive_params"("params" "jsonb") IS 'Masks sensitive data like API keys and passwords in request parameters'
CREATE OR REPLACE FUNCTION "public"."promote_backup_player"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
tournament_rec RECORD;
backup_player_rec RECORD;
active_count INTEGER;
BEGIN
IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
SELECT t.allow_backups, t.max_nb_players
INTO tournament_rec
FROM tournaments t
WHERE t.id = NEW.tournament_id;

IF tournament_rec.allow_backups THEN
SELECT COUNT(*)
INTO active_count
FROM tournament_registrations
WHERE tournament_id = NEW.tournament_id
AND status = 'approved';

IF active_count < tournament_rec.max_nb_players THEN
SELECT id
INTO backup_player_rec
FROM tournament_registrations
WHERE tournament_id = NEW.tournament_id
AND status = 'backup'
ORDER BY registration_order ASC
LIMIT 1;

IF backup_player_rec.id IS NOT NULL THEN
UPDATE tournament_registrations
SET status = 'approved'
WHERE id = backup_player_rec.id;
END IF;
END IF;
END IF;
END IF;

RETURN NEW;
END;
$$
ALTER FUNCTION "public"."promote_backup_player"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."record_player_elimination"("p_tournament_id" "uuid", "p_player_id" "uuid", "p_round" integer, "p_elo" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_elimination_id UUID;
BEGIN
  INSERT INTO bracket_eliminations (
    tournament_id,
    player_id,
    eliminated_round,
    elo_at_elimination
  )
  VALUES (
    p_tournament_id,
    p_player_id,
    p_round,
    p_elo
  )
  RETURNING id INTO v_elimination_id;
  
  RETURN v_elimination_id;
END;
$$
ALTER FUNCTION "public"."record_player_elimination"("p_tournament_id" "uuid", "p_player_id" "uuid", "p_round" integer, "p_elo" integer) OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."reintegrate_lucky_loser"("p_elimination_id" "uuid", "p_reintegrated_round" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE bracket_eliminations
  SET 
    reintegrated = true,
    reintegrated_at = NOW(),
    reintegrated_in_round = p_reintegrated_round
  WHERE id = p_elimination_id
    AND reintegrated = false;
  
  RETURN FOUND;
END;
$$
ALTER FUNCTION "public"."reintegrate_lucky_loser"("p_elimination_id" "uuid", "p_reintegrated_round" integer) OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."set_registration_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
IF NEW.registration_order IS NULL THEN
SELECT COALESCE(MAX(registration_order), 0) + 1
INTO NEW.registration_order
FROM tournament_registrations
WHERE tournament_id = NEW.tournament_id;
END IF;
RETURN NEW;
END;
$$
ALTER FUNCTION "public"."set_registration_order"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."update_admin_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."update_admin_settings_updated_at"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."update_country_whitelist_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."update_country_whitelist_updated_at"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."update_featured_events_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$
ALTER FUNCTION "public"."update_featured_events_updated_at"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."update_round_timer_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
ALTER FUNCTION "public"."update_round_timer_timestamp"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."update_support_ticket_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."update_support_ticket_updated_at"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."update_tournament_feedback_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."update_tournament_feedback_updated_at"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$
ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."update_user_export_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$
ALTER FUNCTION "public"."update_user_export_preferences_updated_at"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."update_user_relationship_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$
ALTER FUNCTION "public"."update_user_relationship_updated_at"() OWNER TO "postgres"
CREATE OR REPLACE FUNCTION "public"."update_virtual_currency_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
INSERT INTO user_virtual_currency (user_id, balance, lifetime_earned, lifetime_spent, updated_at)
VALUES (
NEW.user_id,
CASE WHEN NEW.amount > 0 THEN NEW.amount ELSE 0 END,
CASE WHEN NEW.amount > 0 THEN NEW.amount ELSE 0 END,
CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END,
now()
)
ON CONFLICT (user_id) DO UPDATE SET
balance = user_virtual_currency.balance + NEW.amount,
lifetime_earned = CASE 
WHEN NEW.amount > 0 THEN user_virtual_currency.lifetime_earned + NEW.amount
ELSE user_virtual_currency.lifetime_earned
END,
lifetime_spent = CASE 
WHEN NEW.amount < 0 THEN user_virtual_currency.lifetime_spent + ABS(NEW.amount)
ELSE user_virtual_currency.lifetime_spent
END,
updated_at = now();

RETURN NEW;
END;
$$
ALTER FUNCTION "public"."update_virtual_currency_balance"() OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "type" "public"."achievement_type" NOT NULL,
    "image_url" "text",
    "unlock_condition_type" "public"."unlock_condition_type" NOT NULL,
    "unlock_condition_value" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."achievements" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "activity_data" "jsonb" DEFAULT '{}'::"jsonb",
    "xp_earned" integer DEFAULT 0,
    "gems_earned" integer DEFAULT 0,
    "is_public" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."activity_log" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."admin_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "site_name" "text" DEFAULT 'Gaming Tournaments'::"text",
    "support_email" "text" DEFAULT 'support@gamingtournaments.com'::"text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "language" "text" DEFAULT 'en'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."admin_settings" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."aim_trainer_scores" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "score" integer NOT NULL
)
ALTER TABLE "public"."aim_trainer_scores" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."battle_pass_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "reward_type" "text" NOT NULL,
    "image_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "rarity" "text" DEFAULT 'common'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "battle_pass_rewards_rarity_check" CHECK (("rarity" = ANY (ARRAY['common'::"text", 'rare'::"text", 'epic'::"text", 'legendary'::"text"]))),
    CONSTRAINT "battle_pass_rewards_reward_type_check" CHECK (("reward_type" = ANY (ARRAY['xp_boost'::"text", 'avatar'::"text", 'profile_banner'::"text", 'profile_frame'::"text", 'profile_badge'::"text", 'other'::"text"])))
)
ALTER TABLE "public"."battle_pass_rewards" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."battle_pass_seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_number" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "theme" "text",
    "image_url" "text",
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "total_tiers" integer DEFAULT 50,
    "premium_cost" integer DEFAULT 1000,
    "is_active" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "battle_pass_seasons_total_tiers_check" CHECK (("total_tiers" > 0))
)
ALTER TABLE "public"."battle_pass_seasons" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."battle_pass_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "tier_number" integer NOT NULL,
    "xp_required" integer NOT NULL,
    "free_rewards" "jsonb" DEFAULT '[]'::"jsonb",
    "premium_rewards" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "battle_pass_tiers_tier_number_check" CHECK (("tier_number" >= 0)),
    CONSTRAINT "battle_pass_tiers_xp_required_check" CHECK (("xp_required" >= 0))
)
ALTER TABLE "public"."battle_pass_tiers" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."battle_royale_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "game_id" "uuid" NOT NULL,
    "match_number" integer NOT NULL,
    "player_id" "uuid" NOT NULL,
    "placement" integer NOT NULL,
    "eliminations" integer DEFAULT 0 NOT NULL,
    "placement_points" integer DEFAULT 0 NOT NULL,
    "elimination_points" integer DEFAULT 0 NOT NULL,
    "total_match_points" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "battle_royale_results_eliminations_check" CHECK (("eliminations" >= 0)),
    CONSTRAINT "battle_royale_results_match_number_check" CHECK ((("match_number" >= 1) AND ("match_number" <= 3))),
    CONSTRAINT "battle_royale_results_placement_check" CHECK (("placement" >= 1))
)
ALTER TABLE "public"."battle_royale_results" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."bracket_eliminations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "eliminated_round" integer NOT NULL,
    "eliminated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "elo_at_elimination" integer,
    "reintegrated" boolean DEFAULT false NOT NULL,
    "reintegrated_at" timestamp with time zone,
    "reintegrated_in_round" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
)
ALTER TABLE "public"."bracket_eliminations" OWNER TO "postgres"
COMMENT ON TABLE "public"."bracket_eliminations" IS 'Tracks eliminated players for lucky loser mechanics in tournaments'
CREATE TABLE IF NOT EXISTS "public"."bracket_modifications_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "match_id" "uuid",
    "round" integer NOT NULL,
    "modification_type" "text" NOT NULL,
    "previous_state" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "new_state" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "reason" "text",
    "modified_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bracket_modifications_log_modification_type_check" CHECK (("modification_type" = ANY (ARRAY['player_swap'::"text", 'player_reassign'::"text", 'bye_fill'::"text", 'manual_move'::"text", 'cross_round_move'::"text"])))
)
ALTER TABLE "public"."bracket_modifications_log" OWNER TO "postgres"
COMMENT ON TABLE "public"."bracket_modifications_log" IS 'Audit log for all manual bracket modifications across rounds. Enables tracking of BYE management and player reorganizations.'
CREATE TABLE IF NOT EXISTS "public"."bracket_round_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "round_number" integer NOT NULL,
    "notification_type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bracket_round_notifications_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['round_started'::"text", 'round_completed'::"text", 'round_expired'::"text", 'round_extended'::"text", 'round_paused'::"text", 'round_resumed'::"text"]))),
    CONSTRAINT "bracket_round_notifications_round_number_check" CHECK (("round_number" > 0))
)
ALTER TABLE "public"."bracket_round_notifications" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."bracket_round_timers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "round_number" integer NOT NULL,
    "duration_minutes" integer DEFAULT 60 NOT NULL,
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "paused_at" timestamp with time zone,
    "paused_remaining_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bracket_round_timers_duration_minutes_check" CHECK (("duration_minutes" > 0)),
    CONSTRAINT "bracket_round_timers_round_number_check" CHECK (("round_number" > 0)),
    CONSTRAINT "bracket_round_timers_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'completed'::"text", 'paused'::"text", 'expired'::"text"])))
)
ALTER TABLE "public"."bracket_round_timers" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."channel_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "channel_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'accepted'::"text" NOT NULL,
    CONSTRAINT "channel_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text"]))),
    CONSTRAINT "channel_members_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
)
ALTER TABLE "public"."channel_members" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "is_private" boolean DEFAULT false,
    "is_community" boolean DEFAULT false,
    "image_url" "text"
)
ALTER TABLE "public"."channels" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."coaching_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_date" timestamp with time zone DEFAULT "now"(),
    "topic" "text",
    "initial_assessment" "text",
    "recommendations" "jsonb",
    "api_data_snapshot" "jsonb",
    "coach_notes" "text",
    "status" "text" DEFAULT 'completed'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."coaching_sessions" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."country_configurations" (
    "country_code" character varying(10) NOT NULL,
    "country_name" character varying(100) NOT NULL,
    "is_active" boolean DEFAULT true,
    "brand_name" character varying(200) NOT NULL,
    "logo_path" character varying(500) NOT NULL,
    "favicon_path" character varying(500) NOT NULL,
    "logo_alt_text" character varying(200) NOT NULL,
    "theme_colors" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "locale_language" character varying(10) DEFAULT 'en_EN'::character varying NOT NULL,
    "locale_currency" character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    "locale_text_direction" character varying(3) DEFAULT 'ltr'::character varying NOT NULL,
    "galaxy_campaign_id" character varying(50),
    "galaxy_service_id" character varying(50),
    "galaxy_country_code" character varying(10),
    "galaxy_language_code" character varying(10),
    "extra_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."country_configurations" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."country_whitelist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "country_code" "text" NOT NULL,
    "country_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
)
ALTER TABLE "public"."country_whitelist" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."currency_shop_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "item_category" "text" NOT NULL,
    "item_type" "text" NOT NULL,
    "price" integer NOT NULL,
    "rarity" "text" DEFAULT 'common'::"text" NOT NULL,
    "icon" "text",
    "image_url" "text",
    "preview_data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_limited_time" boolean DEFAULT false,
    "available_until" timestamp with time zone,
    "is_available" boolean DEFAULT true,
    "stock_limit" integer,
    "purchase_count" integer DEFAULT 0,
    "sort_order" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "currency_shop_items_price_check" CHECK (("price" >= 0))
)
ALTER TABLE "public"."currency_shop_items" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."currency_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "balance_after" integer NOT NULL,
    "transaction_type" "text" NOT NULL,
    "source" "text" NOT NULL,
    "source_id" "uuid",
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."currency_transactions" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."daily_login_tracker" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "login_date" "date" NOT NULL,
    "streak_count" integer DEFAULT 1,
    "gems_earned" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."daily_login_tracker" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."dba-test" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
)
ALTER TABLE "public"."dba-test" OWNER TO "postgres"
ALTER TABLE "public"."dba-test" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."dba-test_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
)
CREATE TABLE IF NOT EXISTS "public"."featured_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid",
    "is_active" boolean DEFAULT false,
    "banner_image_url" "text",
    "event_subtitle" "text",
    "phase_1_label" "text" DEFAULT 'Inscription'::"text",
    "phase_1_date" timestamp with time zone NOT NULL,
    "phase_2_label" "text" DEFAULT 'Phase Qualificative'::"text",
    "phase_2_date" timestamp with time zone NOT NULL,
    "phase_3_label" "text" DEFAULT 'Finale'::"text",
    "phase_3_date" timestamp with time zone NOT NULL,
    "phase_3_end_date" timestamp with time zone NOT NULL,
    "cta_text" "text" DEFAULT 'Participer au tournoi'::"text",
    "cta_link" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "eligible_countries" "text"
)
ALTER TABLE "public"."featured_events" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."galaxy_api_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "endpoint" "text" NOT NULL,
    "method" "text" DEFAULT 'GET'::"text" NOT NULL,
    "request_params" "jsonb" DEFAULT '{}'::"jsonb",
    "response_status" integer,
    "response_body" "jsonb",
    "response_headers" "jsonb" DEFAULT '{}'::"jsonb",
    "error_message" "text",
    "duration_ms" integer,
    "campaign_id" "text",
    "project_config_id" "uuid",
    "success" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
)
ALTER TABLE "public"."galaxy_api_logs" OWNER TO "postgres"
COMMENT ON TABLE "public"."galaxy_api_logs" IS 'Logs all Galaxy API calls for debugging, monitoring, and audit purposes'
COMMENT ON COLUMN "public"."galaxy_api_logs"."request_params" IS 'Request parameters with sensitive data masked by mask_sensitive_params()'
COMMENT ON COLUMN "public"."galaxy_api_logs"."duration_ms" IS 'Total request duration in milliseconds, including network latency'
COMMENT ON COLUMN "public"."galaxy_api_logs"."success" IS 'True if the API call completed successfully (2xx status), false otherwise'
CREATE TABLE IF NOT EXISTS "public"."galaxy_rubric_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rubric_id" "text" NOT NULL,
    "game_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "project_config_id" "uuid" NOT NULL
)
ALTER TABLE "public"."galaxy_rubric_mappings" OWNER TO "postgres"
COMMENT ON TABLE "public"."galaxy_rubric_mappings" IS 'Maps games to rubrics within project configurations. Each game in a project can have multiple rubrics assigned.'
COMMENT ON COLUMN "public"."galaxy_rubric_mappings"."id" IS 'Unique identifier for this mapping.'
COMMENT ON COLUMN "public"."galaxy_rubric_mappings"."rubric_id" IS 'Galaxy API rubric identifier (retrieved from campaign rubrics endpoint).'
COMMENT ON COLUMN "public"."galaxy_rubric_mappings"."game_id" IS 'Required. Links this rubric mapping to a specific game within the project.'
COMMENT ON COLUMN "public"."galaxy_rubric_mappings"."created_at" IS 'Timestamp when this mapping was created.'
COMMENT ON COLUMN "public"."galaxy_rubric_mappings"."project_config_id" IS 'Required. Links this rubric mapping to a specific project configuration.'
CREATE TABLE IF NOT EXISTS "public"."game_api_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "api_name" "text" NOT NULL,
    "api_url" "text" NOT NULL,
    "api_key" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."game_api_integrations" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."game_contents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "content_type" "text" NOT NULL,
    "content_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "playlist_image_url" "text",
    "article_text" "text",
    "article_image_url" "text",
    "galaxy_content_id" "text",
    "galaxy_rubric_id" "text",
    "duration" integer,
    "theme_label" "text",
    "product_year" integer,
    "product_country" "text",
    "galaxy_content_type" "text",
    "extra_data" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "game_contents_content_type_check" CHECK (("content_type" = ANY (ARRAY['image'::"text", 'video'::"text", 'playlist'::"text", 'news'::"text"])))
)
ALTER TABLE "public"."game_contents" OWNER TO "postgres"
COMMENT ON COLUMN "public"."game_contents"."galaxy_content_id" IS 'ID du contenu dans l''API Galaxy'
COMMENT ON COLUMN "public"."game_contents"."galaxy_rubric_id" IS 'ID de la rubrique dans l''API Galaxy'
COMMENT ON COLUMN "public"."game_contents"."duration" IS 'Durée de la vidéo en secondes'
COMMENT ON COLUMN "public"."game_contents"."theme_label" IS 'Label du thème/catégorie Galaxy'
COMMENT ON COLUMN "public"."game_contents"."product_year" IS 'Année de production du contenu'
COMMENT ON COLUMN "public"."game_contents"."product_country" IS 'Pays de production (séparés par des virgules)'
COMMENT ON COLUMN "public"."game_contents"."galaxy_content_type" IS 'Type de contenu technique Galaxy'
COMMENT ON COLUMN "public"."game_contents"."extra_data" IS 'Données supplémentaires de Galaxy au format JSON'
CREATE TABLE IF NOT EXISTS "public"."game_publisher_id_for_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "game_id" "uuid" NOT NULL,
    "game_publisher_id" "uuid" NOT NULL,
    "value" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_validated" boolean DEFAULT false,
    "validation_date" timestamp with time zone,
    "validation_data" "jsonb",
    "validation_source" "text"
)
ALTER TABLE "public"."game_publisher_id_for_users" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."game_publisher_ids" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "id_name" "text" NOT NULL,
    "required" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."game_publisher_ids" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "publisher" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "has_an_api" boolean DEFAULT false,
    "api_key" "text",
    "has_validation_api" boolean DEFAULT false,
    "validation_api_type" "text",
    "has_aim_trainer" boolean DEFAULT false
)
ALTER TABLE "public"."games" OWNER TO "postgres"
ALTER TABLE "public"."aim_trainer_scores" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."html_scores_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
)
CREATE TABLE IF NOT EXISTS "public"."match_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid",
    "game_id" "uuid" NOT NULL,
    "match_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_team_match" boolean NOT NULL,
    "winner_team_id" "uuid",
    "loser_team_id" "uuid",
    "winner_player_id" "uuid",
    "loser_player_id" "uuid",
    "score_winner" integer,
    "score_loser" integer,
    "elo_change" integer DEFAULT 16 NOT NULL,
    "match_details" "jsonb",
    CONSTRAINT "match_results_team_match_check" CHECK (((("is_team_match" = true) AND ("winner_team_id" IS NOT NULL) AND ("loser_team_id" IS NOT NULL)) OR (("is_team_match" = false) AND ("winner_player_id" IS NOT NULL) AND ("loser_player_id" IS NOT NULL))))
)
ALTER TABLE "public"."match_results" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" NOT NULL,
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "link" "text",
    "related_id" "uuid",
    "start_date" timestamp with time zone
)
ALTER TABLE "public"."notifications" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."platform_api_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "api_name" "text" NOT NULL,
    "api_url" "text",
    "api_key" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "api_type" "text"
)
ALTER TABLE "public"."platform_api_integrations" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."player_match_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "match_id" "uuid",
    "round_number" integer NOT NULL,
    "notification_type" "text" NOT NULL,
    "opponent_id" "uuid",
    "opponent_game_ids" "jsonb" DEFAULT '{}'::"jsonb",
    "match_result" "text",
    "message" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "player_match_notifications_match_result_check" CHECK (("match_result" = ANY (ARRAY['won'::"text", 'lost'::"text", 'draw'::"text"]))),
    CONSTRAINT "player_match_notifications_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['match_starting'::"text", 'match_result'::"text", 'next_opponent'::"text"]))),
    CONSTRAINT "player_match_notifications_round_number_check" CHECK (("round_number" > 0))
)
ALTER TABLE "public"."player_match_notifications" OWNER TO "postgres"
COMMENT ON TABLE "public"."player_match_notifications" IS 'Stores real-time notifications for players about their matches, results, and next opponents in tournaments.'
COMMENT ON COLUMN "public"."player_match_notifications"."notification_type" IS 'Type of notification: match_starting (match is about to begin), match_result (match ended), next_opponent (info about next round opponent)'
COMMENT ON COLUMN "public"."player_match_notifications"."opponent_game_ids" IS 'JSON object containing opponent game publisher IDs from game_publisher_id_for_users table. Used by players to add opponent as friend in the game.'
COMMENT ON COLUMN "public"."player_match_notifications"."match_result" IS 'Result of the match from player perspective: won, lost, or draw. Null for match_starting notifications.'
COMMENT ON COLUMN "public"."player_match_notifications"."metadata" IS 'JSON metadata including tournament title, round name, match details, etc.'
COMMENT ON COLUMN "public"."player_match_notifications"."is_read" IS 'Whether this notification has been read/acknowledged by the player. Used for unread badge count.'
CREATE TABLE IF NOT EXISTS "public"."player_rankings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "game_id" "uuid" NOT NULL,
    "elo_rating" integer DEFAULT 1000 NOT NULL,
    "wins" integer DEFAULT 0 NOT NULL,
    "losses" integer DEFAULT 0 NOT NULL,
    "rank_tier" "text",
    "last_updated" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."player_rankings" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."pp_user_points" (
    "user_id" "uuid" NOT NULL,
    "total_points" integer DEFAULT 0 NOT NULL,
    "weekly_points" integer DEFAULT 0 NOT NULL,
    "monthly_points" integer DEFAULT 0 NOT NULL,
    "predictions_made" integer DEFAULT 0 NOT NULL,
    "predictions_correct" integer DEFAULT 0 NOT NULL,
    "accuracy_percentage" numeric(5,2) DEFAULT 0 NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "best_streak" integer DEFAULT 0 NOT NULL,
    "last_prediction_date" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
)
ALTER TABLE "public"."pp_user_points" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."pro_games" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "raw_data" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
)
ALTER TABLE "public"."pro_games" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."pro_matches" (
    "id" bigint NOT NULL,
    "game_id" bigint,
    "tournament_id" bigint,
    "team_a" bigint,
    "team_b" bigint,
    "start_time" timestamp with time zone,
    "status" "text",
    "raw_data" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
)
ALTER TABLE "public"."pro_matches" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."pro_stages" (
    "id" bigint NOT NULL,
    "tournament_id" bigint,
    "name" "text",
    "type" "text",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "raw_data" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
)
ALTER TABLE "public"."pro_stages" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."pro_substages" (
    "id" bigint NOT NULL,
    "stage_id" bigint,
    "name" "text",
    "type" "text",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "raw_data" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
)
ALTER TABLE "public"."pro_substages" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."pro_teams" (
    "id" bigint NOT NULL,
    "game_id" bigint,
    "name" "text" NOT NULL,
    "region" "text",
    "raw_data" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
)
ALTER TABLE "public"."pro_teams" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."pro_tournaments" (
    "id" bigint NOT NULL,
    "game_id" bigint,
    "name" "text" NOT NULL,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "status" "text",
    "raw_data" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
)
ALTER TABLE "public"."pro_tournaments" OWNER TO "postgres"
CREATE OR REPLACE VIEW "public"."pro_calendar" AS
 SELECT 'match'::"text" AS "event_type",
    "m"."id" AS "event_id",
    "m"."start_time",
    "m"."status",
    "g"."name" AS "game_name",
    "t"."name" AS "tournament_name",
    "concat"("team_a"."name", ' vs ', "team_b"."name") AS "event_name",
    "m"."raw_data"
   FROM (((("public"."pro_matches" "m"
     JOIN "public"."pro_games" "g" ON (("m"."game_id" = "g"."id")))
     JOIN "public"."pro_tournaments" "t" ON (("m"."tournament_id" = "t"."id")))
     LEFT JOIN "public"."pro_teams" "team_a" ON (("m"."team_a" = "team_a"."id")))
     LEFT JOIN "public"."pro_teams" "team_b" ON (("m"."team_b" = "team_b"."id")))
UNION ALL
 SELECT 'stage'::"text" AS "event_type",
    "s"."id" AS "event_id",
    "s"."start_time",
    NULL::"text" AS "status",
    "g"."name" AS "game_name",
    "t"."name" AS "tournament_name",
    "s"."name" AS "event_name",
    "s"."raw_data"
   FROM (("public"."pro_stages" "s"
     JOIN "public"."pro_tournaments" "t" ON (("s"."tournament_id" = "t"."id")))
     JOIN "public"."pro_games" "g" ON (("t"."game_id" = "g"."id")))
UNION ALL
 SELECT 'substage'::"text" AS "event_type",
    "ss"."id" AS "event_id",
    "ss"."start_time",
    NULL::"text" AS "status",
    "g"."name" AS "game_name",
    "t"."name" AS "tournament_name",
    "ss"."name" AS "event_name",
    "ss"."raw_data"
   FROM ((("public"."pro_substages" "ss"
     JOIN "public"."pro_stages" "s" ON (("ss"."stage_id" = "s"."id")))
     JOIN "public"."pro_tournaments" "t" ON (("s"."tournament_id" = "t"."id")))
     JOIN "public"."pro_games" "g" ON (("t"."game_id" = "g"."id")))
UNION ALL
 SELECT 'tournament'::"text" AS "event_type",
    "t"."id" AS "event_id",
    "t"."start_date" AS "start_time",
    "t"."status",
    "g"."name" AS "game_name",
    "t"."name" AS "tournament_name",
    "t"."name" AS "event_name",
    "t"."raw_data"
   FROM ("public"."pro_tournaments" "t"
     JOIN "public"."pro_games" "g" ON (("t"."game_id" = "g"."id")))
  ORDER BY 3
ALTER VIEW "public"."pro_calendar" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."pro_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content_type" "text" NOT NULL,
    "author" "text",
    "publish_date" timestamp with time zone DEFAULT "now"(),
    "text_content" "text",
    "video_url" "text",
    "image_url" "text",
    "source_api" "text",
    "source_id" "text",
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."pro_content" OWNER TO "postgres"
CREATE OR REPLACE VIEW "public"."pro_match_details" AS
 SELECT "m"."id" AS "match_id",
    "m"."start_time" AS "scheduled_at",
    "m"."start_time",
    "m"."status",
    "m"."game_id",
    "g"."name" AS "game_name",
    "m"."tournament_id",
    "t"."name" AS "tournament_name",
    "m"."team_a" AS "team_a_id",
    "ta"."name" AS "team_a_name",
    "m"."team_b" AS "team_b_id",
    "tb"."name" AS "team_b_name",
    ("ta"."id")::"text" AS "team1_id",
    "ta"."name" AS "team1_name",
    ''::"text" AS "team1_logo",
    ("tb"."id")::"text" AS "team2_id",
    "tb"."name" AS "team2_name",
    ''::"text" AS "team2_logo",
    "m"."raw_data"
   FROM (((("public"."pro_matches" "m"
     LEFT JOIN "public"."pro_games" "g" ON (("m"."game_id" = "g"."id")))
     LEFT JOIN "public"."pro_tournaments" "t" ON (("m"."tournament_id" = "t"."id")))
     LEFT JOIN "public"."pro_teams" "ta" ON (("m"."team_a" = "ta"."id")))
     LEFT JOIN "public"."pro_teams" "tb" ON (("m"."team_b" = "tb"."id")))
ALTER VIEW "public"."pro_match_details" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."pro_tournament_teams" (
    "id" "text" NOT NULL,
    "tournament_id" bigint,
    "team_id" bigint,
    "raw_data" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
)
ALTER TABLE "public"."pro_tournament_teams" OWNER TO "postgres"
CREATE OR REPLACE VIEW "public"."pro_tournaments_active" AS
 SELECT "t"."id",
    "t"."name",
    "g"."name" AS "game_name",
    "t"."start_date",
    "t"."end_date",
    "t"."status"
   FROM ("public"."pro_tournaments" "t"
     JOIN "public"."pro_games" "g" ON (("t"."game_id" = "g"."id")))
  WHERE ("t"."status" = 'STARTED'::"text")
  ORDER BY "t"."start_date" DESC
ALTER VIEW "public"."pro_tournaments_active" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."project_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_id" character varying(50) NOT NULL,
    "config_name" character varying(200) NOT NULL,
    "is_active" boolean DEFAULT true,
    "brand_name" character varying(200) NOT NULL,
    "logo_path" character varying(500) NOT NULL,
    "favicon_path" character varying(500) NOT NULL,
    "logo_alt_text" character varying(200) NOT NULL,
    "primary_color" character varying(7) NOT NULL,
    "secondary_color" character varying(7) NOT NULL,
    "product_id" character varying(100) NOT NULL,
    "campaign_id" character varying(100) NOT NULL,
    "extra_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "domain" character varying(253),
    "is_default" boolean DEFAULT false NOT NULL,
    CONSTRAINT "check_domain_default_exclusive" CHECK (((("domain" IS NULL) AND ("is_default" = false)) OR (("domain" IS NULL) AND ("is_default" = true)) OR (("domain" IS NOT NULL) AND ("is_default" = false)))),
    CONSTRAINT "check_domain_format" CHECK ((("domain" IS NULL) OR (("domain")::"text" ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$'::"text")))
)
ALTER TABLE "public"."project_configurations" OWNER TO "postgres"
COMMENT ON COLUMN "public"."project_configurations"."product_id" IS 'Galaxy API Product ID - overrides value from platform_api_integrations credentials'
COMMENT ON COLUMN "public"."project_configurations"."campaign_id" IS 'Galaxy API Campaign ID - overrides value from platform_api_integrations credentials'
COMMENT ON COLUMN "public"."project_configurations"."domain" IS 'Unique domain name that routes to this configuration (e.g., partner-a.example.com). Must be lowercase, no protocol, no paths. Mutually exclusive with is_default.'
COMMENT ON COLUMN "public"."project_configurations"."is_default" IS 'Marks this configuration as the default fallback when no domain matches. Only one configuration can be default. Mutually exclusive with domain.'
CREATE TABLE IF NOT EXISTS "public"."publisher_gamer" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "publisher_id" "text" NOT NULL,
    "puuid" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."publisher_gamer" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."quests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "xp_reward" integer NOT NULL,
    "quest_type" "public"."quest_type" NOT NULL,
    "target_value" "text" NOT NULL,
    "is_repeatable" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."quests" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."report_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "share_token" "text" NOT NULL,
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "view_count" integer DEFAULT 0,
    "last_viewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
)
ALTER TABLE "public"."report_shares" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tournament_id" "uuid",
    "subject" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "first_opened_at" timestamp with time zone,
    "opened_by" "uuid",
    CONSTRAINT "support_tickets_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'closed'::"text"])))
)
ALTER TABLE "public"."support_tickets" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."team_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
)
ALTER TABLE "public"."team_applications" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text",
    CONSTRAINT "team_members_role_check" CHECK (("role" = ANY (ARRAY['captain'::"text", 'member'::"text"])))
)
ALTER TABLE "public"."team_members" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."team_rankings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "game_id" "uuid" NOT NULL,
    "elo_rating" integer DEFAULT 1000 NOT NULL,
    "wins" integer DEFAULT 0 NOT NULL,
    "losses" integer DEFAULT 0 NOT NULL,
    "rank_tier" "text",
    "last_updated" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."team_rankings" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "captain_id" "uuid" DEFAULT "gen_random_uuid"(),
    "is_looking_for_players" boolean DEFAULT false,
    "chat_channel_id" "uuid"
)
ALTER TABLE "public"."teams" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."ticket_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_admin_message" boolean DEFAULT false
)
ALTER TABLE "public"."ticket_messages" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."toto" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reponses" "text",
    "guzman" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."toto" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."tournament_discord_verification" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "discord_user_id" "text" NOT NULL,
    "discord_server_id" "text" NOT NULL,
    "is_verified" boolean DEFAULT false,
    "status" "text" DEFAULT 'pending'::"text",
    "verified_at" timestamp with time zone,
    "last_checked_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tournament_discord_verification_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'left_server'::"text", 'failed'::"text"])))
)
ALTER TABLE "public"."tournament_discord_verification" OWNER TO "postgres"
COMMENT ON TABLE "public"."tournament_discord_verification" IS 'Tracks Discord server membership verification for tournament participants'
COMMENT ON COLUMN "public"."tournament_discord_verification"."discord_user_id" IS 'Discord user ID from OAuth'
COMMENT ON COLUMN "public"."tournament_discord_verification"."discord_server_id" IS 'Discord server/guild ID to verify membership'
COMMENT ON COLUMN "public"."tournament_discord_verification"."status" IS 'Verification status: pending, verified, left_server, failed'
CREATE TABLE IF NOT EXISTS "public"."tournament_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "registration_order" integer,
    CONSTRAINT "tournament_registrations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'validated'::"text", 'refused'::"text", 'backup'::"text", 'disqualified_discord'::"text"])))
)
ALTER TABLE "public"."tournament_registrations" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "type" "text" NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'upcoming'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "icon_url" "text",
    "announcement_url" "text",
    "main_prize" "text",
    "header_url" "text",
    "twitch_url" "text",
    "compatible_devices" "text",
    "discord_url" "text",
    "tournament_format" "text",
    "registration_start_date" timestamp with time zone,
    "registration_end_date" timestamp with time zone,
    "location_type" "text",
    "location_name" "text",
    "game_id" "uuid",
    "eligible_countries" "text",
    "minimum_age" integer,
    "required_documents_under_18" "text",
    "max_players_per_team" integer,
    "max_nb_players" integer,
    "rules" "text",
    "private_server_code" "text",
    "is_twitch_live" boolean DEFAULT false,
    "twitch_last_checked" timestamp with time zone,
    "bracket_status" "text" DEFAULT 'draft'::"text",
    "allow_backups" boolean DEFAULT false,
    "max_backup_players" integer,
    "full_prize" "text",
    "prize_currency" "text" DEFAULT 'FCFA'::"text",
    "min_nb_players" integer,
    "launched_early" boolean DEFAULT false NOT NULL,
    "actual_participants_at_launch" integer,
    "initial_max_players" integer,
    "actual_participants" integer,
    "registration_locked" boolean DEFAULT false,
    "bracket_launched_at" timestamp with time zone,
    "bracket_size" integer,
    "bracket_byes_count" integer,
    "uses_lucky_loser" boolean DEFAULT true NOT NULL,
    "discord_server_id" "text",
    CONSTRAINT "tournaments_bracket_status_check" CHECK (("bracket_status" = ANY (ARRAY['draft'::"text", 'live'::"text"]))),
    CONSTRAINT "tournaments_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'active'::"text", 'past'::"text"]))),
    CONSTRAINT "tournaments_type_check" CHECK (("type" = ANY (ARRAY['solo'::"text", 'team'::"text"])))
)
ALTER TABLE "public"."tournaments" OWNER TO "postgres"
COMMENT ON COLUMN "public"."tournaments"."max_nb_players" IS 'Maximum number of players/teams allowed in the tournament'
COMMENT ON COLUMN "public"."tournaments"."private_server_code" IS 'Private server code for tournament access, set by admins'
COMMENT ON COLUMN "public"."tournaments"."full_prize" IS 'Calculated total prize pool from all tournament_prizes. Can be null if prizes are non-numeric.'
COMMENT ON COLUMN "public"."tournaments"."prize_currency" IS 'Currency code for prize amounts (FCFA, EUR, USD, etc.)'
COMMENT ON COLUMN "public"."tournaments"."min_nb_players" IS 'Minimum number of participants required to launch the tournament. If not set, defaults to 2.'
COMMENT ON COLUMN "public"."tournaments"."launched_early" IS 'Indicates whether the tournament was launched with fewer participants than max_nb_players.'
COMMENT ON COLUMN "public"."tournaments"."actual_participants_at_launch" IS 'Records the actual number of participants when the bracket was generated.'
COMMENT ON COLUMN "public"."tournaments"."initial_max_players" IS 'Originally configured maximum number of players/teams for the tournament'
COMMENT ON COLUMN "public"."tournaments"."actual_participants" IS 'Actual number of approved participants when the bracket was launched'
COMMENT ON COLUMN "public"."tournaments"."registration_locked" IS 'Whether registrations are locked/closed for this tournament'
COMMENT ON COLUMN "public"."tournaments"."bracket_launched_at" IS 'Timestamp when the tournament bracket was first generated'
COMMENT ON COLUMN "public"."tournaments"."bracket_size" IS 'The power-of-2 bracket size (e.g., 128 for 96 players)'
COMMENT ON COLUMN "public"."tournaments"."bracket_byes_count" IS 'Number of BYEs in the bracket'
COMMENT ON COLUMN "public"."tournaments"."uses_lucky_loser" IS 'Whether this tournament uses lucky loser mechanics'
COMMENT ON COLUMN "public"."tournaments"."discord_server_id" IS 'Discord Guild/Server ID where tournament communication happens'
CREATE OR REPLACE VIEW "public"."tournament_discord_verification_summary" AS
 SELECT "t"."id" AS "tournament_id",
    "t"."title" AS "tournament_title",
    "t"."discord_server_id",
    "count"("tr"."id") AS "total_registrations",
    "count"("tdv"."id") AS "total_verifications",
    "sum"(
        CASE
            WHEN ("tdv"."is_verified" = true) THEN 1
            ELSE 0
        END) AS "verified_count",
    "sum"(
        CASE
            WHEN ("tdv"."status" = 'pending'::"text") THEN 1
            ELSE 0
        END) AS "pending_count",
    "sum"(
        CASE
            WHEN ("tdv"."status" = 'failed'::"text") THEN 1
            ELSE 0
        END) AS "failed_count",
    "round"(((("sum"(
        CASE
            WHEN ("tdv"."is_verified" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("count"("tr"."id"), 0))::numeric) * (100)::numeric), 2) AS "verification_percentage"
   FROM (("public"."tournaments" "t"
     LEFT JOIN "public"."tournament_registrations" "tr" ON (("t"."id" = "tr"."tournament_id")))
     LEFT JOIN "public"."tournament_discord_verification" "tdv" ON ((("tr"."user_id" = "tdv"."user_id") AND ("tr"."tournament_id" = "tdv"."tournament_id"))))
  WHERE ("t"."discord_server_id" IS NOT NULL)
  GROUP BY "t"."id", "t"."title", "t"."discord_server_id"
ALTER VIEW "public"."tournament_discord_verification_summary" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."tournament_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "game_access_difficulty" integer NOT NULL,
    "platform_ease_of_use" integer NOT NULL,
    "tournament_organization" integer NOT NULL,
    "overall_satisfaction" integer NOT NULL,
    "additional_comments" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tournament_feedback_game_access_difficulty_check" CHECK ((("game_access_difficulty" >= 1) AND ("game_access_difficulty" <= 5))),
    CONSTRAINT "tournament_feedback_overall_satisfaction_check" CHECK ((("overall_satisfaction" >= 1) AND ("overall_satisfaction" <= 5))),
    CONSTRAINT "tournament_feedback_platform_ease_of_use_check" CHECK ((("platform_ease_of_use" >= 1) AND ("platform_ease_of_use" <= 5))),
    CONSTRAINT "tournament_feedback_tournament_organization_check" CHECK ((("tournament_organization" >= 1) AND ("tournament_organization" <= 5)))
)
ALTER TABLE "public"."tournament_feedback" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."tournament_field_values" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "field_id" "uuid" NOT NULL,
    "value" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."tournament_field_values" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."tournament_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "field_type" "text" NOT NULL,
    "required" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "options" "jsonb",
    "validation_rules" "jsonb",
    "field_category" "text" DEFAULT 'custom'::"text",
    "placeholder_text" "text",
    "display_order" integer DEFAULT 0,
    "tournament_id" "uuid"
)
ALTER TABLE "public"."tournament_fields" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."tournament_matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "round" integer NOT NULL,
    "position" integer NOT NULL,
    "player1_id" "uuid",
    "player2_id" "uuid",
    "winner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_draw" boolean DEFAULT false,
    "group_id" "text",
    "manual_assignment" boolean DEFAULT false,
    "original_round" integer,
    "is_lucky_loser_match" boolean DEFAULT false NOT NULL,
    "lucky_loser_player_id" "uuid",
    "replaced_player_id" "uuid",
    "forfeit_reason" "text",
    "is_bye" boolean DEFAULT false NOT NULL,
    CONSTRAINT "tournament_matches_different_players_check" CHECK ((("player1_id" IS NULL) OR ("player2_id" IS NULL) OR ("player1_id" <> "player2_id")))
)
ALTER TABLE "public"."tournament_matches" OWNER TO "postgres"
COMMENT ON COLUMN "public"."tournament_matches"."manual_assignment" IS 'Indicates if this match was manually modified by an admin, especially for cross-round BYE management.'
COMMENT ON COLUMN "public"."tournament_matches"."original_round" IS 'Original round assignment before any manual moves. Preserved for audit trail.'
COMMENT ON COLUMN "public"."tournament_matches"."is_lucky_loser_match" IS 'True if this match involves a lucky loser replacement'
COMMENT ON COLUMN "public"."tournament_matches"."lucky_loser_player_id" IS 'The player ID who was brought back as a lucky loser'
COMMENT ON COLUMN "public"."tournament_matches"."replaced_player_id" IS 'The player ID who was replaced by the lucky loser'
COMMENT ON COLUMN "public"."tournament_matches"."forfeit_reason" IS 'Reason for forfeit if applicable'
COMMENT ON COLUMN "public"."tournament_matches"."is_bye" IS 'True if this is a BYE match (one player auto-advances)'
CREATE TABLE IF NOT EXISTS "public"."tournament_prizes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "title" "text" NOT NULL,
    "prize_name" "text" NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "prize_type" "text" DEFAULT 'physical_digital'::"text",
    "monetary_amount" numeric(10,2) DEFAULT NULL::numeric,
    "currency" "text",
    "redemption_code" "text",
    CONSTRAINT "tournament_prizes_prize_type_check" CHECK (("prize_type" = ANY (ARRAY['monetary'::"text", 'physical_digital'::"text"])))
)
ALTER TABLE "public"."tournament_prizes" OWNER TO "postgres"
COMMENT ON COLUMN "public"."tournament_prizes"."prize_type" IS 'Type of prize: monetary (cash) or physical_digital (physical goods, digital codes)'
COMMENT ON COLUMN "public"."tournament_prizes"."monetary_amount" IS 'Cash amount for monetary prizes (e.g., 1000.00)'
COMMENT ON COLUMN "public"."tournament_prizes"."currency" IS 'Currency code for monetary prizes (e.g., EUR, USD, GBP)'
COMMENT ON COLUMN "public"."tournament_prizes"."redemption_code" IS 'Code or link for digital prize redemption'
CREATE TABLE IF NOT EXISTS "public"."tournament_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid",
    "title" "text" NOT NULL,
    "snapshot_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notes" "text",
    "period_start" timestamp with time zone,
    "period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
)
ALTER TABLE "public"."tournament_reports" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "user_id" "uuid" NOT NULL,
    "achievement_id" "uuid" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."user_achievements" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."user_battle_pass_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "current_tier" integer DEFAULT 0,
    "season_xp" integer DEFAULT 0,
    "has_premium" boolean DEFAULT false,
    "premium_purchased_at" timestamp with time zone,
    "claimed_free_tiers" integer[] DEFAULT ARRAY[]::integer[],
    "claimed_premium_tiers" integer[] DEFAULT ARRAY[]::integer[],
    "last_claimed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."user_battle_pass_progress" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."user_currency" (
    "user_id" "uuid" NOT NULL,
    "gems_balance" integer DEFAULT 0,
    "lifetime_gems_earned" integer DEFAULT 0,
    "lifetime_gems_spent" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_currency_gems_balance_check" CHECK (("gems_balance" >= 0))
)
ALTER TABLE "public"."user_currency" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."user_export_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "selected_fields" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."user_export_preferences" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "msisdn" "text",
    "date_of_birth" "date",
    "has_parental_consent" boolean,
    "parental_consent_url" "text",
    "country" "text",
    "username" "text",
    "bio" "text",
    "discord_handle" "text",
    "twitter_handle" "text",
    "avatar_url" "text",
    "riot_game_name" "text",
    "riot_tagline" "text",
    "is_profile_public" boolean DEFAULT true,
    "fortnite_epic_id" "text",
    "is_fortnite_validated" boolean DEFAULT false,
    "fortnite_validation_data" "jsonb",
    "level" integer DEFAULT 1,
    "xp" integer DEFAULT 0,
    "current_avatar_id" "uuid",
    "role" "public"."admin_role_type",
    "is_profile_completed" boolean DEFAULT false,
    "discord_user_id" "text",
    CONSTRAINT "users_type_check" CHECK (("type" = ANY (ARRAY['admin'::"text", 'gamer'::"text"])))
)
ALTER TABLE "public"."users" OWNER TO "postgres"
COMMENT ON COLUMN "public"."users"."msisdn" IS 'International format phone number used for authentication'
COMMENT ON COLUMN "public"."users"."is_profile_completed" IS 'Tracks whether user has completed initial profile setup. Set to true after first profile edit save.'
COMMENT ON COLUMN "public"."users"."discord_user_id" IS 'Discord unique user ID from OAuth (provider_id)'
CREATE TABLE IF NOT EXISTS "public"."xp_thresholds" (
    "level" integer NOT NULL,
    "xp_required" integer NOT NULL,
    "level_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."xp_thresholds" OWNER TO "postgres"
CREATE OR REPLACE VIEW "public"."user_gamification_profile" AS
 SELECT "u"."id",
    "u"."username",
    "u"."level",
    "u"."xp",
    "u"."current_avatar_id",
    "xt"."level_name",
    "xt"."xp_required" AS "current_level_xp",
    "next_xt"."xp_required" AS "next_level_xp",
    ("next_xt"."xp_required" - "u"."xp") AS "xp_to_next_level",
        CASE
            WHEN ("next_xt"."xp_required" IS NOT NULL) THEN "round"((((("u"."xp" - "xt"."xp_required"))::numeric / (("next_xt"."xp_required" - "xt"."xp_required"))::numeric) * (100)::numeric), 2)
            ELSE 100.0
        END AS "level_progress_percentage",
    "current_avatar"."name" AS "current_avatar_name",
    "current_avatar"."image_url" AS "current_avatar_url"
   FROM ((("public"."users" "u"
     LEFT JOIN "public"."xp_thresholds" "xt" ON (("u"."level" = "xt"."level")))
     LEFT JOIN "public"."xp_thresholds" "next_xt" ON ((("u"."level" + 1) = "next_xt"."level")))
     LEFT JOIN "public"."achievements" "current_avatar" ON (("u"."current_avatar_id" = "current_avatar"."id")))
  WHERE ("u"."type" = 'gamer'::"text")
ALTER VIEW "public"."user_gamification_profile" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."user_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1,
    "is_equipped" boolean DEFAULT false,
    "purchased_at" timestamp with time zone DEFAULT "now"(),
    "equipped_at" timestamp with time zone,
    CONSTRAINT "user_inventory_quantity_check" CHECK (("quantity" >= 0))
)
ALTER TABLE "public"."user_inventory" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."user_quests" (
    "user_id" "uuid" NOT NULL,
    "quest_id" "uuid" NOT NULL,
    "progress" "text" DEFAULT '0'::"text",
    "status" "public"."quest_status" DEFAULT 'active'::"public"."quest_status",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone
)
ALTER TABLE "public"."user_quests" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."user_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id_1" "uuid" NOT NULL,
    "user_id_2" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_relationships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'blocked'::"text", 'favorite'::"text"])))
)
ALTER TABLE "public"."user_relationships" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."user_rewards_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reward_id" "uuid" NOT NULL,
    "acquired_at" timestamp with time zone DEFAULT "now"(),
    "source" "text" NOT NULL,
    "source_reference_id" "uuid",
    "is_active" boolean DEFAULT false,
    CONSTRAINT "user_rewards_inventory_source_check" CHECK (("source" = ANY (ARRAY['battle_pass'::"text", 'achievement'::"text", 'shop'::"text", 'quest'::"text", 'admin_grant'::"text", 'event'::"text"])))
)
ALTER TABLE "public"."user_rewards_inventory" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."user_tier_claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tier_id" "uuid" NOT NULL,
    "reward_type" "text" NOT NULL,
    "claimed_at" timestamp with time zone DEFAULT "now"(),
    "rewards_granted" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "user_tier_claims_reward_type_check" CHECK (("reward_type" = ANY (ARRAY['free'::"text", 'premium'::"text"])))
)
ALTER TABLE "public"."user_tier_claims" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."user_tournament_field_values" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "field_id" "uuid" NOT NULL,
    "value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "field_index" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "user_tournament_field_values_value_is_json" CHECK (("jsonb_typeof"("value") = 'object'::"text"))
)
ALTER TABLE "public"."user_tournament_field_values" OWNER TO "postgres"
COMMENT ON COLUMN "public"."user_tournament_field_values"."value" IS 'JSONB structure storing flexible key-value pairs. 
Example: {"Discord ID": "user123", "Téléphone": "+123456789"}
For legacy data: {"value": "original_text_value"}'
CREATE TABLE IF NOT EXISTS "public"."user_virtual_currency" (
    "user_id" "uuid" NOT NULL,
    "balance" integer DEFAULT 0,
    "lifetime_earned" integer DEFAULT 0,
    "lifetime_spent" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_virtual_currency_balance_check" CHECK (("balance" >= 0))
)
ALTER TABLE "public"."user_virtual_currency" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."virtual_currency_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "transaction_type" "text" NOT NULL,
    "reference_id" "uuid",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "virtual_currency_transactions_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['quest_reward'::"text", 'achievement'::"text", 'purchase'::"text", 'admin_grant'::"text", 'battle_pass_purchase'::"text", 'shop_purchase'::"text", 'tournament_prize'::"text", 'daily_login'::"text"])))
)
ALTER TABLE "public"."virtual_currency_transactions" OWNER TO "postgres"
CREATE TABLE IF NOT EXISTS "public"."xp_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "source" "text" NOT NULL,
    "source_id" "uuid",
    "source_details" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
)
ALTER TABLE "public"."xp_events" OWNER TO "postgres"
ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_name_key" UNIQUE ("name")
ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."battle_pass_rewards"
    ADD CONSTRAINT "battle_pass_rewards_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."battle_pass_seasons"
    ADD CONSTRAINT "battle_pass_seasons_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."battle_pass_seasons"
    ADD CONSTRAINT "battle_pass_seasons_season_number_key" UNIQUE ("season_number")
ALTER TABLE ONLY "public"."battle_pass_tiers"
    ADD CONSTRAINT "battle_pass_tiers_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."battle_pass_tiers"
    ADD CONSTRAINT "battle_pass_tiers_season_id_tier_number_key" UNIQUE ("season_id", "tier_number")
ALTER TABLE ONLY "public"."battle_royale_results"
    ADD CONSTRAINT "battle_royale_results_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."battle_royale_results"
    ADD CONSTRAINT "battle_royale_results_unique_player_match" UNIQUE ("tournament_id", "match_number", "player_id")
ALTER TABLE ONLY "public"."bracket_eliminations"
    ADD CONSTRAINT "bracket_eliminations_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."bracket_modifications_log"
    ADD CONSTRAINT "bracket_modifications_log_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."bracket_round_notifications"
    ADD CONSTRAINT "bracket_round_notifications_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."bracket_round_timers"
    ADD CONSTRAINT "bracket_round_timers_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_channel_id_user_id_key" UNIQUE ("channel_id", "user_id")
ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."coaching_sessions"
    ADD CONSTRAINT "coaching_sessions_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."country_configurations"
    ADD CONSTRAINT "country_configurations_pkey" PRIMARY KEY ("country_code")
ALTER TABLE ONLY "public"."country_whitelist"
    ADD CONSTRAINT "country_whitelist_country_code_key" UNIQUE ("country_code")
ALTER TABLE ONLY "public"."country_whitelist"
    ADD CONSTRAINT "country_whitelist_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."currency_shop_items"
    ADD CONSTRAINT "currency_shop_items_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."currency_transactions"
    ADD CONSTRAINT "currency_transactions_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."daily_login_tracker"
    ADD CONSTRAINT "daily_login_tracker_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."daily_login_tracker"
    ADD CONSTRAINT "daily_login_tracker_user_id_login_date_key" UNIQUE ("user_id", "login_date")
ALTER TABLE ONLY "public"."dba-test"
    ADD CONSTRAINT "dba-test_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."featured_events"
    ADD CONSTRAINT "featured_events_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."galaxy_api_logs"
    ADD CONSTRAINT "galaxy_api_logs_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."galaxy_rubric_mappings"
    ADD CONSTRAINT "galaxy_rubric_mappings_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."galaxy_rubric_mappings"
    ADD CONSTRAINT "galaxy_rubric_mappings_rubric_id_key" UNIQUE ("rubric_id")
ALTER TABLE ONLY "public"."game_api_integrations"
    ADD CONSTRAINT "game_api_integrations_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."game_contents"
    ADD CONSTRAINT "game_contents_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."game_publisher_id_for_users"
    ADD CONSTRAINT "game_publisher_id_for_users_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."game_publisher_id_for_users"
    ADD CONSTRAINT "game_publisher_id_for_users_user_id_game_publisher_id_key" UNIQUE ("user_id", "game_publisher_id")
ALTER TABLE ONLY "public"."game_publisher_ids"
    ADD CONSTRAINT "game_publisher_ids_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."aim_trainer_scores"
    ADD CONSTRAINT "html_scores_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."platform_api_integrations"
    ADD CONSTRAINT "platform_api_integrations_api_name_key" UNIQUE ("api_name")
ALTER TABLE ONLY "public"."platform_api_integrations"
    ADD CONSTRAINT "platform_api_integrations_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."player_match_notifications"
    ADD CONSTRAINT "player_match_notifications_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."player_rankings"
    ADD CONSTRAINT "player_rankings_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."player_rankings"
    ADD CONSTRAINT "player_rankings_user_id_game_id_key" UNIQUE ("user_id", "game_id")
ALTER TABLE ONLY "public"."pp_user_points"
    ADD CONSTRAINT "pp_user_points_pkey" PRIMARY KEY ("user_id")
ALTER TABLE ONLY "public"."pro_content"
    ADD CONSTRAINT "pro_content_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."pro_games"
    ADD CONSTRAINT "pro_games_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."pro_matches"
    ADD CONSTRAINT "pro_matches_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."pro_stages"
    ADD CONSTRAINT "pro_stages_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."pro_substages"
    ADD CONSTRAINT "pro_substages_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."pro_teams"
    ADD CONSTRAINT "pro_teams_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."pro_tournament_teams"
    ADD CONSTRAINT "pro_tournament_teams_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."pro_tournaments"
    ADD CONSTRAINT "pro_tournaments_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."project_configurations"
    ADD CONSTRAINT "project_configurations_config_id_key" UNIQUE ("config_id")
ALTER TABLE ONLY "public"."project_configurations"
    ADD CONSTRAINT "project_configurations_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."publisher_gamer"
    ADD CONSTRAINT "publisher_gamer_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."publisher_gamer"
    ADD CONSTRAINT "publisher_gamer_user_id_publisher_id_key" UNIQUE ("user_id", "publisher_id")
ALTER TABLE ONLY "public"."quests"
    ADD CONSTRAINT "quests_name_key" UNIQUE ("name")
ALTER TABLE ONLY "public"."quests"
    ADD CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."report_shares"
    ADD CONSTRAINT "report_shares_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."report_shares"
    ADD CONSTRAINT "report_shares_share_token_key" UNIQUE ("share_token")
ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."team_applications"
    ADD CONSTRAINT "team_applications_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."team_applications"
    ADD CONSTRAINT "team_applications_user_id_team_id_key" UNIQUE ("user_id", "team_id")
ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."team_rankings"
    ADD CONSTRAINT "team_rankings_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."team_rankings"
    ADD CONSTRAINT "team_rankings_team_id_game_id_key" UNIQUE ("team_id", "game_id")
ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."toto"
    ADD CONSTRAINT "toto_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."tournament_discord_verification"
    ADD CONSTRAINT "tournament_discord_verification_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."tournament_feedback"
    ADD CONSTRAINT "tournament_feedback_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."tournament_feedback"
    ADD CONSTRAINT "tournament_feedback_user_id_tournament_id_key" UNIQUE ("user_id", "tournament_id")
ALTER TABLE ONLY "public"."tournament_field_values"
    ADD CONSTRAINT "tournament_field_values_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."tournament_fields"
    ADD CONSTRAINT "tournament_fields_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_unique_position" UNIQUE ("tournament_id", "round", "position")
ALTER TABLE ONLY "public"."tournament_prizes"
    ADD CONSTRAINT "tournament_prizes_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."tournament_reports"
    ADD CONSTRAINT "tournament_reports_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."game_api_integrations"
    ADD CONSTRAINT "unique_game_api_integration" UNIQUE ("game_id", "api_name")
ALTER TABLE ONLY "public"."bracket_round_timers"
    ADD CONSTRAINT "unique_tournament_round" UNIQUE ("tournament_id", "round_number")
ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "unique_user_team" UNIQUE ("user_id", "team_id")
ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "unique_user_tournament" UNIQUE ("user_id", "tournament_id")
ALTER TABLE ONLY "public"."tournament_discord_verification"
    ADD CONSTRAINT "unique_user_tournament_discord" UNIQUE ("user_id", "tournament_id")
ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("user_id", "achievement_id")
ALTER TABLE ONLY "public"."user_battle_pass_progress"
    ADD CONSTRAINT "user_battle_pass_progress_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."user_battle_pass_progress"
    ADD CONSTRAINT "user_battle_pass_progress_user_id_season_id_key" UNIQUE ("user_id", "season_id")
ALTER TABLE ONLY "public"."user_currency"
    ADD CONSTRAINT "user_currency_pkey" PRIMARY KEY ("user_id")
ALTER TABLE ONLY "public"."user_export_preferences"
    ADD CONSTRAINT "user_export_preferences_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."user_export_preferences"
    ADD CONSTRAINT "user_export_preferences_user_id_key" UNIQUE ("user_id")
ALTER TABLE ONLY "public"."user_inventory"
    ADD CONSTRAINT "user_inventory_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."user_inventory"
    ADD CONSTRAINT "user_inventory_user_id_item_id_key" UNIQUE ("user_id", "item_id")
ALTER TABLE ONLY "public"."user_quests"
    ADD CONSTRAINT "user_quests_pkey" PRIMARY KEY ("user_id", "quest_id", "started_at")
ALTER TABLE ONLY "public"."user_relationships"
    ADD CONSTRAINT "user_relationships_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."user_relationships"
    ADD CONSTRAINT "user_relationships_user_id_1_user_id_2_key" UNIQUE ("user_id_1", "user_id_2")
ALTER TABLE ONLY "public"."user_rewards_inventory"
    ADD CONSTRAINT "user_rewards_inventory_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."user_rewards_inventory"
    ADD CONSTRAINT "user_rewards_inventory_user_id_reward_id_source_reference_i_key" UNIQUE ("user_id", "reward_id", "source_reference_id")
ALTER TABLE ONLY "public"."user_tier_claims"
    ADD CONSTRAINT "user_tier_claims_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."user_tier_claims"
    ADD CONSTRAINT "user_tier_claims_user_id_tier_id_reward_type_key" UNIQUE ("user_id", "tier_id", "reward_type")
ALTER TABLE ONLY "public"."user_tournament_field_values"
    ADD CONSTRAINT "user_tournament_field_values_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."user_tournament_field_values"
    ADD CONSTRAINT "user_tournament_field_values_unique_with_index" UNIQUE ("user_id", "tournament_id", "field_id", "field_index")
ALTER TABLE ONLY "public"."user_virtual_currency"
    ADD CONSTRAINT "user_virtual_currency_pkey" PRIMARY KEY ("user_id")
ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email")
ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."virtual_currency_transactions"
    ADD CONSTRAINT "virtual_currency_transactions_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."xp_events"
    ADD CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
ALTER TABLE ONLY "public"."xp_thresholds"
    ADD CONSTRAINT "xp_thresholds_pkey" PRIMARY KEY ("level")
CREATE INDEX "idx_achievements_type" ON "public"."achievements" USING "btree" ("type")
CREATE INDEX "idx_achievements_unlock_condition" ON "public"."achievements" USING "btree" ("unlock_condition_type")
CREATE INDEX "idx_activity_log_public" ON "public"."activity_log" USING "btree" ("is_public", "created_at" DESC) WHERE ("is_public" = true)
CREATE INDEX "idx_activity_log_type" ON "public"."activity_log" USING "btree" ("activity_type")
CREATE INDEX "idx_activity_log_user" ON "public"."activity_log" USING "btree" ("user_id", "created_at" DESC)
CREATE INDEX "idx_aim_trainer_scores_user_id" ON "public"."aim_trainer_scores" USING "btree" ("user_id")
CREATE INDEX "idx_battle_royale_results_game_id" ON "public"."battle_royale_results" USING "btree" ("game_id")
CREATE INDEX "idx_battle_royale_results_player_id" ON "public"."battle_royale_results" USING "btree" ("player_id")
CREATE INDEX "idx_battle_royale_results_tournament_id" ON "public"."battle_royale_results" USING "btree" ("tournament_id")
CREATE INDEX "idx_battle_royale_results_tournament_match" ON "public"."battle_royale_results" USING "btree" ("tournament_id", "match_number")
CREATE INDEX "idx_bp_progress_leaderboard" ON "public"."user_battle_pass_progress" USING "btree" ("season_id", "season_xp" DESC)
CREATE INDEX "idx_bp_progress_season" ON "public"."user_battle_pass_progress" USING "btree" ("season_id")
CREATE INDEX "idx_bp_progress_user" ON "public"."user_battle_pass_progress" USING "btree" ("user_id")
CREATE INDEX "idx_bp_seasons_active" ON "public"."battle_pass_seasons" USING "btree" ("is_active") WHERE ("is_active" = true)
CREATE INDEX "idx_bp_seasons_dates" ON "public"."battle_pass_seasons" USING "btree" ("start_date", "end_date")
CREATE INDEX "idx_bp_tiers_season" ON "public"."battle_pass_tiers" USING "btree" ("season_id", "tier_number")
CREATE INDEX "idx_bracket_eliminations_lookup" ON "public"."bracket_eliminations" USING "btree" ("tournament_id", "eliminated_round", "reintegrated", "elo_at_elimination" DESC, "eliminated_at" DESC)
CREATE INDEX "idx_bracket_eliminations_player" ON "public"."bracket_eliminations" USING "btree" ("player_id")
CREATE INDEX "idx_bracket_eliminations_reintegrated" ON "public"."bracket_eliminations" USING "btree" ("tournament_id", "reintegrated") WHERE ("reintegrated" = false)
CREATE INDEX "idx_bracket_eliminations_round" ON "public"."bracket_eliminations" USING "btree" ("tournament_id", "eliminated_round")
CREATE INDEX "idx_bracket_eliminations_tournament" ON "public"."bracket_eliminations" USING "btree" ("tournament_id")
CREATE INDEX "idx_bracket_modifications_created_at" ON "public"."bracket_modifications_log" USING "btree" ("created_at" DESC)
CREATE INDEX "idx_bracket_modifications_match_id" ON "public"."bracket_modifications_log" USING "btree" ("match_id")
CREATE INDEX "idx_bracket_modifications_modified_by" ON "public"."bracket_modifications_log" USING "btree" ("modified_by")
CREATE INDEX "idx_bracket_modifications_tournament_id" ON "public"."bracket_modifications_log" USING "btree" ("tournament_id")
CREATE INDEX "idx_channel_members_channel_id" ON "public"."channel_members" USING "btree" ("channel_id")
CREATE INDEX "idx_channel_members_user_id" ON "public"."channel_members" USING "btree" ("user_id")
CREATE INDEX "idx_channels_created_by" ON "public"."channels" USING "btree" ("created_by")
CREATE INDEX "idx_country_configurations_active" ON "public"."country_configurations" USING "btree" ("is_active")
CREATE INDEX "idx_country_configurations_country_code" ON "public"."country_configurations" USING "btree" ("country_code")
CREATE INDEX "idx_country_whitelist_active" ON "public"."country_whitelist" USING "btree" ("country_code", "is_active") WHERE ("is_active" = true)
CREATE INDEX "idx_country_whitelist_country_code" ON "public"."country_whitelist" USING "btree" ("country_code")
CREATE INDEX "idx_currency_trans_type" ON "public"."currency_transactions" USING "btree" ("transaction_type")
CREATE INDEX "idx_currency_trans_user" ON "public"."currency_transactions" USING "btree" ("user_id", "created_at" DESC)
CREATE INDEX "idx_daily_login_user" ON "public"."daily_login_tracker" USING "btree" ("user_id", "login_date" DESC)
CREATE INDEX "idx_discord_verification_is_verified" ON "public"."tournament_discord_verification" USING "btree" ("is_verified")
CREATE INDEX "idx_discord_verification_status" ON "public"."tournament_discord_verification" USING "btree" ("status")
CREATE INDEX "idx_discord_verification_tournament_id" ON "public"."tournament_discord_verification" USING "btree" ("tournament_id")
CREATE INDEX "idx_discord_verification_tournament_status" ON "public"."tournament_discord_verification" USING "btree" ("tournament_id", "status")
CREATE INDEX "idx_discord_verification_user_id" ON "public"."tournament_discord_verification" USING "btree" ("user_id")
CREATE INDEX "idx_featured_events_eligible_countries" ON "public"."featured_events" USING "btree" ("eligible_countries") WHERE ("eligible_countries" IS NOT NULL)
CREATE INDEX "idx_featured_events_is_active" ON "public"."featured_events" USING "btree" ("is_active") WHERE ("is_active" = true)
CREATE INDEX "idx_featured_events_tournament_id" ON "public"."featured_events" USING "btree" ("tournament_id")
CREATE INDEX "idx_galaxy_api_logs_campaign" ON "public"."galaxy_api_logs" USING "btree" ("campaign_id") WHERE ("campaign_id" IS NOT NULL)
CREATE INDEX "idx_galaxy_api_logs_campaign_success" ON "public"."galaxy_api_logs" USING "btree" ("campaign_id", "success", "created_at" DESC) WHERE ("campaign_id" IS NOT NULL)
CREATE INDEX "idx_galaxy_api_logs_created_at" ON "public"."galaxy_api_logs" USING "btree" ("created_at" DESC)
CREATE INDEX "idx_galaxy_api_logs_endpoint" ON "public"."galaxy_api_logs" USING "btree" ("endpoint")
CREATE INDEX "idx_galaxy_api_logs_project" ON "public"."galaxy_api_logs" USING "btree" ("project_config_id") WHERE ("project_config_id" IS NOT NULL)
CREATE INDEX "idx_galaxy_api_logs_success" ON "public"."galaxy_api_logs" USING "btree" ("success")
CREATE INDEX "idx_galaxy_rubric_game" ON "public"."galaxy_rubric_mappings" USING "btree" ("game_id")
CREATE INDEX "idx_galaxy_rubric_mappings_game_id" ON "public"."galaxy_rubric_mappings" USING "btree" ("game_id")
CREATE INDEX "idx_galaxy_rubric_mappings_rubric_id" ON "public"."galaxy_rubric_mappings" USING "btree" ("rubric_id")
CREATE INDEX "idx_galaxy_rubric_project_config" ON "public"."galaxy_rubric_mappings" USING "btree" ("project_config_id")
CREATE INDEX "idx_galaxy_rubric_project_game" ON "public"."galaxy_rubric_mappings" USING "btree" ("project_config_id", "game_id")
CREATE INDEX "idx_galaxy_rubric_rubric_id" ON "public"."galaxy_rubric_mappings" USING "btree" ("rubric_id")
CREATE UNIQUE INDEX "idx_galaxy_rubric_unique_project_game" ON "public"."galaxy_rubric_mappings" USING "btree" ("project_config_id", "game_id", "rubric_id")
CREATE INDEX "idx_game_api_integrations_game_id" ON "public"."game_api_integrations" USING "btree" ("game_id")
CREATE INDEX "idx_game_contents_duration" ON "public"."game_contents" USING "btree" ("duration") WHERE ("duration" IS NOT NULL)
CREATE INDEX "idx_game_contents_galaxy_rubric_id" ON "public"."game_contents" USING "btree" ("galaxy_rubric_id") WHERE ("galaxy_rubric_id" IS NOT NULL)
CREATE UNIQUE INDEX "idx_game_contents_galaxy_unique" ON "public"."game_contents" USING "btree" ("game_id", "galaxy_content_id")
CREATE INDEX "idx_game_contents_product_year" ON "public"."game_contents" USING "btree" ("product_year") WHERE ("product_year" IS NOT NULL)
CREATE INDEX "idx_game_publisher_id_for_users_game_id" ON "public"."game_publisher_id_for_users" USING "btree" ("game_id")
CREATE INDEX "idx_game_publisher_id_for_users_game_publisher_id" ON "public"."game_publisher_id_for_users" USING "btree" ("game_publisher_id")
CREATE INDEX "idx_game_publisher_id_for_users_user_id" ON "public"."game_publisher_id_for_users" USING "btree" ("user_id")
CREATE INDEX "idx_game_publisher_ids_game_id" ON "public"."game_publisher_ids" USING "btree" ("game_id")
CREATE INDEX "idx_messages_channel_id" ON "public"."messages" USING "btree" ("channel_id")
CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at")
CREATE INDEX "idx_messages_read" ON "public"."messages" USING "btree" ("read")
CREATE INDEX "idx_messages_receiver_id" ON "public"."messages" USING "btree" ("receiver_id")
CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id")
CREATE INDEX "idx_messages_type" ON "public"."messages" USING "btree" ("type")
CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at")
CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read")
CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type")
CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id")
CREATE INDEX "idx_player_notifications_created_at" ON "public"."player_match_notifications" USING "btree" ("created_at" DESC)
CREATE INDEX "idx_player_notifications_is_read" ON "public"."player_match_notifications" USING "btree" ("is_read") WHERE ("is_read" = false)
CREATE INDEX "idx_player_notifications_match_id" ON "public"."player_match_notifications" USING "btree" ("match_id")
CREATE INDEX "idx_player_notifications_tournament_id" ON "public"."player_match_notifications" USING "btree" ("tournament_id")
CREATE INDEX "idx_player_notifications_user_id" ON "public"."player_match_notifications" USING "btree" ("user_id")
CREATE INDEX "idx_player_notifications_user_unread" ON "public"."player_match_notifications" USING "btree" ("user_id", "is_read", "created_at" DESC) WHERE ("is_read" = false)
CREATE INDEX "idx_pp_user_points_monthly_points" ON "public"."pp_user_points" USING "btree" ("monthly_points" DESC)
CREATE INDEX "idx_pp_user_points_total_points" ON "public"."pp_user_points" USING "btree" ("total_points" DESC)
CREATE INDEX "idx_pp_user_points_weekly_points" ON "public"."pp_user_points" USING "btree" ("weekly_points" DESC)
CREATE INDEX "idx_pro_matches_game" ON "public"."pro_matches" USING "btree" ("game_id")
CREATE INDEX "idx_pro_matches_tournament" ON "public"."pro_matches" USING "btree" ("tournament_id")
CREATE INDEX "idx_pro_stages_tournament" ON "public"."pro_stages" USING "btree" ("tournament_id")
CREATE INDEX "idx_pro_substages_stage" ON "public"."pro_substages" USING "btree" ("stage_id")
CREATE INDEX "idx_pro_teams_game" ON "public"."pro_teams" USING "btree" ("game_id")
CREATE INDEX "idx_pro_tournaments_game" ON "public"."pro_tournaments" USING "btree" ("game_id")
CREATE UNIQUE INDEX "idx_project_config_domain" ON "public"."project_configurations" USING "btree" ("domain") WHERE ("domain" IS NOT NULL)
CREATE UNIQUE INDEX "idx_project_config_single_default" ON "public"."project_configurations" USING "btree" ("is_default") WHERE ("is_default" = true)
CREATE INDEX "idx_project_configurations_campaign_id" ON "public"."project_configurations" USING "btree" ("campaign_id")
CREATE INDEX "idx_project_configurations_config_active" ON "public"."project_configurations" USING "btree" ("config_id", "is_active") WHERE ("is_active" = true)
CREATE INDEX "idx_project_configurations_config_id" ON "public"."project_configurations" USING "btree" ("config_id")
CREATE INDEX "idx_project_configurations_is_active" ON "public"."project_configurations" USING "btree" ("is_active")
CREATE INDEX "idx_project_configurations_product_id" ON "public"."project_configurations" USING "btree" ("product_id")
CREATE INDEX "idx_publisher_gamer_publisher_id" ON "public"."publisher_gamer" USING "btree" ("publisher_id")
CREATE INDEX "idx_publisher_gamer_user_id" ON "public"."publisher_gamer" USING "btree" ("user_id")
CREATE INDEX "idx_report_shares_expires_at" ON "public"."report_shares" USING "btree" ("expires_at")
CREATE INDEX "idx_report_shares_report_id" ON "public"."report_shares" USING "btree" ("report_id")
CREATE INDEX "idx_report_shares_share_token" ON "public"."report_shares" USING "btree" ("share_token")
CREATE INDEX "idx_round_notifications_created_at" ON "public"."bracket_round_notifications" USING "btree" ("created_at" DESC)
CREATE INDEX "idx_round_notifications_is_read" ON "public"."bracket_round_notifications" USING "btree" ("is_read") WHERE ("is_read" = false)
CREATE INDEX "idx_round_notifications_round_number" ON "public"."bracket_round_notifications" USING "btree" ("round_number")
CREATE INDEX "idx_round_notifications_tournament_id" ON "public"."bracket_round_notifications" USING "btree" ("tournament_id")
CREATE INDEX "idx_round_timers_round_number" ON "public"."bracket_round_timers" USING "btree" ("round_number")
CREATE INDEX "idx_round_timers_status" ON "public"."bracket_round_timers" USING "btree" ("status") WHERE ("status" = ANY (ARRAY['active'::"text", 'paused'::"text"]))
CREATE INDEX "idx_round_timers_tournament_id" ON "public"."bracket_round_timers" USING "btree" ("tournament_id")
CREATE INDEX "idx_round_timers_tournament_status" ON "public"."bracket_round_timers" USING "btree" ("tournament_id", "status")
CREATE INDEX "idx_shop_items_available" ON "public"."currency_shop_items" USING "btree" ("is_available", "sort_order") WHERE ("is_available" = true)
CREATE INDEX "idx_shop_items_category" ON "public"."currency_shop_items" USING "btree" ("item_category")
CREATE INDEX "idx_shop_items_type" ON "public"."currency_shop_items" USING "btree" ("item_type")
CREATE INDEX "idx_support_tickets_first_opened_at" ON "public"."support_tickets" USING "btree" ("first_opened_at")
CREATE INDEX "idx_support_tickets_opened_by" ON "public"."support_tickets" USING "btree" ("opened_by")
CREATE INDEX "idx_support_tickets_status" ON "public"."support_tickets" USING "btree" ("status")
CREATE INDEX "idx_support_tickets_status_first_opened" ON "public"."support_tickets" USING "btree" ("status", "first_opened_at")
CREATE INDEX "idx_support_tickets_tournament_id" ON "public"."support_tickets" USING "btree" ("tournament_id")
CREATE INDEX "idx_support_tickets_user_id" ON "public"."support_tickets" USING "btree" ("user_id")
CREATE INDEX "idx_team_applications_status" ON "public"."team_applications" USING "btree" ("status")
CREATE INDEX "idx_team_applications_team_id" ON "public"."team_applications" USING "btree" ("team_id")
CREATE INDEX "idx_team_applications_tournament_id" ON "public"."team_applications" USING "btree" ("tournament_id")
CREATE INDEX "idx_team_applications_user_id" ON "public"."team_applications" USING "btree" ("user_id")
CREATE INDEX "idx_team_members_team_id" ON "public"."team_members" USING "btree" ("team_id")
CREATE INDEX "idx_team_members_user_id" ON "public"."team_members" USING "btree" ("user_id")
CREATE INDEX "idx_teams_chat_channel_id" ON "public"."teams" USING "btree" ("chat_channel_id")
CREATE INDEX "idx_teams_is_looking_for_players" ON "public"."teams" USING "btree" ("is_looking_for_players")
CREATE INDEX "idx_ticket_messages_ticket_id" ON "public"."ticket_messages" USING "btree" ("ticket_id")
CREATE INDEX "idx_ticket_messages_user_id" ON "public"."ticket_messages" USING "btree" ("user_id")
CREATE INDEX "idx_tournament_feedback_created_at" ON "public"."tournament_feedback" USING "btree" ("created_at")
CREATE INDEX "idx_tournament_feedback_tournament_id" ON "public"."tournament_feedback" USING "btree" ("tournament_id")
CREATE INDEX "idx_tournament_feedback_user_id" ON "public"."tournament_feedback" USING "btree" ("user_id")
CREATE INDEX "idx_tournament_field_values_field_id" ON "public"."tournament_field_values" USING "btree" ("field_id")
CREATE INDEX "idx_tournament_field_values_tournament_id" ON "public"."tournament_field_values" USING "btree" ("tournament_id")
CREATE INDEX "idx_tournament_fields_tournament_id" ON "public"."tournament_fields" USING "btree" ("tournament_id")
CREATE INDEX "idx_tournament_matches_bye" ON "public"."tournament_matches" USING "btree" ("tournament_id", "round", "is_bye") WHERE ("is_bye" = true)
CREATE INDEX "idx_tournament_matches_group_id" ON "public"."tournament_matches" USING "btree" ("group_id")
CREATE INDEX "idx_tournament_matches_lucky_loser" ON "public"."tournament_matches" USING "btree" ("tournament_id", "is_lucky_loser_match") WHERE ("is_lucky_loser_match" = true)
CREATE INDEX "idx_tournament_matches_manual_assignment" ON "public"."tournament_matches" USING "btree" ("tournament_id", "manual_assignment") WHERE ("manual_assignment" = true)
CREATE INDEX "idx_tournament_matches_position" ON "public"."tournament_matches" USING "btree" ("position")
CREATE INDEX "idx_tournament_matches_round" ON "public"."tournament_matches" USING "btree" ("round")
CREATE INDEX "idx_tournament_matches_tournament_group" ON "public"."tournament_matches" USING "btree" ("tournament_id", "group_id")
CREATE INDEX "idx_tournament_matches_tournament_id" ON "public"."tournament_matches" USING "btree" ("tournament_id")
CREATE INDEX "idx_tournament_matches_unique_position" ON "public"."tournament_matches" USING "btree" ("tournament_id", "round", "position")
CREATE INDEX "idx_tournament_prizes_position" ON "public"."tournament_prizes" USING "btree" ("tournament_id", "position")
CREATE INDEX "idx_tournament_prizes_prize_type" ON "public"."tournament_prizes" USING "btree" ("prize_type")
CREATE INDEX "idx_tournament_prizes_tournament_id" ON "public"."tournament_prizes" USING "btree" ("tournament_id")
CREATE INDEX "idx_tournament_registrations_status" ON "public"."tournament_registrations" USING "btree" ("status")
CREATE INDEX "idx_tournament_registrations_team_id" ON "public"."tournament_registrations" USING "btree" ("team_id")
CREATE INDEX "idx_tournament_registrations_tournament_id" ON "public"."tournament_registrations" USING "btree" ("tournament_id")
CREATE INDEX "idx_tournament_registrations_user_id" ON "public"."tournament_registrations" USING "btree" ("user_id")
CREATE INDEX "idx_tournament_reports_created_at" ON "public"."tournament_reports" USING "btree" ("created_at" DESC)
CREATE INDEX "idx_tournament_reports_tournament_id" ON "public"."tournament_reports" USING "btree" ("tournament_id")
CREATE INDEX "idx_tournaments_bracket_launched_at" ON "public"."tournaments" USING "btree" ("bracket_launched_at") WHERE ("bracket_launched_at" IS NOT NULL)
CREATE INDEX "idx_tournaments_discord_server_id" ON "public"."tournaments" USING "btree" ("discord_server_id")
CREATE INDEX "idx_tournaments_registration_locked" ON "public"."tournaments" USING "btree" ("registration_locked") WHERE ("registration_locked" = true)
CREATE INDEX "idx_tournaments_twitch_live" ON "public"."tournaments" USING "btree" ("is_twitch_live") WHERE ("is_twitch_live" = true)
CREATE INDEX "idx_tournaments_twitch_url" ON "public"."tournaments" USING "btree" ("twitch_url") WHERE ("twitch_url" IS NOT NULL)
CREATE INDEX "idx_user_achievements_achievement_id" ON "public"."user_achievements" USING "btree" ("achievement_id")
CREATE INDEX "idx_user_achievements_user_id" ON "public"."user_achievements" USING "btree" ("user_id")
CREATE INDEX "idx_user_currency_balance" ON "public"."user_currency" USING "btree" ("gems_balance" DESC)
CREATE INDEX "idx_user_export_preferences_user_id" ON "public"."user_export_preferences" USING "btree" ("user_id")
CREATE INDEX "idx_user_inventory_equipped" ON "public"."user_inventory" USING "btree" ("user_id", "is_equipped") WHERE ("is_equipped" = true)
CREATE INDEX "idx_user_inventory_user" ON "public"."user_inventory" USING "btree" ("user_id")
CREATE INDEX "idx_user_quests_status" ON "public"."user_quests" USING "btree" ("status")
CREATE INDEX "idx_user_quests_user_id" ON "public"."user_quests" USING "btree" ("user_id")
CREATE INDEX "idx_user_relationships_status" ON "public"."user_relationships" USING "btree" ("status")
CREATE INDEX "idx_user_relationships_user_id_1" ON "public"."user_relationships" USING "btree" ("user_id_1")
CREATE INDEX "idx_user_relationships_user_id_2" ON "public"."user_relationships" USING "btree" ("user_id_2")
CREATE INDEX "idx_user_rewards_inventory_reward_id" ON "public"."user_rewards_inventory" USING "btree" ("reward_id")
CREATE INDEX "idx_user_rewards_inventory_user_id" ON "public"."user_rewards_inventory" USING "btree" ("user_id")
CREATE INDEX "idx_user_tier_claims_tier_id" ON "public"."user_tier_claims" USING "btree" ("tier_id")
CREATE INDEX "idx_user_tier_claims_user_id" ON "public"."user_tier_claims" USING "btree" ("user_id")
CREATE INDEX "idx_user_tournament_field_values_composite" ON "public"."user_tournament_field_values" USING "btree" ("user_id", "tournament_id", "field_id", "field_index")
CREATE INDEX "idx_user_tournament_field_values_field_id" ON "public"."user_tournament_field_values" USING "btree" ("field_id")
CREATE INDEX "idx_user_tournament_field_values_tournament_id" ON "public"."user_tournament_field_values" USING "btree" ("tournament_id")
CREATE INDEX "idx_user_tournament_field_values_user_id" ON "public"."user_tournament_field_values" USING "btree" ("user_id")
CREATE INDEX "idx_user_tournament_field_values_value_gin" ON "public"."user_tournament_field_values" USING "gin" ("value")
CREATE INDEX "idx_users_discord_user_id" ON "public"."users" USING "btree" ("discord_user_id")
CREATE INDEX "idx_users_level" ON "public"."users" USING "btree" ("level")
CREATE INDEX "idx_users_xp" ON "public"."users" USING "btree" ("xp")
CREATE INDEX "idx_virtual_currency_transactions_created_at" ON "public"."virtual_currency_transactions" USING "btree" ("created_at" DESC)
CREATE INDEX "idx_virtual_currency_transactions_user_id" ON "public"."virtual_currency_transactions" USING "btree" ("user_id")
CREATE INDEX "idx_xp_events_source" ON "public"."xp_events" USING "btree" ("source")
CREATE INDEX "idx_xp_events_user" ON "public"."xp_events" USING "btree" ("user_id", "created_at" DESC)
CREATE UNIQUE INDEX "users_msisdn_key" ON "public"."users" USING "btree" ("msisdn")
CREATE OR REPLACE TRIGGER "assign_starter_quests_trigger" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."assign_starter_quests"()
CREATE OR REPLACE TRIGGER "battle_royale_calculate_total_points" BEFORE INSERT OR UPDATE ON "public"."battle_royale_results" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_battle_royale_total_points"()
CREATE OR REPLACE TRIGGER "channel_invitation_notification_trigger" AFTER INSERT ON "public"."channel_members" FOR EACH ROW WHEN (("new"."status" = 'pending'::"text")) EXECUTE FUNCTION "public"."create_channel_invitation_notification"()
CREATE OR REPLACE TRIGGER "ensure_single_active_event_trigger" BEFORE INSERT OR UPDATE ON "public"."featured_events" FOR EACH ROW WHEN (("new"."is_active" = true)) EXECUTE FUNCTION "public"."ensure_single_active_event"()
CREATE OR REPLACE TRIGGER "friend_accepted_notification_trigger" AFTER UPDATE OF "status" ON "public"."user_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."create_friend_accepted_notification"()
CREATE OR REPLACE TRIGGER "friend_request_notification_trigger" AFTER INSERT ON "public"."user_relationships" FOR EACH ROW WHEN (("new"."status" = 'pending'::"text")) EXECUTE FUNCTION "public"."create_friend_request_notification"()
CREATE OR REPLACE TRIGGER "new_ticket_notification_trigger" AFTER INSERT ON "public"."support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."create_new_ticket_notification"()
CREATE OR REPLACE TRIGGER "profile_update_xp_trigger" AFTER UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_profile_update_xp"()
CREATE OR REPLACE TRIGGER "promote_backup_player_trigger" AFTER UPDATE ON "public"."tournament_registrations" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."promote_backup_player"()
CREATE OR REPLACE TRIGGER "registration_status_change_trigger" AFTER UPDATE OF "status" ON "public"."tournament_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."create_registration_status_notification"()
CREATE OR REPLACE TRIGGER "set_registration_order_trigger" BEFORE INSERT ON "public"."tournament_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."set_registration_order"()
CREATE OR REPLACE TRIGGER "team_application_received_trigger" AFTER INSERT ON "public"."team_applications" FOR EACH ROW EXECUTE FUNCTION "public"."create_team_application_received_notification"()
CREATE OR REPLACE TRIGGER "team_application_status_change_trigger" AFTER UPDATE OF "status" ON "public"."team_applications" FOR EACH ROW EXECUTE FUNCTION "public"."create_team_application_notification"()
CREATE OR REPLACE TRIGGER "ticket_message_notification_trigger" AFTER INSERT ON "public"."ticket_messages" FOR EACH ROW EXECUTE FUNCTION "public"."create_ticket_message_notification"()
CREATE OR REPLACE TRIGGER "tournament_live_trigger" AFTER UPDATE OF "twitch_url" ON "public"."tournaments" FOR EACH ROW WHEN (((("new"."twitch_url" IS NOT NULL) AND ("old"."twitch_url" IS NULL)) OR (("new"."twitch_url" IS NOT NULL) AND ("new"."twitch_url" <> "old"."twitch_url")))) EXECUTE FUNCTION "public"."create_tournament_join_now_notification"()
CREATE OR REPLACE TRIGGER "tournament_match_update_notification_trigger" AFTER UPDATE OF "winner_id" ON "public"."tournament_matches" FOR EACH ROW EXECUTE FUNCTION "public"."create_bracket_update_notification"()
CREATE OR REPLACE TRIGGER "tournament_registration_xp_trigger" AFTER INSERT ON "public"."tournament_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_tournament_registration_xp"()
CREATE OR REPLACE TRIGGER "tournament_start_trigger" AFTER UPDATE OF "start_date" ON "public"."tournaments" FOR EACH ROW WHEN ((("new"."start_date" <= ("now"() + '1 day'::interval)) AND ("old"."start_date" > ("now"() + '1 day'::interval)))) EXECUTE FUNCTION "public"."create_tournament_start_notification"()
CREATE OR REPLACE TRIGGER "tournament_status_change_trigger" AFTER UPDATE OF "status" ON "public"."tournaments" FOR EACH ROW EXECUTE FUNCTION "public"."create_tournament_status_notification"()
CREATE OR REPLACE TRIGGER "trigger_enforce_single_default" BEFORE INSERT OR UPDATE ON "public"."project_configurations" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_single_default_config"()
CREATE OR REPLACE TRIGGER "trigger_update_country_whitelist_updated_at" BEFORE UPDATE ON "public"."country_whitelist" FOR EACH ROW EXECUTE FUNCTION "public"."update_country_whitelist_updated_at"()
CREATE OR REPLACE TRIGGER "trigger_update_round_timer_timestamp" BEFORE UPDATE ON "public"."bracket_round_timers" FOR EACH ROW EXECUTE FUNCTION "public"."update_round_timer_timestamp"()
CREATE OR REPLACE TRIGGER "trigger_update_user_export_preferences_updated_at" BEFORE UPDATE ON "public"."user_export_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_export_preferences_updated_at"()
CREATE OR REPLACE TRIGGER "trigger_update_user_relationship_updated_at" BEFORE UPDATE ON "public"."user_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_relationship_updated_at"()
CREATE OR REPLACE TRIGGER "trigger_update_virtual_currency_balance" AFTER INSERT ON "public"."virtual_currency_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_virtual_currency_balance"()
CREATE OR REPLACE TRIGGER "update_admin_settings_updated_at" BEFORE UPDATE ON "public"."admin_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_admin_settings_updated_at"()
CREATE OR REPLACE TRIGGER "update_featured_events_updated_at_trigger" BEFORE UPDATE ON "public"."featured_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_featured_events_updated_at"()
CREATE OR REPLACE TRIGGER "update_platform_api_integrations_updated_at" BEFORE UPDATE ON "public"."platform_api_integrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_admin_settings_updated_at"()
CREATE OR REPLACE TRIGGER "update_support_ticket_updated_at" BEFORE UPDATE ON "public"."support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_support_ticket_updated_at"()
CREATE OR REPLACE TRIGGER "update_tournament_discord_verification_updated_at" BEFORE UPDATE ON "public"."tournament_discord_verification" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"()
CREATE OR REPLACE TRIGGER "update_tournament_feedback_updated_at" BEFORE UPDATE ON "public"."tournament_feedback" FOR EACH ROW EXECUTE FUNCTION "public"."update_tournament_feedback_updated_at"()
ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."aim_trainer_scores"
    ADD CONSTRAINT "aim_trainer_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE
ALTER TABLE ONLY "public"."battle_pass_tiers"
    ADD CONSTRAINT "battle_pass_tiers_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."battle_pass_seasons"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."battle_royale_results"
    ADD CONSTRAINT "battle_royale_results_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."battle_royale_results"
    ADD CONSTRAINT "battle_royale_results_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."battle_royale_results"
    ADD CONSTRAINT "battle_royale_results_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."bracket_eliminations"
    ADD CONSTRAINT "bracket_eliminations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."bracket_eliminations"
    ADD CONSTRAINT "bracket_eliminations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."bracket_modifications_log"
    ADD CONSTRAINT "bracket_modifications_log_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."tournament_matches"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."bracket_modifications_log"
    ADD CONSTRAINT "bracket_modifications_log_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "public"."users"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."bracket_modifications_log"
    ADD CONSTRAINT "bracket_modifications_log_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."bracket_round_notifications"
    ADD CONSTRAINT "bracket_round_notifications_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."bracket_round_timers"
    ADD CONSTRAINT "bracket_round_timers_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."coaching_sessions"
    ADD CONSTRAINT "coaching_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."currency_transactions"
    ADD CONSTRAINT "currency_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."daily_login_tracker"
    ADD CONSTRAINT "daily_login_tracker_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."featured_events"
    ADD CONSTRAINT "featured_events_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "fk_current_avatar" FOREIGN KEY ("current_avatar_id") REFERENCES "public"."achievements"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."galaxy_rubric_mappings"
    ADD CONSTRAINT "fk_game" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."galaxy_rubric_mappings"
    ADD CONSTRAINT "fk_project_config_id" FOREIGN KEY ("project_config_id") REFERENCES "public"."project_configurations"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."game_api_integrations"
    ADD CONSTRAINT "game_api_integrations_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."game_contents"
    ADD CONSTRAINT "game_contents_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."game_publisher_id_for_users"
    ADD CONSTRAINT "game_publisher_id_for_users_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."game_publisher_id_for_users"
    ADD CONSTRAINT "game_publisher_id_for_users_game_publisher_id_fkey" FOREIGN KEY ("game_publisher_id") REFERENCES "public"."game_publisher_ids"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."game_publisher_id_for_users"
    ADD CONSTRAINT "game_publisher_id_for_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."game_publisher_ids"
    ADD CONSTRAINT "game_publisher_ids_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_loser_player_id_fkey" FOREIGN KEY ("loser_player_id") REFERENCES "public"."users"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_loser_team_id_fkey" FOREIGN KEY ("loser_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_winner_player_id_fkey" FOREIGN KEY ("winner_player_id") REFERENCES "public"."users"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."player_match_notifications"
    ADD CONSTRAINT "player_match_notifications_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."tournament_matches"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."player_match_notifications"
    ADD CONSTRAINT "player_match_notifications_opponent_id_fkey" FOREIGN KEY ("opponent_id") REFERENCES "public"."users"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."player_match_notifications"
    ADD CONSTRAINT "player_match_notifications_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."player_match_notifications"
    ADD CONSTRAINT "player_match_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."player_rankings"
    ADD CONSTRAINT "player_rankings_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."player_rankings"
    ADD CONSTRAINT "player_rankings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."pp_user_points"
    ADD CONSTRAINT "pp_user_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."pro_matches"
    ADD CONSTRAINT "pro_matches_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."pro_games"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."pro_matches"
    ADD CONSTRAINT "pro_matches_team_a_fkey" FOREIGN KEY ("team_a") REFERENCES "public"."pro_teams"("id")
ALTER TABLE ONLY "public"."pro_matches"
    ADD CONSTRAINT "pro_matches_team_b_fkey" FOREIGN KEY ("team_b") REFERENCES "public"."pro_teams"("id")
ALTER TABLE ONLY "public"."pro_matches"
    ADD CONSTRAINT "pro_matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."pro_tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."pro_stages"
    ADD CONSTRAINT "pro_stages_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."pro_tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."pro_substages"
    ADD CONSTRAINT "pro_substages_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."pro_stages"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."pro_teams"
    ADD CONSTRAINT "pro_teams_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."pro_games"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."pro_tournament_teams"
    ADD CONSTRAINT "pro_tournament_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."pro_teams"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."pro_tournament_teams"
    ADD CONSTRAINT "pro_tournament_teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."pro_tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."pro_tournaments"
    ADD CONSTRAINT "pro_tournaments_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."pro_games"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."publisher_gamer"
    ADD CONSTRAINT "publisher_gamer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."report_shares"
    ADD CONSTRAINT "report_shares_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."report_shares"
    ADD CONSTRAINT "report_shares_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."tournament_reports"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."team_applications"
    ADD CONSTRAINT "team_applications_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."team_applications"
    ADD CONSTRAINT "team_applications_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."team_applications"
    ADD CONSTRAINT "team_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."team_rankings"
    ADD CONSTRAINT "team_rankings_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."team_rankings"
    ADD CONSTRAINT "team_rankings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_captain_id_fkey" FOREIGN KEY ("captain_id") REFERENCES "public"."users"("id")
ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_chat_channel_id_fkey" FOREIGN KEY ("chat_channel_id") REFERENCES "public"."channels"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."tournament_discord_verification"
    ADD CONSTRAINT "tournament_discord_verification_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."tournament_discord_verification"
    ADD CONSTRAINT "tournament_discord_verification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."tournament_feedback"
    ADD CONSTRAINT "tournament_feedback_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."tournament_feedback"
    ADD CONSTRAINT "tournament_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."tournament_field_values"
    ADD CONSTRAINT "tournament_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "public"."tournament_fields"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."tournament_field_values"
    ADD CONSTRAINT "tournament_field_values_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."tournament_fields"
    ADD CONSTRAINT "tournament_fields_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_lucky_loser_player_id_fkey" FOREIGN KEY ("lucky_loser_player_id") REFERENCES "public"."users"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_player1_id_fkey" FOREIGN KEY ("player1_id") REFERENCES "public"."users"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_player2_id_fkey" FOREIGN KEY ("player2_id") REFERENCES "public"."users"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_replaced_player_id_fkey" FOREIGN KEY ("replaced_player_id") REFERENCES "public"."users"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."tournament_matches"
    ADD CONSTRAINT "tournament_matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."tournament_prizes"
    ADD CONSTRAINT "tournament_prizes_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."tournament_registrations"
    ADD CONSTRAINT "tournament_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."tournament_reports"
    ADD CONSTRAINT "tournament_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."tournament_reports"
    ADD CONSTRAINT "tournament_reports_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE SET NULL
ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_battle_pass_progress"
    ADD CONSTRAINT "user_battle_pass_progress_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."battle_pass_seasons"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_battle_pass_progress"
    ADD CONSTRAINT "user_battle_pass_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_currency"
    ADD CONSTRAINT "user_currency_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_export_preferences"
    ADD CONSTRAINT "user_export_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_inventory"
    ADD CONSTRAINT "user_inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."currency_shop_items"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_inventory"
    ADD CONSTRAINT "user_inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_quests"
    ADD CONSTRAINT "user_quests_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_quests"
    ADD CONSTRAINT "user_quests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_relationships"
    ADD CONSTRAINT "user_relationships_user_id_1_fkey" FOREIGN KEY ("user_id_1") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_relationships"
    ADD CONSTRAINT "user_relationships_user_id_2_fkey" FOREIGN KEY ("user_id_2") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_rewards_inventory"
    ADD CONSTRAINT "user_rewards_inventory_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."battle_pass_rewards"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_rewards_inventory"
    ADD CONSTRAINT "user_rewards_inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_tier_claims"
    ADD CONSTRAINT "user_tier_claims_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."battle_pass_tiers"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_tier_claims"
    ADD CONSTRAINT "user_tier_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_tournament_field_values"
    ADD CONSTRAINT "user_tournament_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "public"."tournament_fields"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_tournament_field_values"
    ADD CONSTRAINT "user_tournament_field_values_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_tournament_field_values"
    ADD CONSTRAINT "user_tournament_field_values_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."user_virtual_currency"
    ADD CONSTRAINT "user_virtual_currency_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."virtual_currency_transactions"
    ADD CONSTRAINT "virtual_currency_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
ALTER TABLE ONLY "public"."xp_events"
    ADD CONSTRAINT "xp_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
CREATE POLICY "Admin users can manage configurations" ON "public"."country_configurations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."admin_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."admin_role_type")))))
CREATE POLICY "Administrators can do everything with games" ON "public"."games" USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."type" = 'admin'::"text"))))
CREATE POLICY "Administrators can do everything with teams" ON "public"."teams" USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."type" = 'admin'::"text"))))
CREATE POLICY "Administrators can do everything with tournaments" ON "public"."tournaments" USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."type" = 'admin'::"text"))))
CREATE POLICY "Administrators can manage admin settings" ON "public"."admin_settings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Administrators can manage all applications" ON "public"."team_applications" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Administrators can manage all battle royale results" ON "public"."battle_royale_results" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Administrators can manage all gaming accounts" ON "public"."game_publisher_id_for_users" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Administrators can manage all messages" ON "public"."messages" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Administrators can manage all notifications" ON "public"."notifications" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Administrators can manage all relationships" ON "public"."user_relationships" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Administrators can manage all team members" ON "public"."team_members" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Administrators can manage all tournament field values" ON "public"."user_tournament_field_values" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Administrators can manage all tournament registrations" ON "public"."tournament_registrations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Administrators can manage galaxy rubric mappings" ON "public"."galaxy_rubric_mappings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Administrators can manage game contents" ON "public"."game_contents" USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."type" = 'admin'::"text"))))
CREATE POLICY "Administrators can manage game publisher IDs" ON "public"."game_publisher_ids" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Administrators can manage platform API integrations" ON "public"."platform_api_integrations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Administrators can manage tournament field values" ON "public"."tournament_field_values" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."type" = 'admin'::"text"))))
CREATE POLICY "Administrators can manage tournament matches" ON "public"."tournament_matches" USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."type" = 'admin'::"text"))))
CREATE POLICY "Administrators can manage tournament prizes" ON "public"."tournament_prizes" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."type" = 'admin'::"text"))))
CREATE POLICY "Administrators can modify users" ON "public"."users" TO "authenticated" USING (("type" = 'admin'::"text"))
CREATE POLICY "Admins can create bracket modification logs" ON "public"."bracket_modifications_log" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can create notifications" ON "public"."bracket_round_notifications" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can create notifications" ON "public"."player_match_notifications" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can create report shares" ON "public"."report_shares" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can create round timers" ON "public"."bracket_round_timers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can create tournament reports" ON "public"."tournament_reports" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can delete XP thresholds" ON "public"."xp_thresholds" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can delete achievements" ON "public"."achievements" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can delete bracket eliminations" ON "public"."bracket_eliminations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."admin_role_type")))))
CREATE POLICY "Admins can delete game publisher IDs" ON "public"."game_publisher_ids" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can delete notifications" ON "public"."bracket_round_notifications" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can delete notifications" ON "public"."player_match_notifications" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can delete quests" ON "public"."quests" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can delete report shares" ON "public"."report_shares" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can delete round timers" ON "public"."bracket_round_timers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can delete tournament reports" ON "public"."tournament_reports" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can delete user achievements" ON "public"."user_achievements" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can delete user quests" ON "public"."user_quests" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can insert XP thresholds" ON "public"."xp_thresholds" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can insert achievements" ON "public"."achievements" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can insert bracket eliminations" ON "public"."bracket_eliminations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."admin_role_type")))))
CREATE POLICY "Admins can insert game publisher IDs" ON "public"."game_publisher_ids" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can insert quests" ON "public"."quests" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can insert user achievements" ON "public"."user_achievements" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can insert user quests" ON "public"."user_quests" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can manage all coaching sessions" ON "public"."coaching_sessions" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can manage all feedback" ON "public"."tournament_feedback" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can manage all publisher data" ON "public"."publisher_gamer" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can manage all ticket messages" ON "public"."ticket_messages" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can manage all tickets" ON "public"."support_tickets" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can manage country whitelist" ON "public"."country_whitelist" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can manage currency" ON "public"."user_virtual_currency" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can manage game API integrations" ON "public"."game_api_integrations" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can manage match results" ON "public"."match_results" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can manage player rankings" ON "public"."player_rankings" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can manage pro content" ON "public"."pro_content" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can manage rewards" ON "public"."battle_pass_rewards" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can manage team rankings" ON "public"."team_rankings" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can read all feedback" ON "public"."tournament_feedback" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can read all user field values" ON "public"."user_tournament_field_values" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can read all user game publisher IDs" ON "public"."game_publisher_id_for_users" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can select XP thresholds" ON "public"."xp_thresholds" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can select achievements" ON "public"."achievements" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can select quests" ON "public"."quests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can select user achievements" ON "public"."user_achievements" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can select user quests" ON "public"."user_quests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can update XP thresholds" ON "public"."xp_thresholds" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can update achievements" ON "public"."achievements" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can update all Discord verifications" ON "public"."tournament_discord_verification" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can update all notifications" ON "public"."player_match_notifications" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can update bracket eliminations" ON "public"."bracket_eliminations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."admin_role_type")))))
CREATE POLICY "Admins can update game publisher IDs" ON "public"."game_publisher_ids" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can update quests" ON "public"."quests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can update report shares" ON "public"."report_shares" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can update round timers" ON "public"."bracket_round_timers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can update tournament reports" ON "public"."tournament_reports" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can update user achievements" ON "public"."user_achievements" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can update user quests" ON "public"."user_quests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can view all Discord verifications" ON "public"."tournament_discord_verification" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can view all claims" ON "public"."user_tier_claims" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can view all currency" ON "public"."user_virtual_currency" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can view all inventories" ON "public"."user_rewards_inventory" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can view all notifications" ON "public"."player_match_notifications" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can view all report shares" ON "public"."report_shares" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can view all tournament reports" ON "public"."tournament_reports" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can view all transactions" ON "public"."virtual_currency_transactions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can view bracket modification logs" ON "public"."bracket_modifications_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Admins can view round timers" ON "public"."bracket_round_timers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Allow all authenticated admins to view reports" ON "public"."tournament_reports" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Allow all authenticated admins to view shares" ON "public"."report_shares" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Allow public to view active shares for report access" ON "public"."report_shares" FOR SELECT TO "anon" USING ((("is_active" = true) AND (("expires_at" IS NULL) OR ("expires_at" > "now"()))))
CREATE POLICY "Allow super_admin and master_admin to create shares" ON "public"."report_shares" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text") AND ("users"."role" = ANY (ARRAY['super_admin'::"public"."admin_role_type", 'master_admin'::"public"."admin_role_type"]))))))
CREATE POLICY "Allow super_admin and master_admin to delete reports" ON "public"."tournament_reports" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text") AND ("users"."role" = ANY (ARRAY['super_admin'::"public"."admin_role_type", 'master_admin'::"public"."admin_role_type"]))))))
CREATE POLICY "Allow super_admin and master_admin to delete shares" ON "public"."report_shares" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text") AND ("users"."role" = ANY (ARRAY['super_admin'::"public"."admin_role_type", 'master_admin'::"public"."admin_role_type"]))))))
CREATE POLICY "Allow super_admin and master_admin to insert reports" ON "public"."tournament_reports" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text") AND ("users"."role" = ANY (ARRAY['super_admin'::"public"."admin_role_type", 'master_admin'::"public"."admin_role_type"]))))))
CREATE POLICY "Allow super_admin and master_admin to update reports" ON "public"."tournament_reports" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text") AND ("users"."role" = ANY (ARRAY['super_admin'::"public"."admin_role_type", 'master_admin'::"public"."admin_role_type"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text") AND ("users"."role" = ANY (ARRAY['super_admin'::"public"."admin_role_type", 'master_admin'::"public"."admin_role_type"]))))))
CREATE POLICY "Allow super_admin and master_admin to update shares" ON "public"."report_shares" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text") AND ("users"."role" = ANY (ARRAY['super_admin'::"public"."admin_role_type", 'master_admin'::"public"."admin_role_type"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text") AND ("users"."role" = ANY (ARRAY['super_admin'::"public"."admin_role_type", 'master_admin'::"public"."admin_role_type"]))))))
CREATE POLICY "Anyone can read active configurations" ON "public"."project_configurations" FOR SELECT USING (("is_active" = true))
CREATE POLICY "Anyone can read active featured events" ON "public"."featured_events" FOR SELECT USING (("is_active" = true))
CREATE POLICY "Anyone can read game publisher IDs" ON "public"."game_publisher_ids" FOR SELECT TO "authenticated" USING (true)
CREATE POLICY "Anyone can view rewards" ON "public"."battle_pass_rewards" FOR SELECT TO "authenticated" USING (true)
CREATE POLICY "Authenticated delete own scores" ON "public"."aim_trainer_scores" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")))
CREATE POLICY "Authenticated insert own scores" ON "public"."aim_trainer_scores" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")))
CREATE POLICY "Authenticated read own scores" ON "public"."aim_trainer_scores" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")))
CREATE POLICY "Authenticated update own scores" ON "public"."aim_trainer_scores" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")))
CREATE POLICY "Authenticated users can create channels" ON "public"."channels" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"))
CREATE POLICY "Authenticated users can delete configurations" ON "public"."project_configurations" FOR DELETE TO "authenticated" USING (true)
CREATE POLICY "Authenticated users can delete toto records" ON "public"."toto" FOR DELETE TO "authenticated" USING (true)
CREATE POLICY "Authenticated users can insert configurations" ON "public"."project_configurations" FOR INSERT TO "authenticated" WITH CHECK (true)
CREATE POLICY "Authenticated users can insert galaxy api logs" ON "public"."galaxy_api_logs" FOR INSERT TO "authenticated" WITH CHECK (true)
CREATE POLICY "Authenticated users can insert toto records" ON "public"."toto" FOR INSERT TO "authenticated" WITH CHECK (true)
CREATE POLICY "Authenticated users can read all featured events" ON "public"."featured_events" FOR SELECT TO "authenticated" USING (true)
CREATE POLICY "Authenticated users can read all profiles" ON "public"."users" FOR SELECT TO "authenticated" USING (true)
CREATE POLICY "Authenticated users can update configurations" ON "public"."project_configurations" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true)
CREATE POLICY "Authenticated users can update toto records" ON "public"."toto" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true)
CREATE POLICY "Authenticated users can view all rubric mappings" ON "public"."galaxy_rubric_mappings" FOR SELECT TO "authenticated" USING (true)
CREATE POLICY "Authenticated users can view all toto records" ON "public"."toto" FOR SELECT TO "authenticated" USING (true)
CREATE POLICY "Authenticated users can view galaxy api logs" ON "public"."galaxy_api_logs" FOR SELECT TO "authenticated" USING (true)
CREATE POLICY "Authenticated users can view notifications" ON "public"."bracket_round_notifications" FOR SELECT TO "authenticated" USING (true)
CREATE POLICY "Authenticated users can view toto records" ON "public"."toto" FOR SELECT TO "authenticated" USING (true)
CREATE POLICY "Battle pass seasons publicly viewable" ON "public"."battle_pass_seasons" FOR SELECT TO "authenticated" USING (true)
CREATE POLICY "Battle pass tiers publicly viewable" ON "public"."battle_pass_tiers" FOR SELECT TO "authenticated" USING (true)
CREATE POLICY "Channel admins can add members" ON "public"."channel_members" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."channel_members" "channel_members_1"
  WHERE (("channel_members_1"."channel_id" = "channel_members_1"."channel_id") AND ("channel_members_1"."user_id" = "auth"."uid"()) AND ("channel_members_1"."role" = 'admin'::"text")))))
CREATE POLICY "Channel admins can manage members" ON "public"."channel_members" USING ((EXISTS ( SELECT 1
   FROM "public"."channel_members" "cm"
  WHERE (("cm"."channel_id" = "channel_members"."channel_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'admin'::"text")))))
CREATE POLICY "Channel admins can remove members" ON "public"."channel_members" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."channel_members" "channel_members_1"
  WHERE (("channel_members_1"."channel_id" = "channel_members_1"."channel_id") AND ("channel_members_1"."user_id" = "auth"."uid"()) AND ("channel_members_1"."role" = 'admin'::"text")))))
CREATE POLICY "Channel creators can delete their channels" ON "public"."channels" FOR DELETE USING (("auth"."uid"() = "created_by"))
CREATE POLICY "Channel creators can update their channels" ON "public"."channels" FOR UPDATE USING (("auth"."uid"() = "created_by"))
CREATE POLICY "Master admin can delete rubric mappings" ON "public"."galaxy_rubric_mappings" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'master_admin'::"public"."admin_role_type")))))
CREATE POLICY "Master admin can insert rubric mappings" ON "public"."galaxy_rubric_mappings" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'master_admin'::"public"."admin_role_type")))))
CREATE POLICY "Master admin can update rubric mappings" ON "public"."galaxy_rubric_mappings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'master_admin'::"public"."admin_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'master_admin'::"public"."admin_role_type")))))
CREATE POLICY "Only admins can delete featured events" ON "public"."featured_events" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Only admins can insert featured events" ON "public"."featured_events" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Only admins can update featured events" ON "public"."featured_events" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "Players can update own notifications" ON "public"."player_match_notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Players can view own notifications" ON "public"."player_match_notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Policy with security definer functions" ON "public"."game_contents" USING (true)
CREATE POLICY "Policy with security definer functions" ON "public"."tournament_fields" USING (true)
CREATE POLICY "Policy with security definer functions" ON "public"."tournament_matches" USING (true)
CREATE POLICY "Policy with security definer functions" ON "public"."tournament_prizes" USING (true)
CREATE POLICY "Policy with security definer functions" ON "public"."users" USING (true)
CREATE POLICY "Public can read XP thresholds" ON "public"."xp_thresholds" FOR SELECT USING (true)
CREATE POLICY "Public can read achievements" ON "public"."achievements" FOR SELECT USING (("is_active" = true))
CREATE POLICY "Public can read active quests" ON "public"."quests" FOR SELECT USING (("is_active" = true))
CREATE POLICY "Public can read active whitelisted countries" ON "public"."country_whitelist" FOR SELECT USING (true)
CREATE POLICY "Public can read basic admin settings" ON "public"."admin_settings" FOR SELECT USING (true)
CREATE POLICY "Public can read battle royale results" ON "public"."battle_royale_results" FOR SELECT USING (true)
CREATE POLICY "Public can read game API integrations" ON "public"."game_api_integrations" FOR SELECT USING (true)
CREATE POLICY "Public can read game publisher IDs" ON "public"."game_publisher_ids" FOR SELECT USING (true)
CREATE POLICY "Public can read match results" ON "public"."match_results" FOR SELECT USING (true)
CREATE POLICY "Public can read player rankings" ON "public"."player_rankings" FOR SELECT USING (true)
CREATE POLICY "Public can read pro content" ON "public"."pro_content" FOR SELECT USING (true)
CREATE POLICY "Public can read team rankings" ON "public"."team_rankings" FOR SELECT USING (true)
CREATE POLICY "Public can read tournament prizes" ON "public"."tournament_prizes" FOR SELECT USING (true)
CREATE POLICY "Public can read user achievements for public profiles" ON "public"."user_achievements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "user_achievements"."user_id") AND ("users"."is_profile_public" = true)))))
CREATE POLICY "Public can update view count on active shares" ON "public"."report_shares" FOR UPDATE TO "anon" USING ((("is_active" = true) AND (("expires_at" IS NULL) OR ("expires_at" > "now"())))) WITH CHECK ((("is_active" = true) AND (("expires_at" IS NULL) OR ("expires_at" > "now"()))))
CREATE POLICY "Public can view active report shares" ON "public"."report_shares" FOR SELECT TO "anon" USING ((("is_active" = true) AND (("expires_at" IS NULL) OR ("expires_at" > "now"()))))
CREATE POLICY "Public can view rubric mappings" ON "public"."galaxy_rubric_mappings" FOR SELECT USING (true)
CREATE POLICY "Public channels are viewable by everyone" ON "public"."channels" FOR SELECT USING (("is_private" = false))
CREATE POLICY "Public read access for pro_games" ON "public"."pro_games" FOR SELECT USING (true)
CREATE POLICY "Public read access for pro_matches" ON "public"."pro_matches" FOR SELECT USING (true)
CREATE POLICY "Public read access for pro_stages" ON "public"."pro_stages" FOR SELECT USING (true)
CREATE POLICY "Public read access for pro_substages" ON "public"."pro_substages" FOR SELECT USING (true)
CREATE POLICY "Public read access for pro_teams" ON "public"."pro_teams" FOR SELECT USING (true)
CREATE POLICY "Public read access for pro_tournament_teams" ON "public"."pro_tournament_teams" FOR SELECT USING (true)
CREATE POLICY "Public read access for pro_tournaments" ON "public"."pro_tournaments" FOR SELECT USING (true)
CREATE POLICY "Public read access to active configurations" ON "public"."country_configurations" FOR SELECT USING (("is_active" = true))
CREATE POLICY "Public users can read public profiles" ON "public"."users" FOR SELECT TO "anon" USING (("is_profile_public" = true))
CREATE POLICY "Public users can view community channels" ON "public"."channels" FOR SELECT USING (("is_community" = true))
CREATE POLICY "Service role can manage API integrations" ON "public"."platform_api_integrations" TO "service_role" USING (true)
CREATE POLICY "Service role can manage all points" ON "public"."pp_user_points" TO "service_role" USING (true)
CREATE POLICY "Service role can manage pro_games" ON "public"."pro_games" TO "service_role" USING (true)
CREATE POLICY "Service role can manage pro_matches" ON "public"."pro_matches" TO "service_role" USING (true)
CREATE POLICY "Service role can manage pro_stages" ON "public"."pro_stages" TO "service_role" USING (true)
CREATE POLICY "Service role can manage pro_substages" ON "public"."pro_substages" TO "service_role" USING (true)
CREATE POLICY "Service role can manage pro_teams" ON "public"."pro_teams" TO "service_role" USING (true)
CREATE POLICY "Service role can manage pro_tournament_teams" ON "public"."pro_tournament_teams" TO "service_role" USING (true)
CREATE POLICY "Service role can manage pro_tournaments" ON "public"."pro_tournaments" TO "service_role" USING (true)
CREATE POLICY "Service role can read galaxy rubric mappings" ON "public"."galaxy_rubric_mappings" FOR SELECT TO "service_role" USING (true)
CREATE POLICY "Service role can read platform API integrations" ON "public"."platform_api_integrations" FOR SELECT TO "service_role" USING (true)
CREATE POLICY "Shop items publicly viewable" ON "public"."currency_shop_items" FOR SELECT TO "authenticated" USING (("is_available" = true))
CREATE POLICY "System can create transactions" ON "public"."virtual_currency_transactions" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text"))))))
CREATE POLICY "System can delete user quests" ON "public"."user_quests" FOR DELETE TO "service_role" USING (true)
CREATE POLICY "System can insert user achievements" ON "public"."user_achievements" FOR INSERT TO "service_role" WITH CHECK (true)
CREATE POLICY "System can insert user quests" ON "public"."user_quests" FOR INSERT TO "service_role" WITH CHECK (true)
CREATE POLICY "System can manage inventory" ON "public"."user_rewards_inventory" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."type" = 'admin'::"text")))))
CREATE POLICY "System can select user quests" ON "public"."user_quests" FOR SELECT TO "service_role" USING (true)
CREATE POLICY "System can update user quests" ON "public"."user_quests" FOR UPDATE TO "service_role" USING (true)
CREATE POLICY "Team captains can read applications to their teams" ON "public"."team_applications" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_applications"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))))
CREATE POLICY "Team captains can update applications to their teams" ON "public"."team_applications" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_applications"."team_id") AND ("teams"."captain_id" = "auth"."uid"())))))
CREATE POLICY "Users can claim their own tiers" ON "public"."user_tier_claims" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()))
CREATE POLICY "Users can create messages for their own tickets" ON "public"."ticket_messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."support_tickets"
  WHERE (("support_tickets"."id" = "ticket_messages"."ticket_id") AND ("support_tickets"."user_id" = "auth"."uid"()))))))
CREATE POLICY "Users can create their own coaching sessions" ON "public"."coaching_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can create their own tickets" ON "public"."support_tickets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can delete their own applications" ON "public"."team_applications" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can delete their own field values" ON "public"."user_tournament_field_values" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can delete their own game publisher IDs" ON "public"."game_publisher_id_for_users" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can delete their own gaming accounts" ON "public"."game_publisher_id_for_users" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can delete their own messages" ON "public"."messages" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "sender_id"))
CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can delete their own relationships" ON "public"."user_relationships" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id_1") OR ("auth"."uid"() = "user_id_2")))
CREATE POLICY "Users can delete their own tournament field values" ON "public"."user_tournament_field_values" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert messages they send" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "sender_id"))
CREATE POLICY "Users can insert own BP progress" ON "public"."user_battle_pass_progress" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert own XP events" ON "public"."xp_events" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert own activity" ON "public"."activity_log" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert own currency" ON "public"."user_currency" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert own export preferences" ON "public"."user_export_preferences" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert own inventory" ON "public"."user_inventory" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert own logins" ON "public"."daily_login_tracker" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert own transactions" ON "public"."currency_transactions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert their own Discord verifications" ON "public"."tournament_discord_verification" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert their own applications" ON "public"."team_applications" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert their own feedback" ON "public"."tournament_feedback" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert their own field values" ON "public"."user_tournament_field_values" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert their own game publisher IDs" ON "public"."game_publisher_id_for_users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert their own gaming accounts" ON "public"."game_publisher_id_for_users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert their own points" ON "public"."pp_user_points" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can insert their own relationship requests" ON "public"."user_relationships" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id_1"))
CREATE POLICY "Users can insert their own tournament field values" ON "public"."user_tournament_field_values" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can join channels" ON "public"."channel_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can join community channels without invitation" ON "public"."channel_members" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."channels"
  WHERE (("channels"."id" = "channel_members"."channel_id") AND ("channels"."is_community" = true)))))
CREATE POLICY "Users can join public channels" ON "public"."channel_members" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."channels"
  WHERE (("channels"."id" = "channel_members"."channel_id") AND (NOT "channels"."is_private"))))))
CREATE POLICY "Users can leave channels" ON "public"."channel_members" FOR DELETE USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can mark notifications as read" ON "public"."bracket_round_notifications" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true)
CREATE POLICY "Users can read messages from channels they belong to" ON "public"."messages" FOR SELECT TO "authenticated" USING ((("sender_id" = "auth"."uid"()) OR ("receiver_id" = "auth"."uid"()) OR (("type" = 'channel'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."channel_members"
  WHERE (("channel_members"."channel_id" = "messages"."channel_id") AND ("channel_members"."user_id" = "auth"."uid"())))))))
CREATE POLICY "Users can read own export preferences" ON "public"."user_export_preferences" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can read own profile" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"))
CREATE POLICY "Users can read their own achievements" ON "public"."user_achievements" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()))
CREATE POLICY "Users can read their own applications" ON "public"."team_applications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can read their own channel memberships" ON "public"."channel_members" FOR SELECT USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can read their own feedback" ON "public"."tournament_feedback" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can read their own field values" ON "public"."user_tournament_field_values" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can read their own game publisher IDs" ON "public"."game_publisher_id_for_users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can read their own gaming accounts" ON "public"."game_publisher_id_for_users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can read their own messages" ON "public"."messages" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "receiver_id")))
CREATE POLICY "Users can read their own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can read their own points" ON "public"."pp_user_points" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can read their own private channels" ON "public"."channels" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."channel_members"
  WHERE (("channel_members"."channel_id" = "channel_members"."id") AND ("channel_members"."user_id" = "auth"."uid"())))))
CREATE POLICY "Users can read their own publisher data" ON "public"."publisher_gamer" FOR SELECT USING (("user_id" = "auth"."uid"()))
CREATE POLICY "Users can read their own quest progress" ON "public"."user_quests" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()))
CREATE POLICY "Users can read their own relationships" ON "public"."user_relationships" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id_1") OR ("auth"."uid"() = "user_id_2")))
CREATE POLICY "Users can read their own tournament field values" ON "public"."user_tournament_field_values" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can send messages to channels they belong to" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND (("type" = 'direct'::"text") OR (("type" = 'channel'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."channel_members"
  WHERE (("channel_members"."channel_id" = "messages"."channel_id") AND ("channel_members"."user_id" = "auth"."uid"()))))))))
CREATE POLICY "Users can update messages they received" ON "public"."messages" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "receiver_id"))
CREATE POLICY "Users can update own BP progress" ON "public"."user_battle_pass_progress" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can update own currency" ON "public"."user_currency" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can update own export preferences" ON "public"."user_export_preferences" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can update own inventory" ON "public"."user_inventory" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can update their own Discord verifications" ON "public"."tournament_discord_verification" FOR UPDATE USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can update their own applications" ON "public"."team_applications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can update their own feedback" ON "public"."tournament_feedback" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can update their own field values" ON "public"."user_tournament_field_values" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can update their own game publisher IDs" ON "public"."game_publisher_id_for_users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can update their own gaming accounts" ON "public"."game_publisher_id_for_users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can update their own points" ON "public"."pp_user_points" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can update their own quest progress" ON "public"."user_quests" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()))
CREATE POLICY "Users can update their own relationships" ON "public"."user_relationships" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id_1") OR ("auth"."uid"() = "user_id_2")))
CREATE POLICY "Users can update their own tickets" ON "public"."support_tickets" FOR UPDATE USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can update their own tournament field values" ON "public"."user_tournament_field_values" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can view bracket eliminations" ON "public"."bracket_eliminations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tournaments" "t"
  WHERE ("t"."id" = "bracket_eliminations"."tournament_id"))))
CREATE POLICY "Users can view channel members" ON "public"."channel_members" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."channel_members" "channel_members_1"
  WHERE (("channel_members_1"."channel_id" = "channel_members_1"."channel_id") AND ("channel_members_1"."user_id" = "auth"."uid"())))))
CREATE POLICY "Users can view messages for their own tickets" ON "public"."ticket_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."support_tickets"
  WHERE (("support_tickets"."id" = "ticket_messages"."ticket_id") AND ("support_tickets"."user_id" = "auth"."uid"())))))
CREATE POLICY "Users can view others BP progress" ON "public"."user_battle_pass_progress" FOR SELECT TO "authenticated" USING (true)
CREATE POLICY "Users can view own BP progress" ON "public"."user_battle_pass_progress" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can view own XP events" ON "public"."xp_events" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can view own activity" ON "public"."activity_log" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can view own claims" ON "public"."user_tier_claims" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()))
CREATE POLICY "Users can view own currency" ON "public"."user_currency" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can view own currency" ON "public"."user_virtual_currency" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()))
CREATE POLICY "Users can view own inventory" ON "public"."user_inventory" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can view own inventory" ON "public"."user_rewards_inventory" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()))
CREATE POLICY "Users can view own logins" ON "public"."daily_login_tracker" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can view own transactions" ON "public"."currency_transactions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can view own transactions" ON "public"."virtual_currency_transactions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()))
CREATE POLICY "Users can view public activity" ON "public"."activity_log" FOR SELECT TO "authenticated" USING (("is_public" = true))
CREATE POLICY "Users can view public channels" ON "public"."channels" FOR SELECT TO "authenticated" USING (((NOT "is_private") OR (EXISTS ( SELECT 1
   FROM "public"."channel_members"
  WHERE (("channel_members"."channel_id" = "channels"."id") AND ("channel_members"."user_id" = "auth"."uid"()))))))
CREATE POLICY "Users can view their own Discord verifications" ON "public"."tournament_discord_verification" FOR SELECT USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can view their own coaching sessions" ON "public"."coaching_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"))
CREATE POLICY "Users can view their own tickets" ON "public"."support_tickets" FOR SELECT USING (("auth"."uid"() = "user_id"))
ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY
CREATE POLICY "admin_all_matches" ON "public"."tournament_matches" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."admin_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."admin_role_type")))))
CREATE POLICY "admin_all_registrations" ON "public"."tournament_registrations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."admin_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."admin_role_type")))))
CREATE POLICY "admin_all_tournaments" ON "public"."tournaments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."admin_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."admin_role_type")))))
ALTER TABLE "public"."admin_settings" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."aim_trainer_scores" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."battle_pass_rewards" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."battle_pass_seasons" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."battle_pass_tiers" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."bracket_eliminations" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."bracket_modifications_log" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."bracket_round_notifications" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."bracket_round_timers" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."coaching_sessions" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."country_whitelist" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."currency_shop_items" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."currency_transactions" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."daily_login_tracker" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."dba-test" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."featured_events" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."galaxy_api_logs" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."galaxy_rubric_mappings" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."game_api_integrations" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."game_contents" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."game_publisher_ids" ENABLE ROW LEVEL SECURITY
CREATE POLICY "gamer_own_registrations_delete" ON "public"."tournament_registrations" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()))
CREATE POLICY "gamer_own_registrations_insert" ON "public"."tournament_registrations" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()))
CREATE POLICY "gamer_own_registrations_select" ON "public"."tournament_registrations" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()))
CREATE POLICY "gamer_own_registrations_update" ON "public"."tournament_registrations" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()))
CREATE POLICY "gamer_read_matches" ON "public"."tournament_matches" FOR SELECT TO "authenticated" USING (true)
CREATE POLICY "gamer_read_tournaments" ON "public"."tournaments" FOR SELECT TO "authenticated" USING (true)
CREATE POLICY "master_admin_all_matches" ON "public"."tournament_matches" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'master_admin'::"public"."admin_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'master_admin'::"public"."admin_role_type")))))
CREATE POLICY "master_admin_all_registrations" ON "public"."tournament_registrations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'master_admin'::"public"."admin_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'master_admin'::"public"."admin_role_type")))))
CREATE POLICY "master_admin_all_tournaments" ON "public"."tournaments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'master_admin'::"public"."admin_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'master_admin'::"public"."admin_role_type")))))
ALTER TABLE "public"."platform_api_integrations" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."player_match_notifications" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."pp_user_points" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."pro_content" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."pro_games" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."pro_matches" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."pro_stages" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."pro_substages" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."pro_teams" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."pro_tournament_teams" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."pro_tournaments" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."project_configurations" ENABLE ROW LEVEL SECURITY
CREATE POLICY "public_read_matches" ON "public"."tournament_matches" FOR SELECT TO "authenticated", "anon" USING (true)
CREATE POLICY "public_read_tournaments" ON "public"."tournaments" FOR SELECT TO "authenticated", "anon" USING (true)
ALTER TABLE "public"."quests" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."report_shares" ENABLE ROW LEVEL SECURITY
CREATE POLICY "super_admin_all_matches" ON "public"."tournament_matches" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'super_admin'::"public"."admin_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'super_admin'::"public"."admin_role_type")))))
CREATE POLICY "super_admin_all_registrations" ON "public"."tournament_registrations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'super_admin'::"public"."admin_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'super_admin'::"public"."admin_role_type")))))
CREATE POLICY "super_admin_all_tournaments" ON "public"."tournaments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'super_admin'::"public"."admin_role_type"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'super_admin'::"public"."admin_role_type")))))
ALTER TABLE "public"."team_applications" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."toto" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."tournament_discord_verification" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."tournament_feedback" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."tournament_fields" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."tournament_matches" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."tournament_reports" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."user_battle_pass_progress" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."user_currency" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."user_export_preferences" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."user_inventory" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."user_quests" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."user_rewards_inventory" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."user_tier_claims" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."user_tournament_field_values" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."user_virtual_currency" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."virtual_currency_transactions" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."xp_events" ENABLE ROW LEVEL SECURITY
ALTER TABLE "public"."xp_thresholds" ENABLE ROW LEVEL SECURITY
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres"
GRANT USAGE ON SCHEMA "public" TO "postgres"
GRANT USAGE ON SCHEMA "public" TO "anon"
GRANT USAGE ON SCHEMA "public" TO "authenticated"
GRANT USAGE ON SCHEMA "public" TO "service_role"
GRANT ALL ON FUNCTION "public"."assign_starter_quests"() TO "anon"
GRANT ALL ON FUNCTION "public"."assign_starter_quests"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."assign_starter_quests"() TO "service_role"
GRANT ALL ON FUNCTION "public"."award_xp_and_check_level"("target_user_id" "uuid", "xp_amount" integer) TO "anon"
GRANT ALL ON FUNCTION "public"."award_xp_and_check_level"("target_user_id" "uuid", "xp_amount" integer) TO "authenticated"
GRANT ALL ON FUNCTION "public"."award_xp_and_check_level"("target_user_id" "uuid", "xp_amount" integer) TO "service_role"
GRANT ALL ON FUNCTION "public"."calculate_battle_royale_total_points"() TO "anon"
GRANT ALL ON FUNCTION "public"."calculate_battle_royale_total_points"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."calculate_battle_royale_total_points"() TO "service_role"
GRANT ALL ON FUNCTION "public"."calculate_level_from_xp"("user_xp" integer) TO "anon"
GRANT ALL ON FUNCTION "public"."calculate_level_from_xp"("user_xp" integer) TO "authenticated"
GRANT ALL ON FUNCTION "public"."calculate_level_from_xp"("user_xp" integer) TO "service_role"
GRANT ALL ON FUNCTION "public"."check_and_unlock_achievements"("target_user_id" "uuid") TO "anon"
GRANT ALL ON FUNCTION "public"."check_and_unlock_achievements"("target_user_id" "uuid") TO "authenticated"
GRANT ALL ON FUNCTION "public"."check_and_unlock_achievements"("target_user_id" "uuid") TO "service_role"
GRANT ALL ON FUNCTION "public"."cleanup_old_galaxy_api_logs"("retention_days" integer) TO "anon"
GRANT ALL ON FUNCTION "public"."cleanup_old_galaxy_api_logs"("retention_days" integer) TO "authenticated"
GRANT ALL ON FUNCTION "public"."cleanup_old_galaxy_api_logs"("retention_days" integer) TO "service_role"
GRANT ALL ON FUNCTION "public"."count_unread_messages"("user_id" "uuid") TO "anon"
GRANT ALL ON FUNCTION "public"."count_unread_messages"("user_id" "uuid") TO "authenticated"
GRANT ALL ON FUNCTION "public"."count_unread_messages"("user_id" "uuid") TO "service_role"
GRANT ALL ON FUNCTION "public"."create_bracket_update_notification"() TO "anon"
GRANT ALL ON FUNCTION "public"."create_bracket_update_notification"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."create_bracket_update_notification"() TO "service_role"
GRANT ALL ON FUNCTION "public"."create_channel_invitation_notification"() TO "anon"
GRANT ALL ON FUNCTION "public"."create_channel_invitation_notification"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."create_channel_invitation_notification"() TO "service_role"
GRANT ALL ON FUNCTION "public"."create_chat_attachments_bucket"() TO "anon"
GRANT ALL ON FUNCTION "public"."create_chat_attachments_bucket"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."create_chat_attachments_bucket"() TO "service_role"
GRANT ALL ON FUNCTION "public"."create_friend_accepted_notification"() TO "anon"
GRANT ALL ON FUNCTION "public"."create_friend_accepted_notification"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."create_friend_accepted_notification"() TO "service_role"
GRANT ALL ON FUNCTION "public"."create_friend_request_notification"() TO "anon"
GRANT ALL ON FUNCTION "public"."create_friend_request_notification"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."create_friend_request_notification"() TO "service_role"
GRANT ALL ON FUNCTION "public"."create_new_ticket_notification"() TO "anon"
GRANT ALL ON FUNCTION "public"."create_new_ticket_notification"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."create_new_ticket_notification"() TO "service_role"
GRANT ALL ON FUNCTION "public"."create_registration_status_notification"() TO "anon"
GRANT ALL ON FUNCTION "public"."create_registration_status_notification"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."create_registration_status_notification"() TO "service_role"
GRANT ALL ON FUNCTION "public"."create_team_application_notification"() TO "anon"
GRANT ALL ON FUNCTION "public"."create_team_application_notification"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."create_team_application_notification"() TO "service_role"
GRANT ALL ON FUNCTION "public"."create_team_application_received_notification"() TO "anon"
GRANT ALL ON FUNCTION "public"."create_team_application_received_notification"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."create_team_application_received_notification"() TO "service_role"
GRANT ALL ON FUNCTION "public"."create_ticket_message_notification"() TO "anon"
GRANT ALL ON FUNCTION "public"."create_ticket_message_notification"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."create_ticket_message_notification"() TO "service_role"
GRANT ALL ON FUNCTION "public"."create_tournament_join_now_notification"() TO "anon"
GRANT ALL ON FUNCTION "public"."create_tournament_join_now_notification"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."create_tournament_join_now_notification"() TO "service_role"
GRANT ALL ON FUNCTION "public"."create_tournament_start_notification"() TO "anon"
GRANT ALL ON FUNCTION "public"."create_tournament_start_notification"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."create_tournament_start_notification"() TO "service_role"
GRANT ALL ON FUNCTION "public"."create_tournament_status_notification"() TO "anon"
GRANT ALL ON FUNCTION "public"."create_tournament_status_notification"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."create_tournament_status_notification"() TO "service_role"
GRANT ALL ON FUNCTION "public"."enforce_single_default_config"() TO "anon"
GRANT ALL ON FUNCTION "public"."enforce_single_default_config"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."enforce_single_default_config"() TO "service_role"
GRANT ALL ON FUNCTION "public"."ensure_single_active_event"() TO "anon"
GRANT ALL ON FUNCTION "public"."ensure_single_active_event"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."ensure_single_active_event"() TO "service_role"
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "anon"
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "authenticated"
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "service_role"
GRANT ALL ON FUNCTION "public"."generate_share_token"() TO "anon"
GRANT ALL ON FUNCTION "public"."generate_share_token"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."generate_share_token"() TO "service_role"
GRANT ALL ON TABLE "public"."messages" TO "anon"
GRANT ALL ON TABLE "public"."messages" TO "authenticated"
GRANT ALL ON TABLE "public"."messages" TO "service_role"
GRANT ALL ON FUNCTION "public"."get_chat_history"("user1_id" "uuid", "user2_id" "uuid", "page_size" integer, "page_number" integer) TO "anon"
GRANT ALL ON FUNCTION "public"."get_chat_history"("user1_id" "uuid", "user2_id" "uuid", "page_size" integer, "page_number" integer) TO "authenticated"
GRANT ALL ON FUNCTION "public"."get_chat_history"("user1_id" "uuid", "user2_id" "uuid", "page_size" integer, "page_number" integer) TO "service_role"
GRANT ALL ON FUNCTION "public"."get_config_by_domain"("domain_name" "text") TO "anon"
GRANT ALL ON FUNCTION "public"."get_config_by_domain"("domain_name" "text") TO "authenticated"
GRANT ALL ON FUNCTION "public"."get_config_by_domain"("domain_name" "text") TO "service_role"
GRANT ALL ON FUNCTION "public"."get_default_config"() TO "anon"
GRANT ALL ON FUNCTION "public"."get_default_config"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."get_default_config"() TO "service_role"
GRANT ALL ON FUNCTION "public"."get_eligible_lucky_losers"("p_tournament_id" "uuid", "p_round" integer) TO "anon"
GRANT ALL ON FUNCTION "public"."get_eligible_lucky_losers"("p_tournament_id" "uuid", "p_round" integer) TO "authenticated"
GRANT ALL ON FUNCTION "public"."get_eligible_lucky_losers"("p_tournament_id" "uuid", "p_round" integer) TO "service_role"
GRANT ALL ON FUNCTION "public"."get_galaxy_api_stats"("p_campaign_id" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon"
GRANT ALL ON FUNCTION "public"."get_galaxy_api_stats"("p_campaign_id" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated"
GRANT ALL ON FUNCTION "public"."get_galaxy_api_stats"("p_campaign_id" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role"
GRANT ALL ON FUNCTION "public"."get_recent_galaxy_api_errors"("p_limit" integer, "p_campaign_id" "text") TO "anon"
GRANT ALL ON FUNCTION "public"."get_recent_galaxy_api_errors"("p_limit" integer, "p_campaign_id" "text") TO "authenticated"
GRANT ALL ON FUNCTION "public"."get_recent_galaxy_api_errors"("p_limit" integer, "p_campaign_id" "text") TO "service_role"
GRANT ALL ON FUNCTION "public"."get_user_tournament_status"("user_id" "uuid", "tournament_id" "uuid") TO "anon"
GRANT ALL ON FUNCTION "public"."get_user_tournament_status"("user_id" "uuid", "tournament_id" "uuid") TO "authenticated"
GRANT ALL ON FUNCTION "public"."get_user_tournament_status"("user_id" "uuid", "tournament_id" "uuid") TO "service_role"
GRANT ALL ON FUNCTION "public"."handle_profile_update_xp"() TO "anon"
GRANT ALL ON FUNCTION "public"."handle_profile_update_xp"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."handle_profile_update_xp"() TO "service_role"
GRANT ALL ON FUNCTION "public"."handle_tournament_registration_xp"() TO "anon"
GRANT ALL ON FUNCTION "public"."handle_tournament_registration_xp"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."handle_tournament_registration_xp"() TO "service_role"
GRANT ALL ON FUNCTION "public"."mask_sensitive_params"("params" "jsonb") TO "anon"
GRANT ALL ON FUNCTION "public"."mask_sensitive_params"("params" "jsonb") TO "authenticated"
GRANT ALL ON FUNCTION "public"."mask_sensitive_params"("params" "jsonb") TO "service_role"
GRANT ALL ON FUNCTION "public"."promote_backup_player"() TO "anon"
GRANT ALL ON FUNCTION "public"."promote_backup_player"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."promote_backup_player"() TO "service_role"
GRANT ALL ON FUNCTION "public"."record_player_elimination"("p_tournament_id" "uuid", "p_player_id" "uuid", "p_round" integer, "p_elo" integer) TO "anon"
GRANT ALL ON FUNCTION "public"."record_player_elimination"("p_tournament_id" "uuid", "p_player_id" "uuid", "p_round" integer, "p_elo" integer) TO "authenticated"
GRANT ALL ON FUNCTION "public"."record_player_elimination"("p_tournament_id" "uuid", "p_player_id" "uuid", "p_round" integer, "p_elo" integer) TO "service_role"
GRANT ALL ON FUNCTION "public"."reintegrate_lucky_loser"("p_elimination_id" "uuid", "p_reintegrated_round" integer) TO "anon"
GRANT ALL ON FUNCTION "public"."reintegrate_lucky_loser"("p_elimination_id" "uuid", "p_reintegrated_round" integer) TO "authenticated"
GRANT ALL ON FUNCTION "public"."reintegrate_lucky_loser"("p_elimination_id" "uuid", "p_reintegrated_round" integer) TO "service_role"
GRANT ALL ON FUNCTION "public"."set_registration_order"() TO "anon"
GRANT ALL ON FUNCTION "public"."set_registration_order"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."set_registration_order"() TO "service_role"
GRANT ALL ON FUNCTION "public"."update_admin_settings_updated_at"() TO "anon"
GRANT ALL ON FUNCTION "public"."update_admin_settings_updated_at"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."update_admin_settings_updated_at"() TO "service_role"
GRANT ALL ON FUNCTION "public"."update_country_whitelist_updated_at"() TO "anon"
GRANT ALL ON FUNCTION "public"."update_country_whitelist_updated_at"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."update_country_whitelist_updated_at"() TO "service_role"
GRANT ALL ON FUNCTION "public"."update_featured_events_updated_at"() TO "anon"
GRANT ALL ON FUNCTION "public"."update_featured_events_updated_at"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."update_featured_events_updated_at"() TO "service_role"
GRANT ALL ON FUNCTION "public"."update_round_timer_timestamp"() TO "anon"
GRANT ALL ON FUNCTION "public"."update_round_timer_timestamp"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."update_round_timer_timestamp"() TO "service_role"
GRANT ALL ON FUNCTION "public"."update_support_ticket_updated_at"() TO "anon"
GRANT ALL ON FUNCTION "public"."update_support_ticket_updated_at"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."update_support_ticket_updated_at"() TO "service_role"
GRANT ALL ON FUNCTION "public"."update_tournament_feedback_updated_at"() TO "anon"
GRANT ALL ON FUNCTION "public"."update_tournament_feedback_updated_at"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."update_tournament_feedback_updated_at"() TO "service_role"
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon"
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role"
GRANT ALL ON FUNCTION "public"."update_user_export_preferences_updated_at"() TO "anon"
GRANT ALL ON FUNCTION "public"."update_user_export_preferences_updated_at"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."update_user_export_preferences_updated_at"() TO "service_role"
GRANT ALL ON FUNCTION "public"."update_user_relationship_updated_at"() TO "anon"
GRANT ALL ON FUNCTION "public"."update_user_relationship_updated_at"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."update_user_relationship_updated_at"() TO "service_role"
GRANT ALL ON FUNCTION "public"."update_virtual_currency_balance"() TO "anon"
GRANT ALL ON FUNCTION "public"."update_virtual_currency_balance"() TO "authenticated"
GRANT ALL ON FUNCTION "public"."update_virtual_currency_balance"() TO "service_role"
GRANT ALL ON TABLE "public"."achievements" TO "anon"
GRANT ALL ON TABLE "public"."achievements" TO "authenticated"
GRANT ALL ON TABLE "public"."achievements" TO "service_role"
GRANT ALL ON TABLE "public"."activity_log" TO "anon"
GRANT ALL ON TABLE "public"."activity_log" TO "authenticated"
GRANT ALL ON TABLE "public"."activity_log" TO "service_role"
GRANT ALL ON TABLE "public"."admin_settings" TO "anon"
GRANT ALL ON TABLE "public"."admin_settings" TO "authenticated"
GRANT ALL ON TABLE "public"."admin_settings" TO "service_role"
GRANT ALL ON TABLE "public"."aim_trainer_scores" TO "anon"
GRANT ALL ON TABLE "public"."aim_trainer_scores" TO "authenticated"
GRANT ALL ON TABLE "public"."aim_trainer_scores" TO "service_role"
GRANT ALL ON TABLE "public"."battle_pass_rewards" TO "anon"
GRANT ALL ON TABLE "public"."battle_pass_rewards" TO "authenticated"
GRANT ALL ON TABLE "public"."battle_pass_rewards" TO "service_role"
GRANT ALL ON TABLE "public"."battle_pass_seasons" TO "anon"
GRANT ALL ON TABLE "public"."battle_pass_seasons" TO "authenticated"
GRANT ALL ON TABLE "public"."battle_pass_seasons" TO "service_role"
GRANT ALL ON TABLE "public"."battle_pass_tiers" TO "anon"
GRANT ALL ON TABLE "public"."battle_pass_tiers" TO "authenticated"
GRANT ALL ON TABLE "public"."battle_pass_tiers" TO "service_role"
GRANT ALL ON TABLE "public"."battle_royale_results" TO "anon"
GRANT ALL ON TABLE "public"."battle_royale_results" TO "authenticated"
GRANT ALL ON TABLE "public"."battle_royale_results" TO "service_role"
GRANT ALL ON TABLE "public"."bracket_eliminations" TO "anon"
GRANT ALL ON TABLE "public"."bracket_eliminations" TO "authenticated"
GRANT ALL ON TABLE "public"."bracket_eliminations" TO "service_role"
GRANT ALL ON TABLE "public"."bracket_modifications_log" TO "anon"
GRANT ALL ON TABLE "public"."bracket_modifications_log" TO "authenticated"
GRANT ALL ON TABLE "public"."bracket_modifications_log" TO "service_role"
GRANT ALL ON TABLE "public"."bracket_round_notifications" TO "anon"
GRANT ALL ON TABLE "public"."bracket_round_notifications" TO "authenticated"
GRANT ALL ON TABLE "public"."bracket_round_notifications" TO "service_role"
GRANT ALL ON TABLE "public"."bracket_round_timers" TO "anon"
GRANT ALL ON TABLE "public"."bracket_round_timers" TO "authenticated"
GRANT ALL ON TABLE "public"."bracket_round_timers" TO "service_role"
GRANT ALL ON TABLE "public"."channel_members" TO "anon"
GRANT ALL ON TABLE "public"."channel_members" TO "authenticated"
GRANT ALL ON TABLE "public"."channel_members" TO "service_role"
GRANT ALL ON TABLE "public"."channels" TO "anon"
GRANT ALL ON TABLE "public"."channels" TO "authenticated"
GRANT ALL ON TABLE "public"."channels" TO "service_role"
GRANT ALL ON TABLE "public"."coaching_sessions" TO "anon"
GRANT ALL ON TABLE "public"."coaching_sessions" TO "authenticated"
GRANT ALL ON TABLE "public"."coaching_sessions" TO "service_role"
GRANT ALL ON TABLE "public"."country_configurations" TO "anon"
GRANT ALL ON TABLE "public"."country_configurations" TO "authenticated"
GRANT ALL ON TABLE "public"."country_configurations" TO "service_role"
GRANT ALL ON TABLE "public"."country_whitelist" TO "anon"
GRANT ALL ON TABLE "public"."country_whitelist" TO "authenticated"
GRANT ALL ON TABLE "public"."country_whitelist" TO "service_role"
GRANT ALL ON TABLE "public"."currency_shop_items" TO "anon"
GRANT ALL ON TABLE "public"."currency_shop_items" TO "authenticated"
GRANT ALL ON TABLE "public"."currency_shop_items" TO "service_role"
GRANT ALL ON TABLE "public"."currency_transactions" TO "anon"
GRANT ALL ON TABLE "public"."currency_transactions" TO "authenticated"
GRANT ALL ON TABLE "public"."currency_transactions" TO "service_role"
GRANT ALL ON TABLE "public"."daily_login_tracker" TO "anon"
GRANT ALL ON TABLE "public"."daily_login_tracker" TO "authenticated"
GRANT ALL ON TABLE "public"."daily_login_tracker" TO "service_role"
GRANT ALL ON TABLE "public"."dba-test" TO "anon"
GRANT ALL ON TABLE "public"."dba-test" TO "authenticated"
GRANT ALL ON TABLE "public"."dba-test" TO "service_role"
GRANT ALL ON SEQUENCE "public"."dba-test_id_seq" TO "anon"
GRANT ALL ON SEQUENCE "public"."dba-test_id_seq" TO "authenticated"
GRANT ALL ON SEQUENCE "public"."dba-test_id_seq" TO "service_role"
GRANT ALL ON TABLE "public"."featured_events" TO "anon"
GRANT ALL ON TABLE "public"."featured_events" TO "authenticated"
GRANT ALL ON TABLE "public"."featured_events" TO "service_role"
GRANT ALL ON TABLE "public"."galaxy_api_logs" TO "anon"
GRANT ALL ON TABLE "public"."galaxy_api_logs" TO "authenticated"
GRANT ALL ON TABLE "public"."galaxy_api_logs" TO "service_role"
GRANT ALL ON TABLE "public"."galaxy_rubric_mappings" TO "anon"
GRANT ALL ON TABLE "public"."galaxy_rubric_mappings" TO "authenticated"
GRANT ALL ON TABLE "public"."galaxy_rubric_mappings" TO "service_role"
GRANT ALL ON TABLE "public"."game_api_integrations" TO "anon"
GRANT ALL ON TABLE "public"."game_api_integrations" TO "authenticated"
GRANT ALL ON TABLE "public"."game_api_integrations" TO "service_role"
GRANT ALL ON TABLE "public"."game_contents" TO "anon"
GRANT ALL ON TABLE "public"."game_contents" TO "authenticated"
GRANT ALL ON TABLE "public"."game_contents" TO "service_role"
GRANT ALL ON TABLE "public"."game_publisher_id_for_users" TO "anon"
GRANT ALL ON TABLE "public"."game_publisher_id_for_users" TO "authenticated"
GRANT ALL ON TABLE "public"."game_publisher_id_for_users" TO "service_role"
GRANT ALL ON TABLE "public"."game_publisher_ids" TO "anon"
GRANT ALL ON TABLE "public"."game_publisher_ids" TO "authenticated"
GRANT ALL ON TABLE "public"."game_publisher_ids" TO "service_role"
GRANT ALL ON TABLE "public"."games" TO "anon"
GRANT ALL ON TABLE "public"."games" TO "authenticated"
GRANT ALL ON TABLE "public"."games" TO "service_role"
GRANT ALL ON SEQUENCE "public"."html_scores_id_seq" TO "anon"
GRANT ALL ON SEQUENCE "public"."html_scores_id_seq" TO "authenticated"
GRANT ALL ON SEQUENCE "public"."html_scores_id_seq" TO "service_role"
GRANT ALL ON TABLE "public"."match_results" TO "anon"
GRANT ALL ON TABLE "public"."match_results" TO "authenticated"
GRANT ALL ON TABLE "public"."match_results" TO "service_role"
GRANT ALL ON TABLE "public"."notifications" TO "anon"
GRANT ALL ON TABLE "public"."notifications" TO "authenticated"
GRANT ALL ON TABLE "public"."notifications" TO "service_role"
GRANT ALL ON TABLE "public"."platform_api_integrations" TO "anon"
GRANT ALL ON TABLE "public"."platform_api_integrations" TO "authenticated"
GRANT ALL ON TABLE "public"."platform_api_integrations" TO "service_role"
GRANT ALL ON TABLE "public"."player_match_notifications" TO "anon"
GRANT ALL ON TABLE "public"."player_match_notifications" TO "authenticated"
GRANT ALL ON TABLE "public"."player_match_notifications" TO "service_role"
GRANT ALL ON TABLE "public"."player_rankings" TO "anon"
GRANT ALL ON TABLE "public"."player_rankings" TO "authenticated"
GRANT ALL ON TABLE "public"."player_rankings" TO "service_role"
GRANT ALL ON TABLE "public"."pp_user_points" TO "anon"
GRANT ALL ON TABLE "public"."pp_user_points" TO "authenticated"
GRANT ALL ON TABLE "public"."pp_user_points" TO "service_role"
GRANT ALL ON TABLE "public"."pro_games" TO "anon"
GRANT ALL ON TABLE "public"."pro_games" TO "authenticated"
GRANT ALL ON TABLE "public"."pro_games" TO "service_role"
GRANT ALL ON TABLE "public"."pro_matches" TO "anon"
GRANT ALL ON TABLE "public"."pro_matches" TO "authenticated"
GRANT ALL ON TABLE "public"."pro_matches" TO "service_role"
GRANT ALL ON TABLE "public"."pro_stages" TO "anon"
GRANT ALL ON TABLE "public"."pro_stages" TO "authenticated"
GRANT ALL ON TABLE "public"."pro_stages" TO "service_role"
GRANT ALL ON TABLE "public"."pro_substages" TO "anon"
GRANT ALL ON TABLE "public"."pro_substages" TO "authenticated"
GRANT ALL ON TABLE "public"."pro_substages" TO "service_role"
GRANT ALL ON TABLE "public"."pro_teams" TO "anon"
GRANT ALL ON TABLE "public"."pro_teams" TO "authenticated"
GRANT ALL ON TABLE "public"."pro_teams" TO "service_role"
GRANT ALL ON TABLE "public"."pro_tournaments" TO "anon"
GRANT ALL ON TABLE "public"."pro_tournaments" TO "authenticated"
GRANT ALL ON TABLE "public"."pro_tournaments" TO "service_role"
GRANT ALL ON TABLE "public"."pro_calendar" TO "anon"
GRANT ALL ON TABLE "public"."pro_calendar" TO "authenticated"
GRANT ALL ON TABLE "public"."pro_calendar" TO "service_role"
GRANT ALL ON TABLE "public"."pro_content" TO "anon"
GRANT ALL ON TABLE "public"."pro_content" TO "authenticated"
GRANT ALL ON TABLE "public"."pro_content" TO "service_role"
GRANT ALL ON TABLE "public"."pro_match_details" TO "anon"
GRANT ALL ON TABLE "public"."pro_match_details" TO "authenticated"
GRANT ALL ON TABLE "public"."pro_match_details" TO "service_role"
GRANT ALL ON TABLE "public"."pro_tournament_teams" TO "anon"
GRANT ALL ON TABLE "public"."pro_tournament_teams" TO "authenticated"
GRANT ALL ON TABLE "public"."pro_tournament_teams" TO "service_role"
GRANT ALL ON TABLE "public"."pro_tournaments_active" TO "anon"
GRANT ALL ON TABLE "public"."pro_tournaments_active" TO "authenticated"
GRANT ALL ON TABLE "public"."pro_tournaments_active" TO "service_role"
GRANT ALL ON TABLE "public"."project_configurations" TO "anon"
GRANT ALL ON TABLE "public"."project_configurations" TO "authenticated"
GRANT ALL ON TABLE "public"."project_configurations" TO "service_role"
GRANT ALL ON TABLE "public"."publisher_gamer" TO "anon"
GRANT ALL ON TABLE "public"."publisher_gamer" TO "authenticated"
GRANT ALL ON TABLE "public"."publisher_gamer" TO "service_role"
GRANT ALL ON TABLE "public"."quests" TO "anon"
GRANT ALL ON TABLE "public"."quests" TO "authenticated"
GRANT ALL ON TABLE "public"."quests" TO "service_role"
GRANT ALL ON TABLE "public"."report_shares" TO "anon"
GRANT ALL ON TABLE "public"."report_shares" TO "authenticated"
GRANT ALL ON TABLE "public"."report_shares" TO "service_role"
GRANT ALL ON TABLE "public"."support_tickets" TO "anon"
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated"
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role"
GRANT ALL ON TABLE "public"."team_applications" TO "anon"
GRANT ALL ON TABLE "public"."team_applications" TO "authenticated"
GRANT ALL ON TABLE "public"."team_applications" TO "service_role"
GRANT ALL ON TABLE "public"."team_members" TO "anon"
GRANT ALL ON TABLE "public"."team_members" TO "authenticated"
GRANT ALL ON TABLE "public"."team_members" TO "service_role"
GRANT ALL ON TABLE "public"."team_rankings" TO "anon"
GRANT ALL ON TABLE "public"."team_rankings" TO "authenticated"
GRANT ALL ON TABLE "public"."team_rankings" TO "service_role"
GRANT ALL ON TABLE "public"."teams" TO "anon"
GRANT ALL ON TABLE "public"."teams" TO "authenticated"
GRANT ALL ON TABLE "public"."teams" TO "service_role"
GRANT ALL ON TABLE "public"."ticket_messages" TO "anon"
GRANT ALL ON TABLE "public"."ticket_messages" TO "authenticated"
GRANT ALL ON TABLE "public"."ticket_messages" TO "service_role"
GRANT ALL ON TABLE "public"."toto" TO "anon"
GRANT ALL ON TABLE "public"."toto" TO "authenticated"
GRANT ALL ON TABLE "public"."toto" TO "service_role"
GRANT ALL ON TABLE "public"."tournament_discord_verification" TO "anon"
GRANT ALL ON TABLE "public"."tournament_discord_verification" TO "authenticated"
GRANT ALL ON TABLE "public"."tournament_discord_verification" TO "service_role"
GRANT ALL ON TABLE "public"."tournament_registrations" TO "anon"
GRANT ALL ON TABLE "public"."tournament_registrations" TO "authenticated"
GRANT ALL ON TABLE "public"."tournament_registrations" TO "service_role"
GRANT ALL ON TABLE "public"."tournaments" TO "anon"
GRANT ALL ON TABLE "public"."tournaments" TO "authenticated"
GRANT ALL ON TABLE "public"."tournaments" TO "service_role"
GRANT ALL ON TABLE "public"."tournament_discord_verification_summary" TO "anon"
GRANT ALL ON TABLE "public"."tournament_discord_verification_summary" TO "authenticated"
GRANT ALL ON TABLE "public"."tournament_discord_verification_summary" TO "service_role"
GRANT ALL ON TABLE "public"."tournament_feedback" TO "anon"
GRANT ALL ON TABLE "public"."tournament_feedback" TO "authenticated"
GRANT ALL ON TABLE "public"."tournament_feedback" TO "service_role"
GRANT ALL ON TABLE "public"."tournament_field_values" TO "anon"
GRANT ALL ON TABLE "public"."tournament_field_values" TO "authenticated"
GRANT ALL ON TABLE "public"."tournament_field_values" TO "service_role"
GRANT ALL ON TABLE "public"."tournament_fields" TO "anon"
GRANT ALL ON TABLE "public"."tournament_fields" TO "authenticated"
GRANT ALL ON TABLE "public"."tournament_fields" TO "service_role"
GRANT ALL ON TABLE "public"."tournament_matches" TO "anon"
GRANT ALL ON TABLE "public"."tournament_matches" TO "authenticated"
GRANT ALL ON TABLE "public"."tournament_matches" TO "service_role"
GRANT ALL ON TABLE "public"."tournament_prizes" TO "anon"
GRANT ALL ON TABLE "public"."tournament_prizes" TO "authenticated"
GRANT ALL ON TABLE "public"."tournament_prizes" TO "service_role"
GRANT ALL ON TABLE "public"."tournament_reports" TO "anon"
GRANT ALL ON TABLE "public"."tournament_reports" TO "authenticated"
GRANT ALL ON TABLE "public"."tournament_reports" TO "service_role"
GRANT ALL ON TABLE "public"."user_achievements" TO "anon"
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated"
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role"
GRANT ALL ON TABLE "public"."user_battle_pass_progress" TO "anon"
GRANT ALL ON TABLE "public"."user_battle_pass_progress" TO "authenticated"
GRANT ALL ON TABLE "public"."user_battle_pass_progress" TO "service_role"
GRANT ALL ON TABLE "public"."user_currency" TO "anon"
GRANT ALL ON TABLE "public"."user_currency" TO "authenticated"
GRANT ALL ON TABLE "public"."user_currency" TO "service_role"
GRANT ALL ON TABLE "public"."user_export_preferences" TO "anon"
GRANT ALL ON TABLE "public"."user_export_preferences" TO "authenticated"
GRANT ALL ON TABLE "public"."user_export_preferences" TO "service_role"
GRANT ALL ON TABLE "public"."users" TO "anon"
GRANT ALL ON TABLE "public"."users" TO "authenticated"
GRANT ALL ON TABLE "public"."users" TO "service_role"
GRANT ALL ON TABLE "public"."xp_thresholds" TO "anon"
GRANT ALL ON TABLE "public"."xp_thresholds" TO "authenticated"
GRANT ALL ON TABLE "public"."xp_thresholds" TO "service_role"
GRANT ALL ON TABLE "public"."user_gamification_profile" TO "anon"
GRANT ALL ON TABLE "public"."user_gamification_profile" TO "authenticated"
GRANT ALL ON TABLE "public"."user_gamification_profile" TO "service_role"
GRANT ALL ON TABLE "public"."user_inventory" TO "anon"
GRANT ALL ON TABLE "public"."user_inventory" TO "authenticated"
GRANT ALL ON TABLE "public"."user_inventory" TO "service_role"
GRANT ALL ON TABLE "public"."user_quests" TO "anon"
GRANT ALL ON TABLE "public"."user_quests" TO "authenticated"
GRANT ALL ON TABLE "public"."user_quests" TO "service_role"
GRANT ALL ON TABLE "public"."user_relationships" TO "anon"
GRANT ALL ON TABLE "public"."user_relationships" TO "authenticated"
GRANT ALL ON TABLE "public"."user_relationships" TO "service_role"
GRANT ALL ON TABLE "public"."user_rewards_inventory" TO "anon"
GRANT ALL ON TABLE "public"."user_rewards_inventory" TO "authenticated"
GRANT ALL ON TABLE "public"."user_rewards_inventory" TO "service_role"
GRANT ALL ON TABLE "public"."user_tier_claims" TO "anon"
GRANT ALL ON TABLE "public"."user_tier_claims" TO "authenticated"
GRANT ALL ON TABLE "public"."user_tier_claims" TO "service_role"
GRANT ALL ON TABLE "public"."user_tournament_field_values" TO "anon"
GRANT ALL ON TABLE "public"."user_tournament_field_values" TO "authenticated"
GRANT ALL ON TABLE "public"."user_tournament_field_values" TO "service_role"
GRANT ALL ON TABLE "public"."user_virtual_currency" TO "anon"
GRANT ALL ON TABLE "public"."user_virtual_currency" TO "authenticated"
GRANT ALL ON TABLE "public"."user_virtual_currency" TO "service_role"
GRANT ALL ON TABLE "public"."virtual_currency_transactions" TO "anon"
GRANT ALL ON TABLE "public"."virtual_currency_transactions" TO "authenticated"
GRANT ALL ON TABLE "public"."virtual_currency_transactions" TO "service_role"
GRANT ALL ON TABLE "public"."xp_events" TO "anon"
GRANT ALL ON TABLE "public"."xp_events" TO "authenticated"
GRANT ALL ON TABLE "public"."xp_events" TO "service_role"
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres"
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon"
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated"
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role"
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres"
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon"
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated"
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role"
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres"
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon"
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated"
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role"