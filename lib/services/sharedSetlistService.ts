import { supabase } from '@/lib/supabase';
import { SharedSetlist, SharedSong, Setlist, Song } from '@/types';
import * as FileSystem from 'expo-file-system/legacy';

// Helper function to decode base64 to ArrayBuffer for upload
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Helper: coerce values into an integer (e.g., duration seconds)
const toInt = (v: unknown, fallback = 0) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.round(n) : fallback;
};

export const sharedSetlistService = {
  /**
   * Share a local setlist to a band (with audio file uploads)
   */
  async shareSetlist(
    bandId: string,
    localSetlist: Setlist,
    localSongs: Song[]
  ): Promise<SharedSetlist | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      console.log('Starting setlist share for band:', bandId);

      // 1. Upload songs first (with audio files)
      const sharedSongIds: string[] = [];

      for (const song of localSongs) {
        console.log('Uploading song:', song.title);
        const sharedSong = await this.uploadSharedSong(bandId, song);
        if (sharedSong) {
          sharedSongIds.push(sharedSong.id);
        }
      }

      if (sharedSongIds.length === 0) {
        console.error('No songs were uploaded successfully');
        return null;
      }

      // 2. Create shared setlist
      const { data: setlist, error: setlistError } = await supabase
        .from('shared_setlists')
        .insert({
          band_id: bandId,
          owner_id: user.id,
          name: localSetlist.name,
          description: localSetlist.description || null,
          venue: localSetlist.venue || null,
          event_date: localSetlist.eventDate ? new Date(localSetlist.eventDate).toISOString() : null,
          metadata: {
            duration: localSetlist.duration,
            song_count: sharedSongIds.length
          }
        })
        .select()
        .single();

      if (setlistError || !setlist) {
        console.error('Error creating shared setlist:', setlistError);
        return null;
      }

      // 3. Link songs to setlist with positions
      for (let i = 0; i < sharedSongIds.length; i++) {
        const { error: linkError } = await supabase
          .from('shared_setlist_songs')
          .insert({
            shared_setlist_id: setlist.id,
            shared_song_id: sharedSongIds[i],
            position: i
          });

        if (linkError) {
          console.error('Error linking song to setlist:', linkError);
        }
      }

      console.log('Setlist shared successfully:', setlist.id);
      return setlist;
    } catch (error) {
      console.error('Error in shareSetlist:', error);
      return null;
    }
  },

  /**
   * Upload a single song with audio file to band storage
   */
  async uploadSharedSong(bandId: string, localSong: Song): Promise<SharedSong | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      let audioUrl: string | null = null;

      // Upload audio file if it exists
      if (localSong.audioUri) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(localSong.audioUri);

          if (fileInfo.exists) {
            console.log('Uploading audio file for:', localSong.title);

            const fileExt = localSong.audioUri.split('.').pop()?.toLowerCase() || 'mp3';
            const fileName = `${Date.now()}_${localSong.id}.${fileExt}`;
            const filePath = `${bandId}/${user.id}/${fileName}`;

            // Read file as base64
            const base64 = await FileSystem.readAsStringAsync(localSong.audioUri, {
              encoding: FileSystem.EncodingType.Base64,
            });

            // Convert and upload
            const arrayBuffer = base64ToArrayBuffer(base64);

            // Slightly better content-type handling
            const contentType =
              fileExt === 'mp3' ? 'audio/mpeg' :
              fileExt === 'm4a' ? 'audio/mp4' :
              fileExt === 'wav' ? 'audio/wav' :
              `audio/${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('band-audio')
              .upload(filePath, arrayBuffer, {
                contentType,
                upsert: false,
              });

            if (uploadError) {
              console.error('Error uploading audio file:', uploadError);
            } else if (uploadData) {
              // Get signed URL (for private bucket, 1 year expiry)
              const { data: urlData, error: urlError } = await supabase.storage
                .from('band-audio')
                .createSignedUrl(filePath, 31536000); // 1 year

              if (urlError) {
                console.error('Error creating signed URL:', urlError);
              } else {
                audioUrl = urlData?.signedUrl || null;
                console.log('Audio file uploaded successfully');
              }
            }
          }
        } catch (fileError) {
          console.error('Error handling audio file:', fileError);
          // Continue without audio file
        }
      }

      // Create shared song record
      const { data, error } = await supabase
        .from('shared_songs')
        .insert({
          band_id: bandId,
          owner_id: user.id,
          title: localSong.title,
          artist: localSong.artist,
          duration: toInt(localSong.duration, 180), // ✅ ensure integer for DB
          audio_url: audioUrl,
          album_art: localSong.albumArt || null,
          lyrics: localSong.lyrics || null,
          notes: localSong.notes || null,
          bpm: localSong.bpm || null,
          key: localSong.key || null,
          metadata: {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating shared song:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in uploadSharedSong:', error);
      return null;
    }
  },

  /**
   * Get all shared setlists for a band
   */
  async getBandSetlists(bandId: string): Promise<SharedSetlist[]> {
    try {
      const { data, error } = await supabase
        .from('shared_setlists')
        .select(`
          *,
          profiles!shared_setlists_owner_id_profiles_fkey(full_name, avatar_url)
        `)
        .eq('band_id', bandId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching shared setlists:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getBandSetlists:', error);
      return [];
    }
  },

  /**
   * Get a shared setlist with all its songs
   */
  async getSetlistWithSongs(setlistId: string): Promise<SharedSetlist | null> {
    try {
      const { data, error } = await supabase
        .from('shared_setlists')
        .select(`
          *,
          profiles!shared_setlists_owner_id_profiles_fkey(full_name, avatar_url),
          shared_setlist_songs(
            position,
            shared_songs(*)
          )
        `)
        .eq('id', setlistId)
        .single();

      if (error) {
        console.error('Error fetching setlist with songs:', error);
        return null;
      }

      // Sort songs by position
      if ((data as any)?.shared_setlist_songs) {
        (data as any).shared_setlist_songs.sort((a: any, b: any) => a.position - b.position);
      }

      return data;
    } catch (error) {
      console.error('Error in getSetlistWithSongs:', error);
      return null;
    }
  },

  /**
   * Delete a shared setlist (owner only)
   */
  async deleteSharedSetlist(setlistId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shared_setlists')
        .delete()
        .eq('id', setlistId);

      if (error) {
        console.error('Error deleting shared setlist:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteSharedSetlist:', error);
      return false;
    }
  },

  /**
   * Get shared songs for a band
   */
  async getBandSongs(bandId: string): Promise<SharedSong[]> {
    try {
      const { data, error } = await supabase
        .from('shared_songs')
        .select('*')
        .eq('band_id', bandId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching shared songs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getBandSongs:', error);
      return [];
    }
  }
};
