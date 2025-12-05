/*
  # Create admin settings table

  1. New Tables
    - `admin_settings`
      - `id` (integer, primary key)
      - `site_name` (text)
      - `support_email` (text)
      - `timezone` (text)
      - `language` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  2. Security
    - Enable RLS on `admin_settings` table
    - Add policy for administrators to manage settings
    - Add policy for public to read basic settings
  3. Default Data
    - Insert default settings record
  4. Triggers
    - Add trigger to update the `updated_at` timestamp
*/

CREATE TABLE IF NOT EXISTS admin_settings (
  id integer PRIMARY KEY DEFAULT 1,
  site_name text DEFAULT 'Gaming Tournaments',
  support_email text DEFAULT 'support@gamingtournaments.com',
  timezone text DEFAULT 'UTC',
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Policy for administrators to manage all settings
CREATE POLICY "Administrators can manage admin settings"
  ON admin_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.type = 'admin'
    )
  );

-- Policy for public read access to basic settings (site name, etc.)
CREATE POLICY "Public can read basic admin settings"
  ON admin_settings
  FOR SELECT
  TO public
  USING (true);

-- Insert default settings if table is empty
INSERT INTO admin_settings (id, site_name, support_email, timezone, language)
VALUES (1, 'Gaming Tournaments', 'support@gamingtournaments.com', 'UTC', 'en')
ON CONFLICT (id) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_settings_updated_at();