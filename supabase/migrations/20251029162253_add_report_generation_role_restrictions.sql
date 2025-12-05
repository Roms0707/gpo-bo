/*
  # Add Role-Based Access Control for Tournament Reports

  ## Summary
  This migration implements role-based access control (RBAC) for tournament report generation,
  ensuring that only users with super_admin or master_admin roles can create and manage reports.

  ## Changes Made

  1. **Row Level Security Policies**
     - Enable RLS on tournament_reports table
     - Add policy to restrict INSERT operations to super_admin and master_admin only
     - Add policy to allow SELECT for all authenticated admin users
     - Add policy to restrict UPDATE to super_admin and master_admin only
     - Add policy to restrict DELETE to super_admin and master_admin only

  2. **Row Level Security for Report Shares**
     - Enable RLS on report_shares table
     - Add policies to restrict share management to report creators and elevated admins
     - Allow public SELECT for active, non-expired shares (for public report viewing)

  ## Security Notes
  - Regular admin users can VIEW all reports but cannot CREATE, UPDATE, or DELETE them
  - Only super_admin and master_admin can generate new reports
  - Report shares follow the same access control as reports
  - Public report viewing is allowed via valid share tokens
*/

-- Enable Row Level Security on tournament_reports if not already enabled
ALTER TABLE tournament_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow super_admin and master_admin to insert reports" ON tournament_reports;
DROP POLICY IF EXISTS "Allow all authenticated admins to view reports" ON tournament_reports;
DROP POLICY IF EXISTS "Allow super_admin and master_admin to update reports" ON tournament_reports;
DROP POLICY IF EXISTS "Allow super_admin and master_admin to delete reports" ON tournament_reports;

-- Policy: Only super_admin and master_admin can create reports
CREATE POLICY "Allow super_admin and master_admin to insert reports"
  ON tournament_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
      AND users.role IN ('super_admin', 'master_admin')
    )
  );

-- Policy: All authenticated admin users can view reports
CREATE POLICY "Allow all authenticated admins to view reports"
  ON tournament_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Policy: Only super_admin and master_admin can update reports
CREATE POLICY "Allow super_admin and master_admin to update reports"
  ON tournament_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
      AND users.role IN ('super_admin', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
      AND users.role IN ('super_admin', 'master_admin')
    )
  );

-- Policy: Only super_admin and master_admin can delete reports
CREATE POLICY "Allow super_admin and master_admin to delete reports"
  ON tournament_reports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
      AND users.role IN ('super_admin', 'master_admin')
    )
  );

-- Enable Row Level Security on report_shares if not already enabled
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow super_admin and master_admin to create shares" ON report_shares;
DROP POLICY IF EXISTS "Allow all authenticated admins to view shares" ON report_shares;
DROP POLICY IF EXISTS "Allow public to view active shares for report access" ON report_shares;
DROP POLICY IF EXISTS "Allow super_admin and master_admin to update shares" ON report_shares;
DROP POLICY IF EXISTS "Allow super_admin and master_admin to delete shares" ON report_shares;

-- Policy: Only super_admin and master_admin can create share links
CREATE POLICY "Allow super_admin and master_admin to create shares"
  ON report_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
      AND users.role IN ('super_admin', 'master_admin')
    )
  );

-- Policy: All authenticated admin users can view shares
CREATE POLICY "Allow all authenticated admins to view shares"
  ON report_shares
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Policy: Allow public to view active shares (for public report viewing)
CREATE POLICY "Allow public to view active shares for report access"
  ON report_shares
  FOR SELECT
  TO anon
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Policy: Only super_admin and master_admin can update shares
CREATE POLICY "Allow super_admin and master_admin to update shares"
  ON report_shares
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
      AND users.role IN ('super_admin', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
      AND users.role IN ('super_admin', 'master_admin')
    )
  );

-- Policy: Only super_admin and master_admin can delete shares
CREATE POLICY "Allow super_admin and master_admin to delete shares"
  ON report_shares
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
      AND users.role IN ('super_admin', 'master_admin')
    )
  );