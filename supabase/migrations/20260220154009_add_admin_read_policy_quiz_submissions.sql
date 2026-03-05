/*
  # Add Admin Read Policy for Quiz Submissions

  Allows super_admin and master_admin users to read all quiz submissions
  across all users. This enables the admin Results tab in the Grind Zone
  Quiz page to display submission data for the selected configuration.

  1. Security Changes
    - New SELECT policy on grind_zone_quiz_submissions for admin users
    - Follows the same admin role check pattern used in report_shares,
      tournament_reports, and storage bucket policies
    - Only grants read access -- admins cannot modify user submissions

  2. Important Notes
    - Uses the existing admin_role_type enum values: super_admin, master_admin
    - Checks users.type = 'admin' AND users.role IN (super_admin, master_admin)
    - Combined with the existing user self-read policy, this gives admins
      visibility while users retain access to only their own data
*/

CREATE POLICY "Admins can read all quiz submissions"
  ON grind_zone_quiz_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.type = 'admin'
        AND users.role = ANY (ARRAY['super_admin'::public.admin_role_type, 'master_admin'::public.admin_role_type])
    )
  );