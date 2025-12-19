import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  type: 'admin' | 'gamer';
  role?: 'admin' | 'master_admin' | 'super_admin' | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  canGenerateReports: () => boolean;
  canAccessGamification: () => boolean;
  canResetBrackets: () => boolean;
  canAccessCoachingAnalytics: () => boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Get user type from the users table
      const { data, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (userError) throw userError;

      if (!data) {
        await supabase.auth.signOut();
        throw new Error('User record not found');
      }

      if (data.type !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Only admins can access the dashboard');
      }

      set({
        user: {
          id: data.id,
          email: data.email,
          type: data.type,
          role: data.role,
        },
        isLoading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred during login',
        isLoading: false,
        user: null
      });
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      await supabase.auth.signOut();
      set({ user: null, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred during logout',
        isLoading: false 
      });
    }
  },

  checkSession: async () => {
    try {
      set({ isLoading: true });
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        set({ user: null, isLoading: false });
        return;
      }

      // Get user type from the users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();

      if (error) {
        await supabase.auth.signOut();
        set({ user: null, isLoading: false });
        return;
      }

      if (!data || data.type !== 'admin') {
        await supabase.auth.signOut();
        set({ user: null, isLoading: false });
        return;
      }

      set({
        user: {
          id: data.id,
          email: data.email,
          type: data.type,
          role: data.role,
        },
        isLoading: false
      });
    } catch (error) {
      // Check if the error is related to refresh token not found
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('refresh_token_not_found') || errorMessage.includes('Invalid Refresh Token')) {
        // Clear any stale session data from localStorage
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('sb-' + supabase.supabaseUrl.split('//')[1].split('.')[0] + '-auth-token');
        
        // Sign out to ensure clean state
        await supabase.auth.signOut();
        
        set({ 
          user: null, 
          isLoading: false,
          error: null // Don't show error for invalid refresh tokens
        });
      } else {
        set({ 
          error: error instanceof Error ? error.message : 'An error occurred checking session',
          user: null, 
          isLoading: false 
        });
      }
    }
  },

  canGenerateReports: () => {
    const state = useAuthStore.getState();
    const userRole = state.user?.role;
    return userRole === 'super_admin' || userRole === 'master_admin';
  },

  canAccessGamification: () => {
    const state = useAuthStore.getState();
    const userRole = state.user?.role;
    return userRole === 'master_admin';
  },

  canResetBrackets: () => {
    const state = useAuthStore.getState();
    const userRole = state.user?.role;
    return userRole === 'super_admin' || userRole === 'master_admin';
  },

  canAccessCoachingAnalytics: () => {
    const state = useAuthStore.getState();
    const userRole = state.user?.role;
    return userRole === 'super_admin' || userRole === 'master_admin';
  },
}));