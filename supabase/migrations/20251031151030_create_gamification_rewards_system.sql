/*
  # Create Gamification Rewards System
  
  This migration creates the complete rewards and user progress tracking system for the gamification portal.
  
  ## New Tables
  
  ### `battle_pass_rewards`
  - `id` (uuid, primary key) - Unique identifier for each reward
  - `name` (text) - Display name of the reward
  - `description` (text) - Detailed description of what the reward is
  - `reward_type` (text) - Type of reward: xp_boost, avatar, profile_banner, profile_frame, profile_badge, other
  - `image_url` (text) - URL to the reward's visual asset
  - `metadata` (jsonb) - Additional data like boost percentage, duration, customization properties
  - `rarity` (text) - Rarity tier: common, rare, epic, legendary
  - `created_at` (timestamptz) - When the reward was created
  
  ### `user_rewards_inventory`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid) - Reference to the user
  - `reward_id` (uuid) - Reference to the reward
  - `acquired_at` (timestamptz) - When the user obtained this reward
  - `source` (text) - How they got it: battle_pass, achievement, shop, quest, admin_grant
  - `source_reference_id` (uuid) - ID of the source (tier_id, achievement_id, etc.)
  - `is_active` (boolean) - For equipped cosmetics
  
  ### `user_tier_claims`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid) - Reference to the user
  - `tier_id` (uuid) - Reference to the battle pass tier
  - `reward_type` (text) - free or premium
  - `claimed_at` (timestamptz) - When the tier reward was claimed
  - `rewards_granted` (jsonb) - Array of reward IDs granted from this claim
  
  ### `user_virtual_currency`
  - `user_id` (uuid, primary key) - Reference to the user
  - `balance` (integer) - Current virtual currency balance
  - `lifetime_earned` (integer) - Total amount earned over time
  - `lifetime_spent` (integer) - Total amount spent over time
  - `updated_at` (timestamptz) - Last balance update
  
  ### `virtual_currency_transactions`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid) - Reference to the user
  - `amount` (integer) - Amount (positive for credit, negative for debit)
  - `transaction_type` (text) - Type: quest_reward, achievement, purchase, admin_grant, battle_pass_purchase, shop_purchase
  - `reference_id` (uuid) - ID of related entity
  - `description` (text) - Human-readable description
  - `created_at` (timestamptz) - Transaction timestamp
  
  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to read their own data
  - Add policies for admins to manage rewards
*/

-- Create battle_pass_rewards table
CREATE TABLE IF NOT EXISTS battle_pass_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  reward_type text NOT NULL CHECK (reward_type IN ('xp_boost', 'avatar', 'profile_banner', 'profile_frame', 'profile_badge', 'other')),
  image_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  rarity text DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at timestamptz DEFAULT now()
);

-- Create user_rewards_inventory table
CREATE TABLE IF NOT EXISTS user_rewards_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES battle_pass_rewards(id) ON DELETE CASCADE,
  acquired_at timestamptz DEFAULT now(),
  source text NOT NULL CHECK (source IN ('battle_pass', 'achievement', 'shop', 'quest', 'admin_grant', 'event')),
  source_reference_id uuid,
  is_active boolean DEFAULT false,
  UNIQUE(user_id, reward_id, source_reference_id)
);

-- Create user_tier_claims table
CREATE TABLE IF NOT EXISTS user_tier_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES battle_pass_tiers(id) ON DELETE CASCADE,
  reward_type text NOT NULL CHECK (reward_type IN ('free', 'premium')),
  claimed_at timestamptz DEFAULT now(),
  rewards_granted jsonb DEFAULT '[]'::jsonb,
  UNIQUE(user_id, tier_id, reward_type)
);

-- Create user_virtual_currency table
CREATE TABLE IF NOT EXISTS user_virtual_currency (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned integer DEFAULT 0,
  lifetime_spent integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Create virtual_currency_transactions table
CREATE TABLE IF NOT EXISTS virtual_currency_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('quest_reward', 'achievement', 'purchase', 'admin_grant', 'battle_pass_purchase', 'shop_purchase', 'tournament_prize', 'daily_login')),
  reference_id uuid,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_rewards_inventory_user_id ON user_rewards_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_inventory_reward_id ON user_rewards_inventory(reward_id);
CREATE INDEX IF NOT EXISTS idx_user_tier_claims_user_id ON user_tier_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tier_claims_tier_id ON user_tier_claims(tier_id);
CREATE INDEX IF NOT EXISTS idx_virtual_currency_transactions_user_id ON virtual_currency_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_virtual_currency_transactions_created_at ON virtual_currency_transactions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE battle_pass_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tier_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_virtual_currency ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_currency_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for battle_pass_rewards (public read, admin write)
CREATE POLICY "Anyone can view rewards"
  ON battle_pass_rewards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage rewards"
  ON battle_pass_rewards FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- RLS Policies for user_rewards_inventory
CREATE POLICY "Users can view own inventory"
  ON user_rewards_inventory FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all inventories"
  ON user_rewards_inventory FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

CREATE POLICY "System can manage inventory"
  ON user_rewards_inventory FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- RLS Policies for user_tier_claims
CREATE POLICY "Users can view own claims"
  ON user_tier_claims FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all claims"
  ON user_tier_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

CREATE POLICY "Users can claim their own tiers"
  ON user_tier_claims FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_virtual_currency
CREATE POLICY "Users can view own currency"
  ON user_virtual_currency FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all currency"
  ON user_virtual_currency FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

CREATE POLICY "Admins can manage currency"
  ON user_virtual_currency FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- RLS Policies for virtual_currency_transactions
CREATE POLICY "Users can view own transactions"
  ON virtual_currency_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions"
  ON virtual_currency_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

CREATE POLICY "System can create transactions"
  ON virtual_currency_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.type = 'admin'
    )
  );

-- Function to update virtual currency balance
CREATE OR REPLACE FUNCTION update_virtual_currency_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user_virtual_currency
  INSERT INTO user_virtual_currency (user_id, balance, lifetime_earned, lifetime_spent, updated_at)
  VALUES (
    NEW.user_id,
    CASE WHEN NEW.amount > 0 THEN NEW.amount ELSE 0 END,
    CASE WHEN NEW.amount > 0 THEN NEW.amount ELSE 0 END,
    CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_virtual_currency.balance + NEW.amount,
    lifetime_earned = CASE 
      WHEN NEW.amount > 0 THEN user_virtual_currency.lifetime_earned + NEW.amount
      ELSE user_virtual_currency.lifetime_earned
    END,
    lifetime_spent = CASE 
      WHEN NEW.amount < 0 THEN user_virtual_currency.lifetime_spent + ABS(NEW.amount)
      ELSE user_virtual_currency.lifetime_spent
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update balance on transaction
CREATE TRIGGER trigger_update_virtual_currency_balance
  AFTER INSERT ON virtual_currency_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_virtual_currency_balance();
