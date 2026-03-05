/*
  # Drop game_contents and related playlist/progress tables

  This migration removes the local content storage tables that are no longer needed
  now that content is fetched on-demand from the Galaxy API.

  1. Dropped Tables
    - `playlist_videos` - Junction table linking playlists to game_contents (has FK to both video_playlists and game_contents)
    - `video_playlists` - Auto-generated video playlists per game
    - `playlist_keyword_mappings` - Keyword config for auto-categorizing videos into playlists
    - `user_video_progress` - User watch progress tracking for videos
    - `game_contents` - Cached Galaxy content items per game (replaced by on-demand API calls)

  2. Security Changes
    - All RLS policies on the above tables are removed automatically with the table drops

  3. Important Notes
    - `coaching_content_recommendations.content_id` has no actual FK to `game_contents` so no constraint needs to be dropped
    - `playlist_videos` FK to `game_contents` is removed by dropping `playlist_videos` first
    - All associated indexes, triggers, and constraints are removed automatically
*/

DROP TABLE IF EXISTS playlist_videos;

DROP TABLE IF EXISTS video_playlists;

DROP TABLE IF EXISTS playlist_keyword_mappings;

DROP TABLE IF EXISTS user_video_progress;

DROP TABLE IF EXISTS game_contents;
