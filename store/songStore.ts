import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { Song } from '@/types';
import { getUserStorageKey } from '@/utils/storageUtils';

interface SongState {
  songs: Record<string, Song>;
  currentUserId: string | null;
  addSong: (song: Song) => void;
  updateSong: (id: string, updates: Partial<Song>) => void;
  deleteSong: (id: string) => void;
  cleanupOrphanedAudioFiles: () => Promise<void>;
  loadUserData: (userId: string) => Promise<void>;
  clearData: () => void;
  saveUserData: () => Promise<void>;
}

export const useSongStore = create<SongState>()(
  persist(
    (set, get) => ({
      songs: {},
      currentUserId: null,
      addSong: (song) => {
        set((state) => ({
          songs: { ...state.songs, [song.id]: song }
        }));
        setTimeout(() => get().saveUserData(), 0);
      },
      updateSong: (id, updates) => {
        set((state) => {
          if (!state.songs[id]) return state;
          return {
            songs: {
              ...state.songs,
              [id]: {
                ...state.songs[id],
                ...updates,
                updatedAt: Date.now(),
              }
            }
          };
        });
        setTimeout(() => get().saveUserData(), 0);
      },
      deleteSong: (id) => {
        set((state) => {
          const songToDelete = state.songs[id];

          // Clean up audio file if it exists
          if (songToDelete?.audioUri && Platform.OS !== 'web') {
            FileSystem.deleteAsync(songToDelete.audioUri).catch(error => {
              console.error('Error deleting audio file:', error);
            });
          }

          const newSongs = { ...state.songs };
          delete newSongs[id];
          return { songs: newSongs };
        });
        setTimeout(() => get().saveUserData(), 0);
      },
      
      cleanupOrphanedAudioFiles: async () => {
        if (Platform.OS === 'web') return;

        try {
          const audioDir = `${(FileSystem as any).documentDirectory}audio/`;
          const dirInfo = await FileSystem.getInfoAsync(audioDir);

          if (!dirInfo.exists) return;

          const files = await FileSystem.readDirectoryAsync(audioDir);
          const { songs } = useSongStore.getState();

          // Get all audio URIs currently in use
          const usedAudioFiles = new Set(
            Object.values(songs)
              .map(song => song.audioUri)
              .filter((uri): uri is string => uri !== undefined && uri.includes('/audio/'))
              .map(uri => uri.split('/').pop()) // Get just the filename
              .filter((filename): filename is string => filename !== undefined)
          );

          // Delete files that are not referenced by any song
          for (const file of files) {
            if (!usedAudioFiles.has(file)) {
              const filePath = `${audioDir}${file}`;
              console.log('Cleaning up orphaned audio file:', filePath);
              await FileSystem.deleteAsync(filePath).catch(error => {
                console.error('Error deleting orphaned file:', error);
              });
            }
          }
        } catch (error) {
          console.error('Error cleaning up orphaned audio files:', error);
        }
      },

      loadUserData: async (userId: string) => {
        try {
          const storageKey = getUserStorageKey(userId, 'setmaster-songs');
          const data = await AsyncStorage.getItem(storageKey);

          if (data) {
            const parsed = JSON.parse(data);
            set({ songs: parsed.state?.songs || {}, currentUserId: userId });
          } else {
            // New user - start with empty data
            set({ songs: {}, currentUserId: userId });
          }
        } catch (error) {
          console.error('Error loading user song data:', error);
          set({ songs: {}, currentUserId: userId });
        }
      },

      saveUserData: async () => {
        const { currentUserId, songs } = get();
        if (!currentUserId) return;

        try {
          const storageKey = getUserStorageKey(currentUserId, 'setmaster-songs');
          await AsyncStorage.setItem(storageKey, JSON.stringify({ state: { songs } }));
        } catch (error) {
          console.error('Error saving user song data:', error);
        }
      },

      clearData: () => {
        set({ songs: {}, currentUserId: null });
      },
    }),
    {
      name: 'setmaster-songs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);