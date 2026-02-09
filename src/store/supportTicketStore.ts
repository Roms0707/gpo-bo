import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface SupportTicket {
  id: string;
  user_id: string;
  tournament_id: string | null;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  updated_at: string;
  first_opened_at: string | null;
  opened_by: string | null;
  user?: {
    email: string;
    username: string | null;
    country: string | null;
  };
  tournament?: {
    title: string;
  } | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  created_at: string;
  is_admin_message: boolean;
  user?: {
    email: string;
    username: string | null;
  };
}

interface SupportTicketState {
  tickets: SupportTicket[];
  selectedTicket: SupportTicket | null;
  ticketMessages: TicketMessage[];
  unreadCount: number;
  isLoading: boolean;
  isDeleting: boolean;
  isLoadingMessages: boolean;
  error: string | null;
  fetchTickets: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markTicketAsOpened: (ticketId: string) => Promise<void>;
  updateTicketStatus: (id: string, status: 'open' | 'in_progress' | 'closed') => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  fetchTicketMessages: (ticketId: string) => Promise<void>;
  addTicketMessage: (ticketId: string, message: string, isAdminMessage: boolean) => Promise<void>;
  setSelectedTicket: (ticket: SupportTicket | null) => void;
}

export const useSupportTicketStore = create<SupportTicketState>((set, get) => ({
  tickets: [],
  selectedTicket: null,
  ticketMessages: [],
  unreadCount: 0,
  isLoading: false,
  isDeleting: false,
  isLoadingMessages: false,
  error: null,

  fetchTickets: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          user:user_id (
            email,
            username,
            country
          ),
          tournament:tournament_id (
            title
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ tickets: data as SupportTicket[], isLoading: false });
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      set({
        error: error instanceof Error ? error.message : 'An error occurred fetching support tickets',
        isLoading: false
      });
    }
  },

  updateTicketStatus: async (id, status) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // Update the ticket in the local state
      const updatedTickets = get().tickets.map(ticket =>
        ticket.id === id ? { ...ticket, status } : ticket
      );

      // Also update the selected ticket if it's the one being updated
      const selectedTicket = get().selectedTicket;
      if (selectedTicket && selectedTicket.id === id) {
        set({ selectedTicket: { ...selectedTicket, status } });
      }

      set({ tickets: updatedTickets, isLoading: false });
      toast.success(`Ticket status updated to ${status}`);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      set({
        error: error instanceof Error ? error.message : 'An error occurred updating ticket status',
        isLoading: false
      });
      toast.error('Failed to update ticket status');
    }
  },

  deleteTicket: async (id) => {
    try {
      set({ isDeleting: true, error: null });

      // First delete all associated messages
      const { error: messagesError } = await supabase
        .from('ticket_messages')
        .delete()
        .eq('ticket_id', id);

      if (messagesError) throw messagesError;

      // Then delete the ticket itself
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update the local state by removing the deleted ticket
      set({
        tickets: get().tickets.filter(ticket => ticket.id !== id),
        selectedTicket: null,
        ticketMessages: [],
        isDeleting: false
      });

      toast.success('Ticket deleted successfully');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      set({
        error: error instanceof Error ? error.message : 'An error occurred deleting the ticket',
        isDeleting: false
      });
      toast.error('Failed to delete ticket');
    }
  },

  fetchTicketMessages: async (ticketId) => {
    try {
      set({ isLoadingMessages: true, error: null });

      const { data, error } = await supabase
        .from('ticket_messages')
        .select(`
          *,
          user:user_id (
            email,
            username
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({ ticketMessages: data as TicketMessage[], isLoadingMessages: false });
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      set({
        error: error instanceof Error ? error.message : 'An error occurred fetching ticket messages',
        isLoadingMessages: false
      });
    }
  },

  addTicketMessage: async (ticketId, message, isAdminMessage) => {
    try {
      set({ isLoadingMessages: true, error: null });

      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          message,
          is_admin_message: isAdminMessage
        })
        .select(`
          *,
          user:user_id (
            email,
            username
          )
        `)
        .single();

      if (error) throw error;

      // Add the new message to the local state
      set({
        ticketMessages: [...get().ticketMessages, data as TicketMessage],
        isLoadingMessages: false
      });

      toast.success('Message sent successfully');
    } catch (error) {
      console.error('Error adding ticket message:', error);
      set({
        error: error instanceof Error ? error.message : 'An error occurred adding ticket message',
        isLoadingMessages: false
      });
      toast.error('Failed to send message');
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, country')
        .eq('id', user.id)
        .maybeSingle();

      if (userError || !userData) {
        console.error('Error fetching user data:', userError);
        return;
      }

      let query = supabase
        .from('support_tickets')
        .select('id, user:user_id(country)', { count: 'exact', head: true })
        .is('first_opened_at', null);

      if (userData.role === 'admin') {
        if (userData.country) {
          query = query.eq('user.country', userData.country);
        }
      } else if (userData.role === 'super_admin') {
        if (userData.country) {
          query = query.eq('user.country', userData.country);
        }
      }

      const { count, error } = await query;

      if (error) throw error;

      set({ unreadCount: count || 0 });
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  },

  markTicketAsOpened: async (ticketId: string) => {
    try {
      const ticket = get().tickets.find(t => t.id === ticketId) || get().selectedTicket;

      if (!ticket || ticket.first_opened_at) {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('support_tickets')
        .update({
          first_opened_at: new Date().toISOString(),
          opened_by: user.id
        })
        .eq('id', ticketId)
        .is('first_opened_at', null);

      if (error) throw error;

      const updatedTickets = get().tickets.map(t =>
        t.id === ticketId
          ? { ...t, first_opened_at: new Date().toISOString(), opened_by: user.id }
          : t
      );

      const selectedTicket = get().selectedTicket;
      if (selectedTicket && selectedTicket.id === ticketId) {
        set({
          selectedTicket: {
            ...selectedTicket,
            first_opened_at: new Date().toISOString(),
            opened_by: user.id
          }
        });
      }

      set({ tickets: updatedTickets });

      await get().fetchUnreadCount();
    } catch (error) {
      console.error('Error marking ticket as opened:', error);
    }
  },

  setSelectedTicket: (ticket) => {
    set({ selectedTicket: ticket });
  }
}));
