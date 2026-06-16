import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";

const isTest = Bun.env.NODE_ENV === "test";
const dbPath = Bun.env.DATABASE_PATH || (isTest ? ":memory:" : "sqlite.db");

// Creates a new sqlite database file if it doesn't exist.
export const sqlite = new Database(dbPath);

// Enable WAL mode for better performance and concurrency (skip for in-memory)
if (dbPath !== ":memory:") {
  sqlite.exec("PRAGMA journal_mode = WAL;");
}
// Crucial: Enable foreign keys to ensure onDelete: 'cascade' works properly
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });

// Auto-migrate for in-memory test databases
if (dbPath === ":memory:") {
  migrate(db, { migrationsFolder: "./drizzle" });
}
