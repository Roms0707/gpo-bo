/*
  # Create Game Coaching UI Configuration Table

  1. New Tables
    - `game_coaching_ui_config`
      - `id` (uuid, primary key) - Unique identifier
      - `game_id` (uuid, foreign key, unique) - References games table
      - `game_category` (text) - Category: moba, fps, hero_shooter, battle_royale, sports, racing, fighting, card, autobattler
      - `character_field_label` (text) - Label for character field (e.g., "Main Agents", "Main Heroes")
      - `character_field_placeholder` (text) - Placeholder text with examples
      - `stats_platforms` (jsonb) - Array of platform configs with name, url_pattern, url_example
      - `rank_tiers` (jsonb) - Custom rank options for dropdown
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `game_coaching_ui_config` table
    - Add policy for all authenticated users to read configs (public read)
    - Only service role can insert/update/delete

  3. Indexes
    - Index on game_id for efficient lookups
*/

CREATE TABLE IF NOT EXISTS game_coaching_ui_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  game_category text NOT NULL DEFAULT 'default',
  character_field_label text NOT NULL DEFAULT 'Main Characters',
  character_field_placeholder text,
  stats_platforms jsonb DEFAULT '[]'::jsonb,
  rank_tiers jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_game_coaching_config UNIQUE (game_id)
);

ALTER TABLE game_coaching_ui_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read game coaching configs"
  ON game_coaching_ui_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_game_coaching_ui_config_game_id
  ON game_coaching_ui_config(game_id);

CREATE INDEX IF NOT EXISTS idx_game_coaching_ui_config_category
  ON game_coaching_ui_config(game_category);
