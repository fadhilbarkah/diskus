import { db } from './src/db';
import { users } from './src/db/schema';
import { signToken } from './src/utils/jwt';

async function run() {
  const admin = await db.select().from(users).get();
  if (!admin) {
    console.log("No admin user found.");
    return;
  }
  
  const token = await signToken({ userId: admin.id, email: admin.email, role: admin.role });
  
  try {
    const res = await fetch('http://localhost:3000/admin/account', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (err) {
    console.error(err);
  }
}

run();
