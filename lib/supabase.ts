import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';

/**
 * Supabase Client Configuration
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a project at https://supabase.com
 * 2. Get your project URL and anon key from Project Settings > API
 * 3. Replace the placeholders below with your actual values
 * 4. For production, use environment variables or a config file
 */

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
  'https://your-project.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'your-anon-key-here';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Database Types
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          status: 'active' | 'inactive' | 'cancelled' | 'past_due';
          plan: 'free' | 'pro' | 'premium';
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: 'active' | 'inactive' | 'cancelled' | 'past_due';
          plan?: 'free' | 'pro' | 'premium';
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: 'active' | 'inactive' | 'cancelled' | 'past_due';
          plan?: 'free' | 'pro' | 'premium';
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}
