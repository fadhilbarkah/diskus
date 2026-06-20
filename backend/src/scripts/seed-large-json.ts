import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { readFileSync } from "fs";
import * as schema from "../db/schema";
import { comments, sites, threads } from "../db/schema";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: bun run src/scripts/seed-large-json.ts <path-to-json-file>");
    process.exit(1);
  }

  console.log(`Loading JSON from ${filePath}...`);
  const rawData = readFileSync(filePath, "utf-8");
  const data = JSON.parse(rawData);
  
  const commentsToInsert = Array.isArray(data) ? data : data.comments || data.data;

  if (!commentsToInsert || !Array.isArray(commentsToInsert)) {
    console.error("Invalid JSON format. Expected an array of comments or an object with a 'comments' array.");
    process.exit(1);
  }

  console.log(`Found ${commentsToInsert.length} comments. Connecting to database...`);
  
  const dbPath = Bun.env.DATABASE_PATH || "sqlite.db";
  const sqlite = new Database(dbPath);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA synchronous = NORMAL;");
  
  const db = drizzle(sqlite, { schema });

  console.log("Preparing to insert...");

  // Since we don't know the exact format of the JSON (if it includes thread/site IDs or needs them created),
  // we will extract unique thread IDs from the comments and ensure they exist, OR we can just inject into a default thread.
  // Assuming the JSON perfectly matches the `comments` table schema.
  
  // Use a transaction and chunks to insert quickly
  const CHUNK_SIZE = 5000;
  
  let inserted = 0;
  const start = performance.now();

  sqlite.transaction(() => {
    for (let i = 0; i < commentsToInsert.length; i += CHUNK_SIZE) {
      const chunk = commentsToInsert.slice(i, i + CHUNK_SIZE);
      
      // Map to ensure the schema matches exactly, handles booleans etc.
      const mappedChunk = chunk.map(c => ({
        id: c.id,
        threadId: c.threadId || c.thread_id,
        parentId: c.parentId || c.parent_id || null,
        authorName: c.authorName || c.author_name || "Test User",
        authorEmail: c.authorEmail || c.author_email || "test@test.com",
        content: c.content || "Test comment",
        htmlContent: c.htmlContent || c.html_content || "<p>Test comment</p>",
        isPinned: c.isPinned === true || c.is_pinned === 1 || c.is_pinned === true,
        status: c.status || "approved",
        likesCount: c.likesCount || c.likes_count || 0,
        createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
      }));

      // Fallback for missing threadId: If the JSON doesn't specify thread_id, we should probably warn or skip.
      // But assuming the friend generated it with the correct schema format.
      
      db.insert(comments).values(mappedChunk).run();
      inserted += chunk.length;
      console.log(`Inserted ${inserted} / ${commentsToInsert.length} comments...`);
    }
  })();

  const end = performance.now();
  console.log(`\n✅ Successfully inserted ${inserted} comments in ${((end - start) / 1000).toFixed(2)} seconds!`);
}

main().catch(console.error);
