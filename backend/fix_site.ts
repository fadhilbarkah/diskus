import { db } from './src/db';
import { sites } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(sites)
    .set({ userId: '232dabf5-a7d8-4e51-8063-176ff511c11a' })
    .where(eq(sites.domain, 'localhost'));
  console.log("Updated localhost ownership!");
}
run();
