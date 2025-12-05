/*
  # Amélioration de la gestion des BYE dans les brackets

  ## Changements

  1. Nouveau champ dans tournaments
    - `last_editable_round` (integer) - Dernier round éditable du bracket
    - `bye_history` (jsonb) - Historique des modifications de BYE par round

  2. Nouveaux champs dans tournament_matches
    - `is_bye_match` (boolean) - Indique si le match contient un BYE
    - `bye_handled` (boolean) - Indique si le BYE a été géré manuellement
    - `modification_notes` (text) - Notes sur les modifications du match

  3. Index
    - Index sur `is_bye_match` pour améliorer les requêtes de détection des BYE
    - Index composite sur (`tournament_id`, `round`, `is_bye_match`)

  ## Notes
  - Ces champs permettent un meilleur tracking des BYE et des modifications
  - L'historique aide à l'audit et à la compréhension des changements
  - Les index améliorent les performances des requêtes de gestion des BYE
*/

-- Ajouter les nouveaux champs à la table tournaments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournaments' AND column_name = 'last_editable_round'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN last_editable_round integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournaments' AND column_name = 'bye_history'
  ) THEN
    ALTER TABLE tournaments ADD COLUMN bye_history jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Ajouter un commentaire sur les nouveaux champs
COMMENT ON COLUMN tournaments.last_editable_round IS 'Dernier round éditable du bracket';
COMMENT ON COLUMN tournaments.bye_history IS 'Historique des modifications de BYE au format JSON';

-- Ajouter les nouveaux champs à la table tournament_matches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_matches' AND column_name = 'is_bye_match'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN is_bye_match boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_matches' AND column_name = 'bye_handled'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN bye_handled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_matches' AND column_name = 'modification_notes'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN modification_notes text DEFAULT NULL;
  END IF;
END $$;

-- Ajouter des commentaires sur les nouveaux champs
COMMENT ON COLUMN tournament_matches.is_bye_match IS 'Indique si le match contient un BYE (un participant manquant)';
COMMENT ON COLUMN tournament_matches.bye_handled IS 'Indique si le BYE a été géré manuellement par un administrateur';
COMMENT ON COLUMN tournament_matches.modification_notes IS 'Notes sur les modifications du match pour l''historique';

-- Créer un index sur is_bye_match pour améliorer les requêtes
CREATE INDEX IF NOT EXISTS idx_tournament_matches_bye
  ON tournament_matches(is_bye_match)
  WHERE is_bye_match = true;

-- Créer un index composite pour optimiser les requêtes de gestion des BYE
CREATE INDEX IF NOT EXISTS idx_tournament_matches_bye_composite
  ON tournament_matches(tournament_id, round, is_bye_match);

-- Fonction trigger pour détecter automatiquement les BYE
CREATE OR REPLACE FUNCTION detect_bye_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Marquer le match comme BYE si un participant est manquant et qu'il n'y a pas de gagnant
  NEW.is_bye_match := (
    (NEW.player1_id IS NULL OR NEW.player2_id IS NULL)
    AND NEW.winner_id IS NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour détecter automatiquement les BYE
DROP TRIGGER IF EXISTS trigger_detect_bye_match ON tournament_matches;
CREATE TRIGGER trigger_detect_bye_match
  BEFORE INSERT OR UPDATE ON tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION detect_bye_match();

-- Mettre à jour les matches existants pour marquer les BYE
UPDATE tournament_matches
SET is_bye_match = true
WHERE (player1_id IS NULL OR player2_id IS NULL)
  AND winner_id IS NULL
  AND is_bye_match = false;
