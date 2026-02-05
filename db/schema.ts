import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * SQLite Database Schema for SetMaster Pro
 * Stores: Songs, Setlists, Cues, Practice Schedules, Rehearsal Sessions
 */

// Songs table
export const songs = sqliteTable('songs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // Link to cloud user
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  duration: integer('duration').notNull(), // in seconds
  uri: text('uri'),
  audioUri: text('audio_uri'),
  albumArt: text('album_art'),
  lyrics: text('lyrics'),
  notes: text('notes'),
  bpm: integer('bpm'),
  key: text('key'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Setlists table
export const setlists = sqliteTable('setlists', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  venue: text('venue'),
  eventDate: integer('event_date'),
  duration: integer('duration').notNull(), // total duration in seconds
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Setlist Songs (junction table for many-to-many relationship)
export const setlistSongs = sqliteTable('setlist_songs', {
  id: text('id').primaryKey(),
  setlistId: text('setlist_id').notNull(),
  songId: text('song_id').notNull(),
  position: integer('position').notNull(), // order in setlist
  createdAt: integer('created_at').notNull(),
});

// Song Cues table
export const cues = sqliteTable('cues', {
  id: text('id').primaryKey(),
  songId: text('song_id').notNull(),
  timeInSeconds: real('time_in_seconds').notNull(),
  type: text('type').notNull(), // 'lyric', 'section', 'note', 'warning'
  content: text('content').notNull(),
  color: text('color'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Practice Schedules table
export const practiceSchedules = sqliteTable('practice_schedules', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startDate: integer('start_date').notNull(),
  endDate: integer('end_date'),
  frequency: text('frequency').notNull(), // 'daily', 'weekly', 'monthly', 'custom'
  daysOfWeek: text('days_of_week'), // JSON array of numbers
  reminderEnabled: integer('reminder_enabled', { mode: 'boolean' }).notNull(),
  reminderMinutes: integer('reminder_minutes'),
  goals: text('goals'), // JSON array of strings
  completed: integer('completed', { mode: 'boolean' }).notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Rehearsal Sessions table
export const rehearsalSessions = sqliteTable('rehearsal_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  date: integer('date').notNull(),
  duration: integer('duration').notNull(), // in minutes
  setlistId: text('setlist_id'),
  notes: text('notes'),
  completed: integer('completed', { mode: 'boolean' }).notNull(),
  practiceGoals: text('practice_goals'), // JSON array
  focusAreas: text('focus_areas'), // JSON array
  isActive: integer('is_active', { mode: 'boolean' }),
  startedAt: integer('started_at'),
  currentSongIndex: integer('current_song_index'),
  temporarySetlistId: text('temporary_setlist_id'),
  timeRemaining: integer('time_remaining'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Rehearsal Session Songs (for sessions without setlist)
export const rehearsalSessionSongs = sqliteTable('rehearsal_session_songs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  songId: text('song_id').notNull(),
  position: integer('position').notNull(),
  createdAt: integer('created_at').notNull(),
});

// Rehearsal Plans table
export const rehearsalPlans = sqliteTable('rehearsal_plans', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  totalDuration: integer('total_duration').notNull(), // in minutes
  aiGenerated: integer('ai_generated', { mode: 'boolean' }).notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
