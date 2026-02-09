import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import toast from 'react-hot-toast';
import { resetTournamentBracket } from '../components/bracket/BracketService';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type TournamentInsert = Database['public']['Tables']['tournaments']['Insert'];
type TournamentUpdate = Database['public']['Tables']['tournaments']['Update'];

interface TournamentState {
  tournaments: Tournament[];
  isLoading: boolean;
  error: string | null;
  fetchTournaments: () => Promise<void>;
  createTournament: (tournament: TournamentInsert) => Promise<{ data: Tournament; error: null } | { data: null; error: any }>;
  updateTournament: (id: string, tournament: TournamentUpdate) => Promise<{ data: Tournament; error: null } | { data: null; error: any }>;
  deleteTournament: (id: string) => Promise<void>;
  updateTournamentRules: (id: string, rules: string) => Promise<void>;
  updateBracketStatus: (id: string, status: 'draft' | 'live') => Promise<void>;
  duplicateTournament: (id: string, targetConfigId?: string | null) => Promise<{ data: Tournament; error: null } | { data: null; error: any }>;
  resetBracket: (id: string) => Promise<boolean>;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournaments: [],
  isLoading: false,
  error: null,

  fetchTournaments: async () => {
    try {
      set({ isLoading: true, error: null });

      // Get current user to check their role and country
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      let query = supabase
        .from('tournaments')
        .select('*');

      // Only filter by country for regular admin users (not master_admin or super_admin)
      if (currentUser) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, country')
          .eq('id', currentUser.id)
          .single();

        if (!userError && userData) {
          // Only filter by country for regular admin users (master_admin and super_admin have unlimited access)
          if (userData.role === 'admin' && userData.country) {
            query = query.or(`eligible_countries.is.null,eligible_countries.ilike.%${userData.country}%`);
          }
          // master_admin and super_admin can see all tournaments regardless of country
        }
      }

      const { data, error } = await query
        .order('start_date', { ascending: true });

      if (error) throw error;

      // Update status based on dates
      const now = new Date();
      const updatedTournaments = data.map(tournament => {
        const startDate = new Date(tournament.start_date);
        const endDate = new Date(tournament.end_date);

        let status: 'upcoming' | 'active' | 'past';
        if (now < startDate) {
          status = 'upcoming';
        } else if (now >= startDate && now <= endDate) {
          status = 'active';
        } else {
          status = 'past';
        }

        // Only update if status has changed
        if (status !== tournament.status) {
          supabase
            .from('tournaments')
            .update({ status })
            .eq('id', tournament.id)
            .then();

          return { ...tournament, status };
        }

        return tournament;
      });

      // Sort tournaments by status priority: active first, then upcoming, then past
      const sortedTournaments = updatedTournaments.sort((a, b) => {
        // Define status priority: active = 1, upcoming = 2, past = 3
        const getStatusPriority = (status: string) => {
          switch (status) {
            case 'active': return 1;
            case 'upcoming': return 2;
            case 'past': return 3;
            default: return 4;
          }
        };

        const priorityA = getStatusPriority(a.status);
        const priorityB = getStatusPriority(b.status);

        // First sort by status priority
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Within the same status, sort by start date
        const dateA = new Date(a.start_date);
        const dateB = new Date(b.start_date);

        // For active and upcoming tournaments, show earliest first
        // For past tournaments, show most recent first
        if (a.status === 'past') {
          return dateB.getTime() - dateA.getTime(); // Most recent past tournaments first
        } else {
          return dateA.getTime() - dateB.getTime(); // Earliest active/upcoming first
        }
      });

      set({ tournaments: sortedTournaments, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred fetching tournaments',
        isLoading: false
      });
    }
  },

  createTournament: async (tournament) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('tournaments')
        .insert([tournament])
        .select()
        .single();

      if (error) throw error;

      // Add the new tournament and re-sort the list
      const currentTournaments = get().tournaments;
      const updatedTournaments = [...currentTournaments, data];

      // Apply the same sorting logic
      const sortedTournaments = updatedTournaments.sort((a, b) => {
        const getStatusPriority = (status: string) => {
          switch (status) {
            case 'active': return 1;
            case 'upcoming': return 2;
            case 'past': return 3;
            default: return 4;
          }
        };

        const priorityA = getStatusPriority(a.status);
        const priorityB = getStatusPriority(b.status);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        const dateA = new Date(a.start_date);
        const dateB = new Date(b.start_date);

        if (a.status === 'past') {
          return dateB.getTime() - dateA.getTime();
        } else {
          return dateA.getTime() - dateB.getTime();
        }
      });

      set({
        tournaments: sortedTournaments,
        isLoading: false
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error creating tournament:', error);
      set({
        error: error instanceof Error ? error.message : 'An error occurred creating tournament',
        isLoading: false
      });
      return { data: null, error };
    }
  },

  updateTournament: async (id, tournament) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('tournaments')
        .update(tournament)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update the tournament and re-sort the list
      const currentTournaments = get().tournaments;
      const updatedTournaments = currentTournaments.map(t => t.id === id ? data : t);

      // Apply the same sorting logic
      const sortedTournaments = updatedTournaments.sort((a, b) => {
        const getStatusPriority = (status: string) => {
          switch (status) {
            case 'active': return 1;
            case 'upcoming': return 2;
            case 'past': return 3;
            default: return 4;
          }
        };

        const priorityA = getStatusPriority(a.status);
        const priorityB = getStatusPriority(b.status);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        const dateA = new Date(a.start_date);
        const dateB = new Date(b.start_date);

        if (a.status === 'past') {
          return dateB.getTime() - dateA.getTime();
        } else {
          return dateA.getTime() - dateB.getTime();
        }
      });

      set({
        tournaments: sortedTournaments,
        isLoading: false
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error updating tournament:', error);
      set({
        error: error instanceof Error ? error.message : 'An error occurred updating tournament',
        isLoading: false
      });
      return { data: null, error };
    }
  },

  updateTournamentRules: async (id, rules) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('tournaments')
        .update({ rules })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update the tournament in the list
      const currentTournaments = get().tournaments;
      const updatedTournaments = currentTournaments.map(t =>
        t.id === id ? { ...t, rules } : t
      );

      set({
        tournaments: updatedTournaments,
        isLoading: false
      });

      toast.success('Tournament rules updated successfully');
    } catch (error) {
      console.error('Error updating tournament rules:', error);
      set({
        error: error instanceof Error ? error.message : 'An error occurred updating tournament rules',
        isLoading: false
      });
      toast.error('Failed to update tournament rules');
      throw error;
    }
  },

  updateBracketStatus: async (id, status) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('tournaments')
        .update({ bracket_status: status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update the tournament in the list
      const currentTournaments = get().tournaments;
      const updatedTournaments = currentTournaments.map(t =>
        t.id === id ? { ...t, bracket_status: status } : t
      );

      set({
        tournaments: updatedTournaments,
        isLoading: false
      });

      toast.success(`Bracket status updated to ${status}`);
    } catch (error) {
      console.error('Error updating bracket status:', error);
      set({
        error: error instanceof Error ? error.message : 'An error occurred updating bracket status',
        isLoading: false
      });
      toast.error('Failed to update bracket status');
      throw error;
    }
  },

  deleteTournament: async (id) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set({
        tournaments: get().tournaments.filter(t => t.id !== id),
        isLoading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred deleting tournament',
        isLoading: false
      });
    }
  },

  duplicateTournament: async (id, targetConfigId) => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { data: sourceTournament, error: fetchError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!sourceTournament) throw new Error('Tournament not found');

      const { data: prizes, error: prizesError } = await supabase
        .from('tournament_prizes')
        .select('*')
        .eq('tournament_id', id);

      if (prizesError) throw prizesError;

      const { data: fieldValues, error: fieldValuesError } = await supabase
        .from('tournament_field_values')
        .select('*')
        .eq('tournament_id', id);

      if (fieldValuesError) throw fieldValuesError;

      const newTournamentData: TournamentInsert = {
        title: `${sourceTournament.title} - duplicate`,
        description: sourceTournament.description,
        type: sourceTournament.type,
        location_type: sourceTournament.location_type,
        location_name: sourceTournament.location_name,
        start_date: sourceTournament.start_date,
        end_date: sourceTournament.end_date,
        registration_start_date: sourceTournament.registration_start_date,
        registration_end_date: sourceTournament.registration_end_date,
        status: 'upcoming',
        created_by: currentUser.id,
        game_id: sourceTournament.game_id,
        icon_url: sourceTournament.icon_url,
        announcement_url: sourceTournament.announcement_url,
        header_url: sourceTournament.header_url,
        twitch_url: sourceTournament.twitch_url,
        compatible_devices: sourceTournament.compatible_devices,
        discord_url: sourceTournament.discord_url,
        discord_server_id: sourceTournament.discord_server_id,
        tournament_format: sourceTournament.tournament_format,
        eligible_countries: targetConfigId !== undefined
          ? (targetConfigId ? null : sourceTournament.eligible_countries)
          : sourceTournament.eligible_countries,
        minimum_age: sourceTournament.minimum_age,
        required_documents_under_18: sourceTournament.required_documents_under_18,
        max_players_per_team: sourceTournament.max_players_per_team,
        max_nb_players: sourceTournament.max_nb_players,
        rules: sourceTournament.rules,
        private_server_code: sourceTournament.private_server_code,
        bracket_status: 'draft',
        allow_backups: sourceTournament.allow_backups,
        max_backup_players: sourceTournament.max_backup_players,
        initial_max_players: sourceTournament.initial_max_players,
        actual_participants: null,
        registration_locked: false,
        bracket_launched_at: null,
        config_id: targetConfigId !== undefined ? targetConfigId : sourceTournament.config_id,
      };

      const { data: newTournament, error: createError } = await supabase
        .from('tournaments')
        .insert([newTournamentData])
        .select()
        .single();

      if (createError) throw createError;
      if (!newTournament) throw new Error('Failed to create tournament duplicate');

      if (prizes && prizes.length > 0) {
        const newPrizes = prizes.map((prize) => ({
          tournament_id: newTournament.id,
          position: prize.position,
          title: prize.title,
          prize_name: prize.prize_name,
          description: prize.description,
          image_url: prize.image_url,
          prize_type: prize.prize_type,
          monetary_amount: prize.monetary_amount,
          currency: prize.currency,
          redemption_code: prize.redemption_code,
        }));

        const { error: prizesInsertError } = await supabase
          .from('tournament_prizes')
          .insert(newPrizes);

        if (prizesInsertError) {
          console.error('Error duplicating prizes:', prizesInsertError);
        }
      }

      if (fieldValues && fieldValues.length > 0) {
        const newFieldValues = fieldValues.map((fieldValue) => ({
          tournament_id: newTournament.id,
          field_id: fieldValue.field_id,
          value: fieldValue.value,
        }));

        const { error: fieldValuesInsertError } = await supabase
          .from('tournament_field_values')
          .insert(newFieldValues);

        if (fieldValuesInsertError) {
          console.error('Error duplicating field values:', fieldValuesInsertError);
        }
      }

      const currentTournaments = get().tournaments;
      const updatedTournaments = [...currentTournaments, newTournament];

      const sortedTournaments = updatedTournaments.sort((a, b) => {
        const getStatusPriority = (status: string) => {
          switch (status) {
            case 'active': return 1;
            case 'upcoming': return 2;
            case 'past': return 3;
            default: return 4;
          }
        };

        const priorityA = getStatusPriority(a.status);
        const priorityB = getStatusPriority(b.status);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        const dateA = new Date(a.start_date);
        const dateB = new Date(b.start_date);

        if (a.status === 'past') {
          return dateB.getTime() - dateA.getTime();
        } else {
          return dateA.getTime() - dateB.getTime();
        }
      });

      set({
        tournaments: sortedTournaments,
        isLoading: false
      });

      toast.success(`Tournament duplicated: ${newTournament.title}`);

      return { data: newTournament, error: null };
    } catch (error) {
      console.error('Error duplicating tournament:', error);
      set({
        error: error instanceof Error ? error.message : 'An error occurred duplicating tournament',
        isLoading: false
      });
      toast.error('Failed to duplicate tournament');
      return { data: null, error };
    }
  },

  resetBracket: async (id: string) => {
    try {
      set({ isLoading: true, error: null });

      // Check user permissions - only master_admin and super_admin can reset brackets
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (userError) throw userError;

      if (!userData || (userData.role !== 'master_admin' && userData.role !== 'super_admin')) {
        toast.error('You do not have permission to reset brackets');
        set({ isLoading: false });
        return false;
      }

      // Perform the bracket reset
      const success = await resetTournamentBracket(id);

      if (success) {
        // Update the tournament in the local state
        const currentTournaments = get().tournaments;
        const updatedTournaments = currentTournaments.map(t =>
          t.id === id ? {
            ...t,
            bracket_status: null,
            bracket_launched_at: null,
            actual_participants: null
          } : t
        );

        set({
          tournaments: updatedTournaments,
          isLoading: false
        });

        toast.success('Bracket reset successfully. All matches have been deleted.');
        return true;
      } else {
        toast.error('Failed to reset bracket');
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      console.error('Error resetting bracket:', error);
      set({
        error: error instanceof Error ? error.message : 'An error occurred resetting bracket',
        isLoading: false
      });
      toast.error('Failed to reset bracket');
      return false;
    }
  },
}));
