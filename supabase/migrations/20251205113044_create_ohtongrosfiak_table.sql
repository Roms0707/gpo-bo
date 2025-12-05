/*
  # Create ohtongrosfiak table

  1. New Tables
    - `ohtongrosfiak`
      - `id` (uuid, primary key) - Unique identifier for each record
      - `bbl` (text) - First data column
      - `guzman` (text) - Second data column
      - `created_at` (timestamptz) - Timestamp when record was created
  
  2. Security
    - Enable RLS on `ohtongrosfiak` table
    - Add policy for authenticated users to read all data
    - Add policy for authenticated users to insert their own data
    - Add policy for authenticated users to update their own data
    - Add policy for authenticated users to delete their own data
*/

CREATE TABLE IF NOT EXISTS ohtongrosfiak (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bbl text,
  guzman text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ohtongrosfiak ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all ohtongrosfiak data"
  ON ohtongrosfiak
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ohtongrosfiak data"
  ON ohtongrosfiak
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ohtongrosfiak data"
  ON ohtongrosfiak
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete ohtongrosfiak data"
  ON ohtongrosfiak
  FOR DELETE
  TO authenticated
  USING (true);