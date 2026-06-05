import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';

// Creates a new sqlite database file if it doesn't exist.
export const sqlite = new Database('sqlite.db');
export const db = drizzle(sqlite, { schema });
