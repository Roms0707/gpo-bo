/*
  # Add Slug to FC Mobile Game

  1. Purpose
    - Fix navigation issue for FC Mobile in the game library sidebar
    - Add missing slug field required for URL routing (/hub/fc-mobile)

  2. Changes
    - Update FC Mobile game (ca9408a6-94b1-4744-9177-834c2b63fa10) with slug 'fc-mobile'

  3. Impact
    - Users can now click FC Mobile in the sidebar to navigate to its game hub
    - URL will be /hub/fc-mobile instead of failing navigation
*/

UPDATE games
SET slug = 'fc-mobile'
WHERE id = 'ca9408a6-94b1-4744-9177-834c2b63fa10'
  AND slug IS NULL;
