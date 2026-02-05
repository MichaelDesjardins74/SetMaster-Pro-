import { eq, and } from 'drizzle-orm';
import { getDatabase } from '../database';
import { setlists, setlistSongs } from '../schema';
import { Setlist } from '@/types';
import { generateId } from '@/utils/idUtils';

/**
 * Setlist database operations
 */

export async function getAllSetlists(userId: string): Promise<Setlist[]> {
  const db = getDatabase();
  const results = await db.select().from(setlists).where(eq(setlists.userId, userId));

  // For each setlist, get the songs
  const setlistsWithSongs = await Promise.all(
    results.map(async (row) => {
      const songRecords = await db
        .select()
        .from(setlistSongs)
        .where(eq(setlistSongs.setlistId, row.id))
        .orderBy(setlistSongs.position);

      return {
        id: row.id,
        name: row.name,
        songs: songRecords.map(s => s.songId),
        duration: row.duration,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        description: row.description || undefined,
        venue: row.venue || undefined,
        eventDate: row.eventDate || undefined,
      };
    })
  );

  return setlistsWithSongs;
}

export async function getSetlistById(setlistId: string, userId: string): Promise<Setlist | null> {
  const db = getDatabase();
  const results = await db
    .select()
    .from(setlists)
    .where(and(eq(setlists.id, setlistId), eq(setlists.userId, userId)))
    .limit(1);

  if (results.length === 0) return null;

  const row = results[0];

  // Get songs for this setlist
  const songRecords = await db
    .select()
    .from(setlistSongs)
    .where(eq(setlistSongs.setlistId, row.id))
    .orderBy(setlistSongs.position);

  return {
    id: row.id,
    name: row.name,
    songs: songRecords.map(s => s.songId),
    duration: row.duration,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    description: row.description || undefined,
    venue: row.venue || undefined,
    eventDate: row.eventDate || undefined,
  };
}

export async function createSetlist(setlist: Setlist, userId: string): Promise<void> {
  const db = getDatabase();
  const now = Date.now();

  // Insert setlist
  await db.insert(setlists).values({
    id: setlist.id,
    userId,
    name: setlist.name,
    description: setlist.description || null,
    venue: setlist.venue || null,
    eventDate: setlist.eventDate || null,
    duration: setlist.duration,
    createdAt: setlist.createdAt || now,
    updatedAt: setlist.updatedAt || now,
  });

  // Insert songs
  if (setlist.songs && setlist.songs.length > 0) {
    await db.insert(setlistSongs).values(
      setlist.songs.map((songId, index) => ({
        id: generateId(),
        setlistId: setlist.id,
        songId,
        position: index,
        createdAt: now,
      }))
    );
  }
}

export async function updateSetlist(
  setlistId: string,
  userId: string,
  updates: Partial<Setlist>
): Promise<void> {
  const db = getDatabase();
  const now = Date.now();

  // Update setlist metadata
  const { songs, ...metadataUpdates } = updates;

  if (Object.keys(metadataUpdates).length > 0) {
    await db
      .update(setlists)
      .set({
        ...metadataUpdates,
        updatedAt: now,
      })
      .where(and(eq(setlists.id, setlistId), eq(setlists.userId, userId)));
  }

  // Update songs if provided
  if (songs) {
    // Delete existing songs
    await db.delete(setlistSongs).where(eq(setlistSongs.setlistId, setlistId));

    // Insert new songs
    if (songs.length > 0) {
      await db.insert(setlistSongs).values(
        songs.map((songId, index) => ({
          id: generateId(),
          setlistId,
          songId,
          position: index,
          createdAt: now,
        }))
      );
    }
  }
}

export async function deleteSetlist(setlistId: string, userId: string): Promise<void> {
  const db = getDatabase();

  // Delete songs (cascade should handle this, but being explicit)
  await db.delete(setlistSongs).where(eq(setlistSongs.setlistId, setlistId));

  // Delete setlist
  await db
    .delete(setlists)
    .where(and(eq(setlists.id, setlistId), eq(setlists.userId, userId)));
}

export async function reorderSetlistSongs(
  setlistId: string,
  userId: string,
  songIds: string[]
): Promise<void> {
  const db = getDatabase();
  const now = Date.now();

  // Verify setlist belongs to user
  const setlist = await getSetlistById(setlistId, userId);
  if (!setlist) {
    throw new Error('Setlist not found or unauthorized');
  }

  // Delete existing songs
  await db.delete(setlistSongs).where(eq(setlistSongs.setlistId, setlistId));

  // Insert songs in new order
  if (songIds.length > 0) {
    await db.insert(setlistSongs).values(
      songIds.map((songId, index) => ({
        id: generateId(),
        setlistId,
        songId,
        position: index,
        createdAt: now,
      }))
    );
  }

  // Update setlist timestamp
  await db
    .update(setlists)
    .set({ updatedAt: now })
    .where(and(eq(setlists.id, setlistId), eq(setlists.userId, userId)));
}
