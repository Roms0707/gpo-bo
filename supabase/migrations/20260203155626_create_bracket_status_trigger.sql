/*
  # Create Bracket Status Change Trigger

  1. New Trigger Function
    - `notify_bracket_ready`: Function that fires when bracket_status changes to 'ready'
    - Makes an HTTP POST request to the send-bracket-ready-notifications edge function
    - Uses pg_net extension for async HTTP calls

  2. New Trigger
    - `on_bracket_status_ready`: Fires AFTER UPDATE on tournaments table
    - Only triggers when bracket_status changes to 'ready'

  3. Important Notes
    - The trigger automatically sends notifications to all participants when brackets are generated
    - Uses service role key from vault for authentication
    - Non-blocking async HTTP call ensures tournament updates are not delayed
*/

CREATE OR REPLACE FUNCTION notify_bracket_ready()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  IF NEW.bracket_status = 'ready' AND (OLD.bracket_status IS NULL OR OLD.bracket_status != 'ready') THEN
    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url'
    LIMIT 1;

    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_service_role_key'
    LIMIT 1;

    IF supabase_url IS NULL THEN
      supabase_url := current_setting('app.settings.supabase_url', true);
    END IF;

    IF supabase_url IS NOT NULL AND service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := supabase_url || '/functions/v1/send-bracket-ready-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object('tournament_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_bracket_status_ready ON tournaments;

CREATE TRIGGER on_bracket_status_ready
  AFTER UPDATE OF bracket_status ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION notify_bracket_ready();

COMMENT ON FUNCTION notify_bracket_ready() IS 'Automatically sends bracket ready notifications when tournament bracket_status changes to ready';
COMMENT ON TRIGGER on_bracket_status_ready ON tournaments IS 'Fires notification function when bracket_status becomes ready';
