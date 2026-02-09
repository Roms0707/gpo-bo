/*
  # Create Coaching Analytics Tables

  1. New Tables
    - `coaching_question_analytics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `game_id` (uuid, references games)
      - `session_id` (uuid, references ai_coaching_sessions)
      - `question_text` (text) - the user's original question
      - `detected_topics` (text array) - topics detected in the question
      - `category` (text) - primary category of the question
      - `created_at` (timestamptz)

    - `coaching_ai_config`
      - `id` (uuid, primary key)
      - `game_id` (uuid, references games, nullable for global config)
      - `config_key` (text) - e.g., 'emphasis_areas', 'custom_prompt_section'
      - `config_value` (text) - the configuration value
      - `is_active` (boolean) - whether this config is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only insert their own question analytics
    - AI config is read-only from edge functions (service role writes)

  3. Indexes
    - Index on game_id for filtering
    - Index on category for analytics grouping
    - Index on created_at for time-based queries
*/

-- Create coaching_question_analytics table
CREATE TABLE IF NOT EXISTS coaching_question_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id uuid REFERENCES games(id) ON DELETE SET NULL,
  session_id uuid REFERENCES ai_coaching_sessions(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  detected_topics text[] DEFAULT '{}',
  category text,
  created_at timestamptz DEFAULT now()
);

-- Create coaching_ai_config table
CREATE TABLE IF NOT EXISTS coaching_ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  config_key text NOT NULL,
  config_value text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(game_id, config_key)
);

-- Enable RLS on both tables
ALTER TABLE coaching_question_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_ai_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coaching_question_analytics
-- Users can view their own question history
CREATE POLICY "Users can view own question analytics"
  ON coaching_question_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Edge function inserts via service role (no user policy needed for insert)
-- Admin access will be handled by service role in backoffice

-- RLS Policies for coaching_ai_config
-- Anyone authenticated can read active configs (needed for edge function via user client)
CREATE POLICY "Authenticated users can read active AI config"
  ON coaching_ai_config
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_coaching_question_analytics_game_id
  ON coaching_question_analytics(game_id);

CREATE INDEX IF NOT EXISTS idx_coaching_question_analytics_category
  ON coaching_question_analytics(category);

CREATE INDEX IF NOT EXISTS idx_coaching_question_analytics_created_at
  ON coaching_question_analytics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coaching_question_analytics_user_id
  ON coaching_question_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_coaching_ai_config_game_id
  ON coaching_ai_config(game_id);

CREATE INDEX IF NOT EXISTS idx_coaching_ai_config_active
  ON coaching_ai_config(is_active) WHERE is_active = true;

-- Insert default coaching configurations
INSERT INTO coaching_ai_config (game_id, config_key, config_value, is_active)
VALUES
  (NULL, 'topic_priorities', '["farming", "vision", "teamfighting", "laning", "macro", "builds", "champions", "mental"]', true),
  (NULL, 'emphasis_areas', '[]', true)
ON CONFLICT (game_id, config_key) DO NOTHING;
