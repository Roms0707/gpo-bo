/*
  # Create Coaching Quests Table

  1. New Tables
    - `coaching_quests`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - References users table
      - `game_id` (uuid, foreign key) - References games table
      - `quest_type` (text) - Type of quest (positioning, farming, communication, aim, etc.)
      - `title` (text) - Short quest title
      - `description` (text) - Detailed quest description
      - `target_count` (integer) - Target number to complete (e.g., 5 games)
      - `progress_count` (integer) - Current progress count
      - `status` (text) - Quest status (active, completed, abandoned)
      - `ai_reasoning` (text) - AI explanation for why this quest was assigned
      - `session_id` (uuid) - Reference to the coaching session that created this quest
      - `completed_notes` (text) - User notes on completion
      - `created_at` (timestamptz) - Creation timestamp
      - `completed_at` (timestamptz) - Completion timestamp

  2. Security
    - Enable RLS on `coaching_quests` table
    - Add policies for authenticated users to manage their own quests

  3. Indexes
    - Index on user_id for efficient user quest lookups
    - Index on (user_id, game_id, status) for active quest lookups
*/

CREATE TABLE IF NOT EXISTS coaching_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  quest_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  target_count integer DEFAULT 1,
  progress_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  ai_reasoning text,
  session_id uuid REFERENCES ai_coaching_sessions(id) ON DELETE SET NULL,
  completed_notes text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE coaching_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quests"
  ON coaching_quests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quests"
  ON coaching_quests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quests"
  ON coaching_quests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quests"
  ON coaching_quests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_coaching_quests_user 
  ON coaching_quests(user_id);

CREATE INDEX IF NOT EXISTS idx_coaching_quests_user_game_status 
  ON coaching_quests(user_id, game_id, status);

CREATE INDEX IF NOT EXISTS idx_coaching_quests_session 
  ON coaching_quests(session_id);