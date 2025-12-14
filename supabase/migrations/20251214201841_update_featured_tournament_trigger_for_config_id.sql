/*
  # Update Featured Tournament Trigger for config_id

  1. Changes
    - Modified sync_featured_tournament_to_game_trailers() function
    - Now uses the tournament's config_id instead of hardcoding 'default'
    - Falls back to 'default' if tournament's config_id is NULL (worldwide tournament)

  2. Trigger Updates
    - Added config_id to the list of monitored columns for trigger
    - When config_id changes, the game_trailers entry is updated accordingly

  3. Notes
    - Existing featured tournaments without config_id will use 'default'
    - Project-specific tournaments will use their own config_id
    - This enables proper multi-tenant hero carousel functionality
*/

-- Create or replace the trigger function to use tournament's config_id
CREATE OR REPLACE FUNCTION sync_featured_tournament_to_game_trailers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game_trailer_url TEXT;
  v_config_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM game_trailers 
    WHERE tournament_id = OLD.id;
    RETURN OLD;
  END IF;

  v_config_id := COALESCE(NEW.config_id, 'default');

  IF NEW.is_featured = TRUE THEN
    SELECT g.trailer_url INTO v_game_trailer_url
    FROM games g
    WHERE g.id = NEW.game_id;

    IF v_game_trailer_url IS NOT NULL AND v_game_trailer_url != '' THEN
      INSERT INTO game_trailers (
        tournament_id,
        game_id,
        video_url,
        title,
        is_featured,
        is_default,
        config_id,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        NEW.game_id,
        v_game_trailer_url,
        NEW.title,
        TRUE,
        FALSE,
        v_config_id,
        NOW(),
        NOW()
      )
      ON CONFLICT (tournament_id) 
      WHERE tournament_id IS NOT NULL
      DO UPDATE SET
        game_id = EXCLUDED.game_id,
        video_url = EXCLUDED.video_url,
        title = EXCLUDED.title,
        config_id = EXCLUDED.config_id,
        is_featured = TRUE,
        updated_at = NOW();
    END IF;

  ELSIF NEW.is_featured = FALSE AND OLD.is_featured = TRUE THEN
    DELETE FROM game_trailers 
    WHERE tournament_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_featured_tournament ON tournaments;

-- Create the trigger with config_id in the monitored columns
CREATE TRIGGER trigger_sync_featured_tournament
AFTER INSERT OR UPDATE OF is_featured, title, game_id, config_id ON tournaments
FOR EACH ROW
EXECUTE FUNCTION sync_featured_tournament_to_game_trailers();

-- Update comment
COMMENT ON FUNCTION sync_featured_tournament_to_game_trailers() IS 
'Automatically syncs featured tournaments to game_trailers table for hero carousel display. 
Uses tournament config_id (falls back to default if NULL).
When is_featured=true, creates/updates entry with tournament title, game trailer URL, and config_id.
When is_featured=false, removes the entry.';