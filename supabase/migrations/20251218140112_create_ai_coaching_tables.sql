/*
  # Create AI Coaching Tables

  1. New Tables
    - `ai_coaching_sessions`
      - `id` (uuid, primary key) - Unique session identifier
      - `user_id` (uuid, foreign key to auth.users) - The user receiving coaching
      - `game_id` (uuid, foreign key to games) - The game being coached (e.g., League of Legends)
      - `messages` (jsonb) - Array of conversation messages with role, content, timestamp
      - `performance_context` (jsonb) - Snapshot of user stats at session start
      - `focus_areas` (text array) - Areas of improvement focus (e.g., farming, positioning)
      - `session_title` (text) - Auto-generated title from first message
      - `status` (text) - Session status: active, completed
      - `created_at`, `updated_at` (timestamps)
    
    - `coaching_content_recommendations`
      - `id` (uuid, primary key) - Unique recommendation identifier
      - `session_id` (uuid, foreign key) - The coaching session
      - `content_id` (uuid, foreign key to game_contents) - The recommended video
      - `reason` (text) - Why the AI recommended this content
      - `was_watched` (boolean) - Whether user watched the video
      - `created_at` (timestamp)
    
    - `user_coaching_goals`
      - `id` (uuid, primary key) - Unique goal identifier
      - `user_id` (uuid, foreign key to auth.users) - The user
      - `game_id` (uuid, foreign key to games) - The game
      - `goal_type` (text) - Type of goal (cs_per_min, kda, win_rate, etc.)
      - `goal_description` (text) - Human-readable description
      - `target_value` (numeric) - Target metric value
      - `current_value` (numeric) - Current metric value
      - `created_at`, `achieved_at` (timestamps)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own coaching sessions and goals
    - Content recommendations are accessible to session owners

  3. Indexes
    - Index on user_id and game_id for efficient session lookups
    - Index on session_id for recommendation lookups
*/

-- Create ai_coaching_sessions table
CREATE TABLE IF NOT EXISTS ai_coaching_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL,
  messages jsonb DEFAULT '[]'::jsonb,
  performance_context jsonb DEFAULT '{}'::jsonb,
  focus_areas text[] DEFAULT '{}',
  session_title text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create coaching_content_recommendations table
CREATE TABLE IF NOT EXISTS coaching_content_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai_coaching_sessions(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  reason text,
  was_watched boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create user_coaching_goals table
CREATE TABLE IF NOT EXISTS user_coaching_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL,
  goal_type text NOT NULL,
  goal_description text,
  target_value numeric,
  current_value numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  achieved_at timestamptz
);

-- Enable RLS on all tables
ALTER TABLE ai_coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_content_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coaching_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_coaching_sessions
CREATE POLICY "Users can view their own coaching sessions"
  ON ai_coaching_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coaching sessions"
  ON ai_coaching_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coaching sessions"
  ON ai_coaching_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coaching sessions"
  ON ai_coaching_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for coaching_content_recommendations
CREATE POLICY "Users can view recommendations for their sessions"
  ON coaching_content_recommendations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_coaching_sessions
      WHERE ai_coaching_sessions.id = coaching_content_recommendations.session_id
      AND ai_coaching_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recommendations for their sessions"
  ON coaching_content_recommendations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_coaching_sessions
      WHERE ai_coaching_sessions.id = coaching_content_recommendations.session_id
      AND ai_coaching_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recommendations for their sessions"
  ON coaching_content_recommendations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_coaching_sessions
      WHERE ai_coaching_sessions.id = coaching_content_recommendations.session_id
      AND ai_coaching_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_coaching_sessions
      WHERE ai_coaching_sessions.id = coaching_content_recommendations.session_id
      AND ai_coaching_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recommendations for their sessions"
  ON coaching_content_recommendations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_coaching_sessions
      WHERE ai_coaching_sessions.id = coaching_content_recommendations.session_id
      AND ai_coaching_sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for user_coaching_goals
CREATE POLICY "Users can view their own coaching goals"
  ON user_coaching_goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coaching goals"
  ON user_coaching_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coaching goals"
  ON user_coaching_goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coaching goals"
  ON user_coaching_goals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_game 
  ON ai_coaching_sessions(user_id, game_id);

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_status 
  ON ai_coaching_sessions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_coaching_recommendations_session 
  ON coaching_content_recommendations(session_id);

CREATE INDEX IF NOT EXISTS idx_coaching_goals_user_game 
  ON user_coaching_goals(user_id, game_id);

-- Create updated_at trigger for ai_coaching_sessions
CREATE OR REPLACE FUNCTION update_coaching_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ai_coaching_sessions_updated_at ON ai_coaching_sessions;
CREATE TRIGGER update_ai_coaching_sessions_updated_at
  BEFORE UPDATE ON ai_coaching_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_coaching_session_updated_at();