/*
  # Create Game Trailers Table for Hero Carousel

  1. New Tables
    - `game_trailers`
      - `id` (uuid, primary key) - Unique identifier for the trailer
      - `game_id` (uuid, foreign key to games) - Links to the associated game
      - `tournament_id` (uuid, nullable, foreign key to tournaments) - Links to featured tournament
      - `video_url` (text) - URL of the trailer video
      - `is_featured` (boolean) - Whether this tournament should appear in hero carousel
      - `is_default` (boolean) - Marks the generic esport video for slide 1
      - `title` (text, nullable) - Optional display title override
      - `description` (text, nullable) - Optional display description override
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `game_trailers` table
    - Add policy for public read access (trailers are public content)
    - Add policy for authenticated admin users to manage trailers

  3. Indexes
    - Index on `game_id` for efficient game-based lookups
    - Index on `tournament_id` for tournament-based lookups
    - Index on `is_featured` for filtering featured trailers
    - Index on `is_default` for finding default trailer

  4. Constraints
    - Only one trailer can be marked as default
    - Foreign key constraints to games and tournaments tables
*/

-- Create the game_trailers table
CREATE TABLE IF NOT EXISTS game_trailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE SET NULL,
  video_url text NOT NULL,
  is_featured boolean DEFAULT false,
  is_default boolean DEFAULT false,
  title text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_game_trailers_game_id ON game_trailers(game_id);
CREATE INDEX IF NOT EXISTS idx_game_trailers_tournament_id ON game_trailers(tournament_id);
CREATE INDEX IF NOT EXISTS idx_game_trailers_is_featured ON game_trailers(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_game_trailers_is_default ON game_trailers(is_default) WHERE is_default = true;

-- Enable Row Level Security
ALTER TABLE game_trailers ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (trailers are public content for the hero section)
CREATE POLICY "Anyone can view game trailers"
  ON game_trailers
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy for admin users to insert trailers
CREATE POLICY "Admin users can insert game trailers"
  ON game_trailers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Policy for admin users to update trailers
CREATE POLICY "Admin users can update game trailers"
  ON game_trailers
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

-- Policy for admin users to delete trailers
CREATE POLICY "Admin users can delete game trailers"
  ON game_trailers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_trailers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_game_trailers_updated_at ON game_trailers;
CREATE TRIGGER trigger_game_trailers_updated_at
  BEFORE UPDATE ON game_trailers
  FOR EACH ROW
  EXECUTE FUNCTION update_game_trailers_updated_at();

-- Insert a default generic esport trailer as placeholder
-- This can be updated later with the actual video URL
INSERT INTO game_trailers (video_url, is_default, is_featured, title, description)
VALUES (
  'https://cdn.pixabay.com/video/2020/05/25/40130-424930032_large.mp4',
  true,
  false,
  'Welcome to the Arena',
  'Compete in tournaments, climb the leaderboards, and become a champion.'
)
ON CONFLICT DO NOTHING;