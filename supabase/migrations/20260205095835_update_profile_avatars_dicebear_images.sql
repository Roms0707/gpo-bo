/*
  # Update Profile Avatars with Game-Inspired DiceBear Images

  1. Changes
    - Updates all profile_avatars records with new DiceBear-generated avatar URLs
    - Each game affinity uses a distinct art style:
      - League of Legends (lol): bottts style - robotic/fantasy characters
      - Warzone: pixel-art style - military-themed pixel characters
      - Valorant: shapes style - geometric abstract designs with neon colors
      - CS2: identicon style - tactical abstract patterns
      - Apex Legends: lorelei style - futuristic character designs
      - Universal: avataaars style - general gaming character avatars

  2. Notes
    - Uses DiceBear v7.x API for reliable avatar generation
    - Each avatar uses its name as the seed for consistent generation
    - Mixed styles create visual variety across all collections
*/

-- League of Legends avatars (bottts style)
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/bottts/svg?seed=SummonerApprentice&backgroundColor=1a1a2e' WHERE name = 'Summoner Apprentice';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/bottts/svg?seed=ArmoredWarrior&backgroundColor=2d132c' WHERE name = 'Armored Warrior';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/bottts/svg?seed=ArcaneMage&backgroundColor=190a32' WHERE name = 'Arcane Mage';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/bottts/svg?seed=DragonKnight&backgroundColor=2c1654' WHERE name = 'Dragon Knight';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/bottts/svg?seed=CosmicEmperor&backgroundColor=0f0e17' WHERE name = 'Cosmic Emperor';

-- Warzone avatars (pixel-art style)
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=RecruitSoldier&backgroundColor=1c1c1c' WHERE name = 'Recruit Soldier';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=TacticalOperator&backgroundColor=2d2d2d' WHERE name = 'Tactical Operator';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=GhostSniper&backgroundColor=1a1a2e' WHERE name = 'Ghost Sniper';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=BlackOpsCommander&backgroundColor=0d0d0d' WHERE name = 'Black Ops Commander';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=LegendaryGhost&backgroundColor=111111' WHERE name = 'Legendary Ghost';

-- Valorant avatars (shapes style)
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/shapes/svg?seed=NewAgent&backgroundColor=0f1923' WHERE name = 'New Agent';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/shapes/svg?seed=RadiantDuelist&backgroundColor=ff4655,0f1923' WHERE name = 'Radiant Duelist';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/shapes/svg?seed=ShieldSentinel&backgroundColor=1a237e' WHERE name = 'Shield Sentinel';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/shapes/svg?seed=SmokeController&backgroundColor=0d1117' WHERE name = 'Smoke Controller';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/shapes/svg?seed=RadiantAscended&backgroundColor=ff4655' WHERE name = 'Radiant Ascended';

-- CS2 avatars (identicon style)
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/identicon/svg?seed=RookieCT&backgroundColor=1e3a5f' WHERE name = 'Rookie CT';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/identicon/svg?seed=SWATLeader&backgroundColor=0f2942' WHERE name = 'SWAT Leader';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/identicon/svg?seed=EliteMercenary&backgroundColor=1a1a2e' WHERE name = 'Elite Mercenary';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/identicon/svg?seed=VeteranCommander&backgroundColor=0a1628' WHERE name = 'Veteran Commander';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/identicon/svg?seed=GlobalElite&backgroundColor=ffc107' WHERE name = 'Global Elite';

-- Apex Legends avatars (lorelei style)
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/lorelei/svg?seed=NewLegend&backgroundColor=1a1a2e' WHERE name = 'New Legend';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/lorelei/svg?seed=AssaultFighter&backgroundColor=d62828' WHERE name = 'Assault Fighter';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/lorelei/svg?seed=ReconSpecialist&backgroundColor=1d3557' WHERE name = 'Recon Specialist';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/lorelei/svg?seed=SupportMedic&backgroundColor=2a9d8f' WHERE name = 'Support Medic';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/lorelei/svg?seed=ApexPredator&backgroundColor=e63946' WHERE name = 'Apex Predator';

-- Universal avatars (avataaars style)
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=GamingEnthusiast&backgroundColor=6366f1' WHERE name = 'Gaming Enthusiast';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=EsportsPlayer&backgroundColor=8b5cf6' WHERE name = 'Esports Player';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=TeamCaptain&backgroundColor=ec4899' WHERE name = 'Team Captain';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=TournamentFinalist&backgroundColor=f59e0b' WHERE name = 'Tournament Finalist';
UPDATE profile_avatars SET image_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=WorldChampion&backgroundColor=fbbf24' WHERE name = 'World Champion';
