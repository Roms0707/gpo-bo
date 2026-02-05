/*
  # Create Playlist Keyword Mappings Table

  1. New Tables
    - `playlist_keyword_mappings`
      - `id` (uuid, primary key) - Unique mapping identifier
      - `playlist_name` (text) - Target playlist name
      - `category` (text) - Playlist category (fundamentals, advanced, etc.)
      - `keywords` (text array) - Keywords to match in video titles
      - `priority` (integer) - Matching priority (higher = matched first)
      - `description_template` (text) - Template for auto-generating playlist description
      - `is_active` (boolean) - Whether this mapping is active
      - `created_at` (timestamp)

  2. Seed Data
    - Common gaming playlist categories with keywords for:
      - Aim Training
      - Map Knowledge
      - Game Sense / Fundamentals
      - Economy Management
      - Agent/Champion Guides
      - Advanced Techniques
      - Communication & Teamwork

  3. Security
    - Enable RLS with public read access
    - Service role for management
*/

-- Create playlist_keyword_mappings table
CREATE TABLE IF NOT EXISTS playlist_keyword_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  keywords text[] NOT NULL DEFAULT '{}',
  priority integer DEFAULT 0,
  description_template text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE playlist_keyword_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view keyword mappings"
  ON playlist_keyword_mappings
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service role can manage keyword mappings"
  ON playlist_keyword_mappings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for active mappings
CREATE INDEX IF NOT EXISTS idx_playlist_keyword_mappings_active 
  ON playlist_keyword_mappings(is_active, priority DESC);

-- Seed initial keyword mappings for common gaming topics

-- Fundamentals Category
INSERT INTO playlist_keyword_mappings (playlist_name, category, keywords, priority, description_template)
VALUES 
  ('Fundamentals', 'fundamentals', 
   ARRAY['beginner', 'basic', 'fundamental', 'start', 'getting started', 'introduction', 'intro', 'tutorial', 'learn', 'first', 'new player', 'newbie', 'débutant', 'débuter', 'apprendre'],
   100,
   'Essential basics to get you started and build a strong foundation for improvement.'
  ),
  ('Aim Training', 'fundamentals',
   ARRAY['aim', 'aiming', 'crosshair', 'flick', 'tracking', 'precision', 'accuracy', 'headshot', 'target', 'mouse', 'sensitivity', 'visée', 'précision'],
   90,
   'Master your aim with drills and techniques to improve accuracy and consistency.'
  ),
  ('Movement & Mechanics', 'fundamentals',
   ARRAY['movement', 'strafe', 'bunny hop', 'slide', 'jump', 'crouch', 'peek', 'jiggle', 'counter-strafe', 'mobility', 'movement', 'déplacement', 'mécanique'],
   85,
   'Learn essential movement techniques to outmaneuver opponents.'
  );

-- Game Knowledge Category  
INSERT INTO playlist_keyword_mappings (playlist_name, category, keywords, priority, description_template)
VALUES
  ('Map Knowledge', 'knowledge',
   ARRAY['map', 'callout', 'position', 'rotation', 'angle', 'spot', 'location', 'site', 'lane', 'jungle', 'route', 'carte', 'position'],
   80,
   'Learn map layouts, callouts, and optimal positioning for every situation.'
  ),
  ('Game Sense', 'knowledge',
   ARRAY['game sense', 'awareness', 'prediction', 'read', 'anticipate', 'decision', 'timing', 'when to', 'macro', 'strategy', 'stratégie'],
   75,
   'Develop your ability to read the game and make smart decisions.'
  ),
  ('Economy Management', 'knowledge',
   ARRAY['economy', 'eco', 'buy', 'save', 'force', 'money', 'gold', 'credits', 'budget', 'économie', 'argent'],
   70,
   'Optimize your resource management for maximum impact.'
  );

-- Advanced Category
INSERT INTO playlist_keyword_mappings (playlist_name, category, keywords, priority, description_template)
VALUES
  ('Advanced Techniques', 'advanced',
   ARRAY['advanced', 'pro', 'high level', 'expert', 'master', 'technique', 'trick', 'tech', 'avancé', 'expert'],
   60,
   'Take your skills to the next level with advanced techniques used by pros.'
  ),
  ('Team Play', 'advanced',
   ARRAY['team', 'communication', 'callout', 'coordinate', 'combo', 'synergy', 'together', 'équipe', 'communication'],
   55,
   'Learn to coordinate with your team for better results.'
  ),
  ('Mental Game', 'advanced',
   ARRAY['mental', 'mindset', 'tilt', 'focus', 'confidence', 'pressure', 'clutch', 'psychology', 'mental', 'mentalité'],
   50,
   'Strengthen your mental game to perform under pressure.'
  );

-- Character/Agent Specific Category
INSERT INTO playlist_keyword_mappings (playlist_name, category, keywords, priority, description_template)
VALUES
  ('Agent Guides', 'characters',
   ARRAY['agent', 'character', 'champion', 'hero', 'operator', 'legend', 'guide', 'main', 'one trick', 'personnage'],
   65,
   'In-depth guides for specific agents and characters.'
  ),
  ('Ability Usage', 'characters',
   ARRAY['ability', 'skill', 'ultimate', 'ult', 'spell', 'power', 'utility', 'lineup', 'compétence', 'capacité'],
   62,
   'Master ability usage and lineups for maximum effectiveness.'
  );

-- Gameplay Analysis Category
INSERT INTO playlist_keyword_mappings (playlist_name, category, keywords, priority, description_template)
VALUES
  ('VOD Review', 'analysis',
   ARRAY['vod', 'review', 'analysis', 'breakdown', 'replay', 'mistake', 'improve', 'coaching', 'analyse', 'replay'],
   45,
   'Learn from gameplay analysis and identify areas for improvement.'
  ),
  ('Pro Play Analysis', 'analysis',
   ARRAY['pro', 'professional', 'esport', 'tournament', 'match', 'final', 'championship', 'compétition'],
   40,
   'Study professional matches to learn high-level strategies.'
  );

-- Catch-all for uncategorized
INSERT INTO playlist_keyword_mappings (playlist_name, category, keywords, priority, description_template)
VALUES
  ('General Training', 'general',
   ARRAY[]::text[],
   0,
   'Miscellaneous training content to help you improve.'
  );