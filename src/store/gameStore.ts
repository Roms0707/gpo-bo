import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import toast from 'react-hot-toast';

type Game = Database['public']['Tables']['games']['Row'];
type GameInsert = Database['public']['Tables']['games']['Insert'];
type GameUpdate = Database['public']['Tables']['games']['Update'];

interface GameState {
  games: Game[];
  isLoading: boolean;
  error: string | null;
  fetchGames: () => Promise<void>;
  createGame: (game: GameInsert) => Promise<void>;
  updateGame: (id: string, game: GameUpdate) => Promise<void>;
  deleteGame: (id: string) => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  games: [],
  isLoading: false,
  error: null,

  fetchGames: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('sort_priority', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      set({ games: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred fetching games',
        isLoading: false 
      });
    }
  },

  createGame: async (game) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('games')
        .insert([game])
        .select()
        .single();

      if (error) throw error;
      
      set({ 
        games: [...get().games, data],
        isLoading: false 
      });
      
      toast.success('Game created successfully');
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred creating game',
        isLoading: false 
      });
      toast.error('Failed to create game');
      throw error;
    }
  },

  updateGame: async (id, game) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('games')
        .update(game)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      set({ 
        games: get().games.map(g => g.id === id ? data : g),
        isLoading: false 
      });
      
      toast.success('Game updated successfully');
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred updating game',
        isLoading: false 
      });
      toast.error('Failed to update game');
      throw error;
    }
  },

  deleteGame: async (id) => {
    try {
      set({ isLoading: true, error: null });
      
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      set({ 
        games: get().games.filter(g => g.id !== id),
        isLoading: false 
      });
      
      toast.success('Game deleted successfully');
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred deleting game',
        isLoading: false 
      });
      toast.error('Failed to delete game');
    }
  },
}));