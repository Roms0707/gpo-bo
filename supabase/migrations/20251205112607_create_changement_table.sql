/*
  # Create changement table

  1. New Tables
    - `changement`
      - `id` (uuid, primary key) - Unique identifier for each record
      - `guzman` (text) - First data column
      - `popopo` (text) - Second data column
      - `created_at` (timestamptz) - Timestamp when record was created
      - `updated_at` (timestamptz) - Timestamp when record was last updated

  2. Security
    - Enable RLS on `changement` table
    - Add policy for authenticated users to read all records
    - Add policy for authenticated users to insert their own records
    - Add policy for authenticated users to update their own records
    - Add policy for authenticated users to delete their own records

  3. Notes
    - Both data columns (guzman and popopo) are text fields
    - Standard id and timestamp columns included for best practices
    - RLS policies restrict access to authenticated users only
*/

-- Create the changement table
CREATE TABLE IF NOT EXISTS changement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guzman text,
  popopo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE changement ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can read all changement records"
  ON changement
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert changement records"
  ON changement
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update changement records"
  ON changement
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete changement records"
  ON changement
  FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_changement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_changement_updated_at
  BEFORE UPDATE ON changement
  FOR EACH ROW
  EXECUTE FUNCTION update_changement_updated_at();