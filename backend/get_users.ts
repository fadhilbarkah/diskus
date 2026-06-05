import { db } from './src/db';
import { users } from './src/db/schema';

async function run() {
  const allUsers = await db.select().from(users).all();
  console.log("All users in DB:", allUsers.map(u => ({ id: u.id, email: u.email })));
}
run();
