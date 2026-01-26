/*
  # Profile Customization System

  This migration creates the database schema for profile customization features
  including avatar frames, modal frames, and badges.

  1. New Tables
    - `profile_frames`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text) - Display name of the frame
      - `description` (text) - Brief description
      - `frame_type` (text) - Either 'avatar' or 'modal'
      - `style` (text) - Visual style: 'metallic', 'neon', 'elegant', 'animated'
      - `rarity` (text) - Rarity level: 'common', 'rare', 'epic', 'legendary'
      - `css_styles` (jsonb) - Custom CSS properties for the frame
      - `animation_class` (text, nullable) - CSS animation class name
      - `is_available` (boolean) - If users can currently select it
      - `is_premium` (boolean) - Placeholder for premium unlock system
      - `unlock_type` (text) - How to unlock: 'free', 'xp', 'achievement', 'premium'
      - `unlock_requirement` (jsonb) - Unlock details (e.g., {"xp": 1000})
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz) - Creation timestamp

    - `profile_badges`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text) - Display name of the badge
      - `description` (text) - Brief description
      - `badge_type` (text) - Type: 'corner', 'overlay', 'accent'
      - `position` (text) - Position: 'top-left', 'top-right', 'bottom-left', 'bottom-right'
      - `rarity` (text) - Rarity level
      - `css_styles` (jsonb) - Custom CSS properties
      - `is_available` (boolean) - If users can select it
      - `is_premium` (boolean) - Placeholder for premium system
      - `unlock_type` (text) - How to unlock
      - `unlock_requirement` (jsonb) - Unlock details
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz) - Creation timestamp

    - `user_profile_customizations`
      - `user_id` (uuid, primary key) - References users table
      - `avatar_frame_id` (uuid, nullable) - Selected avatar frame
      - `modal_frame_id` (uuid, nullable) - Selected modal frame
      - `avatar_badge_id` (uuid, nullable) - Selected avatar badge
      - `updated_at` (timestamptz) - Last update timestamp

    - `user_unlocked_items`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid) - References users table
      - `item_type` (text) - Either 'frame' or 'badge'
      - `item_id` (uuid) - ID of the unlocked item
      - `unlocked_at` (timestamptz) - When item was unlocked
      - `unlock_source` (text) - How they unlocked it

  2. Security
    - Enable RLS on all tables
    - Users can read all available frames and badges
    - Users can only manage their own customizations and unlocked items

  3. Seed Data
    - Initial collection of avatar frames (mixed styles)
    - Initial collection of modal frames
    - Initial collection of badges
*/

-- Create profile_frames table
CREATE TABLE IF NOT EXISTS profile_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  frame_type text NOT NULL CHECK (frame_type IN ('avatar', 'modal')),
  style text NOT NULL CHECK (style IN ('metallic', 'neon', 'elegant', 'animated', 'simple')),
  rarity text NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  css_styles jsonb DEFAULT '{}'::jsonb,
  animation_class text,
  is_available boolean DEFAULT true,
  is_premium boolean DEFAULT false,
  unlock_type text NOT NULL CHECK (unlock_type IN ('free', 'xp', 'achievement', 'premium')),
  unlock_requirement jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create profile_badges table
CREATE TABLE IF NOT EXISTS profile_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  badge_type text NOT NULL CHECK (badge_type IN ('corner', 'overlay', 'accent')),
  position text NOT NULL CHECK (position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right')),
  rarity text NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  css_styles jsonb DEFAULT '{}'::jsonb,
  is_available boolean DEFAULT true,
  is_premium boolean DEFAULT false,
  unlock_type text NOT NULL CHECK (unlock_type IN ('free', 'xp', 'achievement', 'premium')),
  unlock_requirement jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create user_profile_customizations table
CREATE TABLE IF NOT EXISTS user_profile_customizations (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar_frame_id uuid REFERENCES profile_frames(id) ON DELETE SET NULL,
  modal_frame_id uuid REFERENCES profile_frames(id) ON DELETE SET NULL,
  avatar_badge_id uuid REFERENCES profile_badges(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- Create user_unlocked_items table
CREATE TABLE IF NOT EXISTS user_unlocked_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('frame', 'badge')),
  item_id uuid NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  unlock_source text,
  UNIQUE(user_id, item_type, item_id)
);

-- Enable RLS on all tables
ALTER TABLE profile_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unlocked_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_frames
CREATE POLICY "Anyone can view available frames"
  ON profile_frames FOR SELECT
  USING (is_available = true);

-- RLS Policies for profile_badges
CREATE POLICY "Anyone can view available badges"
  ON profile_badges FOR SELECT
  USING (is_available = true);

-- RLS Policies for user_profile_customizations
CREATE POLICY "Users can view their own customizations"
  ON user_profile_customizations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customizations"
  ON user_profile_customizations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customizations"
  ON user_profile_customizations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view customizations for profiles"
  ON user_profile_customizations FOR SELECT
  USING (true);

-- RLS Policies for user_unlocked_items
CREATE POLICY "Users can view their own unlocked items"
  ON user_unlocked_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlocked items"
  ON user_unlocked_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profile_frames_type ON profile_frames(frame_type);
CREATE INDEX IF NOT EXISTS idx_profile_frames_rarity ON profile_frames(rarity);
CREATE INDEX IF NOT EXISTS idx_profile_badges_type ON profile_badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_items_user ON user_unlocked_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_items_item ON user_unlocked_items(item_type, item_id);

-- Seed Avatar Frames
INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, animation_class, is_available, is_premium, unlock_type, unlock_requirement, sort_order) VALUES
-- Free frames
('Default', 'A clean, simple border', 'avatar', 'simple', 'common',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "rgba(255,255,255,0.2)", "borderRadius": "16px"}'::jsonb,
  NULL, true, false, 'free', '{}'::jsonb, 1),
('Bronze Ring', 'A metallic bronze circular frame', 'avatar', 'metallic', 'common',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#CD7F32", "borderRadius": "50%", "boxShadow": "0 0 10px rgba(205, 127, 50, 0.3)"}'::jsonb,
  NULL, true, false, 'free', '{}'::jsonb, 2),
('Silver Edge', 'A sleek silver border with subtle shine', 'avatar', 'metallic', 'common',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#C0C0C0", "borderRadius": "12px", "boxShadow": "0 0 12px rgba(192, 192, 192, 0.4)"}'::jsonb,
  NULL, true, false, 'free', '{}'::jsonb, 3),

-- XP unlockable frames
('Gold Crown', 'An ornate golden frame fit for royalty', 'avatar', 'elegant', 'rare',
  '{"borderWidth": "4px", "borderStyle": "double", "borderColor": "#FFD700", "borderRadius": "14px", "boxShadow": "0 0 20px rgba(255, 215, 0, 0.5), inset 0 0 10px rgba(255, 215, 0, 0.2)"}'::jsonb,
  NULL, true, false, 'xp', '{"xp": 100}'::jsonb, 4),
('Neon Pulse', 'An animated neon glow that pulses with energy', 'avatar', 'neon', 'rare',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#00ff88", "borderRadius": "16px", "boxShadow": "0 0 15px #00ff88, 0 0 30px rgba(0, 255, 136, 0.3)"}'::jsonb,
  'animate-pulse-glow', true, false, 'xp', '{"xp": 250}'::jsonb, 5),
('Diamond Elite', 'A crystalline diamond-inspired frame', 'avatar', 'elegant', 'epic',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#b9f2ff", "borderRadius": "8px", "boxShadow": "0 0 25px rgba(185, 242, 255, 0.6), inset 0 0 15px rgba(185, 242, 255, 0.3)"}'::jsonb,
  'animate-shimmer', true, false, 'xp', '{"xp": 500}'::jsonb, 6),
('Champion''s Glory', 'An ornate golden frame with laurels', 'avatar', 'elegant', 'epic',
  '{"borderWidth": "5px", "borderStyle": "double", "borderColor": "#FFD700", "borderRadius": "50%", "boxShadow": "0 0 30px rgba(255, 215, 0, 0.7), 0 0 60px rgba(255, 215, 0, 0.3)"}'::jsonb,
  'animate-shimmer', true, false, 'xp', '{"xp": 1000}'::jsonb, 7),

-- Premium placeholder frames
('Legendary Flame', 'An animated fire border that burns with passion', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#ff6b35", "borderRadius": "16px", "boxShadow": "0 0 30px rgba(255, 107, 53, 0.8), 0 0 60px rgba(255, 69, 0, 0.4)"}'::jsonb,
  'animate-flame', false, true, 'premium', '{"premium": true}'::jsonb, 8),
('Void Master', 'Dark animated particles swirl around your avatar', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#1a1a2e", "borderRadius": "16px", "boxShadow": "0 0 30px rgba(138, 43, 226, 0.6), 0 0 60px rgba(75, 0, 130, 0.4)"}'::jsonb,
  'animate-void', false, true, 'premium', '{"premium": true}'::jsonb, 9);

-- Seed Modal Frames
INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, animation_class, is_available, is_premium, unlock_type, unlock_requirement, sort_order) VALUES
-- Free frames
('Default', 'Standard modal border', 'modal', 'simple', 'common',
  '{"borderWidth": "1px", "borderStyle": "solid", "borderColor": "rgba(75, 85, 99, 0.5)", "borderRadius": "16px"}'::jsonb,
  NULL, true, false, 'free', '{}'::jsonb, 1),
('Bronze Accent', 'Subtle bronze corner accents', 'modal', 'metallic', 'common',
  '{"borderWidth": "2px", "borderStyle": "solid", "borderColor": "#CD7F32", "borderRadius": "12px", "boxShadow": "0 0 15px rgba(205, 127, 50, 0.2)"}'::jsonb,
  NULL, true, false, 'free', '{}'::jsonb, 2),
('Silver Frame', 'A clean metallic outline', 'modal', 'metallic', 'common',
  '{"borderWidth": "2px", "borderStyle": "solid", "borderColor": "#C0C0C0", "borderRadius": "14px", "boxShadow": "0 0 15px rgba(192, 192, 192, 0.25)"}'::jsonb,
  NULL, true, false, 'free', '{}'::jsonb, 3),

-- XP unlockable frames
('Gold Trim', 'An elegant golden border', 'modal', 'elegant', 'rare',
  '{"borderWidth": "2px", "borderStyle": "solid", "borderColor": "#FFD700", "borderRadius": "16px", "boxShadow": "0 0 20px rgba(255, 215, 0, 0.3)"}'::jsonb,
  NULL, true, false, 'xp', '{"xp": 200}'::jsonb, 4),
('Neon Edge', 'A glowing colored border', 'modal', 'neon', 'rare',
  '{"borderWidth": "2px", "borderStyle": "solid", "borderColor": "#00ff88", "borderRadius": "16px", "boxShadow": "0 0 20px rgba(0, 255, 136, 0.4)"}'::jsonb,
  'animate-pulse-glow', true, false, 'xp', '{"xp": 400}'::jsonb, 5),
('Diamond Prestige', 'Sparkling border effects', 'modal', 'elegant', 'epic',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#b9f2ff", "borderRadius": "16px", "boxShadow": "0 0 30px rgba(185, 242, 255, 0.5)"}'::jsonb,
  'animate-shimmer', true, false, 'xp', '{"xp": 800}'::jsonb, 6),
('Royal Crest', 'An ornate top banner decoration', 'modal', 'elegant', 'epic',
  '{"borderWidth": "3px", "borderStyle": "double", "borderColor": "#FFD700", "borderRadius": "16px", "boxShadow": "0 0 30px rgba(255, 215, 0, 0.4)"}'::jsonb,
  'animate-shimmer', true, false, 'xp', '{"xp": 1200}'::jsonb, 7),

-- Premium placeholder frames
('Inferno Blaze', 'Animated ember border that flickers', 'modal', 'animated', 'legendary',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#ff6b35", "borderRadius": "16px", "boxShadow": "0 0 40px rgba(255, 107, 53, 0.6)"}'::jsonb,
  'animate-flame', false, true, 'premium', '{"premium": true}'::jsonb, 8),
('Cosmic Aura', 'Space-themed particle effects', 'modal', 'animated', 'legendary',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#8b5cf6", "borderRadius": "16px", "boxShadow": "0 0 40px rgba(139, 92, 246, 0.5)"}'::jsonb,
  'animate-cosmic', false, true, 'premium', '{"premium": true}'::jsonb, 9);

-- Seed Badges
INSERT INTO profile_badges (name, description, badge_type, position, rarity, css_styles, is_available, is_premium, unlock_type, unlock_requirement, sort_order) VALUES
-- Free badges
('Star Player', 'A small star icon showing dedication', 'corner', 'bottom-right', 'common',
  '{"icon": "star", "color": "#FFD700", "size": "20px"}'::jsonb,
  true, false, 'free', '{}'::jsonb, 1),
('Verified', 'A checkmark badge for verified players', 'corner', 'bottom-right', 'common',
  '{"icon": "check-circle", "color": "#00ff88", "size": "20px"}'::jsonb,
  true, false, 'free', '{}'::jsonb, 2),

-- XP unlockable badges
('Rising Star', 'An ascending star for promising players', 'corner', 'bottom-right', 'rare',
  '{"icon": "trending-up", "color": "#3b82f6", "size": "22px", "glow": true}'::jsonb,
  true, false, 'xp', '{"xp": 100}'::jsonb, 3),
('Elite Gamer', 'A crown icon for elite players', 'corner', 'bottom-right', 'epic',
  '{"icon": "crown", "color": "#FFD700", "size": "24px", "glow": true}'::jsonb,
  true, false, 'xp', '{"xp": 500}'::jsonb, 4),

-- Achievement placeholder badges
('Tournament Victor', 'Trophy icon for tournament winners', 'corner', 'bottom-right', 'epic',
  '{"icon": "trophy", "color": "#FFD700", "size": "24px", "glow": true}'::jsonb,
  false, false, 'achievement', '{"achievement": "win_tournament"}'::jsonb, 5),

-- Premium placeholder badges
('Legend', 'An animated legendary emblem', 'corner', 'bottom-right', 'legendary',
  '{"icon": "flame", "color": "#ff6b35", "size": "26px", "animated": true, "glow": true}'::jsonb,
  false, true, 'premium', '{"premium": true}'::jsonb, 6);
