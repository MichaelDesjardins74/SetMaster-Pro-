import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { loadUserData, clearAllUserData } from '@/utils/userDataManager';
import { Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  email?: string;
  name?: string;
  profilePicture?: string;
  authProvider: 'email' | 'apple' | 'google';
}

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Subscription {
  id: string;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  plan: 'free' | 'pro' | 'premium';
  currentPeriodEnd: string | null;
}

interface AuthStore {
  user: User | null;
  profile: UserProfile | null;
  subscription: Subscription | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  session: Session | null;

  // Actions
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  saveUser: (user: User) => Promise<void>;
  signupUser: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  loginUser: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  loadSubscription: () => Promise<void>;
}

const AUTH_STORAGE_KEY = 'setmaster_user';

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  subscription: null,
  isAuthenticated: false,
  isLoading: true,
  session: null,

  setUser: (user) => {
    set({
      user,
      isAuthenticated: user !== null,
      isLoading: false
    });
  },

  saveUser: async (user) => {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      set({
        user,
        isAuthenticated: true,
        isLoading: false
      });

      // Load user-specific data
      await loadUserData(user.id);

      // Load profile and subscription
      await get().loadSubscription();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  },

  loadUser: async () => {
    try {
      set({ isLoading: true });
      console.log('📱 AuthStore: Starting loadUser...');

      // Add timeout to prevent hanging forever
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session load timeout after 8 seconds')), 8000);
      });

      // Check for existing Supabase session with timeout
      const sessionPromise = supabase.auth.getSession();
      const { data: { session }, error } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('❌ AuthStore: Error getting session:', error);
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      if (session?.user) {
        console.log('✓ AuthStore: Session found, restoring user:', session.user.id);

        // Get user profile from Supabase
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('⚠️  AuthStore: Error fetching profile (non-critical):', profileError);
        }

        const user: User = {
          id: session.user.id,
          email: session.user.email,
          name: profile?.full_name || undefined,
          profilePicture: profile?.avatar_url || undefined,
          authProvider: 'email', // You can enhance this to detect the actual provider
        };

        set({
          user,
          profile: profile || null,
          session,
          isAuthenticated: true,
          isLoading: false
        });

        // Load user-specific data - wrapped in try/catch to not block authentication
        try {
          console.log('📦 AuthStore: Loading user-specific data...');
          await loadUserData(user.id);
          console.log('✓ AuthStore: User data loaded successfully');
        } catch (dataError) {
          console.error('⚠️  AuthStore: Error loading user data (non-critical):', dataError);
        }

        // Load subscription - wrapped in try/catch to not block authentication
        try {
          console.log('💳 AuthStore: Loading subscription...');
          await get().loadSubscription();
          console.log('✓ AuthStore: Subscription loaded');
        } catch (subError) {
          console.error('⚠️  AuthStore: Error loading subscription (non-critical):', subError);
        }

        console.log('✓ AuthStore: User restored successfully from session');
      } else {
        console.log('ℹ️  AuthStore: No existing session found');
        set({
          user: null,
          profile: null,
          session: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('❌ AuthStore: Critical error in loadUser:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        if (error.message.includes('timeout')) {
          console.error('⚠️  Session load timed out - network may be slow or offline');
        }
        console.error('Stack trace:', error.stack);
      }
      // CRITICAL: Always set isLoading to false to prevent hanging
      set({
        user: null,
        profile: null,
        session: null,
        isAuthenticated: false,
        isLoading: false
      });
    } finally {
      // Extra safety: ensure isLoading is always false after this function
      const currentState = get();
      if (currentState.isLoading) {
        console.warn('⚠️  Force setting isLoading to false in finally block');
        set({ isLoading: false });
      }
    }
  },

  logout: async () => {
    try {
      // Clear all user data first
      clearAllUserData();

      // Sign out from Supabase
      await supabase.auth.signOut();

      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      set({
        user: null,
        profile: null,
        subscription: null,
        session: null,
        isAuthenticated: false,
        isLoading: false
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  },

  signupUser: async (email, password, name) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        console.error('Signup error:', error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Check if email confirmation is required
        const session = data.session;

        if (!session && data.user.identities && data.user.identities.length === 0) {
          // User already exists
          return {
            success: false,
            error: 'An account with this email already exists. Please login instead.'
          };
        }

        if (!session) {
          // Email confirmation required
          return {
            success: true,
            error: 'Please check your email to confirm your account before logging in.'
          };
        }

        // User created and logged in successfully
        const user: User = {
          id: data.user.id,
          email: data.user.email,
          name,
          authProvider: 'email',
        };

        await get().saveUser(user);
        return { success: true };
      }

      return { success: false, error: 'Failed to create user' };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { success: false, error: error.message || 'Failed to sign up' };
    }
  },

  loginUser: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
      }

      if (data.session?.user) {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();

        const user: User = {
          id: data.session.user.id,
          email: data.session.user.email,
          name: profile?.full_name || undefined,
          profilePicture: profile?.avatar_url || undefined,
          authProvider: 'email',
        };

        await get().saveUser(user);
        return { success: true };
      }

      return { success: false, error: 'Failed to login' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Failed to login' };
    }
  },

  updateProfile: async (updates) => {
    try {
      const { user } = get();
      if (!user) return false;

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return false;
      }

      // Reload user data
      await get().loadUser();
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  },

  loadSubscription: async () => {
    try {
      const { user } = get();
      if (!user) return;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results

      if (error) {
        console.error('Error loading subscription:', error);
        return;
      }

      if (data) {
        set({
          subscription: {
            id: data.id,
            status: data.status,
            plan: data.plan,
            currentPeriodEnd: data.current_period_end,
          }
        });
      } else {
        // No subscription found - user might be newly created
        console.log('No subscription found for user, will be created by trigger');
        set({ subscription: null });
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  },
}));

// Listen to auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');

  if (event === 'SIGNED_IN' && session) {
    // User signed in - reload user data
    await useAuthStore.getState().loadUser();
  } else if (event === 'TOKEN_REFRESHED' && session) {
    // Token refreshed - update session in store
    console.log('Token refreshed successfully');
    useAuthStore.setState({ session });
  } else if (event === 'SIGNED_OUT') {
    // User signed out - clear all data
    console.log('User signed out, clearing data');
    useAuthStore.setState({
      user: null,
      profile: null,
      subscription: null,
      session: null,
      isAuthenticated: false,
    });
  } else if (event === 'INITIAL_SESSION' && session) {
    // Initial session loaded from storage
    console.log('Initial session restored from storage');
    await useAuthStore.getState().loadUser();
  }
});
