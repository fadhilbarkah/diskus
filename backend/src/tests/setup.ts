// This preload file ensures the database is initialized before tests run.
// When NODE_ENV=test, db/index.ts automatically uses :memory: and runs migrations.
import "../db";
