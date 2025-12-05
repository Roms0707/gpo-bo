/*
  # Create bigfloetoli table

  1. New Tables
    - `bigfloetoli`
      - `id` (uuid, primary key) - Unique identifier
      - `bigflo` (text) - First column
      - `oli` (text) - Second column
      - `created_at` (timestamptz) - Timestamp of record creation
      
  2. Security
    - Enable RLS on `bigfloetoli` table
    - Add policies for authenticated users to manage their data
*/

CREATE TABLE IF NOT EXISTS bigfloetoli (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bigflo text,
  oli text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bigfloetoli ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all bigfloetoli"
  ON bigfloetoli
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert bigfloetoli"
  ON bigfloetoli
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update bigfloetoli"
  ON bigfloetoli
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete bigfloetoli"
  ON bigfloetoli
  FOR DELETE
  TO authenticated
  USING (true);