/*
  # Allow users to self-assign quests

  1. Security Changes
    - Add INSERT policy on `user_quests` for authenticated users
    - Users can only insert rows where `user_id` matches their own `auth.uid()`
    - This enables the frontend to assign quests to the logged-in user based on profile setup

  2. Important Notes
    - The existing admin and service_role INSERT policies remain unchanged
    - Users cannot insert quests for other users
    - The USING clause is not needed for INSERT; only WITH CHECK is used
*/

CREATE POLICY "Users can self-assign quests"
  ON user_quests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
