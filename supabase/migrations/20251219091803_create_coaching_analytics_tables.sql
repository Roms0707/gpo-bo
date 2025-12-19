/*
  # Create Coaching Analytics Tables

  1. New Tables
    - `coaching_question_analytics`
      - `id` (uuid, primary key)
      - `session_id` (uuid) - Reference to the coaching session
      - `user_id` (uuid, nullable) - Reference to the user who asked
      - `game_id` (uuid, nullable) - Reference to the game context
      - `question_text` (text) - The question that was asked
      - `response_text` (text, nullable) - The AI response
      - `detected_topics` (text array) - Topics detected in the question
      - `category` (text, nullable) - Question category
      - `created_at` (timestamptz) - When the question was asked
    
    - `coaching_ai_config`
      - `id` (uuid, primary key)
      - `game_id` (uuid) - Reference to the game
      - `config_key` (text) - Type of configuration
      - `config_value` (text) - The configuration value
      - `is_active` (boolean) - Whether this config is active
      - `display_order` (integer) - Order for priority configs
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated admin users
*/

CREATE TABLE IF NOT EXISTS coaching_question_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  game_id uuid REFERENCES public.games(id) ON DELETE SET NULL,
  question_text text NOT NULL,
  response_text text,
  detected_topics text[] DEFAULT '{}',
  category text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coaching_ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  config_key text NOT NULL CHECK (config_key IN ('custom_prompt_section', 'emphasis_areas', 'topic_priority', 'behavior_toggle')),
  config_value text NOT NULL,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaching_question_analytics_session_id ON coaching_question_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_coaching_question_analytics_user_id ON coaching_question_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_question_analytics_game_id ON coaching_question_analytics(game_id);
CREATE INDEX IF NOT EXISTS idx_coaching_question_analytics_created_at ON coaching_question_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_coaching_question_analytics_topics ON coaching_question_analytics USING GIN(detected_topics);

CREATE INDEX IF NOT EXISTS idx_coaching_ai_config_game_id ON coaching_ai_config(game_id);
CREATE INDEX IF NOT EXISTS idx_coaching_ai_config_key ON coaching_ai_config(config_key);

ALTER TABLE coaching_question_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view coaching question analytics"
  ON coaching_question_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

CREATE POLICY "Admins can insert coaching question analytics"
  ON coaching_question_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

CREATE POLICY "Admins can view coaching AI config"
  ON coaching_ai_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

CREATE POLICY "Admins can insert coaching AI config"
  ON coaching_ai_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

CREATE POLICY "Admins can update coaching AI config"
  ON coaching_ai_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

CREATE POLICY "Admins can delete coaching AI config"
  ON coaching_ai_config
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );
