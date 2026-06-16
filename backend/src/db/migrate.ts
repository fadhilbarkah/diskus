import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db, sqlite } from "./index";

console.log("Running migrations...");
migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations completed successfully!");
sqlite.close();
