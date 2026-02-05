import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Setlist } from '@/types';
import { getUserStorageKey } from '@/utils/storageUtils';

interface SetlistState {
  setlists: Record<string, Setlist>;
  activeSetlistId: string | null;
  currentUserId: string | null;
  addSetlist: (setlist: Setlist) => void;
  updateSetlist: (id: string, updates: Partial<Setlist>) => void;
  deleteSetlist: (id: string) => void;
  setActiveSetlist: (id: string | null) => void;
  reorderSongs: (setlistId: string, songIds: string[]) => void;
  loadUserData: (userId: string) => Promise<void>;
  clearData: () => void;
  saveUserData: () => Promise<void>;
}

export const useSetlistStore = create<SetlistState>()(
  persist(
    (set, get) => ({
      setlists: {},
      activeSetlistId: null,
      currentUserId: null,

      addSetlist: (setlist) => {
        set((state) => ({
          setlists: { ...state.setlists, [setlist.id]: setlist }
        }));
        setTimeout(() => get().saveUserData(), 0);
      },

      updateSetlist: (id, updates) => {
        set((state) => {
          if (!state.setlists[id]) return state;
          return {
            setlists: {
              ...state.setlists,
              [id]: {
                ...state.setlists[id],
                ...updates,
                updatedAt: Date.now(),
              }
            }
          };
        });
        setTimeout(() => get().saveUserData(), 0);
      },

      deleteSetlist: (id) => {
        set((state) => {
          const newSetlists = { ...state.setlists };
          delete newSetlists[id];
          return {
            setlists: newSetlists,
            activeSetlistId: state.activeSetlistId === id ? null : state.activeSetlistId
          };
        });
        setTimeout(() => get().saveUserData(), 0);
      },

      setActiveSetlist: (id) => {
        set({ activeSetlistId: id });
        setTimeout(() => get().saveUserData(), 0);
      },

      reorderSongs: (setlistId, songIds) => {
        set((state) => {
          if (!state.setlists[setlistId]) return state;
          return {
            setlists: {
              ...state.setlists,
              [setlistId]: {
                ...state.setlists[setlistId],
                songs: songIds,
                updatedAt: Date.now(),
              }
            }
          };
        });
        setTimeout(() => get().saveUserData(), 0);
      },

      loadUserData: async (userId: string) => {
        try {
          const storageKey = getUserStorageKey(userId, 'setmaster-setlists');
          const data = await AsyncStorage.getItem(storageKey);

          if (data) {
            const parsed = JSON.parse(data);
            set({
              setlists: parsed.state?.setlists || {},
              activeSetlistId: parsed.state?.activeSetlistId || null,
              currentUserId: userId
            });
          } else {
            // New user - start with empty data
            set({ setlists: {}, activeSetlistId: null, currentUserId: userId });
          }
        } catch (error) {
          console.error('Error loading user setlist data:', error);
          set({ setlists: {}, activeSetlistId: null, currentUserId: userId });
        }
      },

      saveUserData: async () => {
        const { currentUserId, setlists, activeSetlistId } = get();
        if (!currentUserId) return;

        try {
          const storageKey = getUserStorageKey(currentUserId, 'setmaster-setlists');
          await AsyncStorage.setItem(storageKey, JSON.stringify({
            state: { setlists, activeSetlistId }
          }));
        } catch (error) {
          console.error('Error saving user setlist data:', error);
        }
      },

      clearData: () => {
        set({ setlists: {}, activeSetlistId: null, currentUserId: null });
      },
    }),
    {
      name: 'setmaster-setlists',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
