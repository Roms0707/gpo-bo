/*
  # Fix Featured Tournament Trigger Null Handling

  1. Problem
    - The existing trigger condition `NEW.is_featured = FALSE AND OLD.is_featured = TRUE`
      fails when is_featured is NULL instead of explicit FALSE
    - This prevents proper deletion of game_trailers entries when featured status is disabled

  2. Solution
    - Change the delete condition to use null-safe comparisons:
      - `NEW.is_featured IS NOT TRUE` (covers both FALSE and NULL)
      - `OLD.is_featured IS TRUE`
    - This ensures the delete happens correctly regardless of whether the value is FALSE or NULL

  3. Security
    - No changes to security model
    - Function remains SECURITY DEFINER for proper access to game_trailers table
*/

CREATE OR REPLACE FUNCTION sync_featured_tournament_to_game_trailers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game_trailer_url TEXT;
  v_config_id TEXT := 'default';
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM game_trailers 
    WHERE tournament_id = OLD.id;
    RETURN OLD;
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

COMMENT ON FUNCTION sync_featured_tournament_to_game_trailers() IS 
'Automatically syncs featured tournaments to game_trailers table for hero carousel display. 
When is_featured=true, creates/updates entry with tournament title and game trailer URL.
When is_featured is not true (false or null), removes the entry if it was previously featured.
Uses null-safe comparisons to handle both FALSE and NULL values correctly.';