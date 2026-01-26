/*
  # Create Video Playlist System Tables

  1. New Tables
    - `video_playlists`
      - `id` (uuid, primary key) - Unique playlist identifier
      - `game_id` (uuid, foreign key to games) - The game this playlist belongs to
      - `name` (text) - Playlist title (e.g., "Aim Training", "Map Awareness")
      - `description` (text) - Auto-generated or custom description
      - `thumbnail_url` (text) - Playlist cover image
      - `category` (text) - Grouping category (fundamentals, advanced, agent-specific)
      - `sort_order` (integer) - Display ordering
      - `is_auto_generated` (boolean) - Flag for auto vs manual creation
      - `keywords` (text array) - Keywords used for video matching
      - `created_at`, `updated_at` (timestamps)

    - `playlist_videos`
      - `id` (uuid, primary key) - Unique junction identifier
      - `playlist_id` (uuid, foreign key) - Reference to playlist
      - `content_id` (uuid, foreign key to game_contents) - Reference to video
      - `position` (integer) - Video order within playlist
      - `created_at` (timestamp)

    - `user_video_progress`
      - `id` (uuid, primary key) - Unique progress identifier
      - `user_id` (uuid, foreign key to auth.users) - The user
      - `content_id` (uuid, foreign key to game_contents) - The video
      - `watch_time_seconds` (integer) - Current playback position
      - `duration_seconds` (integer) - Total video duration
      - `is_completed` (boolean) - Marked complete when >90% watched
      - `last_watched_at` (timestamp)
      - `created_at`, `updated_at` (timestamps)

  2. Security
    - Enable RLS on all tables
    - Playlists and playlist_videos are publicly readable
    - User progress is private to each user

  3. Indexes
    - Index on game_id for playlist lookups
    - Index on playlist_id for video lookups
    - Index on user_id and content_id for progress lookups
*/

-- Create video_playlists table
CREATE TABLE IF NOT EXISTS video_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  thumbnail_url text,
  category text DEFAULT 'general',
  sort_order integer DEFAULT 0,
  is_auto_generated boolean DEFAULT true,
  keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create playlist_videos junction table
CREATE TABLE IF NOT EXISTS playlist_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES video_playlists(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(playlist_id, content_id)
);

-- Create user_video_progress table
CREATE TABLE IF NOT EXISTS user_video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  watch_time_seconds integer DEFAULT 0,
  duration_seconds integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  last_watched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Enable RLS on all tables
ALTER TABLE video_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_video_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_playlists (publicly readable)
CREATE POLICY "Anyone can view playlists"
  ON video_playlists
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service role can manage playlists"
  ON video_playlists
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for playlist_videos (publicly readable)
CREATE POLICY "Anyone can view playlist videos"
  ON playlist_videos
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service role can manage playlist videos"
  ON playlist_videos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for user_video_progress (user-specific)
CREATE POLICY "Users can view their own video progress"
  ON user_video_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video progress"
  ON user_video_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video progress"
  ON user_video_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video progress"
  ON user_video_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_video_playlists_game_id
  ON video_playlists(game_id);

CREATE INDEX IF NOT EXISTS idx_video_playlists_category
  ON video_playlists(category);

CREATE INDEX IF NOT EXISTS idx_playlist_videos_playlist_id
  ON playlist_videos(playlist_id);

CREATE INDEX IF NOT EXISTS idx_playlist_videos_content_id
  ON playlist_videos(content_id);

CREATE INDEX IF NOT EXISTS idx_user_video_progress_user_id
  ON user_video_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_user_video_progress_content_id
  ON user_video_progress(content_id);

CREATE INDEX IF NOT EXISTS idx_user_video_progress_user_content
  ON user_video_progress(user_id, content_id);

CREATE INDEX IF NOT EXISTS idx_user_video_progress_last_watched
  ON user_video_progress(user_id, last_watched_at DESC);

-- Create updated_at trigger for video_playlists
CREATE OR REPLACE FUNCTION update_video_playlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_video_playlists_updated_at ON video_playlists;
CREATE TRIGGER update_video_playlists_updated_at
  BEFORE UPDATE ON video_playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_video_playlist_updated_at();

-- Create updated_at trigger for user_video_progress
CREATE OR REPLACE FUNCTION update_user_video_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_video_progress_updated_at ON user_video_progress;
CREATE TRIGGER update_user_video_progress_updated_at
  BEFORE UPDATE ON user_video_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_video_progress_updated_at();
