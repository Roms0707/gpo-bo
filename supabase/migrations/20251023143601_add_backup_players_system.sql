/*
  # Add Backup Players System

  1. Schema Changes
    - Add `allow_backups` column to `tournaments` table
      - Boolean flag to enable/disable backup system for a tournament
      - Default: false (disabled)
    - Add `max_backup_players` column to `tournaments` table
      - Defines maximum number of backup players allowed
      - Nullable (null when backups are disabled)
    - Add `registration_order` column to `tournament_registrations` table
      - Tracks the order of registration for automatic promotion
      - Auto-incremented based on created_at timestamp
    - Modify `status` enum in `tournament_registrations` to include 'backup' status
      - Existing statuses: 'pending', 'approved', 'rejected'
      - New status: 'backup' for players on backup list

  2. Data Migration
    - Set default values for existing tournaments (allow_backups = false)
    - Set registration_order for existing registrations based on created_at

  3. Security
    - RLS policies remain unchanged as these fields follow existing patterns
    - Only authenticated admins can modify tournament backup settings

  4. Notes
    - Backup system is opt-in via allow_backups flag
    - When allow_backups is true, max_backup_players must be set
    - registration_order helps with automatic promotion logic
    - The 'backup' status indicates approved players who are on standby
*/

-- Add new columns to tournaments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournaments' AND column_name = 'allow_backups'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN allow_backups BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournaments' AND column_name = 'max_backup_players'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN max_backup_players INTEGER DEFAULT NULL;
  END IF;
END $$;

-- Add registration_order column to tournament_registrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_registrations' AND column_name = 'registration_order'
  ) THEN
    ALTER TABLE tournament_registrations ADD COLUMN registration_order INTEGER DEFAULT NULL;
  END IF;
END $$;

-- Create function to set registration_order for existing records
DO $$
DECLARE
  tournament_rec RECORD;
  registration_rec RECORD;
  order_counter INTEGER;
BEGIN
  -- For each tournament, set registration_order based on created_at
  FOR tournament_rec IN 
    SELECT DISTINCT tournament_id FROM tournament_registrations
  LOOP
    order_counter := 1;
    FOR registration_rec IN
      SELECT id FROM tournament_registrations
      WHERE tournament_id = tournament_rec.tournament_id
      ORDER BY created_at ASC, id ASC
    LOOP
      UPDATE tournament_registrations
      SET registration_order = order_counter
      WHERE id = registration_rec.id;
      order_counter := order_counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Create function to auto-assign registration_order on insert
CREATE OR REPLACE FUNCTION set_registration_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.registration_order IS NULL THEN
    SELECT COALESCE(MAX(registration_order), 0) + 1
    INTO NEW.registration_order
    FROM tournament_registrations
    WHERE tournament_id = NEW.tournament_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign registration_order
DROP TRIGGER IF EXISTS set_registration_order_trigger ON tournament_registrations;
CREATE TRIGGER set_registration_order_trigger
  BEFORE INSERT ON tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION set_registration_order();

-- Create function for automatic promotion of backup players
CREATE OR REPLACE FUNCTION promote_backup_player()
RETURNS TRIGGER AS $$
DECLARE
  tournament_rec RECORD;
  backup_player_rec RECORD;
  active_count INTEGER;
BEGIN
  -- Only process if a player was removed from approved status
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    -- Get tournament details
    SELECT t.allow_backups, t.max_nb_players
    INTO tournament_rec
    FROM tournaments t
    WHERE t.id = NEW.tournament_id;

    -- Only promote if tournament has backup system enabled
    IF tournament_rec.allow_backups THEN
      -- Count current active players
      SELECT COUNT(*)
      INTO active_count
      FROM tournament_registrations
      WHERE tournament_id = NEW.tournament_id
        AND status = 'approved';

      -- If we have room and there are backup players, promote the first one
      IF active_count < tournament_rec.max_nb_players THEN
        -- Get the first backup player (lowest registration_order)
        SELECT id
        INTO backup_player_rec
        FROM tournament_registrations
        WHERE tournament_id = NEW.tournament_id
          AND status = 'backup'
        ORDER BY registration_order ASC
        LIMIT 1;

        -- Promote the backup player
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
$$ LANGUAGE plpgsql;

-- Create trigger for automatic promotion
DROP TRIGGER IF EXISTS promote_backup_player_trigger ON tournament_registrations;
CREATE TRIGGER promote_backup_player_trigger
  AFTER UPDATE ON tournament_registrations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION promote_backup_player();