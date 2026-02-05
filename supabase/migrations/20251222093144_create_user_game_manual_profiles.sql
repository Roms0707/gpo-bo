/*
  # Create User Game Manual Profiles Table

  1. New Tables
    - `user_game_manual_profiles`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - References users table
      - `game_id` (uuid, foreign key) - References games table
      - `self_reported_rank` (text) - User's self-reported rank/ELO (e.g., "Gold 2", "Diamond", "1500 ELO")
      - `external_stats_url` (text) - URL to external stats profile (op.gg, tracker.gg, etc.)
      - `external_stats_platform` (text) - Platform type (op.gg, tracker.gg, blitz.gg, leetify, etc.)
      - `main_characters` (text[]) - Array of main characters/heroes/agents
      - `playstyle_notes` (text) - User's notes about their playstyle
      - `hours_played_estimate` (integer) - Estimated hours played
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `user_game_manual_profiles` table
    - Add policy for authenticated users to manage their own profiles

  3. Indexes
    - Index on (user_id, game_id) for efficient lookups
*/

CREATE TABLE IF NOT EXISTS user_game_manual_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  self_reported_rank text,
  external_stats_url text,
  external_stats_platform text,
  main_characters text[] DEFAULT '{}',
  playstyle_notes text,
  hours_played_estimate integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_game_profile UNIQUE (user_id, game_id)
);

ALTER TABLE user_game_manual_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own game profiles"
  ON user_game_manual_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game profiles"
  ON user_game_manual_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game profiles"
  ON user_game_manual_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own game profiles"
  ON user_game_manual_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_game_manual_profiles_user_game 
  ON user_game_manual_profiles(user_id, game_id);

CREATE INDEX IF NOT EXISTS idx_user_game_manual_profiles_user 
  ON user_game_manual_profiles(user_id);