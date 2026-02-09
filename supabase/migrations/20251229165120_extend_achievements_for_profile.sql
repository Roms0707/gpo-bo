/*
  # Extend Achievements Table for Profile Display

  1. Changes
    - Add `icon` column for lucide-react icon names
    - Add `category` column for grouping achievements
    - Add `xp_reward` column for XP rewards
    - Add `rarity` column for visual styling

  2. Seed Data
    - Add profile-related achievements for the new gamification system
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'achievements' AND column_name = 'icon'
  ) THEN
    ALTER TABLE achievements ADD COLUMN icon text DEFAULT 'trophy'

  END IF

END $$


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'achievements' AND column_name = 'category'
  ) THEN
    ALTER TABLE achievements ADD COLUMN category text DEFAULT 'milestone'

  END IF

END $$


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'achievements' AND column_name = 'xp_reward'
  ) THEN
    ALTER TABLE achievements ADD COLUMN xp_reward integer DEFAULT 0

  END IF

END $$


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'achievements' AND column_name = 'rarity'
  ) THEN
    ALTER TABLE achievements ADD COLUMN rarity text DEFAULT 'common'

  END IF

END $$


UPDATE achievements SET
  icon = 'sword',
  category = 'tournament',
  xp_reward = 50,
  rarity = 'common'
WHERE name ILIKE '%first%' AND icon IS NULL


UPDATE achievements SET
  icon = 'trophy',
  category = 'tournament',
  xp_reward = 200,
  rarity = 'rare'
WHERE name ILIKE '%champion%' OR name ILIKE '%winner%'


UPDATE achievements SET
  icon = 'medal',
  category = 'tournament',
  xp_reward = 150,
  rarity = 'rare'
WHERE name ILIKE '%veteran%'


UPDATE achievements SET
  icon = 'users',
  category = 'social',
  xp_reward = 100,
  rarity = 'common'
WHERE name ILIKE '%friend%' OR name ILIKE '%social%'


UPDATE achievements SET
  icon = 'check-circle',
  category = 'account',
  xp_reward = 75,
  rarity = 'common'
WHERE name ILIKE '%verif%'


UPDATE achievements SET
  icon = 'gamepad-2',
  category = 'account',
  xp_reward = 150,
  rarity = 'rare'
WHERE name ILIKE '%multi%' OR name ILIKE '%gamer%'


UPDATE achievements SET rarity = 'common' WHERE rarity IS NULL

UPDATE achievements SET xp_reward = 50 WHERE xp_reward IS NULL OR xp_reward = 0

UPDATE achievements SET icon = 'trophy' WHERE icon IS NULL

UPDATE achievements SET category = 'milestone' WHERE category IS NULL
