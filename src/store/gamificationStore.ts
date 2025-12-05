import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { Database } from '../types/supabase';

type Quest = Database['public']['Tables']['quests']['Row'];
type Achievement = Database['public']['Tables']['achievements']['Row'];
type BattlePassSeason = Database['public']['Tables']['battle_pass_seasons']['Row'];
type BattlePassTier = Database['public']['Tables']['battle_pass_tiers']['Row'];
type XPThreshold = Database['public']['Tables']['xp_thresholds']['Row'];
type XPEvent = Database['public']['Tables']['xp_events']['Row'];
type ShopItem = Database['public']['Tables']['currency_shop_items']['Row'];
type UserQuest = Database['public']['Tables']['user_quests']['Row'];
type UserAchievement = Database['public']['Tables']['user_achievements']['Row'];

interface GamificationState {
  quests: Quest[];
  achievements: Achievement[];
  battlePassSeasons: BattlePassSeason[];
  battlePassTiers: BattlePassTier[];
  xpThresholds: XPThreshold[];
  xpEvents: XPEvent[];
  shopItems: ShopItem[];
  isLoading: boolean;

  fetchQuests: () => Promise<void>;
  createQuest: (quest: Database['public']['Tables']['quests']['Insert']) => Promise<void>;
  updateQuest: (id: string, updates: Database['public']['Tables']['quests']['Update']) => Promise<void>;
  deleteQuest: (id: string) => Promise<void>;

  fetchAchievements: () => Promise<void>;
  createAchievement: (achievement: Database['public']['Tables']['achievements']['Insert']) => Promise<void>;
  updateAchievement: (id: string, updates: Database['public']['Tables']['achievements']['Update']) => Promise<void>;
  deleteAchievement: (id: string) => Promise<void>;

  fetchBattlePassSeasons: () => Promise<void>;
  createBattlePassSeason: (season: Database['public']['Tables']['battle_pass_seasons']['Insert']) => Promise<void>;
  updateBattlePassSeason: (id: string, updates: Database['public']['Tables']['battle_pass_seasons']['Update']) => Promise<void>;
  deleteBattlePassSeason: (id: string) => Promise<void>;

  fetchBattlePassTiers: (seasonId: string) => Promise<void>;
  createBattlePassTier: (tier: Database['public']['Tables']['battle_pass_tiers']['Insert']) => Promise<void>;
  updateBattlePassTier: (id: string, updates: Database['public']['Tables']['battle_pass_tiers']['Update']) => Promise<void>;
  deleteBattlePassTier: (id: string) => Promise<void>;

  fetchXPThresholds: () => Promise<void>;
  createXPThreshold: (threshold: Database['public']['Tables']['xp_thresholds']['Insert']) => Promise<void>;
  updateXPThreshold: (level: number, updates: Database['public']['Tables']['xp_thresholds']['Update']) => Promise<void>;
  deleteXPThreshold: (level: number) => Promise<void>;

  fetchXPEvents: () => Promise<void>;
  createXPEvent: (event: Database['public']['Tables']['xp_events']['Insert']) => Promise<void>;
  updateXPEvent: (id: string, updates: Database['public']['Tables']['xp_events']['Update']) => Promise<void>;
  deleteXPEvent: (id: string) => Promise<void>;

  fetchShopItems: () => Promise<void>;
  createShopItem: (item: Database['public']['Tables']['currency_shop_items']['Insert']) => Promise<void>;
  updateShopItem: (id: string, updates: Database['public']['Tables']['currency_shop_items']['Update']) => Promise<void>;
  deleteShopItem: (id: string) => Promise<void>;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  quests: [],
  achievements: [],
  battlePassSeasons: [],
  battlePassTiers: [],
  xpThresholds: [],
  xpEvents: [],
  shopItems: [],
  isLoading: false,

  fetchQuests: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('quests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ quests: data || [] });
    } catch (error: any) {
      toast.error('Erreur lors du chargement des quêtes');
      console.error('Error fetching quests:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createQuest: async (quest) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('quests')
        .insert(quest)
        .select()
        .single();

      if (error) throw error;
      set({ quests: [data, ...get().quests] });
      toast.success('Quête créée avec succès');
    } catch (error: any) {
      toast.error('Erreur lors de la création de la quête');
      console.error('Error creating quest:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateQuest: async (id, updates) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('quests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set({ quests: get().quests.map(q => q.id === id ? data : q) });
      toast.success('Quête mise à jour');
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour de la quête');
      console.error('Error updating quest:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteQuest: async (id) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('quests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set({ quests: get().quests.filter(q => q.id !== id) });
      toast.success('Quête supprimée');
    } catch (error: any) {
      toast.error('Erreur lors de la suppression de la quête');
      console.error('Error deleting quest:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAchievements: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ achievements: data || [] });
    } catch (error: any) {
      toast.error('Erreur lors du chargement des achievements');
      console.error('Error fetching achievements:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createAchievement: async (achievement) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('achievements')
        .insert(achievement)
        .select()
        .single();

      if (error) throw error;
      set({ achievements: [data, ...get().achievements] });
      toast.success('Achievement créé avec succès');
    } catch (error: any) {
      toast.error('Erreur lors de la création de l\'achievement');
      console.error('Error creating achievement:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateAchievement: async (id, updates) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('achievements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set({ achievements: get().achievements.map(a => a.id === id ? data : a) });
      toast.success('Achievement mis à jour');
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour de l\'achievement');
      console.error('Error updating achievement:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteAchievement: async (id) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('achievements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set({ achievements: get().achievements.filter(a => a.id !== id) });
      toast.success('Achievement supprimé');
    } catch (error: any) {
      toast.error('Erreur lors de la suppression de l\'achievement');
      console.error('Error deleting achievement:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBattlePassSeasons: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('battle_pass_seasons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ battlePassSeasons: data || [] });
    } catch (error: any) {
      toast.error('Erreur lors du chargement des saisons Battle Pass');
      console.error('Error fetching battle pass seasons:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createBattlePassSeason: async (season) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('battle_pass_seasons')
        .insert(season)
        .select()
        .single();

      if (error) throw error;
      set({ battlePassSeasons: [data, ...get().battlePassSeasons] });
      toast.success('Saison Battle Pass créée avec succès');
    } catch (error: any) {
      toast.error('Erreur lors de la création de la saison');
      console.error('Error creating battle pass season:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateBattlePassSeason: async (id, updates) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('battle_pass_seasons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set({ battlePassSeasons: get().battlePassSeasons.map(s => s.id === id ? data : s) });
      toast.success('Saison mise à jour');
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour de la saison');
      console.error('Error updating battle pass season:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteBattlePassSeason: async (id) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('battle_pass_seasons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set({ battlePassSeasons: get().battlePassSeasons.filter(s => s.id !== id) });
      toast.success('Saison supprimée');
    } catch (error: any) {
      toast.error('Erreur lors de la suppression de la saison');
      console.error('Error deleting battle pass season:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBattlePassTiers: async (seasonId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('battle_pass_tiers')
        .select('*')
        .eq('season_id', seasonId)
        .order('tier_number', { ascending: true });

      if (error) throw error;
      set({ battlePassTiers: data || [] });
    } catch (error: any) {
      toast.error('Erreur lors du chargement des paliers');
      console.error('Error fetching battle pass tiers:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createBattlePassTier: async (tier) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('battle_pass_tiers')
        .insert(tier)
        .select()
        .single();

      if (error) throw error;
      set({ battlePassTiers: [...get().battlePassTiers, data].sort((a, b) => a.tier_number - b.tier_number) });
      toast.success('Palier créé avec succès');
    } catch (error: any) {
      toast.error('Erreur lors de la création du palier');
      console.error('Error creating battle pass tier:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateBattlePassTier: async (id, updates) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('battle_pass_tiers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set({ battlePassTiers: get().battlePassTiers.map(t => t.id === id ? data : t).sort((a, b) => a.tier_number - b.tier_number) });
      toast.success('Palier mis à jour');
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour du palier');
      console.error('Error updating battle pass tier:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteBattlePassTier: async (id) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('battle_pass_tiers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set({ battlePassTiers: get().battlePassTiers.filter(t => t.id !== id) });
      toast.success('Palier supprimé');
    } catch (error: any) {
      toast.error('Erreur lors de la suppression du palier');
      console.error('Error deleting battle pass tier:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchXPThresholds: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('xp_thresholds')
        .select('*')
        .order('level', { ascending: true });

      if (error) throw error;
      set({ xpThresholds: data || [] });
    } catch (error: any) {
      toast.error('Erreur lors du chargement des seuils XP');
      console.error('Error fetching XP thresholds:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createXPThreshold: async (threshold) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('xp_thresholds')
        .insert(threshold)
        .select()
        .single();

      if (error) throw error;
      set({ xpThresholds: [...get().xpThresholds, data].sort((a, b) => a.level - b.level) });
      toast.success('Seuil XP créé avec succès');
    } catch (error: any) {
      toast.error('Erreur lors de la création du seuil XP');
      console.error('Error creating XP threshold:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateXPThreshold: async (level, updates) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('xp_thresholds')
        .update(updates)
        .eq('level', level)
        .select()
        .single();

      if (error) throw error;
      set({ xpThresholds: get().xpThresholds.map(t => t.level === level ? data : t) });
      toast.success('Seuil XP mis à jour');
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour du seuil XP');
      console.error('Error updating XP threshold:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteXPThreshold: async (level) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('xp_thresholds')
        .delete()
        .eq('level', level);

      if (error) throw error;
      set({ xpThresholds: get().xpThresholds.filter(t => t.level !== level) });
      toast.success('Seuil XP supprimé');
    } catch (error: any) {
      toast.error('Erreur lors de la suppression du seuil XP');
      console.error('Error deleting XP threshold:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchXPEvents: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('xp_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ xpEvents: data || [] });
    } catch (error: any) {
      toast.error('Erreur lors du chargement des événements XP');
      console.error('Error fetching XP events:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createXPEvent: async (event) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('xp_events')
        .insert(event)
        .select()
        .single();

      if (error) throw error;
      set({ xpEvents: [data, ...get().xpEvents] });
      toast.success('Événement XP créé avec succès');
    } catch (error: any) {
      toast.error('Erreur lors de la création de l\'événement XP');
      console.error('Error creating XP event:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateXPEvent: async (id, updates) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('xp_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set({ xpEvents: get().xpEvents.map(e => e.id === id ? data : e) });
      toast.success('Événement XP mis à jour');
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour de l\'événement XP');
      console.error('Error updating XP event:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteXPEvent: async (id) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('xp_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set({ xpEvents: get().xpEvents.filter(e => e.id !== id) });
      toast.success('Événement XP supprimé');
    } catch (error: any) {
      toast.error('Erreur lors de la suppression de l\'événement XP');
      console.error('Error deleting XP event:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchShopItems: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('currency_shop_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ shopItems: data || [] });
    } catch (error: any) {
      toast.error('Erreur lors du chargement des items de la boutique');
      console.error('Error fetching shop items:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createShopItem: async (item) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('currency_shop_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      set({ shopItems: [data, ...get().shopItems] });
      toast.success('Item créé avec succès');
    } catch (error: any) {
      toast.error('Erreur lors de la création de l\'item');
      console.error('Error creating shop item:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateShopItem: async (id, updates) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('currency_shop_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set({ shopItems: get().shopItems.map(i => i.id === id ? data : i) });
      toast.success('Item mis à jour');
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour de l\'item');
      console.error('Error updating shop item:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteShopItem: async (id) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('currency_shop_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set({ shopItems: get().shopItems.filter(i => i.id !== id) });
      toast.success('Item supprimé');
    } catch (error: any) {
      toast.error('Erreur lors de la suppression de l\'item');
      console.error('Error deleting shop item:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
