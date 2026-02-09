/*
  # Game-Themed Premium Border Collections

  This migration adds an extensive collection of game-themed avatar and modal frames
  with achievement-based unlock requirements. Each collection is inspired by popular
  competitive games and features unique visual styles and animations.

  1. Schema Changes
    - Add `collection` column to profile_frames for grouping frames by theme
    - Add `game_affinity` column to profile_frames for game-specific frames
    - Update style CHECK constraint to include new style types

  2. New Frame Collections
    - League of Legends Collection (5 frames)
    - Valorant Collection (5 frames)
    - Diablo/Dark Fantasy Collection (5 frames)
    - Apex Legends/Futuristic Collection (5 frames)
    - CS2/Tactical Collection (5 frames)
    - Rocket League/High Energy Collection (5 frames)
    - Universal Elite Collection (6 frames)

  3. Unlock Requirements
    - XP thresholds ranging from 500 to 50,000 XP
    - Achievement-based unlocks for special frames
    - Collection-specific progression paths

  4. Notes
    - All frames use high XP thresholds to create aspirational progression
    - Legendary frames require significant dedication to unlock
    - Each collection has a distinct visual identity
*/

-- Add collection column to profile_frames
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profile_frames' AND column_name = 'collection'
  ) THEN
    ALTER TABLE profile_frames ADD COLUMN collection text DEFAULT 'default';
  END IF;
END $$;

-- Add game_affinity column to profile_frames
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profile_frames' AND column_name = 'game_affinity'
  ) THEN
    ALTER TABLE profile_frames ADD COLUMN game_affinity text;
  END IF;
END $$;

-- Update existing frames to have default collection
UPDATE profile_frames SET collection = 'default' WHERE collection IS NULL;

-- Drop the old style constraint and add new one with additional styles
ALTER TABLE profile_frames DROP CONSTRAINT IF EXISTS profile_frames_style_check;
ALTER TABLE profile_frames ADD CONSTRAINT profile_frames_style_check
  CHECK (style IN ('metallic', 'neon', 'elegant', 'animated', 'simple', 'tech', 'elemental', 'gothic', 'tactical', 'cosmic', 'seasonal'));

-- Create index for collection queries
CREATE INDEX IF NOT EXISTS idx_profile_frames_collection ON profile_frames(collection);
CREATE INDEX IF NOT EXISTS idx_profile_frames_game_affinity ON profile_frames(game_affinity);

-- ============================================
-- LEAGUE OF LEGENDS COLLECTION
-- Theme: Ornate gold filigree, hextech technology, magical essence
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, animation_class, is_available, is_premium, unlock_type, unlock_requirement, sort_order, collection, game_affinity) VALUES
-- Summoner's Edge (Rare - 500 XP)
('Summoner''s Edge', 'A bronze frame with ornate edges inspired by the Summoner''s Rift', 'avatar', 'elegant', 'rare',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#CD7F32", "borderRadius": "14px", "boxShadow": "0 0 15px rgba(205, 127, 50, 0.4), inset 0 0 8px rgba(205, 127, 50, 0.2)"}'::jsonb,
  'animate-ancient-glow', true, false, 'xp', '{"xp": 500}'::jsonb, 101, 'league_of_legends', 'lol'),

-- Hextech Core (Epic - 2,000 XP)
('Hextech Core', 'Cyan hexagonal patterns with pulsing tech energy', 'avatar', 'tech', 'epic',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#00d4ff", "borderRadius": "12px", "boxShadow": "0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(0, 212, 255, 0.2), inset 0 0 15px rgba(0, 212, 255, 0.1)"}'::jsonb,
  'animate-hextech-pulse', true, false, 'xp', '{"xp": 2000}'::jsonb, 102, 'league_of_legends', 'lol'),

-- Challenger Crest (Epic - 5,000 XP)
('Challenger Crest', 'An ornate golden frame worthy of the highest ranked players', 'avatar', 'elegant', 'epic',
  '{"borderWidth": "5px", "borderStyle": "double", "borderColor": "#FFD700", "borderRadius": "16px", "boxShadow": "0 0 25px rgba(255, 215, 0, 0.6), 0 0 50px rgba(255, 215, 0, 0.3), inset 0 0 12px rgba(255, 215, 0, 0.15)"}'::jsonb,
  'animate-golden-sweep', true, false, 'xp', '{"xp": 5000}'::jsonb, 103, 'league_of_legends', 'lol'),

-- Arcane Embrace (Legendary - 10,000 XP)
('Arcane Embrace', 'Deep blue magical energy with swirling golden particles', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#1a237e", "borderRadius": "50%", "boxShadow": "0 0 30px rgba(26, 35, 126, 0.7), 0 0 60px rgba(255, 215, 0, 0.4), inset 0 0 20px rgba(26, 35, 126, 0.3)"}'::jsonb,
  'animate-frame-cosmic', true, false, 'xp', '{"xp": 10000}'::jsonb, 104, 'league_of_legends', 'lol'),

-- Ruination (Legendary - 15,000 XP)
('Ruination', 'Black mist frame with ghostly green spectral glow', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#0a0a0a", "borderRadius": "14px", "boxShadow": "0 0 25px rgba(34, 197, 94, 0.5), 0 0 50px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(34, 197, 94, 0.2)"}'::jsonb,
  'animate-ruination-mist', true, false, 'xp', '{"xp": 15000}'::jsonb, 105, 'league_of_legends', 'lol');

-- ============================================
-- VALORANT COLLECTION
-- Theme: Clean geometric lines, tactical precision, radianite energy
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, animation_class, is_available, is_premium, unlock_type, unlock_requirement, sort_order, collection, game_affinity) VALUES
-- Protocol Frame (Rare - 500 XP)
('Protocol Frame', 'Clean white geometric frame with sharp red accent lines', 'avatar', 'tech', 'rare',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#ffffff", "borderRadius": "8px", "boxShadow": "0 0 15px rgba(255, 70, 85, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.1)"}'::jsonb,
  NULL, true, false, 'xp', '{"xp": 500}'::jsonb, 111, 'valorant', 'valorant'),

-- Radiant Edge (Epic - 2,000 XP)
('Radiant Edge', 'Cyan radianite energy flowing through a dark tactical frame', 'avatar', 'tech', 'epic',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#0f1923", "borderRadius": "10px", "boxShadow": "0 0 20px rgba(0, 255, 255, 0.5), 0 0 40px rgba(0, 255, 255, 0.2)"}'::jsonb,
  'animate-electric-arc', true, false, 'xp', '{"xp": 2000}'::jsonb, 112, 'valorant', 'valorant'),

-- Phantom Strike (Epic - 5,000 XP)
('Phantom Strike', 'Matte black with animated crimson pulse accents', 'avatar', 'tech', 'epic',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#1a1a1a", "borderRadius": "6px", "boxShadow": "0 0 20px rgba(255, 70, 85, 0.6), inset 0 0 15px rgba(255, 70, 85, 0.1)"}'::jsonb,
  'animate-blood-drip', true, false, 'xp', '{"xp": 5000}'::jsonb, 113, 'valorant', 'valorant'),

-- Elderflame (Legendary - 10,000 XP)
('Elderflame', 'Living dragon-scale texture with organic fire animation', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#ff6b35", "borderRadius": "12px", "boxShadow": "0 0 30px rgba(255, 107, 53, 0.7), 0 0 60px rgba(255, 69, 0, 0.4)"}'::jsonb,
  'animate-dragon-breathe', true, false, 'xp', '{"xp": 10000}'::jsonb, 114, 'valorant', 'valorant'),

-- Singularity (Legendary - 15,000 XP)
('Singularity', 'Deep space black hole effect with gravitational distortion', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#1a0a2e", "borderRadius": "50%", "boxShadow": "0 0 30px rgba(88, 28, 135, 0.7), 0 0 60px rgba(0, 0, 0, 0.9), inset 0 0 40px rgba(0, 0, 0, 0.8)"}'::jsonb,
  'animate-singularity-warp', true, false, 'xp', '{"xp": 15000}'::jsonb, 115, 'valorant', 'valorant');

-- ============================================
-- DIABLO / DARK FANTASY COLLECTION
-- Theme: Gothic architecture, hellfire, demonic symbols
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, animation_class, is_available, is_premium, unlock_type, unlock_requirement, sort_order, collection, game_affinity) VALUES
-- Bone Warden (Rare - 500 XP)
('Bone Warden', 'Weathered bone white frame with dark cracks and skull motifs', 'avatar', 'gothic', 'rare',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#d4c5a9", "borderRadius": "12px", "boxShadow": "0 0 15px rgba(30, 30, 30, 0.6), inset 0 0 10px rgba(0, 0, 0, 0.3)"}'::jsonb,
  NULL, true, false, 'xp', '{"xp": 500}'::jsonb, 121, 'diablo', NULL),

-- Infernal Gate (Epic - 2,000 XP)
('Infernal Gate', 'Dark iron frame with ember glow seeping through ancient cracks', 'avatar', 'gothic', 'epic',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#2a1a0a", "borderRadius": "10px", "boxShadow": "0 0 20px rgba(255, 69, 0, 0.5), 0 0 40px rgba(139, 0, 0, 0.4), inset 0 0 15px rgba(255, 69, 0, 0.2)"}'::jsonb,
  'animate-ember-dance', true, false, 'xp', '{"xp": 2000}'::jsonb, 122, 'diablo', NULL),

-- Hellforged (Epic - 5,000 XP)
('Hellforged', 'Molten metal frame with dripping lava animation', 'avatar', 'elemental', 'epic',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#8b0000", "borderRadius": "8px", "boxShadow": "0 0 25px rgba(255, 69, 0, 0.7), 0 0 50px rgba(139, 0, 0, 0.5)"}'::jsonb,
  'animate-frame-flame', true, false, 'xp', '{"xp": 5000}'::jsonb, 123, 'diablo', NULL),

-- Necromancer''s Sigil (Legendary - 10,000 XP + Achievement)
('Necromancer''s Sigil', 'Obsidian black with glowing green necromantic runes', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#0a0a0a", "borderRadius": "50%", "boxShadow": "0 0 25px rgba(34, 197, 94, 0.6), 0 0 50px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(34, 197, 94, 0.15)"}'::jsonb,
  'animate-ruination-mist', true, false, 'achievement', '{"xp": 10000, "achievement": "complete_50_achievements"}'::jsonb, 124, 'diablo', NULL),

-- Diablo''s Embrace (Legendary - 20,000 XP)
('Diablo''s Embrace', 'Ultimate demonic frame with animated fire, bone spikes, and crimson aura', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "6px", "borderStyle": "solid", "borderColor": "#8b0000", "borderRadius": "14px", "boxShadow": "0 0 35px rgba(139, 0, 0, 0.8), 0 0 70px rgba(255, 69, 0, 0.5), inset 0 0 25px rgba(139, 0, 0, 0.3)"}'::jsonb,
  'animate-ember-dance', true, false, 'xp', '{"xp": 20000}'::jsonb, 125, 'diablo', NULL);

-- ============================================
-- APEX LEGENDS / FUTURISTIC COLLECTION
-- Theme: Titanfall aesthetic, sleek futuristic, battle-worn metal
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, animation_class, is_available, is_premium, unlock_type, unlock_requirement, sort_order, collection, game_affinity) VALUES
-- Militia Standard (Rare - 500 XP)
('Militia Standard', 'Weathered titanium frame with orange warning accents', 'avatar', 'tactical', 'rare',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#6b7280", "borderRadius": "10px", "boxShadow": "0 0 15px rgba(249, 115, 22, 0.4), inset 0 0 8px rgba(107, 114, 128, 0.3)"}'::jsonb,
  NULL, true, false, 'xp', '{"xp": 500}'::jsonb, 131, 'apex', 'apex'),

-- Jump Kit (Epic - 2,500 XP)
('Jump Kit', 'Titanium frame with animated blue thruster glow effects', 'avatar', 'tech', 'epic',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#374151", "borderRadius": "8px", "boxShadow": "0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.2)"}'::jsonb,
  'animate-boost-trail', true, false, 'xp', '{"xp": 2500}'::jsonb, 132, 'apex', 'apex'),

-- Apex Predator (Epic - 5,000 XP)
('Apex Predator', 'Red and black elite frame with animated warning light indicators', 'avatar', 'tech', 'epic',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#1f1f1f", "borderRadius": "10px", "boxShadow": "0 0 20px rgba(220, 38, 38, 0.6), 0 0 40px rgba(220, 38, 38, 0.3)"}'::jsonb,
  'animate-blood-drip', true, false, 'xp', '{"xp": 5000}'::jsonb, 133, 'apex', 'apex'),

-- Heirloom (Legendary - 12,000 XP + Reaction Achievement)
('Heirloom', 'Premium frame with rotating heirloom weapon silhouettes', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#fbbf24", "borderRadius": "12px", "boxShadow": "0 0 30px rgba(251, 191, 36, 0.6), 0 0 60px rgba(251, 191, 36, 0.3)"}'::jsonb,
  'animate-golden-sweep', true, false, 'achievement', '{"xp": 12000, "achievement": "top_10_reaction_time"}'::jsonb, 134, 'apex', 'apex'),

-- Voidwalker (Legendary - 15,000 XP)
('Voidwalker', 'Phase-shift dimensional frame with reality-tear effects', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#312e81", "borderRadius": "50%", "boxShadow": "0 0 30px rgba(99, 102, 241, 0.6), 0 0 60px rgba(49, 46, 129, 0.5)"}'::jsonb,
  'animate-frame-void', true, false, 'xp', '{"xp": 15000}'::jsonb, 135, 'apex', 'apex');

-- ============================================
-- CS2 / TACTICAL COLLECTION
-- Theme: Military precision, weapon finishes, tactical gear
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, animation_class, is_available, is_premium, unlock_type, unlock_requirement, sort_order, collection, game_affinity) VALUES
-- Factory New (Rare - 500 XP)
('Factory New', 'Pristine steel frame with minimal wear and clean finish', 'avatar', 'tactical', 'rare',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#9ca3af", "borderRadius": "8px", "boxShadow": "0 0 12px rgba(156, 163, 175, 0.4), inset 0 0 8px rgba(255, 255, 255, 0.1)"}'::jsonb,
  NULL, true, false, 'xp', '{"xp": 500}'::jsonb, 141, 'cs2', 'cs'),

-- Asiimov (Epic - 3,000 XP)
('Asiimov', 'White, orange, and black sci-fi geometric pattern', 'avatar', 'tech', 'epic',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#ffffff", "borderRadius": "6px", "boxShadow": "0 0 20px rgba(249, 115, 22, 0.5), 0 0 40px rgba(0, 0, 0, 0.4)"}'::jsonb,
  'animate-neon-breathe', true, false, 'xp', '{"xp": 3000}'::jsonb, 142, 'cs2', 'cs'),

-- Dragon Lore (Epic - 7,000 XP)
('Dragon Lore', 'Ornate gold dragon artwork on deep cobalt blue background', 'avatar', 'elegant', 'epic',
  '{"borderWidth": "5px", "borderStyle": "double", "borderColor": "#FFD700", "borderRadius": "12px", "boxShadow": "0 0 25px rgba(255, 215, 0, 0.5), 0 0 50px rgba(30, 64, 175, 0.4)"}'::jsonb,
  'animate-ancient-glow', true, false, 'xp', '{"xp": 7000}'::jsonb, 143, 'cs2', 'cs'),

-- Karambit Edge (Legendary - 12,000 XP + Aim Achievement)
('Karambit Edge', 'Curved blade silhouette frame with Damascus steel pattern animation', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#4b5563", "borderRadius": "10px", "boxShadow": "0 0 25px rgba(75, 85, 99, 0.6), 0 0 50px rgba(75, 85, 99, 0.3)"}'::jsonb,
  'animate-damascus-shimmer', true, false, 'achievement', '{"xp": 12000, "achievement": "perfect_aim_score"}'::jsonb, 144, 'cs2', 'cs'),

-- The Howl (Legendary - 20,000 XP)
('The Howl', 'Fierce crimson wolf design with animated glowing eyes', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#dc2626", "borderRadius": "14px", "boxShadow": "0 0 30px rgba(220, 38, 38, 0.7), 0 0 60px rgba(220, 38, 38, 0.4)"}'::jsonb,
  'animate-blood-drip', true, false, 'xp', '{"xp": 20000}'::jsonb, 145, 'cs2', 'cs');

-- ============================================
-- ROCKET LEAGUE / HIGH ENERGY COLLECTION
-- Theme: Neon boost trails, supersonic speed, goal explosions
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, animation_class, is_available, is_premium, unlock_type, unlock_requirement, sort_order, collection, game_affinity) VALUES
-- Bronze Boost (Rare - 500 XP)
('Bronze Boost', 'Metallic bronze frame with subtle orange boost trail effect', 'avatar', 'metallic', 'rare',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#CD7F32", "borderRadius": "50%", "boxShadow": "0 0 15px rgba(205, 127, 50, 0.5), -8px 0 15px rgba(249, 115, 22, 0.3)"}'::jsonb,
  NULL, true, false, 'xp', '{"xp": 500}'::jsonb, 151, 'rocket_league', 'rocket'),

-- Diamond Rush (Epic - 3,000 XP)
('Diamond Rush', 'Ice blue crystalline frame with sparkle animation', 'avatar', 'elegant', 'epic',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#b9f2ff", "borderRadius": "50%", "boxShadow": "0 0 20px rgba(185, 242, 255, 0.6), 0 0 40px rgba(185, 242, 255, 0.3)"}'::jsonb,
  'animate-diamond-sparkle', true, false, 'xp', '{"xp": 3000}'::jsonb, 152, 'rocket_league', 'rocket'),

-- Grand Champion (Epic - 6,000 XP)
('Grand Champion', 'Elite pink and purple gradient with rotating trophy accent', 'avatar', 'neon', 'epic',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#ec4899", "borderRadius": "50%", "boxShadow": "0 0 25px rgba(236, 72, 153, 0.6), 0 0 50px rgba(168, 85, 247, 0.4)"}'::jsonb,
  'animate-holographic-shift', true, false, 'xp', '{"xp": 6000}'::jsonb, 153, 'rocket_league', 'rocket'),

-- Titanium White (Legendary - 10,000 XP + Speed Achievement)
('Titanium White', 'Pure white frame with premium rainbow shimmer effect', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#ffffff", "borderRadius": "50%", "boxShadow": "0 0 30px rgba(255, 255, 255, 0.8), 0 0 60px rgba(255, 255, 255, 0.4)"}'::jsonb,
  'animate-holographic-shift', true, false, 'achievement', '{"xp": 10000, "achievement": "fastest_reaction_time"}'::jsonb, 154, 'rocket_league', 'rocket'),

-- Black Market (Legendary - 15,000 XP)
('Black Market', 'Animated goal explosion effect surrounding your avatar', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#fbbf24", "borderRadius": "50%", "boxShadow": "0 0 35px rgba(251, 191, 36, 0.7), 0 0 70px rgba(251, 191, 36, 0.4), 0 0 100px rgba(249, 115, 22, 0.3)"}'::jsonb,
  'animate-solar-corona', true, false, 'xp', '{"xp": 15000}'::jsonb, 155, 'rocket_league', 'rocket');

-- ============================================
-- UNIVERSAL ELITE COLLECTION
-- Theme: Premium designs not tied to specific games
-- ============================================

INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, animation_class, is_available, is_premium, unlock_type, unlock_requirement, sort_order, collection, game_affinity) VALUES
-- Obsidian (Epic - 8,000 XP)
('Obsidian', 'Deep volcanic glass black with subtle crystalline reflections', 'avatar', 'elegant', 'epic',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#0a0a0a", "borderRadius": "12px", "boxShadow": "0 0 20px rgba(30, 30, 30, 0.8), inset 0 0 15px rgba(255, 255, 255, 0.05)"}'::jsonb,
  'animate-frost-shimmer', true, false, 'xp', '{"xp": 8000}'::jsonb, 161, 'universal', NULL),

-- Aurora Borealis (Epic - 100 Sessions Achievement)
('Aurora Borealis', 'Animated northern lights with green, blue, and pink waves', 'avatar', 'animated', 'epic',
  '{"borderWidth": "5px", "borderStyle": "solid", "borderColor": "#22c55e", "borderRadius": "16px", "boxShadow": "0 0 25px rgba(34, 197, 94, 0.5), 0 0 50px rgba(59, 130, 246, 0.3), 0 0 75px rgba(236, 72, 153, 0.2)"}'::jsonb,
  'animate-holographic-shift', true, false, 'achievement', '{"achievement": "complete_100_training_sessions"}'::jsonb, 162, 'universal', NULL),

-- Solar Flare (Legendary - 25,000 XP)
('Solar Flare', 'Golden solar corona with animated eruption effects', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "6px", "borderStyle": "solid", "borderColor": "#fbbf24", "borderRadius": "50%", "boxShadow": "0 0 40px rgba(251, 191, 36, 0.7), 0 0 80px rgba(251, 191, 36, 0.4), 0 0 120px rgba(249, 115, 22, 0.3)"}'::jsonb,
  'animate-solar-corona', true, false, 'xp', '{"xp": 25000}'::jsonb, 163, 'universal', NULL),

-- Cosmic Royalty (Legendary - #1 Leaderboard Achievement)
('Cosmic Royalty', 'Deep space nebula with animated stars and cosmic dust', 'avatar', 'cosmic', 'legendary',
  '{"borderWidth": "6px", "borderStyle": "solid", "borderColor": "#1e1b4b", "borderRadius": "50%", "boxShadow": "0 0 35px rgba(99, 102, 241, 0.6), 0 0 70px rgba(139, 92, 246, 0.4), 0 0 100px rgba(236, 72, 153, 0.3)"}'::jsonb,
  'animate-frame-cosmic', true, false, 'achievement', '{"achievement": "reach_number_one_leaderboard"}'::jsonb, 164, 'universal', NULL),

-- Infinity Frame (Legendary - 50,000 XP)
('Infinity Frame', 'Impossible geometry with mesmerizing perspective shifts', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "6px", "borderStyle": "double", "borderColor": "#8b5cf6", "borderRadius": "14px", "boxShadow": "0 0 40px rgba(139, 92, 246, 0.6), 0 0 80px rgba(139, 92, 246, 0.3)"}'::jsonb,
  'animate-void-swirl', true, false, 'xp', '{"xp": 50000}'::jsonb, 165, 'universal', NULL),

-- The Prestige (Legendary - All Achievements)
('The Prestige', 'Ultimate platinum frame with diamond particle effects for completionists', 'avatar', 'animated', 'legendary',
  '{"borderWidth": "6px", "borderStyle": "solid", "borderColor": "#e5e7eb", "borderRadius": "50%", "boxShadow": "0 0 35px rgba(229, 231, 235, 0.8), 0 0 70px rgba(229, 231, 235, 0.4), 0 0 100px rgba(251, 191, 36, 0.3)"}'::jsonb,
  'animate-diamond-sparkle', true, false, 'achievement', '{"achievement": "complete_all_achievements"}'::jsonb, 166, 'universal', NULL);

-- ============================================
-- MODAL FRAMES - Game Themed Collections
-- ============================================

-- League of Legends Modal Frames
INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, animation_class, is_available, is_premium, unlock_type, unlock_requirement, sort_order, collection, game_affinity) VALUES
('Hextech Modal', 'Cyan hextech energy border for profile modals', 'modal', 'tech', 'epic',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#00d4ff", "borderRadius": "16px", "boxShadow": "0 0 25px rgba(0, 212, 255, 0.4)"}'::jsonb,
  'animate-hextech-pulse', true, false, 'xp', '{"xp": 3000}'::jsonb, 201, 'league_of_legends', 'lol'),

('Challenger Modal', 'Ornate golden challenger-tier modal border', 'modal', 'elegant', 'legendary',
  '{"borderWidth": "4px", "borderStyle": "double", "borderColor": "#FFD700", "borderRadius": "16px", "boxShadow": "0 0 35px rgba(255, 215, 0, 0.5)"}'::jsonb,
  'animate-golden-sweep', true, false, 'xp', '{"xp": 12000}'::jsonb, 202, 'league_of_legends', 'lol');

-- Valorant Modal Frames
INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, animation_class, is_available, is_premium, unlock_type, unlock_requirement, sort_order, collection, game_affinity) VALUES
('Radianite Modal', 'Tactical frame with flowing radianite energy', 'modal', 'tech', 'epic',
  '{"borderWidth": "3px", "borderStyle": "solid", "borderColor": "#0f1923", "borderRadius": "12px", "boxShadow": "0 0 25px rgba(0, 255, 255, 0.4)"}'::jsonb,
  'animate-electric-arc', true, false, 'xp', '{"xp": 3500}'::jsonb, 211, 'valorant', 'valorant'),

('Elderflame Modal', 'Living dragon-scale modal border with fire effects', 'modal', 'animated', 'legendary',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#ff6b35", "borderRadius": "14px", "boxShadow": "0 0 35px rgba(255, 107, 53, 0.5)"}'::jsonb,
  'animate-dragon-breathe', true, false, 'xp', '{"xp": 15000}'::jsonb, 212, 'valorant', 'valorant');

-- Universal Elite Modal Frames
INSERT INTO profile_frames (name, description, frame_type, style, rarity, css_styles, animation_class, is_available, is_premium, unlock_type, unlock_requirement, sort_order, collection, game_affinity) VALUES
('Cosmic Modal', 'Space-themed modal with swirling nebula effects', 'modal', 'cosmic', 'legendary',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#1e1b4b", "borderRadius": "16px", "boxShadow": "0 0 40px rgba(139, 92, 246, 0.5)"}'::jsonb,
  'animate-frame-cosmic', true, false, 'xp', '{"xp": 20000}'::jsonb, 261, 'universal', NULL),

('Diamond Modal', 'Premium crystalline modal border with sparkle animation', 'modal', 'elegant', 'legendary',
  '{"borderWidth": "4px", "borderStyle": "solid", "borderColor": "#b9f2ff", "borderRadius": "16px", "boxShadow": "0 0 35px rgba(185, 242, 255, 0.6)"}'::jsonb,
  'animate-diamond-sparkle', true, false, 'xp', '{"xp": 30000}'::jsonb, 262, 'universal', NULL);
