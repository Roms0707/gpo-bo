/*
  # Create Profile Banners Table

  1. New Tables
    - `profile_banners`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text, nullable)
      - `image_url` (text, not null)
      - `game_affinity` (text, not null) - matches avatar affinities: lol, warzone, valorant, cs2, apex, rocket_league, universal
      - `rarity` (text, not null) - common, rare, epic, legendary
      - `unlock_type` (text, not null) - free, xp
      - `unlock_requirement` (jsonb, default '{}')
      - `sort_order` (integer, default 0)
      - `is_available` (boolean, default true)
      - `created_at` (timestamptz, default now())

  2. Schema Changes
    - Add `selected_banner_id` (uuid, FK) to `user_profile_customizations`
    - Add `use_preset_banner` (boolean, default false) to `user_profile_customizations`

  3. Security
    - Enable RLS on `profile_banners`
    - Add SELECT policy for authenticated users to read available banners

  4. Seed Data
    - Initial banners using IGDB artwork from existing games table
    - Free + XP-locked banners across all game affinities
*/

CREATE TABLE IF NOT EXISTS profile_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text NOT NULL,
  game_affinity text NOT NULL DEFAULT 'universal',
  rarity text NOT NULL DEFAULT 'common',
  unlock_type text NOT NULL DEFAULT 'free',
  unlock_requirement jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profile_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view available banners"
  ON profile_banners
  FOR SELECT
  TO authenticated
  USING (is_available = true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_customizations' AND column_name = 'selected_banner_id'
  ) THEN
    ALTER TABLE user_profile_customizations ADD COLUMN selected_banner_id uuid REFERENCES profile_banners(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_customizations' AND column_name = 'use_preset_banner'
  ) THEN
    ALTER TABLE user_profile_customizations ADD COLUMN use_preset_banner boolean DEFAULT false;
  END IF;
END $$;

INSERT INTO profile_banners (name, description, image_url, game_affinity, rarity, unlock_type, unlock_requirement, sort_order) VALUES
  ('Summoner''s Rift', 'The classic League of Legends battlefield', 'https://images.igdb.com/igdb/image/upload/t_original/ar6di.jpg', 'lol', 'common', 'free', '{}', 10),
  ('Runeterra Rising', 'Legendary artwork from the world of Runeterra', 'https://images.igdb.com/igdb/image/upload/t_1080p/scbrmf.jpg', 'lol', 'rare', 'xp', '{"xp": 500}', 11),
  ('Champion''s Arena', 'Where champions prove their worth', 'https://images.igdb.com/igdb/image/upload/t_1080p/scbrmi.jpg', 'lol', 'epic', 'xp', '{"xp": 1500}', 12),

  ('Warzone Drop', 'Call of Duty Warzone combat zone', 'https://images.igdb.com/igdb/image/upload/t_original/ar1zdk.jpg', 'warzone', 'common', 'free', '{}', 20),
  ('Verdansk Night', 'Under cover of darkness in Verdansk', 'https://images.igdb.com/igdb/image/upload/t_1080p/co4bqc.jpg', 'warzone', 'rare', 'xp', '{"xp": 500}', 21),
  ('Warzone Elite', 'Only the strongest survive', 'https://images.igdb.com/igdb/image/upload/t_1080p/co4jni.jpg', 'warzone', 'epic', 'xp', '{"xp": 1500}', 22),

  ('Valorant Protocol', 'Join the VALORANT Protocol', 'https://images.igdb.com/igdb/image/upload/t_original/ar4p45.jpg', 'valorant', 'common', 'free', '{}', 30),
  ('Radianite Storm', 'Harnessing the power of Radianite', 'https://images.igdb.com/igdb/image/upload/t_1080p/co7clg.jpg', 'valorant', 'rare', 'xp', '{"xp": 500}', 31),
  ('Agent Elite', 'Rise through the ranks of VALORANT', 'https://images.igdb.com/igdb/image/upload/t_1080p/co2mvt.jpg', 'valorant', 'legendary', 'xp', '{"xp": 3000}', 32),

  ('Counter Strike Arena', 'The iconic CS2 battlegrounds', 'https://images.igdb.com/igdb/image/upload/t_original/ar439t.jpg', 'cs2', 'common', 'free', '{}', 40),
  ('Dust Legends', 'Legendary moments on Dust II', 'https://images.igdb.com/igdb/image/upload/t_1080p/co6t5l.jpg', 'cs2', 'rare', 'xp', '{"xp": 500}', 41),
  ('Global Elite', 'Reach the pinnacle of competitive CS', 'https://images.igdb.com/igdb/image/upload/t_1080p/co1rgi.jpg', 'cs2', 'epic', 'xp', '{"xp": 1500}', 42),

  ('Apex Arena', 'Welcome to the Apex Games', 'https://images.igdb.com/igdb/image/upload/t_original/ar3zi8.jpg', 'apex', 'common', 'free', '{}', 50),
  ('Legends Rising', 'Where Legends are born', 'https://images.igdb.com/igdb/image/upload/t_1080p/co1wt4.jpg', 'apex', 'rare', 'xp', '{"xp": 500}', 51),
  ('Apex Predator', 'Dominate the arena as an Apex Predator', 'https://images.igdb.com/igdb/image/upload/t_1080p/co85gy.jpg', 'apex', 'legendary', 'xp', '{"xp": 3000}', 52),

  ('Rocket Kickoff', 'Hit the pitch in Rocket League', 'https://images.igdb.com/igdb/image/upload/t_original/ar4lm5.jpg', 'rocket_league', 'common', 'free', '{}', 60),
  ('Supersonic Legend', 'Fly high above the competition', 'https://images.igdb.com/igdb/image/upload/t_1080p/co2lcn.jpg', 'rocket_league', 'rare', 'xp', '{"xp": 500}', 61),
  ('Grand Champion', 'The ultimate Rocket League achievement', 'https://images.igdb.com/igdb/image/upload/t_1080p/co7iqt.jpg', 'rocket_league', 'epic', 'xp', '{"xp": 1500}', 62),

  ('Battle Royale', 'Drop into the iconic Fortnite island', 'https://images.igdb.com/igdb/image/upload/t_1080p/scsfyk.jpg', 'universal', 'common', 'free', '{}', 70),
  ('Overwatch Heroes', 'The heroes of Overwatch assemble', 'https://images.igdb.com/igdb/image/upload/t_original/ar2ggy.jpg', 'universal', 'common', 'free', '{}', 71),
  ('Gaming Elite', 'For the dedicated esports competitor', 'https://images.igdb.com/igdb/image/upload/t_1080p/co5vmg.jpg', 'universal', 'rare', 'xp', '{"xp": 750}', 72),
  ('Esports Legend', 'The ultimate gaming banner', 'https://images.igdb.com/igdb/image/upload/t_1080p/co1wyy.jpg', 'universal', 'legendary', 'xp', '{"xp": 5000}', 73);
