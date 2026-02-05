/**
 * NEW Song Store - Uses SQLite Database
 *
 * This is a new version of songStore that uses SQLite instead of AsyncStorage.
 * Replace the old store/songStore.ts with this file once you're ready to migrate.
 */

import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { Song } from '@/types';
import * as songService from '@/db/services/songService';
import { useAuthStore } from './authStore';

interface SongState {
  songs: Record<string, Song>;
  isLoaded: boolean;
  addSong: (song: Song) => Promise<void>;
  updateSong: (id: string, updates: Partial<Song>) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  loadSongs: () => Promise<void>;
  cleanupOrphanedAudioFiles: () => Promise<void>;
}

export const useSongStore = create<SongState>((set, get) => ({
  songs: {},
  isLoaded: false,

  loadSongs: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      console.warn('Cannot load songs: user not authenticated');
      set({ songs: {}, isLoaded: false });
      return;
    }

    try {
      const songsArray = await songService.getAllSongs(user.id);

      // Convert array to record
      const songsRecord: Record<string, Song> = {};
      songsArray.forEach(song => {
        songsRecord[song.id] = song;
      });

      set({ songs: songsRecord, isLoaded: true });
    } catch (error) {
      console.error('Error loading songs:', error);
      set({ songs: {}, isLoaded: false });
    }
  },

  addSong: async (song) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      console.error('Cannot add song: user not authenticated');
      return;
    }

    try {
      await songService.createSong(song, user.id);

      // Update local state
      set((state) => ({
        songs: { ...state.songs, [song.id]: song }
      }));
    } catch (error) {
      console.error('Error adding song:', error);
      throw error;
    }
  },

  updateSong: async (id, updates) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      console.error('Cannot update song: user not authenticated');
      return;
    }

    try {
      await songService.updateSong(id, user.id, updates);

      // Update local state
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
    } catch (error) {
      console.error('Error updating song:', error);
      throw error;
    }
  },

  deleteSong: async (id) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      console.error('Cannot delete song: user not authenticated');
      return;
    }

    try {
      const songToDelete = get().songs[id];

      // Clean up audio file if it exists
      if (songToDelete?.audioUri && Platform.OS !== 'web') {
        FileSystem.deleteAsync(songToDelete.audioUri).catch(error => {
          console.error('Error deleting audio file:', error);
        });
      }

      await songService.deleteSong(id, user.id);

      // Update local state
      set((state) => {
        const newSongs = { ...state.songs };
        delete newSongs[id];
        return { songs: newSongs };
      });
    } catch (error) {
      console.error('Error deleting song:', error);
      throw error;
    }
  },

  cleanupOrphanedAudioFiles: async () => {
    if (Platform.OS === 'web') return;

    try {
      const audioDir = `${(FileSystem as any).documentDirectory}audio/`;
      const dirInfo = await FileSystem.getInfoAsync(audioDir);

      if (!dirInfo.exists) return;

      const files = await FileSystem.readDirectoryAsync(audioDir);
      const { songs } = get();

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
}));
