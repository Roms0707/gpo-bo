/*
  # Add Typewriter Phrase Columns to Project Configurations

  1. Changes
    - `typewriter_phrase_1` (text) - First customizable typewriter phrase for the hero section
    - `typewriter_phrase_2` (text) - Second customizable typewriter phrase for the hero section

  2. Purpose
    - Allow project configurations to customize the typewriter animation text
    - Each project can have unique phrases displayed in their hero carousel
*/

ALTER TABLE project_configurations
ADD COLUMN IF NOT EXISTS typewriter_phrase_1 text,
ADD COLUMN IF NOT EXISTS typewriter_phrase_2 text;
