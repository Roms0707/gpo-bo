/*
  # Remove unique players constraint for Swiss tournaments

  1. Changes
    - Remove the `idx_tournament_matches_unique_players` constraint that prevents players from facing each other multiple times
    - This allows Swiss tournaments to transition to knockout stages where players may face previous opponents

  2. Security
    - No security changes needed as this only removes a constraint
    - All existing RLS policies remain in place

  3. Notes
    - This constraint was too restrictive for Swiss tournaments that transition to knockout stages
    - Players who meet in Swiss rounds should be able to face each other again in knockout rounds
    - The constraint was preventing the generation of knockout brackets
*/

-- Remove the unique constraint that prevents players from facing each other multiple times
DROP INDEX IF EXISTS idx_tournament_matches_unique_players;
