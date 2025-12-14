import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type GameTrailer = Database['public']['Tables']['game_trailers']['Row'];
type GameTrailerInsert = Database['public']['Tables']['game_trailers']['Insert'];
type GameTrailerUpdate = Database['public']['Tables']['game_trailers']['Update'];

export interface GameTrailerData {
  id?: string;
  tournament_id: string;
  game_id: string;
  video_url: string;
  is_featured: boolean;
  title?: string | null;
}

export const gameTrailerService = {
  async getByTournamentId(tournamentId: string): Promise<GameTrailer | null> {
    const { data, error } = await supabase
      .from('game_trailers')
      .select('*')
      .eq('tournament_id', tournamentId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching game trailer:', error);
      return null;
    }

    return data;
  },

  async create(trailerData: GameTrailerData): Promise<{ data: GameTrailer | null; error: Error | null }> {
    const insertData: GameTrailerInsert = {
      tournament_id: trailerData.tournament_id,
      game_id: trailerData.game_id,
      video_url: trailerData.video_url,
      is_featured: trailerData.is_featured,
      is_default: false,
      title: trailerData.title || null,
    };

    const { data, error } = await supabase
      .from('game_trailers')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating game trailer:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  },

  async update(id: string, trailerData: Partial<GameTrailerData>): Promise<{ data: GameTrailer | null; error: Error | null }> {
    const updateData: GameTrailerUpdate = {};

    if (trailerData.video_url !== undefined) updateData.video_url = trailerData.video_url;
    if (trailerData.is_featured !== undefined) updateData.is_featured = trailerData.is_featured;
    if (trailerData.title !== undefined) updateData.title = trailerData.title;
    if (trailerData.game_id !== undefined) updateData.game_id = trailerData.game_id;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('game_trailers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating game trailer:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  },

  async upsert(trailerData: GameTrailerData): Promise<{ data: GameTrailer | null; error: Error | null }> {
    const existing = await this.getByTournamentId(trailerData.tournament_id);

    if (existing) {
      return this.update(existing.id, trailerData);
    } else {
      return this.create(trailerData);
    }
  },

  async setFeatured(tournamentId: string, isFeatured: boolean): Promise<{ success: boolean; error: Error | null }> {
    const existing = await this.getByTournamentId(tournamentId);

    if (!existing) {
      return { success: false, error: new Error('No trailer found for this tournament') };
    }

    const { error } = await supabase
      .from('game_trailers')
      .update({ is_featured: isFeatured, updated_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (error) {
      console.error('Error updating featured status:', error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  },

  async getAllFeatured(): Promise<GameTrailer[]> {
    const { data, error } = await supabase
      .from('game_trailers')
      .select('*')
      .eq('is_featured', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching featured trailers:', error);
      return [];
    }

    return data || [];
  },
};
