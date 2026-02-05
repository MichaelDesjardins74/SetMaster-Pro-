import { eq, and } from 'drizzle-orm';
import { getDatabase } from '../database';
import { cues } from '../schema';
import { Cue } from '@/types';

/**
 * Cue database operations
 */

export async function getCuesBySongId(songId: string): Promise<Cue[]> {
  const db = getDatabase();
  const results = await db
    .select()
    .from(cues)
    .where(eq(cues.songId, songId))
    .orderBy(cues.timeInSeconds);

  return results.map(row => ({
    id: row.id,
    songId: row.songId,
    timeInSeconds: row.timeInSeconds,
    type: row.type as 'lyric' | 'section' | 'note' | 'warning',
    content: row.content,
    color: row.color || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function getCueById(cueId: string): Promise<Cue | null> {
  const db = getDatabase();
  const results = await db
    .select()
    .from(cues)
    .where(eq(cues.id, cueId))
    .limit(1);

  if (results.length === 0) return null;

  const row = results[0];
  return {
    id: row.id,
    songId: row.songId,
    timeInSeconds: row.timeInSeconds,
    type: row.type as 'lyric' | 'section' | 'note' | 'warning',
    content: row.content,
    color: row.color || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createCue(cue: Cue): Promise<void> {
  const db = getDatabase();
  const now = Date.now();

  await db.insert(cues).values({
    id: cue.id,
    songId: cue.songId,
    timeInSeconds: cue.timeInSeconds,
    type: cue.type,
    content: cue.content,
    color: cue.color || null,
    createdAt: cue.createdAt || now,
    updatedAt: cue.updatedAt || now,
  });
}

export async function updateCue(cueId: string, updates: Partial<Cue>): Promise<void> {
  const db = getDatabase();

  await db
    .update(cues)
    .set({
      ...updates,
      updatedAt: Date.now(),
    })
    .where(eq(cues.id, cueId));
}

export async function deleteCue(cueId: string): Promise<void> {
  const db = getDatabase();

  await db.delete(cues).where(eq(cues.id, cueId));
}

export async function deleteCuesBySongId(songId: string): Promise<void> {
  const db = getDatabase();

  await db.delete(cues).where(eq(cues.songId, songId));
}
