export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          type: 'admin' | 'gamer'
          created_at: string
          msisdn: string | null
          date_of_birth: string | null
          has_parental_consent: boolean | null
          parental_consent_url: string | null
          country: string | null
          username: string | null
          bio: string | null
          discord_handle: string | null
          twitter_handle: string | null
          avatar_url: string | null
          steam_id: string | null
          freefire_nickname: string | null
          ow2_battle_net_id: string | null
          fc26_ea_id: string | null
          apex_legends_ea_id: string | null
          fortnite_epic_id: string | null
          rocket_league_epic_id: string | null
          warzone_activision_id: string | null
          r6_ubisoft_id: string | null
          riot_game_name: string | null
          riot_tagline: string | null
          role: Database['public']['Enums']['admin_role_type'] | null
        }
        Insert: {
          id?: string
          email: string
          type: 'admin' | 'gamer'
          created_at?: string
          msisdn?: string | null
          date_of_birth?: string | null
          has_parental_consent?: boolean | null
          parental_consent_url?: string | null
          country?: string | null
          username?: string | null
          bio?: string | null
          discord_handle?: string | null
          twitter_handle?: string | null
          avatar_url?: string | null
          steam_id?: string | null
          freefire_nickname?: string | null
          ow2_battle_net_id?: string | null
          fc26_ea_id?: string | null
          apex_legends_ea_id?: string | null
          fortnite_epic_id?: string | null
          rocket_league_epic_id?: string | null
          warzone_activision_id?: string | null
          r6_ubisoft_id?: string | null
          riot_game_name?: string | null
          riot_tagline?: string | null
          role?: Database['public']['Enums']['admin_role_type'] | null
        }
        Update: {
          id?: string
          email?: string
          type?: 'admin' | 'gamer'
          created_at?: string
          msisdn?: string | null
          date_of_birth?: string | null
          has_parental_consent?: boolean | null
          parental_consent_url?: string | null
          country?: string | null
          username?: string | null
          bio?: string | null
          discord_handle?: string | null
          twitter_handle?: string | null
          avatar_url?: string | null
          steam_id?: string | null
          freefire_nickname?: string | null
          ow2_battle_net_id?: string | null
          fc26_ea_id?: string | null
          apex_legends_ea_id?: string | null
          fortnite_epic_id?: string | null
          rocket_league_epic_id?: string | null
          warzone_activision_id?: string | null
          r6_ubisoft_id?: string | null
          riot_game_name?: string | null
          riot_tagline?: string | null
          role?: Database['public']['Enums']['admin_role_type'] | null
        }
      }
      tournaments: {
        Row: {
          id: string
          title: string
          description: string | null
          type: 'solo' | 'team'
          location_type: 'online' | 'offline' | null
          location_name: string | null
          start_date: string
          end_date: string
          registration_start_date: string | null
          registration_end_date: string | null
          status: 'upcoming' | 'active' | 'past'
          created_by: string
          created_at: string
          event_id: string | null
          icon_url: string | null
          announcement_url: string | null
          main_prize: string | null
          header_url: string | null
          twitch_url: string | null
          compatible_devices: string | null
          discord_url: string | null
          tournament_format: string | null
          game_id: string | null
          eligible_countries: string | null
          minimum_age: number | null
          required_documents_under_18: string | null
          max_players_per_team: number | null
          max_nb_players: number | null
          rules: string | null
          private_server_code: string | null
          bracket_status: 'draft' | 'live'
          allow_backups: boolean
          max_backup_players: number | null
          initial_max_players: number | null
          actual_participants: number | null
          registration_locked: boolean
          bracket_launched_at: string | null
          is_featured: boolean | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          type: 'solo' | 'team'
          location_type?: 'online' | 'offline' | null
          location_name?: string | null
          start_date: string
          end_date: string
          registration_start_date?: string | null
          registration_end_date?: string | null
          status?: 'upcoming' | 'active' | 'past'
          created_by: string
          created_at?: string
          event_id?: string | null
          icon_url?: string | null
          announcement_url?: string | null
          main_prize?: string | null
          header_url?: string | null
          twitch_url?: string | null
          compatible_devices?: string | null
          discord_url?: string | null
          tournament_format?: string | null
          game_id?: string | null
          eligible_countries?: string | null
          minimum_age?: number | null
          required_documents_under_18?: string | null
          max_players_per_team?: number | null
          max_nb_players?: number | null
          rules?: string | null
          private_server_code?: string | null
          bracket_status?: 'draft' | 'live'
          allow_backups?: boolean
          max_backup_players?: number | null
          initial_max_players?: number | null
          actual_participants?: number | null
          registration_locked?: boolean
          bracket_launched_at?: string | null
          is_featured?: boolean | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          type?: 'solo' | 'team'
          location_type?: 'online' | 'offline' | null
          location_name?: string | null
          start_date?: string
          end_date?: string
          registration_start_date?: string | null
          registration_end_date?: string | null
          status?: 'upcoming' | 'active' | 'past'
          created_by?: string
          created_at?: string
          event_id?: string | null
          icon_url?: string | null
          announcement_url?: string | null
          main_prize?: string | null
          header_url?: string | null
          twitch_url?: string | null
          compatible_devices?: string | null
          discord_url?: string | null
          tournament_format?: string | null
          game_id?: string | null
          eligible_countries?: string | null
          minimum_age?: number | null
          required_documents_under_18?: string | null
          max_players_per_team?: number | null
          max_nb_players?: number | null
          rules?: string | null
          private_server_code?: string | null
          bracket_status?: 'draft' | 'live'
          allow_backups?: boolean
          max_backup_players?: number | null
          initial_max_players?: number | null
          actual_participants?: number | null
          registration_locked?: boolean
          bracket_launched_at?: string | null
          is_featured?: boolean | null
        }
      }
      tournament_prizes: {
        Row: {
          id: string
          tournament_id: string
          position: number
          title: string
          prize_name: string
          description: string | null
          image_url: string | null
          created_at: string | null
          prize_type: 'monetary' | 'physical_digital'
          monetary_amount: number | null
          currency: string | null
          redemption_code: string | null
        }
        Insert: {
          id?: string
          tournament_id: string
          position: number
          title: string
          prize_name: string
          description?: string | null
          image_url?: string | null
          created_at?: string | null
          prize_type?: 'monetary' | 'physical_digital'
          monetary_amount?: number | null
          currency?: string | null
          redemption_code?: string | null
        }
        Update: {
          id?: string
          tournament_id?: string
          position?: number
          title?: string
          prize_name?: string
          description?: string | null
          image_url?: string | null
          created_at?: string | null
          prize_type?: 'monetary' | 'physical_digital'
          monetary_amount?: number | null
          currency?: string | null
          redemption_code?: string | null
        }
      }
      tournament_fields: {
        Row: {
          id: string
          name: string
          field_type: string
          required: boolean
          created_at: string
          options: any | null
          validation_rules: any | null
          field_category: string | null
          placeholder_text: string | null
          display_order: number | null
          tournament_id: string | null
        }
        Insert: {
          id?: string
          name: string
          field_type: string
          required?: boolean
          created_at?: string
          options?: any | null
          validation_rules?: any | null
          field_category?: string | null
          placeholder_text?: string | null
          display_order?: number | null
          tournament_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          field_type?: string
          required?: boolean
          created_at?: string
          options?: any | null
          validation_rules?: any | null
          field_category?: string | null
          placeholder_text?: string | null
          display_order?: number | null
          tournament_id?: string | null
        }
      }
      tournament_field_values: {
        Row: {
          id: string
          tournament_id: string
          field_id: string
          value: string
          created_at: string | null
        }
        Insert: {
          id?: string
          tournament_id: string
          field_id: string
          value: string
          created_at?: string | null
        }
        Update: {
          id?: string
          tournament_id?: string
          field_id?: string
          value?: string
          created_at?: string | null
        }
      }
      events: {
        Row: {
          id: string
          name: string
          tournament_id: string | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          tournament_id?: string | null
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          tournament_id?: string | null
          date?: string
          created_at?: string
        }
      }
      games: {
        Row: {
          id: string
          name: string
          publisher: string | null
          image_url: string | null
          created_at: string
          has_an_api: boolean | null
          api_key: string | null
          trailer_url: string | null
        }
        Insert: {
          id?: string
          name: string
          publisher?: string | null
          image_url?: string | null
          created_at?: string
          has_an_api?: boolean | null
          api_key?: string | null
          trailer_url?: string | null
        }
        Update: {
          id?: string
          name?: string
          publisher?: string | null
          image_url?: string | null
          created_at?: string
          has_an_api?: boolean | null
          api_key?: string | null
          trailer_url?: string | null
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          tournament_id: string
          created_at: string
          captain_id: string | null
        }
        Insert: {
          id?: string
          name: string
          tournament_id: string
          created_at?: string
          captain_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          tournament_id?: string
          created_at?: string
          captain_id?: string | null
        }
      }
      tournament_registrations: {
        Row: {
          id: string
          tournament_id: string
          user_id: string
          team_id: string | null
          status: 'pending' | 'approved' | 'rejected' | 'backup'
          created_at: string
          registration_order: number | null
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id: string
          team_id?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'backup'
          created_at?: string
          registration_order?: number | null
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string
          team_id?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'backup'
          created_at?: string
          registration_order?: number | null
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'captain' | 'member'
          created_at: string
          status: string | null
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: 'captain' | 'member'
          created_at?: string
          status?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: 'captain' | 'member'
          created_at?: string
          status?: string | null
        }
      }
      tournament_matches: {
        Row: {
          id: string
          tournament_id: string
          round: number
          position: number
          player1_id: string | null
          player2_id: string | null
          winner_id: string | null
          created_at: string | null
          is_draw: boolean | null
        }
        Insert: {
          id?: string
          tournament_id: string
          round: number
          position: number
          player1_id?: string | null
          player2_id?: string | null
          winner_id?: string | null
          created_at?: string | null
          is_draw?: boolean | null
        }
        Update: {
          id?: string
          tournament_id?: string
          round?: number
          position?: number
          player1_id?: string | null
          player2_id?: string | null
          winner_id?: string | null
          created_at?: string | null
          is_draw?: boolean | null
        }
      }
      publisher_gamer: {
        Row: {
          id: string
          user_id: string
          publisher_id: string
          puuid: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          publisher_id: string
          puuid?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          publisher_id?: string
          puuid?: string | null
          created_at?: string | null
        }
      }
      team_rankings: {
        Row: {
          id: string
          team_id: string
          game_id: string
          elo_rating: number
          wins: number
          losses: number
          rank_tier: string | null
          last_updated: string | null
        }
        Insert: {
          id?: string
          team_id: string
          game_id: string
          elo_rating?: number
          wins?: number
          losses?: number
          rank_tier?: string | null
          last_updated?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          game_id?: string
          elo_rating?: number
          wins?: number
          losses?: number
          rank_tier?: string | null
          last_updated?: string | null
        }
      }
      player_rankings: {
        Row: {
          id: string
          user_id: string
          game_id: string
          elo_rating: number
          wins: number
          losses: number
          rank_tier: string | null
          last_updated: string | null
        }
        Insert: {
          id?: string
          user_id: string
          game_id: string
          elo_rating?: number
          wins?: number
          losses?: number
          rank_tier?: string | null
          last_updated?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          game_id?: string
          elo_rating?: number
          wins?: number
          losses?: number
          rank_tier?: string | null
          last_updated?: string | null
        }
      }
      match_results: {
        Row: {
          id: string
          tournament_id: string | null
          game_id: string
          match_date: string
          is_team_match: boolean
          winner_team_id: string | null
          loser_team_id: string | null
          winner_player_id: string | null
          loser_player_id: string | null
          score_winner: number | null
          score_loser: number | null
          elo_change: number
          match_details: Json | null
        }
        Insert: {
          id?: string
          tournament_id?: string | null
          game_id: string
          match_date?: string
          is_team_match: boolean
          winner_team_id?: string | null
          loser_team_id?: string | null
          winner_player_id?: string | null
          loser_player_id?: string | null
          score_winner?: number | null
          score_loser?: number | null
          elo_change?: number
          match_details?: Json | null
        }
        Update: {
          id?: string
          tournament_id?: string | null
          game_id?: string
          match_date?: string
          is_team_match?: boolean
          winner_team_id?: string | null
          loser_team_id?: string | null
          winner_player_id?: string | null
          loser_player_id?: string | null
          score_winner?: number | null
          score_loser?: number | null
          elo_change?: number
          match_details?: Json | null
        }
      }
      battle_royale_results: {
        Row: {
          id: string
          tournament_id: string
          game_id: string
          match_number: number
          player_id: string
          placement: number
          eliminations: number
          placement_points: number
          elimination_points: number
          total_match_points: number
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          game_id: string
          match_number: number
          player_id: string
          placement: number
          eliminations?: number
          placement_points?: number
          elimination_points?: number
          total_match_points?: number
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          game_id?: string
          match_number?: number
          player_id?: string
          placement?: number
          eliminations?: number
          placement_points?: number
          elimination_points?: number
          total_match_points?: number
          created_at?: string
        }
      }
      game_contents: {
        Row: {
          id: string
          game_id: string
          title: string
          description: string | null
          content_type: 'image' | 'video' | 'playlist' | 'news'
          content_url: string
          created_at: string | null
          playlist_image_url: string | null
          article_text: string | null
          article_image_url: string | null
        }
        Insert: {
          id?: string
          game_id: string
          title: string
          description?: string | null
          content_type: 'image' | 'video' | 'playlist' | 'news'
          content_url: string
          created_at?: string | null
          playlist_image_url?: string | null
          article_text?: string | null
          article_image_url?: string | null
        }
        Update: {
          id?: string
          game_id?: string
          title?: string
          description?: string | null
          content_type?: 'image' | 'video' | 'playlist' | 'news'
          content_url?: string
          created_at?: string | null
          playlist_image_url?: string | null
          article_text?: string | null
          article_image_url?: string | null
        }
      }
      tournament_reports: {
        Row: {
          id: string
          tournament_id: string | null
          title: string
          snapshot_data: Json
          notes: string | null
          period_start: string | null
          period_end: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          tournament_id?: string | null
          title: string
          snapshot_data?: Json
          notes?: string | null
          period_start?: string | null
          period_end?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          tournament_id?: string | null
          title?: string
          snapshot_data?: Json
          notes?: string | null
          period_start?: string | null
          period_end?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      report_shares: {
        Row: {
          id: string
          report_id: string
          share_token: string
          expires_at: string | null
          is_active: boolean
          view_count: number
          last_viewed_at: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          report_id: string
          share_token: string
          expires_at?: string | null
          is_active?: boolean
          view_count?: number
          last_viewed_at?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          report_id?: string
          share_token?: string
          expires_at?: string | null
          is_active?: boolean
          view_count?: number
          last_viewed_at?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      support_tickets: {
        Row: {
          id: string
          user_id: string
          tournament_id: string | null
          subject: string
          description: string
          status: 'open' | 'in_progress' | 'closed'
          created_at: string
          updated_at: string
          first_opened_at: string | null
          opened_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          tournament_id?: string | null
          subject: string
          description: string
          status?: 'open' | 'in_progress' | 'closed'
          created_at?: string
          updated_at?: string
          first_opened_at?: string | null
          opened_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          tournament_id?: string | null
          subject?: string
          description?: string
          status?: 'open' | 'in_progress' | 'closed'
          created_at?: string
          updated_at?: string
          first_opened_at?: string | null
          opened_by?: string | null
        }
      }
      ticket_messages: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          message: string
          is_admin_message: boolean
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          message: string
          is_admin_message?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          message?: string
          is_admin_message?: boolean
          created_at?: string
        }
      }
      quests: {
        Row: {
          id: string
          name: string
          description: string
          xp_reward: number
          quest_type: string
          target_value: string
          is_repeatable: boolean
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          xp_reward: number
          quest_type: string
          target_value: string
          is_repeatable?: boolean
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          xp_reward?: number
          quest_type?: string
          target_value?: string
          is_repeatable?: boolean
          is_active?: boolean
          created_at?: string
        }
      }
      achievements: {
        Row: {
          id: string
          name: string
          description: string
          type: string
          image_url: string | null
          unlock_condition_type: string
          unlock_condition_value: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          type: string
          image_url?: string | null
          unlock_condition_type: string
          unlock_condition_value: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          type?: string
          image_url?: string | null
          unlock_condition_type?: string
          unlock_condition_value?: string
          is_active?: boolean
          created_at?: string
        }
      }
      xp_thresholds: {
        Row: {
          level: number
          xp_required: number
          level_name: string
          created_at: string
        }
        Insert: {
          level: number
          xp_required: number
          level_name: string
          created_at?: string
        }
        Update: {
          level?: number
          xp_required?: number
          level_name?: string
          created_at?: string
        }
      }
      xp_events: {
        Row: {
          id: string
          event_name: string
          event_type: string
          xp_amount: number
          multiplier: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          event_name: string
          event_type: string
          xp_amount: number
          multiplier?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          event_name?: string
          event_type?: string
          xp_amount?: number
          multiplier?: number
          is_active?: boolean
          created_at?: string
        }
      }
      battle_pass_seasons: {
        Row: {
          id: string
          name: string
          description: string | null
          start_date: string
          end_date: string
          premium_price: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          start_date: string
          end_date: string
          premium_price?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          start_date?: string
          end_date?: string
          premium_price?: number | null
          is_active?: boolean
          created_at?: string
        }
      }
      battle_pass_tiers: {
        Row: {
          id: string
          season_id: string
          tier_number: number
          xp_required: number
          free_rewards: any | null
          premium_rewards: any | null
          created_at: string
        }
        Insert: {
          id?: string
          season_id: string
          tier_number: number
          xp_required: number
          free_rewards?: any | null
          premium_rewards?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          tier_number?: number
          xp_required?: number
          free_rewards?: any | null
          premium_rewards?: any | null
          created_at?: string
        }
      }
      battle_pass_rewards: {
        Row: {
          id: string
          name: string
          description: string | null
          reward_type: string
          image_url: string | null
          metadata: any
          rarity: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          reward_type: string
          image_url?: string | null
          metadata?: any
          rarity?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          reward_type?: string
          image_url?: string | null
          metadata?: any
          rarity?: string
          created_at?: string
        }
      }
      user_rewards_inventory: {
        Row: {
          id: string
          user_id: string
          reward_id: string
          acquired_at: string
          source: string
          source_reference_id: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          reward_id: string
          acquired_at?: string
          source: string
          source_reference_id?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          reward_id?: string
          acquired_at?: string
          source?: string
          source_reference_id?: string | null
          is_active?: boolean
        }
      }
      user_tier_claims: {
        Row: {
          id: string
          user_id: string
          tier_id: string
          reward_type: string
          claimed_at: string
          rewards_granted: any
        }
        Insert: {
          id?: string
          user_id: string
          tier_id: string
          reward_type: string
          claimed_at?: string
          rewards_granted?: any
        }
        Update: {
          id?: string
          user_id?: string
          tier_id?: string
          reward_type?: string
          claimed_at?: string
          rewards_granted?: any
        }
      }
      user_virtual_currency: {
        Row: {
          user_id: string
          balance: number
          lifetime_earned: number
          lifetime_spent: number
          updated_at: string
        }
        Insert: {
          user_id: string
          balance?: number
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          balance?: number
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
        }
      }
      virtual_currency_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          transaction_type: string
          reference_id: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          transaction_type: string
          reference_id?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          transaction_type?: string
          reference_id?: string | null
          description?: string | null
          created_at?: string
        }
      }
      user_battle_pass_progress: {
        Row: {
          id: string
          user_id: string
          season_id: string
          current_tier: number
          total_xp: number
          is_premium_unlocked: boolean
          purchase_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          season_id: string
          current_tier?: number
          total_xp?: number
          is_premium_unlocked?: boolean
          purchase_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          season_id?: string
          current_tier?: number
          total_xp?: number
          is_premium_unlocked?: boolean
          purchase_date?: string | null
          created_at?: string
        }
      }
      currency_shop_items: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          item_type: string
          image_url: string | null
          is_available: boolean
          stock_quantity: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          item_type: string
          image_url?: string | null
          is_available?: boolean
          stock_quantity?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          item_type?: string
          image_url?: string | null
          is_available?: boolean
          stock_quantity?: number | null
          created_at?: string
        }
      }
      user_quests: {
        Row: {
          id: string
          user_id: string
          quest_id: string
          progress: number
          is_completed: boolean
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          quest_id: string
          progress?: number
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          quest_id?: string
          progress?: number
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
      }
      user_achievements: {
        Row: {
          user_id: string
          achievement_id: string
          unlocked_at: string
        }
        Insert: {
          user_id: string
          achievement_id: string
          unlocked_at?: string
        }
        Update: {
          user_id?: string
          achievement_id?: string
          unlocked_at?: string
        }
      }
      user_currency: {
        Row: {
          user_id: string
          balance: number
          last_updated: string
        }
        Insert: {
          user_id: string
          balance?: number
          last_updated?: string
        }
        Update: {
          user_id?: string
          balance?: number
          last_updated?: string
        }
      }
      user_battle_pass_progress: {
        Row: {
          id: string
          user_id: string
          season_id: string
          current_tier: number
          total_xp: number
          is_premium: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          season_id: string
          current_tier?: number
          total_xp?: number
          is_premium?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          season_id?: string
          current_tier?: number
          total_xp?: number
          is_premium?: boolean
          created_at?: string
        }
      }
      user_inventory: {
        Row: {
          id: string
          user_id: string
          item_id: string
          quantity: number
          is_equipped: boolean
          purchased_at: string
          equipped_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          quantity?: number
          is_equipped?: boolean
          purchased_at?: string
          equipped_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          quantity?: number
          is_equipped?: boolean
          purchased_at?: string
          equipped_at?: string | null
        }
      }
      currency_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          balance_after: number
          transaction_type: string
          source: string
          source_id: string | null
          description: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          balance_after: number
          transaction_type: string
          source: string
          source_id?: string | null
          description?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          balance_after?: number
          transaction_type?: string
          source?: string
          source_id?: string | null
          description?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      user_tournament_field_values: {
        Row: {
          id: string
          user_id: string
          tournament_id: string
          field_id: string
          field_index: number
          value: Record<string, string>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tournament_id: string
          field_id: string
          field_index?: number
          value: Record<string, string>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tournament_id?: string
          field_id?: string
          field_index?: number
          value?: Record<string, string>
          created_at?: string
        }
      }
      game_publisher_ids: {
        Row: {
          id: string
          game_id: string
          label: string
          id_name: string
          required: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          label: string
          id_name: string
          required?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          label?: string
          id_name?: string
          required?: boolean
          display_order?: number
          created_at?: string
        }
      }
      game_publisher_id_for_users: {
        Row: {
          id: string
          user_id: string
          game_id: string
          game_publisher_id: string
          value: string
          is_validated: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          game_id: string
          game_publisher_id: string
          value: string
          is_validated?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_id?: string
          game_publisher_id?: string
          value?: string
          is_validated?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_export_preferences: {
        Row: {
          id: string
          user_id: string
          selected_fields: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          selected_fields?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          selected_fields?: Json
          created_at?: string
          updated_at?: string
        }
      }
      player_match_notifications: {
        Row: {
          id: string
          user_id: string
          tournament_id: string
          match_id: string | null
          round_number: number
          notification_type: 'match_starting' | 'match_result' | 'next_opponent'
          opponent_id: string | null
          opponent_game_ids: Json
          match_result: 'won' | 'lost' | 'draw' | null
          message: string
          metadata: Json
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tournament_id: string
          match_id?: string | null
          round_number: number
          notification_type: 'match_starting' | 'match_result' | 'next_opponent'
          opponent_id?: string | null
          opponent_game_ids?: Json
          match_result?: 'won' | 'lost' | 'draw' | null
          message: string
          metadata?: Json
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tournament_id?: string
          match_id?: string | null
          round_number?: number
          notification_type?: 'match_starting' | 'match_result' | 'next_opponent'
          opponent_id?: string | null
          opponent_game_ids?: Json
          match_result?: 'won' | 'lost' | 'draw' | null
          message?: string
          metadata?: Json
          is_read?: boolean
          created_at?: string
        }
      }
      bracket_round_timers: {
        Row: {
          id: string
          tournament_id: string
          round_number: number
          duration_minutes: number
          start_time: string | null
          end_time: string | null
          status: 'pending' | 'active' | 'completed' | 'paused' | 'expired'
          paused_at: string | null
          paused_remaining_seconds: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          round_number: number
          duration_minutes?: number
          start_time?: string | null
          end_time?: string | null
          status?: 'pending' | 'active' | 'completed' | 'paused' | 'expired'
          paused_at?: string | null
          paused_remaining_seconds?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          round_number?: number
          duration_minutes?: number
          start_time?: string | null
          end_time?: string | null
          status?: 'pending' | 'active' | 'completed' | 'paused' | 'expired'
          paused_at?: string | null
          paused_remaining_seconds?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      bracket_round_notifications: {
        Row: {
          id: string
          tournament_id: string
          round_number: number
          notification_type: 'round_started' | 'round_completed' | 'round_expired' | 'round_extended' | 'round_paused' | 'round_resumed'
          message: string
          metadata: Json
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          round_number: number
          notification_type: 'round_started' | 'round_completed' | 'round_expired' | 'round_extended' | 'round_paused' | 'round_resumed'
          message: string
          metadata?: Json
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          round_number?: number
          notification_type?: 'round_started' | 'round_completed' | 'round_expired' | 'round_extended' | 'round_paused' | 'round_resumed'
          message?: string
          metadata?: Json
          is_read?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      admin_role_type: 'super_admin' | 'admin' | 'master_admin'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          id: string
          name: string
          owner: string | null
          created_at: string | null
          updated_at: string | null
          public: boolean | null
        }
        Insert: {
          id: string
          name: string
          owner?: string | null
          created_at?: string | null
          updated_at?: string | null
          public?: boolean | null
        }
        Update: {
          id?: string
          name?: string
          owner?: string | null
          created_at?: string | null
          updated_at?: string | null
          public?: boolean | null
        }
      }
      objects: {
        Row: {
          id: string
          bucket_id: string
          name: string
          owner: string | null
          created_at: string | null
          updated_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          bucket_id: string
          name: string
          owner?: string | null
          created_at?: string | null
          updated_at?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          bucket_id?: string
          name?: string
          owner?: string | null
          created_at?: string | null
          updated_at?: string | null
          metadata?: Json | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}