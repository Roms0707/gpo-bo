import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type TournamentField = Database['public']['Tables']['tournament_fields']['Row'];
type TournamentFieldInsert = Database['public']['Tables']['tournament_fields']['Insert'];
type TournamentFieldUpdate = Database['public']['Tables']['tournament_fields']['Update'];

interface FieldState {
  fields: TournamentField[];
  isLoading: boolean;
  error: string | null;
  fetchFields: () => Promise<void>;
  createField: (field: TournamentFieldInsert) => Promise<void>;
  updateField: (id: string, field: TournamentFieldUpdate) => Promise<void>;
  deleteField: (id: string) => Promise<void>;
}

export const useFieldStore = create<FieldState>((set, get) => ({
  fields: [],
  isLoading: false,
  error: null,

  fetchFields: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('tournament_fields')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      
      set({ fields: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred fetching fields',
        isLoading: false 
      });
    }
  },

  createField: async (field) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('tournament_fields')
        .insert([field])
        .select()
        .single();

      if (error) throw error;
      
      set({ 
        fields: [...get().fields, data],
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred creating field',
        isLoading: false 
      });
    }
  },

  updateField: async (id, field) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('tournament_fields')
        .update(field)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      set({ 
        fields: get().fields.map(f => f.id === id ? data : f),
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred updating field',
        isLoading: false 
      });
    }
  },

  deleteField: async (id) => {
    try {
      set({ isLoading: true, error: null });
      
      const { error } = await supabase
        .from('tournament_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      set({ 
        fields: get().fields.filter(f => f.id !== id),
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred deleting field',
        isLoading: false 
      });
    }
  },
}));