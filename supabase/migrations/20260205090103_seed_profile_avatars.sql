/*
  # Seed Profile Avatars

  This migration seeds the profile_avatars table with 30 esports-themed avatars
  across 6 game collections: League of Legends, Warzone, Valorant, CS2, Apex Legends, and Universal.

  Each collection has 5 avatars:
    - 1 Common (free)
    - 2 Rare (500-1500 XP)
    - 1 Epic (3000-5000 XP)
    - 1 Legendary (12000-20000 XP)

  Avatar images are realistic/cartoon style gaming character portraits.
*/

-- League of Legends Collection (5 avatars)
INSERT INTO profile_avatars (name, description, image_url, game_affinity, rarity, unlock_type, unlock_requirement, sort_order, is_available) VALUES
('Summoner Apprentice', 'A young mage beginning their journey on the Rift', 'https://images.pexels.com/photos/7562313/pexels-photo-7562313.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'lol', 'common', 'free', '{}'::jsonb, 1, true),
('Armored Warrior', 'A battle-hardened knight with a glowing enchanted blade', 'https://images.pexels.com/photos/8721342/pexels-photo-8721342.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'lol', 'rare', 'xp', '{"xp": 500}'::jsonb, 2, true),
('Arcane Mage', 'A powerful sorcerer channeling mystical energies', 'https://images.pexels.com/photos/7562076/pexels-photo-7562076.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'lol', 'rare', 'xp', '{"xp": 1000}'::jsonb, 3, true),
('Dragon Knight', 'An elite champion adorned with draconic armor', 'https://images.pexels.com/photos/8721318/pexels-photo-8721318.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'lol', 'epic', 'xp', '{"xp": 3500}'::jsonb, 4, true),
('Cosmic Emperor', 'A celestial being of immense power wearing starforged armor', 'https://images.pexels.com/photos/7562139/pexels-photo-7562139.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'lol', 'legendary', 'xp', '{"xp": 15000}'::jsonb, 5, true),

-- Warzone/Call of Duty Collection (5 avatars)
('Recruit Soldier', 'A fresh operative ready for deployment', 'https://images.pexels.com/photos/5473184/pexels-photo-5473184.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'warzone', 'common', 'free', '{}'::jsonb, 6, true),
('Tactical Operator', 'An elite soldier equipped with night vision and advanced gear', 'https://images.pexels.com/photos/5473298/pexels-photo-5473298.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'warzone', 'rare', 'xp', '{"xp": 750}'::jsonb, 7, true),
('Ghost Sniper', 'A precision marksman in ghillie camouflage', 'https://images.pexels.com/photos/5473177/pexels-photo-5473177.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'warzone', 'rare', 'xp', '{"xp": 1200}'::jsonb, 8, true),
('Black Ops Commander', 'A decorated special forces leader', 'https://images.pexels.com/photos/5473302/pexels-photo-5473302.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'warzone', 'epic', 'xp', '{"xp": 4000}'::jsonb, 9, true),
('Legendary Ghost', 'The iconic skull-masked operator with gold insignia', 'https://images.pexels.com/photos/5473186/pexels-photo-5473186.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'warzone', 'legendary', 'xp', '{"xp": 18000}'::jsonb, 10, true),

-- Valorant Collection (5 avatars)
('New Agent', 'A newly recruited agent ready to prove themselves', 'https://images.pexels.com/photos/7915357/pexels-photo-7915357.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'valorant', 'common', 'free', '{}'::jsonb, 11, true),
('Radiant Duelist', 'An aggressive fighter wielding a radianite blade', 'https://images.pexels.com/photos/7915437/pexels-photo-7915437.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'valorant', 'rare', 'xp', '{"xp": 600}'::jsonb, 12, true),
('Shield Sentinel', 'A defensive specialist with advanced barrier tech', 'https://images.pexels.com/photos/7915286/pexels-photo-7915286.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'valorant', 'rare', 'xp', '{"xp": 1100}'::jsonb, 13, true),
('Smoke Controller', 'A tactical mastermind manipulating the battlefield', 'https://images.pexels.com/photos/7915527/pexels-photo-7915527.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'valorant', 'epic', 'xp', '{"xp": 3800}'::jsonb, 14, true),
('Radiant Ascended', 'A legendary agent with fully awakened radiant powers', 'https://images.pexels.com/photos/7915280/pexels-photo-7915280.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'valorant', 'legendary', 'xp', '{"xp": 16000}'::jsonb, 15, true),

-- CS2 Collection (5 avatars)
('Rookie CT', 'A fresh counter-terrorist recruit in basic gear', 'https://images.pexels.com/photos/6498990/pexels-photo-6498990.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'cs2', 'common', 'free', '{}'::jsonb, 16, true),
('SWAT Leader', 'An experienced tactical unit commander', 'https://images.pexels.com/photos/5473950/pexels-photo-5473950.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'cs2', 'rare', 'xp', '{"xp": 550}'::jsonb, 17, true),
('Elite Mercenary', 'A skilled professional with custom loadout', 'https://images.pexels.com/photos/5473961/pexels-photo-5473961.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'cs2', 'rare', 'xp', '{"xp": 1300}'::jsonb, 18, true),
('Veteran Commander', 'A decorated veteran with service medals', 'https://images.pexels.com/photos/5473944/pexels-photo-5473944.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'cs2', 'epic', 'xp', '{"xp": 4500}'::jsonb, 19, true),
('Global Elite', 'The pinnacle of competitive excellence with gold insignia', 'https://images.pexels.com/photos/5473943/pexels-photo-5473943.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'cs2', 'legendary', 'xp', '{"xp": 20000}'::jsonb, 20, true),

-- Apex Legends Collection (5 avatars)
('New Legend', 'A competitor entering the Apex Games', 'https://images.pexels.com/photos/7862353/pexels-photo-7862353.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'apex', 'common', 'free', '{}'::jsonb, 21, true),
('Assault Fighter', 'An aggressive legend built for combat', 'https://images.pexels.com/photos/7862361/pexels-photo-7862361.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'apex', 'rare', 'xp', '{"xp": 700}'::jsonb, 22, true),
('Recon Specialist', 'A tracker legend with scanning abilities', 'https://images.pexels.com/photos/7862354/pexels-photo-7862354.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'apex', 'rare', 'xp', '{"xp": 1400}'::jsonb, 23, true),
('Support Medic', 'A healing legend with advanced holo-tech', 'https://images.pexels.com/photos/7862355/pexels-photo-7862355.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'apex', 'epic', 'xp', '{"xp": 5000}'::jsonb, 24, true),
('Apex Predator', 'The ultimate champion with exclusive trophy gear', 'https://images.pexels.com/photos/7862360/pexels-photo-7862360.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'apex', 'legendary', 'xp', '{"xp": 17000}'::jsonb, 25, true),

-- Universal/Elite Gaming Collection (5 avatars)
('Gaming Enthusiast', 'A passionate gamer ready for any challenge', 'https://images.pexels.com/photos/7915264/pexels-photo-7915264.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'universal', 'common', 'free', '{}'::jsonb, 26, true),
('Esports Player', 'A competitive team player with pro gear', 'https://images.pexels.com/photos/7915359/pexels-photo-7915359.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'universal', 'rare', 'xp', '{"xp": 800}'::jsonb, 27, true),
('Team Captain', 'A skilled leader wearing team colors', 'https://images.pexels.com/photos/7915299/pexels-photo-7915299.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'universal', 'rare', 'xp', '{"xp": 1500}'::jsonb, 28, true),
('Tournament Finalist', 'An elite competitor at championship level', 'https://images.pexels.com/photos/7915358/pexels-photo-7915358.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'universal', 'epic', 'xp', '{"xp": 4200}'::jsonb, 29, true),
('World Champion', 'The ultimate gaming legend with crown and golden controller', 'https://images.pexels.com/photos/7915440/pexels-photo-7915440.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop', 'universal', 'legendary', 'xp', '{"xp": 12000}'::jsonb, 30, true);
