import { db } from './src/db';
import { sites } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const allSites = await db.select().from(sites).all();
  console.log("All sites in DB:", allSites);
}
run();
