/*
  # Add bracket_ready notification type

  1. Changes
    - Drop and recreate `player_match_notifications_notification_type_check` constraint
      to include 'bracket_ready' alongside 'match_starting', 'match_result', 'next_opponent'
  
  2. Security
    - No RLS changes needed (existing policies remain intact)
  
  3. Notes
    - The bracket_ready type is used when a tournament bracket is generated
      and participants need to be notified about their placement
    - round_number constraint (> 0) already exists, bracket_ready uses round_number: 1
*/

ALTER TABLE player_match_notifications
  DROP CONSTRAINT IF EXISTS player_match_notifications_notification_type_check;

ALTER TABLE player_match_notifications
  ADD CONSTRAINT player_match_notifications_notification_type_check
  CHECK (notification_type = ANY (ARRAY['match_starting'::text, 'match_result'::text, 'next_opponent'::text, 'bracket_ready'::text]));
