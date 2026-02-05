/*
  # Add Foreign Key Constraint for Playlist Videos

  1. Changes
    - Adds foreign key constraint from `playlist_videos.content_id` to `game_contents.id`
    - This enables Supabase PostgREST to resolve embedded relationship queries
    - Uses ON DELETE CASCADE to automatically remove playlist_videos when the referenced game_content is deleted

  2. Purpose
    - Fixes the 400 error when querying playlist_videos with embedded video content
    - Enables the `video:content_id(...)` syntax in Supabase queries
*/

ALTER TABLE IF EXISTS playlist_videos 
ADD CONSTRAINT playlist_videos_content_id_fkey 
FOREIGN KEY (content_id) REFERENCES game_contents(id) ON DELETE CASCADE;
