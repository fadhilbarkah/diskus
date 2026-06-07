import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';

// Creates a new sqlite database file if it doesn't exist.
export const sqlite = new Database(Bun.env.DATABASE_PATH || 'sqlite.db');

// Enable WAL mode for better performance and concurrency
sqlite.exec('PRAGMA journal_mode = WAL;');
// Crucial: Enable foreign keys to ensure onDelete: 'cascade' works properly
sqlite.exec('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
