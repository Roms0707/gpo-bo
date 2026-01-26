/*
  # Update "Other Games" Icon to Shapes

  1. Changes
    - Updates the image_url for the "Other Games" entry to use the Lucide Shapes icon
    - Uses the official Lucide CDN via unpkg for reliable hosting

  2. Notes
    - This provides a more distinctive icon that represents variety/miscellaneous games
    - The Shapes icon visually conveys diversity without being confused with standard gamepad icons
*/

UPDATE games
SET image_url = 'https://unpkg.com/lucide-static@latest/icons/shapes.svg'
WHERE name = 'Other Games';
