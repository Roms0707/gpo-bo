/*
  # Profile Avatars System

  This migration creates the database schema for esports-themed preset avatars
  with XP-based unlocking system.

  1. New Tables
    - `profile_avatars`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text) - Display name of the avatar
      - `description` (text) - Brief description
      - `image_url` (text) - URL to the avatar image
      - `game_affinity` (text) - Game theme: 'lol', 'warzone', 'valorant', 'cs2', 'apex', 'rocket_league', 'universal'
      - `rarity` (text) - Rarity level: 'common', 'rare', 'epic', 'legendary'
      - `unlock_type` (text) - How to unlock: 'free', 'xp'
      - `unlock_requirement` (jsonb) - Unlock details (e.g., {"xp": 1000})
      - `sort_order` (integer) - Display order
      - `is_available` (boolean) - If users can currently select it
      - `created_at` (timestamptz) - Creation timestamp

  2. Schema Updates
    - Add `selected_avatar_id` to `user_profile_customizations` table
    - Add `use_preset_avatar` boolean toggle to `user_profile_customizations` table
    - Update `user_unlocked_items` to support 'avatar' item type

  3. Security
    - Enable RLS on profile_avatars table
    - Anyone can view available avatars
    - Authenticated users can select avatars

  4. Initial Data
    - 30 esports-themed avatars across 6 game collections
    - XP requirements: Common (free), Rare (500-1500), Epic (3000-5000), Legendary (12000-20000)
*/

-- Create profile_avatars table
CREATE TABLE IF NOT EXISTS profile_avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text NOT NULL,
  game_affinity text NOT NULL CHECK (game_affinity IN ('lol', 'warzone', 'valorant', 'cs2', 'apex', 'rocket_league', 'universal')),
  rarity text NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  unlock_type text NOT NULL CHECK (unlock_type IN ('free', 'xp')),
  unlock_requirement jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add avatar columns to user_profile_customizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_customizations' AND column_name = 'selected_avatar_id'
  ) THEN
    ALTER TABLE user_profile_customizations ADD COLUMN selected_avatar_id uuid REFERENCES profile_avatars(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_customizations' AND column_name = 'use_preset_avatar'
  ) THEN
    ALTER TABLE user_profile_customizations ADD COLUMN use_preset_avatar boolean DEFAULT false;
  END IF;
END $$;

-- Update user_unlocked_items check constraint to include 'avatar' type
ALTER TABLE user_unlocked_items DROP CONSTRAINT IF EXISTS user_unlocked_items_item_type_check;
ALTER TABLE user_unlocked_items ADD CONSTRAINT user_unlocked_items_item_type_check 
  CHECK (item_type IN ('frame', 'badge', 'avatar'));

-- Enable RLS on profile_avatars
ALTER TABLE profile_avatars ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_avatars
CREATE POLICY "Anyone can view available avatars"
  ON profile_avatars FOR SELECT
  USING (is_available = true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profile_avatars_game_affinity ON profile_avatars(game_affinity);
CREATE INDEX IF NOT EXISTS idx_profile_avatars_rarity ON profile_avatars(rarity);
CREATE INDEX IF NOT EXISTS idx_profile_avatars_sort_order ON profile_avatars(sort_order);
