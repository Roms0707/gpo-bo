/*
  # Auto-Remove Past Tournaments from Hero Carousel

  1. Overview
    - Extends the featured tournament sync trigger to handle tournament status changes
    - Automatically removes tournaments from game_trailers when status changes to 'past'
    - Implements a 24-hour grace period after the tournament end_date

  2. Changes to Trigger Function
    - Added status change detection (OLD.status != 'past' AND NEW.status = 'past')
    - When status changes to 'past':
      - Checks if 24 hours have passed since the tournament's end_date
      - If grace period has passed, removes the entry from game_trailers
      - Also performs opportunistic cleanup of any other stale entries
    - Preserves all existing functionality for is_featured changes

  3. Changes to Trigger Definition
    - Added 'status' to the UPDATE OF column list
    - Trigger now fires on: is_featured, title, game_id, status

  4. Grace Period Logic
    - Tournament remains visible in carousel for 24 hours after end_date
    - Cleanup occurs when: status = 'past' AND end_date + 24 hours <= NOW()
    - Opportunistic cleanup: when any tournament goes 'past', also clean up
      other stale entries that have expired grace periods

  5. Security
    - No changes to RLS policies
    - Function remains SECURITY DEFINER for proper access
*/

CREATE OR REPLACE FUNCTION sync_featured_tournament_to_game_trailers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game_trailer_url TEXT;
  v_config_id TEXT := 'default';
  v_grace_period_passed BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM game_trailers
    WHERE tournament_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.status = 'past' AND (OLD.status IS NULL OR OLD.status != 'past') THEN
    v_grace_period_passed := (NEW.end_date + INTERVAL '24 hours') <= NOW();

    IF v_grace_period_passed THEN
      DELETE FROM game_trailers
      WHERE tournament_id = NEW.id;
    END IF;

    DELETE FROM game_trailers gt
    WHERE gt.tournament_id != NEW.id
      AND gt.tournament_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM tournaments t
        WHERE t.id = gt.tournament_id
          AND t.status = 'past'
          AND (t.end_date + INTERVAL '24 hours') <= NOW()
      );

    IF v_grace_period_passed THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.is_featured IS TRUE THEN
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
        is_featured = TRUE,
        updated_at = NOW();
    END IF;

  ELSIF NEW.is_featured IS NOT TRUE AND OLD.is_featured IS TRUE THEN
    DELETE FROM game_trailers
    WHERE tournament_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_featured_tournament ON tournaments;

CREATE TRIGGER trigger_sync_featured_tournament
AFTER INSERT OR UPDATE OF is_featured, title, game_id, status ON tournaments
FOR EACH ROW
EXECUTE FUNCTION sync_featured_tournament_to_game_trailers();

COMMENT ON FUNCTION sync_featured_tournament_to_game_trailers() IS
'Automatically syncs featured tournaments to game_trailers table for hero carousel display.
- When is_featured=true: creates/updates entry with tournament title and game trailer URL
- When is_featured becomes false/null: removes the entry
- When status changes to past: removes entry after 24-hour grace period from end_date
- Performs opportunistic cleanup of other stale entries when any tournament goes past';
