/*
  # Create coaching_topic_content_links table

  Links coaching AI configuration entries (topic priorities, behavior toggles, etc.)
  to Galaxy API rubric content. This enables the AI coaching system to automatically
  recommend relevant training videos/content when a user asks about a specific topic.

  1. New Tables
    - `coaching_topic_content_links`
      - `id` (uuid, primary key)
      - `coaching_config_id` (uuid, FK to coaching_ai_config) - the parent topic/toggle
      - `game_id` (uuid, FK to games) - game context for faster lookups
      - `rubric_id` (text, NOT NULL) - Galaxy API rubric identifier
      - `rubric_name` (text) - cached display name from Galaxy API
      - `content_category` (text, default 'tips') - tips, masterclass, grind_zone, article
      - `display_order` (integer, default 0) - ordering within a topic
      - `is_active` (boolean, default true) - whether this link is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `coaching_topic_content_links`
    - Authenticated users can read active links
    - Admins can insert, update, delete

  3. Indexes
    - (coaching_config_id) for fast joins
    - (game_id) for edge function lookups
    - Unique constraint on (coaching_config_id, rubric_id) to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS coaching_topic_content_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_config_id uuid NOT NULL REFERENCES coaching_ai_config(id) ON DELETE CASCADE,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  rubric_id text NOT NULL,
  rubric_name text,
  content_category text NOT NULL DEFAULT 'tips' CHECK (content_category IN ('tips', 'masterclass', 'grind_zone', 'article')),
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coaching_topic_content_links ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_coaching_content_links_config_rubric
  ON coaching_topic_content_links(coaching_config_id, rubric_id);

CREATE INDEX IF NOT EXISTS idx_coaching_content_links_config_id
  ON coaching_topic_content_links(coaching_config_id);

CREATE INDEX IF NOT EXISTS idx_coaching_content_links_game_id
  ON coaching_topic_content_links(game_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_coaching_content_links_game_active
  ON coaching_topic_content_links(game_id, is_active)
  WHERE is_active = true;

CREATE POLICY "Authenticated users can read active content links"
  ON coaching_topic_content_links
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can view all content links"
  ON coaching_topic_content_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.type = 'admin'
    )
  );

CREATE POLICY "Admins can insert content links"
  ON coaching_topic_content_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.type = 'admin'
    )
  );

CREATE POLICY "Admins can update content links"
  ON coaching_topic_content_links
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.type = 'admin'
    )
  );

CREATE POLICY "Admins can delete content links"
  ON coaching_topic_content_links
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.type = 'admin'
    )
  );
