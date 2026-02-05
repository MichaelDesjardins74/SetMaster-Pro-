import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

/**
 * Database initialization and management
 */

let db: ReturnType<typeof drizzle> | null = null;
let sqliteDb: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the database connection
 */
export async function initDatabase() {
  try {
    if (db) {
      console.log('Database already initialized');
      return db;
    }

    console.log('Initializing SQLite database...');

    // Open SQLite database
    sqliteDb = await SQLite.openDatabaseAsync('setmaster.db');

    // Initialize Drizzle ORM
    db = drizzle(sqliteDb, { schema });

    // Run migrations
    await runMigrations();

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Get the database instance
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Get the raw SQLite database instance
 */
export function getRawDatabase() {
  if (!sqliteDb) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return sqliteDb;
}

/**
 * Run database migrations
 */
async function runMigrations() {
  if (!sqliteDb) {
    throw new Error('SQLite database not initialized');
  }

  console.log('Running database migrations...');

  try {
    // Create tables
    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        duration INTEGER NOT NULL,
        uri TEXT,
        audio_uri TEXT,
        album_art TEXT,
        lyrics TEXT,
        notes TEXT,
        bpm INTEGER,
        key TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS setlists (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        venue TEXT,
        event_date INTEGER,
        duration INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS setlist_songs (
        id TEXT PRIMARY KEY,
        setlist_id TEXT NOT NULL,
        song_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (setlist_id) REFERENCES setlists(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS cues (
        id TEXT PRIMARY KEY,
        song_id TEXT NOT NULL,
        time_in_seconds REAL NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        color TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS practice_schedules (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        start_date INTEGER NOT NULL,
        end_date INTEGER,
        frequency TEXT NOT NULL,
        days_of_week TEXT,
        reminder_enabled INTEGER NOT NULL,
        reminder_minutes INTEGER,
        goals TEXT,
        completed INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rehearsal_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        date INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        setlist_id TEXT,
        notes TEXT,
        completed INTEGER NOT NULL,
        practice_goals TEXT,
        focus_areas TEXT,
        is_active INTEGER,
        started_at INTEGER,
        current_song_index INTEGER,
        temporary_setlist_id TEXT,
        time_remaining INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (setlist_id) REFERENCES setlists(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS rehearsal_session_songs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        song_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES rehearsal_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS rehearsal_plans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        total_duration INTEGER NOT NULL,
        ai_generated INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
      CREATE INDEX IF NOT EXISTS idx_setlists_user_id ON setlists(user_id);
      CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id ON setlist_songs(setlist_id);
      CREATE INDEX IF NOT EXISTS idx_setlist_songs_song_id ON setlist_songs(song_id);
      CREATE INDEX IF NOT EXISTS idx_cues_song_id ON cues(song_id);
      CREATE INDEX IF NOT EXISTS idx_practice_schedules_user_id ON practice_schedules(user_id);
      CREATE INDEX IF NOT EXISTS idx_rehearsal_sessions_user_id ON rehearsal_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_rehearsal_session_songs_session_id ON rehearsal_session_songs(session_id);
      CREATE INDEX IF NOT EXISTS idx_rehearsal_plans_user_id ON rehearsal_plans(user_id);
    `);

    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

/**
 * Close the database connection
 */
export async function closeDatabase() {
  if (sqliteDb) {
    await sqliteDb.closeAsync();
    sqliteDb = null;
    db = null;
    console.log('Database closed');
  }
}

/**
 * Clear all data from the database (for testing/development)
 */
export async function clearAllData() {
  const rawDb = getRawDatabase();

  await rawDb.execAsync(`
    DELETE FROM rehearsal_session_songs;
    DELETE FROM rehearsal_sessions;
    DELETE FROM rehearsal_plans;
    DELETE FROM setlist_songs;
    DELETE FROM cues;
    DELETE FROM practice_schedules;
    DELETE FROM setlists;
    DELETE FROM songs;
  `);

  console.log('All data cleared from database');
}

/**
 * Clear user-specific data
 */
export async function clearUserData(userId: string) {
  const rawDb = getRawDatabase();

  await rawDb.execAsync(`
    DELETE FROM rehearsal_session_songs
    WHERE session_id IN (SELECT id FROM rehearsal_sessions WHERE user_id = '${userId}');

    DELETE FROM rehearsal_sessions WHERE user_id = '${userId}';
    DELETE FROM rehearsal_plans WHERE user_id = '${userId}';

    DELETE FROM setlist_songs
    WHERE setlist_id IN (SELECT id FROM setlists WHERE user_id = '${userId}');

    DELETE FROM cues
    WHERE song_id IN (SELECT id FROM songs WHERE user_id = '${userId}');

    DELETE FROM practice_schedules WHERE user_id = '${userId}';
    DELETE FROM setlists WHERE user_id = '${userId}';
    DELETE FROM songs WHERE user_id = '${userId}';
  `);

  console.log(`Cleared data for user: ${userId}`);
}
