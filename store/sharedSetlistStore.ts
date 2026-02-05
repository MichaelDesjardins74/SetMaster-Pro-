import { create } from 'zustand';
import { SharedSetlist, Setlist, Song } from '@/types';
import { sharedSetlistService } from '@/lib/services/sharedSetlistService';

interface SharedSetlistState {
  sharedSetlists: Record<string, SharedSetlist[]>; // bandId -> setlists
  isLoading: boolean;
  isSharing: boolean;

  // Actions
  loadBandSetlists: (bandId: string) => Promise<void>;
  shareSetlist: (bandId: string, localSetlist: Setlist, localSongs: Song[]) => Promise<SharedSetlist | null>;
  getSetlistDetails: (setlistId: string) => Promise<SharedSetlist | null>;
  deleteSharedSetlist: (bandId: string, setlistId: string) => Promise<boolean>;
  clearData: () => void;
}

export const useSharedSetlistStore = create<SharedSetlistState>((set, get) => ({
  sharedSetlists: {},
  isLoading: false,
  isSharing: false,

  loadBandSetlists: async (bandId) => {
    set({ isLoading: true });
    try {
      const setlists = await sharedSetlistService.getBandSetlists(bandId);
      set((state) => ({
        sharedSetlists: { ...state.sharedSetlists, [bandId]: setlists },
        isLoading: false
      }));
    } catch (error) {
      console.error('Error loading shared setlists:', error);
      set({ isLoading: false });
    }
  },

  shareSetlist: async (bandId, localSetlist, localSongs) => {
    set({ isSharing: true });
    try {
      const sharedSetlist = await sharedSetlistService.shareSetlist(
        bandId,
        localSetlist,
        localSongs
      );

      if (sharedSetlist) {
        // Reload band setlists
        await get().loadBandSetlists(bandId);
      }

      set({ isSharing: false });
      return sharedSetlist;
    } catch (error) {
      console.error('Error sharing setlist:', error);
      set({ isSharing: false });
      return null;
    }
  },

  getSetlistDetails: async (setlistId) => {
    try {
      return await sharedSetlistService.getSetlistWithSongs(setlistId);
    } catch (error) {
      console.error('Error fetching setlist details:', error);
      return null;
    }
  },

  deleteSharedSetlist: async (bandId, setlistId) => {
    try {
      const success = await sharedSetlistService.deleteSharedSetlist(setlistId);
      if (success) {
        // Remove from local state
        set((state) => ({
          sharedSetlists: {
            ...state.sharedSetlists,
            [bandId]: state.sharedSetlists[bandId]?.filter((s) => s.id !== setlistId) || []
          }
        }));
      }
      return success;
    } catch (error) {
      console.error('Error deleting shared setlist:', error);
      return false;
    }
  },

  clearData: () => {
    set({
      sharedSetlists: {},
      isLoading: false,
      isSharing: false
    });
  }
}));
