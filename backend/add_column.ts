import { Database } from "bun:sqlite";

try {
  const db = new Database("sqlite.db");
  db.run("ALTER TABLE users ADD COLUMN name TEXT;");
  console.log("Column 'name' added successfully!");
} catch (err: any) {
  // Ignore error if column already exists
  if (err.message.includes("duplicate column name")) {
    console.log("Column already exists.");
  } else {
    console.error(err);
  }
}
