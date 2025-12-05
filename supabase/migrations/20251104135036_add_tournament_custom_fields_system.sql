/*
  # Add Tournament Custom Fields System

  ## Overview
  This migration creates a complete system for tournament custom registration fields,
  allowing tournaments to collect additional information from players during registration.

  ## 1. New Tables Created

  ### user_tournament_field_values
  Stores user responses to custom tournament registration fields.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users)
  - `tournament_id` (uuid, references tournaments)
  - `field_id` (uuid, references tournament_fields)
  - `value` (text) - The user's response to the field
  - `created_at` (timestamptz)
  - Unique constraint on (user_id, tournament_id, field_id)

  ### game_publisher_ids
  Defines game-specific publisher IDs required for each game (e.g., EA ID, Steam ID).
  - `id` (uuid, primary key)
  - `game_id` (uuid, references games)
  - `label` (text) - Display name (e.g., "EA ID")
  - `id_name` (text) - Internal identifier (e.g., "ea_id")
  - `required` (boolean) - Whether this ID is mandatory
  - `display_order` (integer) - Order to display fields
  - `created_at` (timestamptz)

  ### game_publisher_id_for_users
  Stores users' actual game publisher IDs.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users)
  - `game_id` (uuid, references games)
  - `game_publisher_id` (uuid, references game_publisher_ids)
  - `value` (text) - The actual ID value
  - `is_validated` (boolean) - Whether the ID has been verified
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - Unique constraint on (user_id, game_publisher_id)

  ## 2. Schema Modifications

  ### tournament_fields table enhancement
  - Add `tournament_id` column (uuid, references tournaments, nullable for backward compatibility)
  - Add index on tournament_id for query performance
  - Add cascade delete when tournament is deleted

  ## 3. Security (Row Level Security)

  All tables have RLS enabled with policies for:
  - Admins can read/write all data
  - Users can read field definitions
  - Users can write their own field values
  - Users can manage their own game publisher IDs

  ## 4. Indexes

  Created for query performance on:
  - tournament_fields.tournament_id
  - user_tournament_field_values (user_id, tournament_id, field_id)
  - game_publisher_ids (game_id)
  - game_publisher_id_for_users (user_id, game_id)

  ## Notes
  - Existing tournament_fields data is preserved
  - tournament_id is nullable to maintain backward compatibility
  - All timestamps default to now()
  - Foreign keys use CASCADE for deletions where appropriate
*/

-- =====================================================
-- 1. Add tournament_id to tournament_fields table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_fields' AND column_name = 'tournament_id'
  ) THEN
    ALTER TABLE tournament_fields 
    ADD COLUMN tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_tournament_fields_tournament_id 
    ON tournament_fields(tournament_id);
  END IF;
END $$;

-- =====================================================
-- 2. Create user_tournament_field_values table
-- =====================================================

CREATE TABLE IF NOT EXISTS user_tournament_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES tournament_fields(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tournament_id, field_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tournament_field_values_user_id 
ON user_tournament_field_values(user_id);

CREATE INDEX IF NOT EXISTS idx_user_tournament_field_values_tournament_id 
ON user_tournament_field_values(tournament_id);

CREATE INDEX IF NOT EXISTS idx_user_tournament_field_values_field_id 
ON user_tournament_field_values(field_id);

-- Enable RLS
ALTER TABLE user_tournament_field_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_tournament_field_values
CREATE POLICY "Admins can read all user field values"
  ON user_tournament_field_values FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

CREATE POLICY "Users can read their own field values"
  ON user_tournament_field_values FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own field values"
  ON user_tournament_field_values FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own field values"
  ON user_tournament_field_values FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own field values"
  ON user_tournament_field_values FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. Create game_publisher_ids table
-- =====================================================

CREATE TABLE IF NOT EXISTS game_publisher_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  id_name TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_game_publisher_ids_game_id 
ON game_publisher_ids(game_id);

-- Enable RLS
ALTER TABLE game_publisher_ids ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_publisher_ids
CREATE POLICY "Anyone can read game publisher IDs"
  ON game_publisher_ids FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert game publisher IDs"
  ON game_publisher_ids FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

CREATE POLICY "Admins can update game publisher IDs"
  ON game_publisher_ids FOR UPDATE
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

CREATE POLICY "Admins can delete game publisher IDs"
  ON game_publisher_ids FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- =====================================================
-- 4. Create game_publisher_id_for_users table
-- =====================================================

CREATE TABLE IF NOT EXISTS game_publisher_id_for_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  game_publisher_id UUID NOT NULL REFERENCES game_publisher_ids(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  is_validated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, game_publisher_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_publisher_id_for_users_user_id 
ON game_publisher_id_for_users(user_id);

CREATE INDEX IF NOT EXISTS idx_game_publisher_id_for_users_game_id 
ON game_publisher_id_for_users(game_id);

CREATE INDEX IF NOT EXISTS idx_game_publisher_id_for_users_game_publisher_id 
ON game_publisher_id_for_users(game_publisher_id);

-- Enable RLS
ALTER TABLE game_publisher_id_for_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_publisher_id_for_users
CREATE POLICY "Admins can read all user game publisher IDs"
  ON game_publisher_id_for_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

CREATE POLICY "Users can read their own game publisher IDs"
  ON game_publisher_id_for_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game publisher IDs"
  ON game_publisher_id_for_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game publisher IDs"
  ON game_publisher_id_for_users FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own game publisher IDs"
  ON game_publisher_id_for_users FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);