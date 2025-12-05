/*
  # Create toto table

  1. New Tables
    - `toto`
      - `id` (uuid, primary key) - Unique identifier for each record
      - `tamere` (text) - String field for storing text data
      - `created_at` (timestamptz) - Timestamp of record creation
  
  2. Security
    - Enable RLS on `toto` table
    - Add policy for authenticated users to read all data
    - Add policy for authenticated users to insert their own data
    - Add policy for authenticated users to update their own data
    - Add policy for authenticated users to delete their own data
*/

CREATE TABLE IF NOT EXISTS toto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tamere text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE toto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all toto records"
  ON toto
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert toto records"
  ON toto
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update all toto records"
  ON toto
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete all toto records"
  ON toto
  FOR DELETE
  TO authenticated
  USING (true);