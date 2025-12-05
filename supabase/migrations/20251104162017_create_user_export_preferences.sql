/*
  # Create User Export Preferences System

  1. New Tables
    - `user_export_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users table)
      - `selected_fields` (jsonb, stores array of field names user has selected)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `user_export_preferences` table
    - Add policy for authenticated users to read their own preferences
    - Add policy for authenticated users to insert their own preferences
    - Add policy for authenticated users to update their own preferences
  
  3. Notes
    - Stores user's CSV export field preferences for persistence across sessions
    - Only master_admin and super_admin users will use this feature
    - Uses JSONB for flexible storage of field selection arrays
*/

-- Create the user_export_preferences table
CREATE TABLE IF NOT EXISTS user_export_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  selected_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_export_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own export preferences
CREATE POLICY "Users can read own export preferences"
  ON user_export_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own export preferences
CREATE POLICY "Users can insert own export preferences"
  ON user_export_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own export preferences
CREATE POLICY "Users can update own export preferences"
  ON user_export_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_export_preferences_user_id 
  ON user_export_preferences(user_id);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_export_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_export_preferences_updated_at
  BEFORE UPDATE ON user_export_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_export_preferences_updated_at();