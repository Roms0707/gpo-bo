/*
  # Backfill existing notifications with i18n keys and metadata

  1. Purpose
    - Parses existing French notification text to extract dynamic values
    - Sets `title` to the correct i18n translation key
    - Populates `metadata` with extracted dynamic values for frontend interpolation

  2. Affected notification types (all existing rows)
    - tournament_update, tournament_start, bracket_advance, bracket_eliminated
    - registration_status, friend_request, friend_accepted
    - new_ticket, support_message

  3. Important Notes
    - Only updates rows where metadata is NULL or empty '{}'
    - French text is preserved in the `message` field as fallback
    - Pattern matching uses the known French message templates
*/

-- tournament_update: extract tournament title and status
UPDATE notifications
SET
  title = 'notif.tournament_status_updated',
  metadata = jsonb_build_object(
    'tournament_title',
    CASE
      WHEN message LIKE '%"%"%' THEN
        SUBSTRING(message FROM '"([^"]+)"')
      ELSE ''
    END,
    'status',
    CASE
      WHEN message LIKE '%à venir' THEN 'upcoming'
      WHEN message LIKE '%en cours' THEN 'active'
      WHEN message LIKE '%terminé' THEN 'past'
      ELSE 'unknown'
    END
  )
WHERE type = 'tournament_update'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- tournament_start: extract tournament title
UPDATE notifications
SET
  title = 'notif.tournament_starting_soon',
  metadata = jsonb_build_object(
    'tournament_title',
    COALESCE(SUBSTRING(message FROM '"([^"]+)"'), '')
  )
WHERE type = 'tournament_start'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- bracket_advance: extract tournament title and is_team
UPDATE notifications
SET
  title = 'notif.bracket_advance',
  metadata = jsonb_build_object(
    'tournament_title',
    COALESCE(SUBSTRING(message FROM '"([^"]+)"'), ''),
    'is_team',
    message LIKE '%équipe%'
  )
WHERE type = 'bracket_advance'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- bracket_eliminated: extract tournament title and is_team
UPDATE notifications
SET
  title = 'notif.bracket_eliminated',
  metadata = jsonb_build_object(
    'tournament_title',
    COALESCE(SUBSTRING(message FROM '"([^"]+)"'), ''),
    'is_team',
    message LIKE '%équipe%'
  )
WHERE type = 'bracket_eliminated'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- registration_status: extract tournament title and status
UPDATE notifications
SET
  title = 'notif.registration_status',
  metadata = jsonb_build_object(
    'tournament_title',
    COALESCE(SUBSTRING(message FROM '"([^"]+)"'), ''),
    'status',
    CASE
      WHEN message LIKE '%en attente%' THEN 'pending'
      WHEN message LIKE '%approuvée%' THEN 'approved'
      WHEN message LIKE '%refusée%' THEN 'rejected'
      ELSE 'unknown'
    END
  )
WHERE type = 'registration_status'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- friend_request: extract sender username
UPDATE notifications
SET
  title = 'notif.friend_request',
  metadata = jsonb_build_object(
    'sender_username',
    COALESCE(SUBSTRING(message FROM '^(.+) vous a envoyé'), '')
  )
WHERE type = 'friend_request'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- friend_accepted: extract acceptor username
UPDATE notifications
SET
  title = 'notif.friend_accepted',
  metadata = jsonb_build_object(
    'acceptor_username',
    COALESCE(SUBSTRING(message FROM '^(.+) a accepté'), '')
  )
WHERE type = 'friend_accepted'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- new_ticket: extract creator username and ticket subject
UPDATE notifications
SET
  title = 'notif.new_ticket',
  metadata = jsonb_build_object(
    'creator_username',
    COALESCE(SUBSTRING(message FROM '^(.+) a créé un nouveau ticket'), ''),
    'ticket_subject',
    COALESCE(SUBSTRING(message FROM 'ticket: (.+)$'), '')
  )
WHERE type = 'new_ticket'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- support_message (admin reply): title contains "réponse du support"
UPDATE notifications
SET
  title = 'notif.support_admin_reply',
  metadata = jsonb_build_object(
    'ticket_subject',
    COALESCE(SUBSTRING(message FROM 'ticket: (.+)$'), '')
  )
WHERE type = 'support_message'
  AND message LIKE '%administrateur a répondu%'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- support_message (user message): title contains "message de support"
UPDATE notifications
SET
  title = 'notif.support_user_message',
  metadata = jsonb_build_object(
    'sender_username',
    COALESCE(SUBSTRING(message FROM '^(.+) a envoyé'), ''),
    'ticket_subject',
    COALESCE(SUBSTRING(message FROM 'ticket: (.+)$'), '')
  )
WHERE type = 'support_message'
  AND message LIKE '%a envoyé un message%'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- team_accepted
UPDATE notifications
SET
  title = 'notif.team_app_accepted',
  metadata = jsonb_build_object(
    'team_name',
    COALESCE(SUBSTRING(message FROM '"([^"]+)"'), '')
  )
WHERE type = 'team_accepted'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- team_rejected
UPDATE notifications
SET
  title = 'notif.team_app_rejected',
  metadata = jsonb_build_object(
    'team_name',
    COALESCE(SUBSTRING(message FROM '"([^"]+)"'), '')
  )
WHERE type = 'team_rejected'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- team_member_joined
UPDATE notifications
SET
  title = 'notif.team_member_joined',
  metadata = jsonb_build_object(
    'username',
    COALESCE(SUBSTRING(message FROM '^(.+) a rejoint'), ''),
    'team_name',
    COALESCE(SUBSTRING(message FROM '"([^"]+)"'), '')
  )
WHERE type = 'team_member_joined'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- team_application (received by captain)
UPDATE notifications
SET
  title = 'notif.team_app_received',
  metadata = jsonb_build_object(
    'applicant_username',
    COALESCE(SUBSTRING(message FROM '^(.+) a postulé'), ''),
    'team_name',
    COALESCE(SUBSTRING(message FROM 'équipe "([^"]+)"'), '')
  )
WHERE type = 'team_application'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- channel_invitation
UPDATE notifications
SET
  title = 'notif.channel_invitation',
  metadata = jsonb_build_object(
    'channel_name',
    COALESCE(SUBSTRING(message FROM 'le canal (.+)$'), '')
  )
WHERE type = 'channel_invitation'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);

-- tournament_join_now
UPDATE notifications
SET
  title = 'notif.tournament_live',
  metadata = jsonb_build_object(
    'tournament_title',
    COALESCE(SUBSTRING(message FROM '"([^"]+)"'), '')
  )
WHERE type = 'tournament_join_now'
  AND (metadata IS NULL OR metadata = '{}'::jsonb);
