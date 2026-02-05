/*
  # Sync Featured Tournaments to Game Trailers

  This migration creates a database trigger that automatically manages the 
  game_trailers table when a tournament's is_featured status changes.

  1. Trigger Function: sync_featured_tournament_to_game_trailers()
    - When is_featured is set to TRUE:
      - Creates or updates a row in game_trailers with:
        - tournament_id: The featured tournament's ID
        - game_id: The tournament's associated game
        - video_url: The game's trailer_url (from games table)
        - title: The tournament's title
        - is_featured: true
        - config_id: 'default' (uses default project configuration)
    - When is_featured is set to FALSE:
      - Removes the corresponding entry from game_trailers

  2. Trigger: trigger_sync_featured_tournament
    - Fires AFTER INSERT OR UPDATE on tournaments table
    - Only triggers when is_featured column changes or on insert

  3. Security Notes
    - Uses SECURITY DEFINER to ensure trigger can modify game_trailers
    - Only affects rows where tournament_id matches the featured tournament

  4. Important Notes
    - If a game has no trailer_url, the sync will fail silently
    - Multiple featured tournaments can coexist (frontend decides display priority)
    - config_id defaults to 'default' - adjust if multi-tenant support needed
*/

-- Create or replace the trigger function
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

-- Create unique partial index on tournament_id for upsert to work
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_trailers_tournament_id_unique 
ON game_trailers(tournament_id) 
WHERE tournament_id IS NOT NULL;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_featured_tournament ON tournaments;

-- Create the trigger
CREATE TRIGGER trigger_sync_featured_tournament
AFTER INSERT OR UPDATE OF is_featured, title, game_id ON tournaments
FOR EACH ROW
EXECUTE FUNCTION sync_featured_tournament_to_game_trailers();

-- Add comment documenting the trigger
COMMENT ON FUNCTION sync_featured_tournament_to_game_trailers() IS 
'Automatically syncs featured tournaments to game_trailers table for hero carousel display. 
When is_featured=true, creates/updates entry with tournament title and game trailer URL.
When is_featured=false, removes the entry.';
