/*
  # Create Masterclasses tables

  1. New Tables
    - `masterclasses`
      - `id` (uuid, primary key)
      - `title` (text, not null) - Series title
      - `slug` (text, unique, not null) - URL-friendly identifier
      - `description` (text) - Series description
      - `cover_image_url` (text) - Cover image for the series
      - `theme_tag` (text) - Category tag (e.g. "Pro Gaming", "History")
      - `is_featured` (boolean, default false) - Whether shown in hero section
      - `sort_order` (integer, default 0) - Display ordering
      - `created_at` (timestamptz, default now())

    - `masterclass_episodes`
      - `id` (uuid, primary key)
      - `masterclass_id` (uuid, FK to masterclasses) - Parent series
      - `episode_number` (integer, not null) - Episode order (1-3)
      - `title` (text, not null) - Episode title
      - `description` (text) - Episode description
      - `thumbnail_url` (text) - Episode thumbnail image
      - `duration_seconds` (integer, default 0) - Episode duration
      - `video_placeholder` (text) - Temporary field for Galaxy integration
      - `created_at` (timestamptz, default now())

  2. Indexes
    - Unique index on masterclasses.slug
    - Index on masterclasses.theme_tag
    - Index on masterclass_episodes.masterclass_id
    - Unique constraint on (masterclass_id, episode_number)

  3. Security
    - Enable RLS on both tables
    - Add SELECT policy for authenticated users on both tables

  4. Seed Data
    - 6 masterclass series with 3 episodes each
*/

-- Create masterclasses table
CREATE TABLE IF NOT EXISTS masterclasses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  cover_image_url text DEFAULT '',
  theme_tag text DEFAULT '',
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create masterclass_episodes table
CREATE TABLE IF NOT EXISTS masterclass_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  masterclass_id uuid NOT NULL REFERENCES masterclasses(id) ON DELETE CASCADE,
  episode_number integer NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  thumbnail_url text DEFAULT '',
  duration_seconds integer DEFAULT 0,
  video_placeholder text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE (masterclass_id, episode_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_masterclasses_theme_tag ON masterclasses(theme_tag);
CREATE INDEX IF NOT EXISTS idx_masterclass_episodes_masterclass_id ON masterclass_episodes(masterclass_id);

-- Enable RLS
ALTER TABLE masterclasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE masterclass_episodes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: authenticated users can read
CREATE POLICY "Authenticated users can view masterclasses"
  ON masterclasses
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view masterclass episodes"
  ON masterclass_episodes
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Seed masterclass series
INSERT INTO masterclasses (title, slug, description, cover_image_url, theme_tag, is_featured, sort_order) VALUES
(
  'Esports Legends: Stories That Made History',
  'esports-legends',
  'Dive into the incredible stories of the players and moments that defined competitive gaming. From legendary clutch plays to dynasty teams, discover how esports became a global phenomenon.',
  'https://images.pexels.com/photos/7862657/pexels-photo-7862657.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Esports',
  true,
  1
),
(
  'How to Be a Pro Player',
  'how-to-be-a-pro-player',
  'Learn the mindset, training routines, and strategies that separate amateur players from professional competitors. This masterclass covers everything from mechanical skills to mental resilience.',
  'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Pro Gaming',
  false,
  2
),
(
  'History of Fighting Games',
  'history-of-fighting-games',
  'From the arcades of the 1990s to modern esports arenas, explore the evolution of fighting games. Discover the iconic titles, legendary players, and cultural impact of the FGC.',
  'https://images.pexels.com/photos/4009599/pexels-photo-4009599.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'History',
  false,
  3
),
(
  'The Rise of Battle Royale',
  'rise-of-battle-royale',
  'How did the battle royale genre go from a niche mod to dominating the gaming industry? Trace the journey from ARMA mods to Fortnite, PUBG, and Apex Legends.',
  'https://images.pexels.com/photos/3945683/pexels-photo-3945683.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'History',
  false,
  4
),
(
  'Mastering Team Communication',
  'mastering-team-communication',
  'Effective communication is the backbone of any winning team. Learn the callout systems, leadership styles, and conflict resolution techniques used by top esports teams.',
  'https://images.pexels.com/photos/7915437/pexels-photo-7915437.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Strategy',
  false,
  5
),
(
  'The Art of Game Design',
  'art-of-game-design',
  'Go behind the scenes to understand how competitive games are designed and balanced. From map design to character abilities, learn what makes a great esports title.',
  'https://images.pexels.com/photos/5926389/pexels-photo-5926389.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Behind the Scenes',
  false,
  6
);

-- Seed episodes for each masterclass
-- Esports Legends
INSERT INTO masterclass_episodes (masterclass_id, episode_number, title, description, thumbnail_url, duration_seconds, video_placeholder)
SELECT m.id, ep.episode_number, ep.title, ep.description, ep.thumbnail_url, ep.duration_seconds, 'galaxy_placeholder'
FROM masterclasses m
CROSS JOIN (VALUES
  (1, 'The Birth of Competitive Gaming', 'Explore the origins of esports from early LAN parties to the first major tournaments that put competitive gaming on the map.', 'https://images.pexels.com/photos/3945657/pexels-photo-3945657.jpeg?auto=compress&cs=tinysrgb&w=800', 1440),
  (2, 'Iconic Moments and Legendary Players', 'Relive the most unforgettable moments in esports history and meet the players whose skills became legendary.', 'https://images.pexels.com/photos/7915286/pexels-photo-7915286.jpeg?auto=compress&cs=tinysrgb&w=800', 1620),
  (3, 'The Future of Esports', 'Where is competitive gaming headed? From mobile esports to VR competitions, discover what the next chapter holds.', 'https://images.pexels.com/photos/7862519/pexels-photo-7862519.jpeg?auto=compress&cs=tinysrgb&w=800', 1380)
) AS ep(episode_number, title, description, thumbnail_url, duration_seconds)
WHERE m.slug = 'esports-legends';

-- How to Be a Pro Player
INSERT INTO masterclass_episodes (masterclass_id, episode_number, title, description, thumbnail_url, duration_seconds, video_placeholder)
SELECT m.id, ep.episode_number, ep.title, ep.description, ep.thumbnail_url, ep.duration_seconds, 'galaxy_placeholder'
FROM masterclasses m
CROSS JOIN (VALUES
  (1, 'Building Your Foundation', 'Master the fundamentals: aim training, game sense, and developing a practice routine that actually works.', 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=800', 1560),
  (2, 'The Competitive Mindset', 'Learn mental resilience, how to handle pressure, and the psychology behind peak performance in gaming.', 'https://images.pexels.com/photos/7915509/pexels-photo-7915509.jpeg?auto=compress&cs=tinysrgb&w=800', 1380),
  (3, 'Going Pro: The Path Forward', 'Navigate the journey from ranked ladder to professional play. Team tryouts, networking, and building your brand.', 'https://images.pexels.com/photos/9072388/pexels-photo-9072388.jpeg?auto=compress&cs=tinysrgb&w=800', 1500)
) AS ep(episode_number, title, description, thumbnail_url, duration_seconds)
WHERE m.slug = 'how-to-be-a-pro-player';

-- History of Fighting Games
INSERT INTO masterclass_episodes (masterclass_id, episode_number, title, description, thumbnail_url, duration_seconds, video_placeholder)
SELECT m.id, ep.episode_number, ep.title, ep.description, ep.thumbnail_url, ep.duration_seconds, 'galaxy_placeholder'
FROM masterclasses m
CROSS JOIN (VALUES
  (1, 'The Arcade Era', 'From Street Fighter II to Mortal Kombat, discover how the arcade scene birthed an entire competitive community.', 'https://images.pexels.com/photos/4009599/pexels-photo-4009599.jpeg?auto=compress&cs=tinysrgb&w=800', 1320),
  (2, 'Evolution and Innovation', 'How 3D fighters, crossover titles, and online play transformed the fighting game landscape.', 'https://images.pexels.com/photos/4842489/pexels-photo-4842489.jpeg?auto=compress&cs=tinysrgb&w=800', 1440),
  (3, 'The FGC Today', 'The modern fighting game community: EVO, grassroots tournaments, and the new generation of players keeping the spirit alive.', 'https://images.pexels.com/photos/7862657/pexels-photo-7862657.jpeg?auto=compress&cs=tinysrgb&w=800', 1260)
) AS ep(episode_number, title, description, thumbnail_url, duration_seconds)
WHERE m.slug = 'history-of-fighting-games';

-- The Rise of Battle Royale
INSERT INTO masterclass_episodes (masterclass_id, episode_number, title, description, thumbnail_url, duration_seconds, video_placeholder)
SELECT m.id, ep.episode_number, ep.title, ep.description, ep.thumbnail_url, ep.duration_seconds, 'galaxy_placeholder'
FROM masterclasses m
CROSS JOIN (VALUES
  (1, 'From Mods to Mainstream', 'Trace the origins of battle royale from ARMA mods and H1Z1 to PlayerUnknown''s Battlegrounds.', 'https://images.pexels.com/photos/3945683/pexels-photo-3945683.jpeg?auto=compress&cs=tinysrgb&w=800', 1500),
  (2, 'The Fortnite Phenomenon', 'How Fortnite redefined gaming culture, attracted millions, and turned battle royale into a global entertainment event.', 'https://images.pexels.com/photos/7915437/pexels-photo-7915437.jpeg?auto=compress&cs=tinysrgb&w=800', 1680),
  (3, 'Battle Royale Evolved', 'Apex Legends, Warzone, and beyond: how the genre continues to innovate and shape competitive gaming.', 'https://images.pexels.com/photos/3945657/pexels-photo-3945657.jpeg?auto=compress&cs=tinysrgb&w=800', 1380)
) AS ep(episode_number, title, description, thumbnail_url, duration_seconds)
WHERE m.slug = 'rise-of-battle-royale';

-- Mastering Team Communication
INSERT INTO masterclass_episodes (masterclass_id, episode_number, title, description, thumbnail_url, duration_seconds, video_placeholder)
SELECT m.id, ep.episode_number, ep.title, ep.description, ep.thumbnail_url, ep.duration_seconds, 'galaxy_placeholder'
FROM masterclasses m
CROSS JOIN (VALUES
  (1, 'Communication Fundamentals', 'Learn the core principles of effective in-game communication: clarity, timing, and information hierarchy.', 'https://images.pexels.com/photos/7915437/pexels-photo-7915437.jpeg?auto=compress&cs=tinysrgb&w=800', 1260),
  (2, 'Advanced Callout Systems', 'Build structured callout systems for different game types. Map callouts, enemy positions, and resource management.', 'https://images.pexels.com/photos/7862519/pexels-photo-7862519.jpeg?auto=compress&cs=tinysrgb&w=800', 1440),
  (3, 'Leadership and Team Dynamics', 'Develop leadership skills, resolve conflicts, and create a positive team environment that drives performance.', 'https://images.pexels.com/photos/7915286/pexels-photo-7915286.jpeg?auto=compress&cs=tinysrgb&w=800', 1380)
) AS ep(episode_number, title, description, thumbnail_url, duration_seconds)
WHERE m.slug = 'mastering-team-communication';

-- The Art of Game Design
INSERT INTO masterclass_episodes (masterclass_id, episode_number, title, description, thumbnail_url, duration_seconds, video_placeholder)
SELECT m.id, ep.episode_number, ep.title, ep.description, ep.thumbnail_url, ep.duration_seconds, 'galaxy_placeholder'
FROM masterclasses m
CROSS JOIN (VALUES
  (1, 'Designing for Competition', 'What makes a game competitively viable? Explore the design principles behind the most successful esports titles.', 'https://images.pexels.com/photos/5926389/pexels-photo-5926389.jpeg?auto=compress&cs=tinysrgb&w=800', 1500),
  (2, 'Balance and Meta', 'Understand how developers approach game balance, meta shifts, and the delicate art of keeping competition fresh.', 'https://images.pexels.com/photos/4842489/pexels-photo-4842489.jpeg?auto=compress&cs=tinysrgb&w=800', 1620),
  (3, 'Maps, Modes, and Player Experience', 'From map layout to game modes, discover how spatial design and gameplay mechanics shape the competitive experience.', 'https://images.pexels.com/photos/9072388/pexels-photo-9072388.jpeg?auto=compress&cs=tinysrgb&w=800', 1440)
) AS ep(episode_number, title, description, thumbnail_url, duration_seconds)
WHERE m.slug = 'art-of-game-design';