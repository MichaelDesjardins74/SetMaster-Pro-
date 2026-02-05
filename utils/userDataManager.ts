/**
 * Centralized user data manager
 * Handles loading and clearing user-specific data across all stores
 */

import { useSongStore } from '@/store/songStore';
import { useSetlistStore } from '@/store/setlistStore';
import { useRehearsalStore } from '@/store/rehearsalStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useBandStore } from '@/store/bandStore';
import { useSharedSetlistStore } from '@/store/sharedSetlistStore';
import { useChatStore } from '@/store/chatStore';

export const loadUserData = async (userId: string) => {
  try {
    console.log('Loading data for user:', userId);

    // Load user-specific data for each store
    await Promise.all([
      useSongStore.getState().loadUserData(userId),
      useSetlistStore.getState().loadUserData(userId),
      useRehearsalStore.getState().loadUserData(userId),
      // Load band-related data
      useBandStore.getState().loadBands(),
      useBandStore.getState().loadInvitations(),
      // settingsStore can load its own data separately if needed
    ]);

    console.log('User data loaded successfully');
  } catch (error) {
    console.error('Error loading user data:', error);
  }
};

export const clearAllUserData = () => {
  try {
    console.log('Clearing all user data');

    // Unsubscribe from all chat channels before clearing
    const chatStore = useChatStore.getState();
    const bandStore = useBandStore.getState();

    bandStore.bands.forEach((band) => {
      chatStore.unsubscribeFromChat(band.id);
    });

    // Clear data from all stores
    useSongStore.getState().clearData();
    useSetlistStore.getState().clearData();
    useRehearsalStore.getState().clearData();
    bandStore.clearData();
    useSharedSetlistStore.getState().clearData();
    chatStore.clearData();
    // Clear settings if needed

    console.log('All user data cleared');
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
};
