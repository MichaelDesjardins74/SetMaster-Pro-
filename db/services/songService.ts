import { eq, and } from 'drizzle-orm';
import { getDatabase } from '../database';
import { songs } from '../schema';
import { Song } from '@/types';

/**
 * Song database operations
 */

export async function getAllSongs(userId: string): Promise<Song[]> {
  const db = getDatabase();
  const results = await db.select().from(songs).where(eq(songs.userId, userId));

  return results.map(row => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    duration: row.duration,
    uri: row.uri || undefined,
    audioUri: row.audioUri || undefined,
    albumArt: row.albumArt || undefined,
    lyrics: row.lyrics || undefined,
    notes: row.notes || undefined,
    bpm: row.bpm || undefined,
    key: row.key || undefined,
    createdAt: row.createdAt || undefined,
    updatedAt: row.updatedAt || undefined,
  }));
}

export async function getSongById(songId: string, userId: string): Promise<Song | null> {
  const db = getDatabase();
  const results = await db
    .select()
    .from(songs)
    .where(and(eq(songs.id, songId), eq(songs.userId, userId)))
    .limit(1);

  if (results.length === 0) return null;

  const row = results[0];
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    duration: row.duration,
    uri: row.uri || undefined,
    audioUri: row.audioUri || undefined,
    albumArt: row.albumArt || undefined,
    lyrics: row.lyrics || undefined,
    notes: row.notes || undefined,
    bpm: row.bpm || undefined,
    key: row.key || undefined,
    createdAt: row.createdAt || undefined,
    updatedAt: row.updatedAt || undefined,
  };
}

export async function createSong(song: Song, userId: string): Promise<void> {
  const db = getDatabase();
  const now = Date.now();

  await db.insert(songs).values({
    id: song.id,
    userId,
    title: song.title,
    artist: song.artist,
    duration: song.duration,
    uri: song.uri || null,
    audioUri: song.audioUri || null,
    albumArt: song.albumArt || null,
    lyrics: song.lyrics || null,
    notes: song.notes || null,
    bpm: song.bpm || null,
    key: song.key || null,
    createdAt: song.createdAt || now,
    updatedAt: song.updatedAt || now,
  });
}

export async function updateSong(
  songId: string,
  userId: string,
  updates: Partial<Song>
): Promise<void> {
  const db = getDatabase();

  await db
    .update(songs)
    .set({
      ...updates,
      updatedAt: Date.now(),
    })
    .where(and(eq(songs.id, songId), eq(songs.userId, userId)));
}

export async function deleteSong(songId: string, userId: string): Promise<void> {
  const db = getDatabase();

  await db
    .delete(songs)
    .where(and(eq(songs.id, songId), eq(songs.userId, userId)));
}

export async function getSongsByIds(songIds: string[], userId: string): Promise<Song[]> {
  if (songIds.length === 0) return [];

  const db = getDatabase();
  const results = await db
    .select()
    .from(songs)
    .where(eq(songs.userId, userId));

  // Filter by IDs in memory (Drizzle doesn't have a clean "IN" operator for SQLite yet)
  const filtered = results.filter(row => songIds.includes(row.id));

  return filtered.map(row => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    duration: row.duration,
    uri: row.uri || undefined,
    audioUri: row.audioUri || undefined,
    albumArt: row.albumArt || undefined,
    lyrics: row.lyrics || undefined,
    notes: row.notes || undefined,
    bpm: row.bpm || undefined,
    key: row.key || undefined,
    createdAt: row.createdAt || undefined,
    updatedAt: row.updatedAt || undefined,
  }));
}
