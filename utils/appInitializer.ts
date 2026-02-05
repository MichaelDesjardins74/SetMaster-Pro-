/**
 * App Initialization
 * Handles database setup and app startup logic
 */

import { initDatabase } from '@/db/database';
import { useAuthStore } from '@/store/authStore';

let isInitialized = false;

/**
 * Initialize the app
 * Call this once when the app starts
 */
export async function initializeApp() {
  if (isInitialized) {
    console.log('App already initialized');
    return;
  }

  try {
    console.log('Initializing app...');

    // 1. Initialize SQLite database
    console.log('Initializing database...');
    await initDatabase();

    // 2. Load user session (from Supabase)
    console.log('Loading user session...');
    await useAuthStore.getState().loadUser();

    isInitialized = true;
    console.log('App initialized successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
    throw error;
  }
}

/**
 * Check if app is initialized
 */
export function isAppInitialized() {
  return isInitialized;
}
