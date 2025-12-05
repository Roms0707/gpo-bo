/*
  # Create Tournament Reports System

  1. New Tables
    - `tournament_reports`
      - `id` (uuid, primary key)
      - `tournament_id` (uuid, foreign key to tournaments)
      - `title` (text) - Custom title for the report
      - `snapshot_data` (jsonb) - Captured statistics data
      - `notes` (text) - Custom notes and context
      - `period_start` (timestamptz) - Start of reporting period
      - `period_end` (timestamptz) - End of reporting period
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key to users)
      
    - `report_shares`
      - `id` (uuid, primary key)
      - `report_id` (uuid, foreign key to tournament_reports)
      - `share_token` (text, unique) - Unique token for public access
      - `expires_at` (timestamptz) - Expiration date
      - `is_active` (boolean) - Can be manually deactivated
      - `view_count` (integer) - Track number of views
      - `last_viewed_at` (timestamptz) - Last view timestamp
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key to users)

  2. Security
    - Enable RLS on both tables
    - Admins can create and manage reports
    - Public can view active, non-expired shared reports via token
    - Track view counts for analytics

  3. Indexes
    - Index on share_token for fast public lookups
    - Index on tournament_id for filtering
    - Index on expires_at for cleanup queries
*/

-- Create tournament_reports table
CREATE TABLE IF NOT EXISTS tournament_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  title text NOT NULL,
  snapshot_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Create report_shares table
CREATE TABLE IF NOT EXISTS report_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES tournament_reports(id) ON DELETE CASCADE NOT NULL,
  share_token text UNIQUE NOT NULL,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  view_count integer DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournament_reports_tournament_id ON tournament_reports(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_reports_created_at ON tournament_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_shares_share_token ON report_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_report_shares_report_id ON report_shares(report_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_expires_at ON report_shares(expires_at);

-- Enable RLS
ALTER TABLE tournament_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament_reports

-- Admins can view all reports
CREATE POLICY "Admins can view all tournament reports"
  ON tournament_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Admins can create reports
CREATE POLICY "Admins can create tournament reports"
  ON tournament_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Admins can update their own reports
CREATE POLICY "Admins can update tournament reports"
  ON tournament_reports FOR UPDATE
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

-- Admins can delete reports
CREATE POLICY "Admins can delete tournament reports"
  ON tournament_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- RLS Policies for report_shares

-- Admins can view all shares
CREATE POLICY "Admins can view all report shares"
  ON report_shares FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Public can view active, non-expired shares (for viewing reports)
CREATE POLICY "Public can view active report shares"
  ON report_shares FOR SELECT
  TO anon
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Admins can create shares
CREATE POLICY "Admins can create report shares"
  ON report_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Admins can update shares (for deactivation, view counts)
CREATE POLICY "Admins can update report shares"
  ON report_shares FOR UPDATE
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

-- Allow anon users to increment view count
CREATE POLICY "Public can update view count on active shares"
  ON report_shares FOR UPDATE
  TO anon
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  )
  WITH CHECK (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Admins can delete shares
CREATE POLICY "Admins can delete report shares"
  ON report_shares FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Function to generate unique share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  token text;
  exists boolean;
BEGIN
  LOOP
    -- Generate a random 32-character alphanumeric token
    token := encode(gen_random_bytes(24), 'base64');
    -- Remove non-alphanumeric characters and limit to 32 chars
    token := regexp_replace(token, '[^a-zA-Z0-9]', '', 'g');
    token := substring(token from 1 for 32);
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM report_shares WHERE share_token = token) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN token;
END;
$$;