/*
  # MagicUI Profile Frame System Overhaul
  
  This migration completely replaces the existing profile customization system
  with a new MagicUI-powered effect system featuring animated borders, 
  shine effects, particles, and meteors.

  1. Schema Changes
    - Add `magicui_effects` (jsonb) column to profile_frames for effect configurations
    - Add `effect_intensity` (text) column to profile_frames
    - Add `magicui_effects` (jsonb) column to profile_badges for effect configurations
    - Add `effect_intensity` (text) column to profile_badges

  2. Data Changes
    - Delete all existing profile frames
    - Delete all existing profile badges
    - Reset user customizations (set frame/badge selections to NULL)
    - Delete all user unlocked items
    - Insert new MagicUI-powered avatar frames (18 total)
    - Insert new MagicUI-powered modal frames (13 total)
    - Insert new MagicUI-powered badges (10 total)

  3. New Frame Tiers
    - Common (Free): 3 avatar frames, 2 modal frames, 2 badges
    - Rare (5,000-15,000 XP): 4 avatar frames, 3 modal frames, 3 badges
    - Epic (25,000-50,000 XP): 5 avatar frames, 4 modal frames, 3 badges
    - Legendary (75,000-150,000 XP): 6 avatar frames, 4 modal frames, 2 badges

  4. Effect Types
    - border-beam: Animated light beam traveling along border
    - shine-border: Rotating gradient shine effect
    - particles: Floating particle effects
    - meteors: Animated meteor shower effects
    - Combined effects for higher tier items

  5. Security
    - Existing RLS policies remain in place
    - All new frames are available for selection
*/

-- Add magicui_effects column to profile_frames
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profile_frames' AND column_name = 'magicui_effects'
  ) THEN
    ALTER TABLE profile_frames ADD COLUMN magicui_effects jsonb DEFAULT '[]'::jsonb

  END IF

END $$


-- Add effect_intensity column to profile_frames
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profile_frames' AND column_name = 'effect_intensity'
  ) THEN
    ALTER TABLE profile_frames ADD COLUMN effect_intensity text DEFAULT 'medium' CHECK (effect_intensity IN ('subtle', 'medium', 'intense'))

  END IF

END $$


-- Add magicui_effects column to profile_badges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profile_badges' AND column_name = 'magicui_effects'
  ) THEN
    ALTER TABLE profile_badges ADD COLUMN magicui_effects jsonb DEFAULT '[]'::jsonb

  END IF

END $$


-- Add effect_intensity column to profile_badges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profile_badges' AND column_name = 'effect_intensity'
  ) THEN
    ALTER TABLE profile_badges ADD COLUMN effect_intensity text DEFAULT 'medium' CHECK (effect_intensity IN ('subtle', 'medium', 'intense'))

  END IF

END $$


-- Reset user customizations to avoid foreign key violations
UPDATE user_profile_customizations SET avatar_frame_id = NULL, modal_frame_id = NULL, avatar_badge_id = NULL


-- Delete all user unlocked items
DELETE FROM user_unlocked_items WHERE item_type IN ('frame', 'badge')


-- Delete all existing frames
DELETE FROM profile_frames


-- Delete all existing badges
DELETE FROM profile_badges


-- ============================================
-- AVATAR FRAMES - COMMON TIER (Free)
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, magicui_effects, effect_intensity, is_available, unlock_type, unlock_requirement, sort_order, collection) VALUES
-- Basic Glow - Simple Shine Border
('Basic Glow', 'A subtle white glow around your avatar', 'avatar', 'simple', 'common',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "rgba(255,255,255,0.3)", "borderRadius": "16px"}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#ffffff", "#e5e5e5"], "duration": 16, "borderWidth": 2}]'::jsonb,
  'subtle', true, 'free', '{}'::jsonb, 1, 'default'),

-- Starter Beam - Single Border Beam
('Starter Beam', 'A teal energy beam orbits your avatar', 'avatar', 'neon', 'common',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#14b8a6", "borderRadius": "16px"}'::jsonb,
  '[{"type": "border-beam", "size": 60, "duration": 8, "colorFrom": "#14b8a6", "colorTo": "#06b6d4", "borderWidth": 2}]'::jsonb,
  'subtle', true, 'free', '{}'::jsonb, 2, 'default'),

-- Soft Pulse - Shine Border with gentle pulse
('Soft Pulse', 'A gentle pulsing glow in neutral tones', 'avatar', 'elegant', 'common',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#a3a3a3", "borderRadius": "16px"}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#d4d4d4", "#a3a3a3", "#737373"], "duration": 12, "borderWidth": 2}]'::jsonb,
  'subtle', true, 'free', '{}'::jsonb, 3, 'default')


-- ============================================
-- AVATAR FRAMES - RARE TIER (5,000 - 15,000 XP)
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, magicui_effects, effect_intensity, is_available, unlock_type, unlock_requirement, sort_order, collection) VALUES
-- Neon Circuit - Border Beam cyan/green
('Neon Circuit', 'Electric cyan energy pulses through digital circuits', 'avatar', 'tech', 'rare',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#22d3ee", "borderRadius": "12px", "boxShadow": "0 0 15px rgba(34, 211, 238, 0.4)"}'::jsonb,
  '[{"type": "border-beam", "size": 70, "duration": 5, "colorFrom": "#22d3ee", "colorTo": "#34d399", "borderWidth": 2}]'::jsonb,
  'medium', true, 'xp', '{"xp": 5000}'::jsonb, 10, 'default'),

-- Rose Gold - Shine Border pink/gold
('Rose Gold', 'Elegant rose gold shimmer for a premium look', 'avatar', 'elegant', 'rare',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#f472b6", "borderRadius": "16px", "boxShadow": "0 0 15px rgba(244, 114, 182, 0.3)"}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#f472b6", "#fbbf24", "#f472b6"], "duration": 10, "borderWidth": 2}]'::jsonb,
  'medium', true, 'xp', '{"xp": 8000}'::jsonb, 11, 'default'),

-- Ocean Drift - Border Beam blue tones
('Ocean Drift', 'Deep ocean currents flow around your avatar', 'avatar', 'elemental', 'rare',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#0ea5e9", "borderRadius": "50%", "boxShadow": "0 0 18px rgba(14, 165, 233, 0.4)"}'::jsonb,
  '[{"type": "border-beam", "size": 80, "duration": 7, "colorFrom": "#0ea5e9", "colorTo": "#6366f1", "borderWidth": 2}]'::jsonb,
  'medium', true, 'xp', '{"xp": 10000}'::jsonb, 12, 'default'),

-- Ember Spark - Shine Border orange/red
('Ember Spark', 'Warm ember glow like a dying fire', 'avatar', 'elemental', 'rare',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#f97316", "borderRadius": "14px", "boxShadow": "0 0 18px rgba(249, 115, 22, 0.4)"}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#f97316", "#ef4444", "#fbbf24"], "duration": 8, "borderWidth": 2}]'::jsonb,
  'medium', true, 'xp', '{"xp": 15000}'::jsonb, 13, 'default')


-- ============================================
-- AVATAR FRAMES - EPIC TIER (25,000 - 50,000 XP)
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, magicui_effects, effect_intensity, is_available, unlock_type, unlock_requirement, sort_order, collection) VALUES
-- Plasma Core - Border Beam + Particles
('Plasma Core', 'High-energy plasma containment field', 'avatar', 'tech', 'epic',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#3b82f6", "borderRadius": "14px", "boxShadow": "0 0 25px rgba(59, 130, 246, 0.5)"}'::jsonb,
  '[{"type": "border-beam", "size": 80, "duration": 4, "colorFrom": "#3b82f6", "colorTo": "#8b5cf6", "borderWidth": 2}, {"type": "particles", "quantity": 25, "color": "#60a5fa", "size": 0.6}]'::jsonb,
  'medium', true, 'xp', '{"xp": 25000}'::jsonb, 20, 'default'),

-- Phoenix Rising - Shine Border + Particles fire colors
('Phoenix Rising', 'Rise from the ashes in blazing glory', 'avatar', 'animated', 'epic',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#f97316", "borderRadius": "16px", "boxShadow": "0 0 25px rgba(249, 115, 22, 0.5)"}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#f97316", "#ef4444", "#fbbf24"], "duration": 6, "borderWidth": 2}, {"type": "particles", "quantity": 20, "color": "#fbbf24", "size": 0.5, "vy": -0.2}]'::jsonb,
  'medium', true, 'xp', '{"xp": 30000}'::jsonb, 21, 'default'),

-- Frost Sentinel - Border Beam reverse + Particles ice
('Frost Sentinel', 'Ancient ice guardian protection', 'avatar', 'elemental', 'epic',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#67e8f9", "borderRadius": "12px", "boxShadow": "0 0 25px rgba(103, 232, 249, 0.5)"}'::jsonb,
  '[{"type": "border-beam", "size": 70, "duration": 5, "colorFrom": "#67e8f9", "colorTo": "#ffffff", "borderWidth": 2, "reverse": true}, {"type": "particles", "quantity": 30, "color": "#e0f2fe", "size": 0.4}]'::jsonb,
  'medium', true, 'xp', '{"xp": 35000}'::jsonb, 22, 'default'),

-- Toxic Venom - Shine Border + Particles green
('Toxic Venom', 'Corrosive acid drips with deadly beauty', 'avatar', 'gothic', 'epic',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#84cc16", "borderRadius": "14px", "boxShadow": "0 0 25px rgba(132, 204, 22, 0.5)"}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#84cc16", "#22c55e", "#a3e635"], "duration": 7, "borderWidth": 2}, {"type": "particles", "quantity": 25, "color": "#bef264", "size": 0.5}]'::jsonb,
  'medium', true, 'xp', '{"xp": 40000}'::jsonb, 23, 'default'),

-- Storm Bringer - Dual Border Beams
('Storm Bringer', 'Harness the power of lightning itself', 'avatar', 'elemental', 'epic',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#fbbf24", "borderRadius": "50%", "boxShadow": "0 0 30px rgba(251, 191, 36, 0.5)"}'::jsonb,
  '[{"type": "border-beam", "size": 60, "duration": 3, "colorFrom": "#fbbf24", "colorTo": "#ffffff", "borderWidth": 2}, {"type": "border-beam", "size": 60, "duration": 3, "delay": 1.5, "colorFrom": "#ffffff", "colorTo": "#fbbf24", "borderWidth": 2, "reverse": true}]'::jsonb,
  'intense', true, 'xp', '{"xp": 50000}'::jsonb, 24, 'default')


-- ============================================
-- AVATAR FRAMES - LEGENDARY TIER (75,000 - 150,000 XP)
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, magicui_effects, effect_intensity, is_available, unlock_type, unlock_requirement, sort_order, collection) VALUES
-- Cosmic Emperor - Border Beam + Shine Border + Particles
('Cosmic Emperor', 'Rule over the stars themselves', 'avatar', 'cosmic', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#6366f1", "borderRadius": "50%", "boxShadow": "0 0 35px rgba(99, 102, 241, 0.6)"}'::jsonb,
  '[{"type": "border-beam", "size": 80, "duration": 4, "colorFrom": "#6366f1", "colorTo": "#ec4899", "borderWidth": 2}, {"type": "shine-border", "shineColor": ["#6366f1", "#8b5cf6", "#ec4899"], "duration": 8, "borderWidth": 1}, {"type": "particles", "quantity": 35, "color": "#c4b5fd", "size": 0.5}]'::jsonb,
  'intense', true, 'xp', '{"xp": 75000}'::jsonb, 30, 'default'),

-- Inferno Overlord - Shine Border + Meteors + Particles
('Inferno Overlord', 'Command the flames of destruction', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#dc2626", "borderRadius": "14px", "boxShadow": "0 0 35px rgba(220, 38, 38, 0.6)"}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#dc2626", "#f97316", "#fbbf24"], "duration": 5, "borderWidth": 2}, {"type": "meteors", "number": 8, "color": "#fbbf24", "minDuration": 2, "maxDuration": 5}, {"type": "particles", "quantity": 30, "color": "#fed7aa", "size": 0.5, "vy": -0.15}]'::jsonb,
  'intense', true, 'xp', '{"xp": 90000}'::jsonb, 31, 'default'),

-- Diamond Sovereign - Triple Border Beam + Particles
('Diamond Sovereign', 'Brilliance beyond measure', 'avatar', 'elegant', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#f0f9ff", "borderRadius": "16px", "boxShadow": "0 0 40px rgba(240, 249, 255, 0.7)"}'::jsonb,
  '[{"type": "border-beam", "size": 50, "duration": 3, "colorFrom": "#f0f9ff", "colorTo": "#bae6fd", "borderWidth": 2}, {"type": "border-beam", "size": 50, "duration": 3, "delay": 1, "colorFrom": "#bae6fd", "colorTo": "#7dd3fc", "borderWidth": 2}, {"type": "border-beam", "size": 50, "duration": 3, "delay": 2, "colorFrom": "#7dd3fc", "colorTo": "#f0f9ff", "borderWidth": 2}, {"type": "particles", "quantity": 40, "color": "#ffffff", "size": 0.4}]'::jsonb,
  'intense', true, 'xp', '{"xp": 100000}'::jsonb, 32, 'default'),

-- Void Reaper - Reverse Border Beam + Dark Particles + Meteors
('Void Reaper', 'Consume all light and hope', 'avatar', 'gothic', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#1e1b4b", "borderRadius": "14px", "boxShadow": "0 0 35px rgba(30, 27, 75, 0.8)"}'::jsonb,
  '[{"type": "border-beam", "size": 70, "duration": 5, "colorFrom": "#4c1d95", "colorTo": "#1e1b4b", "borderWidth": 2, "reverse": true}, {"type": "particles", "quantity": 25, "color": "#7c3aed", "size": 0.6}, {"type": "meteors", "number": 6, "color": "#4c1d95", "angle": 225, "minDuration": 3, "maxDuration": 6}]'::jsonb,
  'intense', true, 'xp', '{"xp": 120000}'::jsonb, 33, 'default'),

-- Solar Deity - Shine Border + Meteors + Particles golden
('Solar Deity', 'The sun itself bows to your radiance', 'avatar', 'cosmic', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#fbbf24", "borderRadius": "50%", "boxShadow": "0 0 45px rgba(251, 191, 36, 0.7)"}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#fbbf24", "#ffffff", "#f97316"], "duration": 6, "borderWidth": 2}, {"type": "meteors", "number": 10, "color": "#fef3c7", "minDuration": 1.5, "maxDuration": 4}, {"type": "particles", "quantity": 35, "color": "#fef08a", "size": 0.5}]'::jsonb,
  'intense', true, 'xp', '{"xp": 135000}'::jsonb, 34, 'default'),

-- Nexus Prime - All effects combined
('Nexus Prime', 'The ultimate power at the center of all realities', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "6px", "borderStyle": "solid", "borderColor": "#ffffff", "borderRadius": "50%", "boxShadow": "0 0 50px rgba(255, 255, 255, 0.6)"}'::jsonb,
  '[{"type": "border-beam", "size": 60, "duration": 3, "colorFrom": "#ec4899", "colorTo": "#8b5cf6", "borderWidth": 2}, {"type": "border-beam", "size": 60, "duration": 3, "delay": 1.5, "colorFrom": "#3b82f6", "colorTo": "#22d3ee", "borderWidth": 2, "reverse": true}, {"type": "shine-border", "shineColor": ["#ec4899", "#8b5cf6", "#3b82f6", "#22d3ee", "#10b981"], "duration": 10, "borderWidth": 1}, {"type": "particles", "quantity": 45, "color": "#ffffff", "size": 0.5}, {"type": "meteors", "number": 8, "color": "#c4b5fd", "minDuration": 2, "maxDuration": 5}]'::jsonb,
  'intense', true, 'xp', '{"xp": 150000}'::jsonb, 35, 'default')


-- ============================================
-- MODAL FRAMES - COMMON TIER (Free)
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, magicui_effects, effect_intensity, is_available, unlock_type, unlock_requirement, sort_order, collection) VALUES
-- Clean Edge - Subtle Border Beam
('Clean Edge', 'A minimal animated border', 'modal', 'simple', 'common',
  '{"borderWidth": "1px", "borderStyle": "solid", "borderColor": "rgba(75, 85, 99, 0.5)", "borderRadius": "16px"}'::jsonb,
  '[{"type": "border-beam", "size": 120, "duration": 10, "colorFrom": "#6b7280", "colorTo": "#9ca3af", "borderWidth": 1}]'::jsonb,
  'subtle', true, 'free', '{}'::jsonb, 50, 'default'),

-- Soft Glow Modal - Light Shine Border
('Soft Glow', 'A gentle ambient glow', 'modal', 'elegant', 'common',
  '{"borderWidth": "1px", "borderStyle": "solid", "borderColor": "rgba(255,255,255,0.2)", "borderRadius": "16px"}'::jsonb,
  '[{"type": "shine-border", "shineColor": "#d4d4d4", "duration": 18, "borderWidth": 1}]'::jsonb,
  'subtle', true, 'free', '{}'::jsonb, 51, 'default')


-- ============================================
-- MODAL FRAMES - RARE TIER
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, magicui_effects, effect_intensity, is_available, unlock_type, unlock_requirement, sort_order, collection) VALUES
-- Accent Line - Border Beam with color
('Accent Line', 'A colored energy line traces your profile', 'modal', 'neon', 'rare',
  '{"borderWidth": "2px", "borderStyle": "solid", "borderColor": "#14b8a6", "borderRadius": "16px", "boxShadow": "0 0 15px rgba(20, 184, 166, 0.3)"}'::jsonb,
  '[{"type": "border-beam", "size": 150, "duration": 7, "colorFrom": "#14b8a6", "colorTo": "#06b6d4", "borderWidth": 2}]'::jsonb,
  'medium', true, 'xp', '{"xp": 7000}'::jsonb, 55, 'default'),

-- Gradient Flow - Shine Border smooth gradient
('Gradient Flow', 'Smooth gradient animation around your profile', 'modal', 'elegant', 'rare',
  '{"borderWidth": "2px", "borderStyle": "solid", "borderColor": "#f472b6", "borderRadius": "16px", "boxShadow": "0 0 15px rgba(244, 114, 182, 0.3)"}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#f472b6", "#c084fc", "#60a5fa"], "duration": 12, "borderWidth": 2}]'::jsonb,
  'medium', true, 'xp', '{"xp": 12000}'::jsonb, 56, 'default'),

-- Corner Spark - Border Beam focused corners
('Corner Spark', 'Energy sparks at the corners', 'modal', 'tech', 'rare',
  '{"borderWidth": "2px", "borderStyle": "solid", "borderColor": "#fbbf24", "borderRadius": "12px", "boxShadow": "0 0 15px rgba(251, 191, 36, 0.3)"}'::jsonb,
  '[{"type": "border-beam", "size": 80, "duration": 4, "colorFrom": "#fbbf24", "colorTo": "#f97316", "borderWidth": 2}]'::jsonb,
  'medium', true, 'xp', '{"xp": 18000}'::jsonb, 57, 'default')


-- ============================================
-- MODAL FRAMES - EPIC TIER
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, magicui_effects, effect_intensity, is_available, unlock_type, unlock_requirement, sort_order, collection) VALUES
-- Energy Field - Border Beam + Particles
('Energy Field', 'A protective energy field surrounds your profile', 'modal', 'tech', 'epic',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#3b82f6", "borderRadius": "16px", "boxShadow": "0 0 25px rgba(59, 130, 246, 0.4)"}'::jsonb,
  '[{"type": "border-beam", "size": 120, "duration": 5, "colorFrom": "#3b82f6", "colorTo": "#6366f1", "borderWidth": 2}, {"type": "particles", "quantity": 40, "color": "#93c5fd", "size": 0.4}]'::jsonb,
  'medium', true, 'xp', '{"xp": 30000}'::jsonb, 60, 'default'),

-- Flame Border - Shine Border + Meteors fire
('Flame Border', 'Fire dances at the edges', 'modal', 'elemental', 'epic',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#f97316", "borderRadius": "14px", "boxShadow": "0 0 25px rgba(249, 115, 22, 0.4)"}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#f97316", "#ef4444", "#fbbf24"], "duration": 8, "borderWidth": 2}, {"type": "meteors", "number": 10, "color": "#fed7aa", "minDuration": 3, "maxDuration": 7}]'::jsonb,
  'medium', true, 'xp', '{"xp": 40000}'::jsonb, 61, 'default'),

-- Ice Fortress - Border Beam + Particles frost
('Ice Fortress', 'An impenetrable wall of ice', 'modal', 'elemental', 'epic',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#67e8f9", "borderRadius": "16px", "boxShadow": "0 0 25px rgba(103, 232, 249, 0.4)"}'::jsonb,
  '[{"type": "border-beam", "size": 100, "duration": 6, "colorFrom": "#67e8f9", "colorTo": "#e0f2fe", "borderWidth": 2, "reverse": true}, {"type": "particles", "quantity": 50, "color": "#ffffff", "size": 0.3}]'::jsonb,
  'medium', true, 'xp', '{"xp": 50000}'::jsonb, 62, 'default'),

-- Electric Surge - Dual Border Beams electric
('Electric Surge', 'Raw electrical power crackles around you', 'modal', 'tech', 'epic',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#fbbf24", "borderRadius": "14px", "boxShadow": "0 0 30px rgba(251, 191, 36, 0.5)"}'::jsonb,
  '[{"type": "border-beam", "size": 100, "duration": 3, "colorFrom": "#fbbf24", "colorTo": "#ffffff", "borderWidth": 2}, {"type": "border-beam", "size": 100, "duration": 3, "delay": 1.5, "colorFrom": "#ffffff", "colorTo": "#fbbf24", "borderWidth": 2, "reverse": true}]'::jsonb,
  'intense', true, 'xp', '{"xp": 60000}'::jsonb, 63, 'default')


-- ============================================
-- MODAL FRAMES - LEGENDARY TIER
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, magicui_effects, effect_intensity, is_available, unlock_type, unlock_requirement, sort_order, collection) VALUES
-- Galactic Portal - All effects cosmic
('Galactic Portal', 'A window into the cosmos', 'modal', 'cosmic', 'legendary',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#6366f1", "borderRadius": "16px", "boxShadow": "0 0 40px rgba(99, 102, 241, 0.5)"}'::jsonb,
  '[{"type": "border-beam", "size": 120, "duration": 4, "colorFrom": "#6366f1", "colorTo": "#ec4899", "borderWidth": 2}, {"type": "shine-border", "shineColor": ["#6366f1", "#8b5cf6", "#ec4899", "#f472b6"], "duration": 10, "borderWidth": 1}, {"type": "particles", "quantity": 60, "color": "#c4b5fd", "size": 0.4}, {"type": "meteors", "number": 8, "color": "#a5b4fc", "minDuration": 3, "maxDuration": 6}]'::jsonb,
  'intense', true, 'xp', '{"xp": 80000}'::jsonb, 70, 'default'),

-- Dragon Lair - Shine Border + Meteors + Particles fire/gold
('Dragon''s Lair', 'The treasure hoard of legends', 'modal', 'animated', 'legendary',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#f97316", "borderRadius": "14px", "boxShadow": "0 0 40px rgba(249, 115, 22, 0.5)"}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#f97316", "#fbbf24", "#dc2626"], "duration": 6, "borderWidth": 2}, {"type": "meteors", "number": 12, "color": "#fef3c7", "minDuration": 2, "maxDuration": 5}, {"type": "particles", "quantity": 45, "color": "#fbbf24", "size": 0.5}]'::jsonb,
  'intense', true, 'xp', '{"xp": 100000}'::jsonb, 71, 'default'),

-- Crystal Palace - Triple Border Beam + Particles prismatic
('Crystal Palace', 'Prismatic light refracts through crystal walls', 'modal', 'elegant', 'legendary',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#f0f9ff", "borderRadius": "16px", "boxShadow": "0 0 45px rgba(240, 249, 255, 0.6)"}'::jsonb,
  '[{"type": "border-beam", "size": 80, "duration": 3, "colorFrom": "#f0f9ff", "colorTo": "#bae6fd", "borderWidth": 2}, {"type": "border-beam", "size": 80, "duration": 3, "delay": 1, "colorFrom": "#c4b5fd", "colorTo": "#fbcfe8", "borderWidth": 2}, {"type": "border-beam", "size": 80, "duration": 3, "delay": 2, "colorFrom": "#bbf7d0", "colorTo": "#fef08a", "borderWidth": 2}, {"type": "particles", "quantity": 70, "color": "#ffffff", "size": 0.35}]'::jsonb,
  'intense', true, 'xp', '{"xp": 120000}'::jsonb, 72, 'default'),

-- Shadow Realm - Dark effects reverse beams
('Shadow Realm', 'Where light goes to die', 'modal', 'gothic', 'legendary',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#1e1b4b", "borderRadius": "14px", "boxShadow": "0 0 40px rgba(30, 27, 75, 0.7)"}'::jsonb,
  '[{"type": "border-beam", "size": 100, "duration": 5, "colorFrom": "#4c1d95", "colorTo": "#0f172a", "borderWidth": 2, "reverse": true}, {"type": "shine-border", "shineColor": ["#1e1b4b", "#4c1d95", "#312e81"], "duration": 12, "borderWidth": 1}, {"type": "particles", "quantity": 40, "color": "#6366f1", "size": 0.5}, {"type": "meteors", "number": 6, "color": "#312e81", "angle": 225, "minDuration": 4, "maxDuration": 8}]'::jsonb,
  'intense', true, 'xp', '{"xp": 140000}'::jsonb, 73, 'default')


-- ============================================
-- BADGES - COMMON TIER (Free)
-- ============================================

INSERT INTO profile_badges (name, description, badge_type, position, rarity, css_styles, magicui_effects, effect_intensity, is_available, unlock_type, unlock_requirement, sort_order) VALUES
-- Newcomer Star
('Newcomer Star', 'Welcome to the arena', 'corner', 'bottom-right', 'common',
  '{"icon": "star", "color": "#fbbf24", "size": "20px"}'::jsonb,
  '[{"type": "shine-border", "shineColor": "#fbbf24", "duration": 16, "borderWidth": 1}]'::jsonb,
  'subtle', true, 'free', '{}'::jsonb, 1),

-- Active Player
('Active Player', 'You show up and play', 'corner', 'bottom-right', 'common',
  '{"icon": "check-circle", "color": "#22c55e", "size": "20px"}'::jsonb,
  '[{"type": "border-beam", "size": 30, "duration": 6, "colorFrom": "#22c55e", "colorTo": "#4ade80", "borderWidth": 1}]'::jsonb,
  'subtle', true, 'free', '{}'::jsonb, 2)


-- ============================================
-- BADGES - RARE TIER
-- ============================================

INSERT INTO profile_badges (name, description, badge_type, position, rarity, css_styles, magicui_effects, effect_intensity, is_available, unlock_type, unlock_requirement, sort_order) VALUES
-- Rising Star
('Rising Star', 'On the path to greatness', 'corner', 'bottom-right', 'rare',
  '{"icon": "trending-up", "color": "#3b82f6", "size": "22px", "glow": true}'::jsonb,
  '[{"type": "border-beam", "size": 35, "duration": 4, "colorFrom": "#3b82f6", "colorTo": "#60a5fa", "borderWidth": 1}]'::jsonb,
  'medium', true, 'xp', '{"xp": 10000}'::jsonb, 10),

-- Veteran
('Veteran', 'Battle-hardened competitor', 'corner', 'bottom-right', 'rare',
  '{"icon": "trophy", "color": "#fbbf24", "size": "22px", "glow": true}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#fbbf24", "#f97316"], "duration": 8, "borderWidth": 1}]'::jsonb,
  'medium', true, 'xp', '{"xp": 20000}'::jsonb, 11),

-- Hot Streak
('Hot Streak', 'On fire right now', 'corner', 'bottom-right', 'rare',
  '{"icon": "flame", "color": "#f97316", "size": "22px", "glow": true}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#f97316", "#ef4444", "#fbbf24"], "duration": 6, "borderWidth": 1}, {"type": "particles", "quantity": 8, "color": "#fbbf24", "size": 0.4, "vy": -0.1}]'::jsonb,
  'medium', true, 'xp', '{"xp": 30000}'::jsonb, 12)


-- ============================================
-- BADGES - EPIC TIER
-- ============================================

INSERT INTO profile_badges (name, description, badge_type, position, rarity, css_styles, magicui_effects, effect_intensity, is_available, unlock_type, unlock_requirement, sort_order) VALUES
-- Elite
('Elite', 'Among the best', 'corner', 'bottom-right', 'epic',
  '{"icon": "crown", "color": "#a855f7", "size": "24px", "glow": true}'::jsonb,
  '[{"type": "border-beam", "size": 40, "duration": 3, "colorFrom": "#a855f7", "colorTo": "#c084fc", "borderWidth": 1}, {"type": "particles", "quantity": 10, "color": "#e9d5ff", "size": 0.4}]'::jsonb,
  'medium', true, 'xp', '{"xp": 50000}'::jsonb, 20),

-- Champion
('Champion', 'Tournament victor', 'corner', 'bottom-right', 'epic',
  '{"icon": "trophy", "color": "#fbbf24", "size": "24px", "glow": true}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#fbbf24", "#f59e0b", "#d97706"], "duration": 5, "borderWidth": 1}, {"type": "particles", "quantity": 12, "color": "#fef3c7", "size": 0.35}]'::jsonb,
  'medium', true, 'achievement', '{"achievement": "win_tournament"}'::jsonb, 21),

-- Inferno
('Inferno', 'Unstoppable force', 'corner', 'bottom-right', 'epic',
  '{"icon": "flame", "color": "#ef4444", "size": "24px", "glow": true, "animated": true}'::jsonb,
  '[{"type": "shine-border", "shineColor": ["#ef4444", "#f97316", "#fbbf24"], "duration": 4, "borderWidth": 1}, {"type": "meteors", "number": 5, "color": "#fecaca", "minDuration": 2, "maxDuration": 4}]'::jsonb,
  'medium', true, 'xp', '{"xp": 75000}'::jsonb, 22)


-- ============================================
-- BADGES - LEGENDARY TIER
-- ============================================

INSERT INTO profile_badges (name, description, badge_type, position, rarity, css_styles, magicui_effects, effect_intensity, is_available, unlock_type, unlock_requirement, sort_order) VALUES
-- Mythic
('Mythic', 'Legend among legends', 'corner', 'bottom-right', 'legendary',
  '{"icon": "crown", "color": "#fbbf24", "size": "26px", "glow": true, "animated": true}'::jsonb,
  '[{"type": "border-beam", "size": 45, "duration": 2.5, "colorFrom": "#fbbf24", "colorTo": "#f97316", "borderWidth": 1}, {"type": "shine-border", "shineColor": ["#fbbf24", "#ffffff", "#fbbf24"], "duration": 6, "borderWidth": 1}, {"type": "particles", "quantity": 15, "color": "#fef08a", "size": 0.4}]'::jsonb,
  'intense', true, 'xp', '{"xp": 100000}'::jsonb, 30),

-- Immortal
('Immortal', 'Transcended mortality', 'corner', 'bottom-right', 'legendary',
  '{"icon": "flame", "color": "#8b5cf6", "size": "26px", "glow": true, "animated": true}'::jsonb,
  '[{"type": "border-beam", "size": 40, "duration": 2, "colorFrom": "#8b5cf6", "colorTo": "#ec4899", "borderWidth": 1}, {"type": "border-beam", "size": 40, "duration": 2, "delay": 1, "colorFrom": "#ec4899", "colorTo": "#8b5cf6", "borderWidth": 1, "reverse": true}, {"type": "shine-border", "shineColor": ["#8b5cf6", "#c084fc", "#f0abfc", "#ec4899"], "duration": 8, "borderWidth": 1}, {"type": "particles", "quantity": 18, "color": "#e9d5ff", "size": 0.45}, {"type": "meteors", "number": 4, "color": "#c4b5fd", "minDuration": 2, "maxDuration": 4}]'::jsonb,
  'intense', true, 'xp', '{"xp": 150000}'::jsonb, 31)


-- Create index for magicui_effects queries
CREATE INDEX IF NOT EXISTS idx_profile_frames_magicui ON profile_frames USING gin (magicui_effects)

CREATE INDEX IF NOT EXISTS idx_profile_badges_magicui ON profile_badges USING gin (magicui_effects)

