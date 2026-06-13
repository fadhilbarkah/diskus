import { db } from '../db';
import { users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const emailArg = process.argv[2];
  const email = emailArg || prompt("Enter the email address to reset password:");

  if (!email) {
    console.error("Error: Email is required.");
    process.exit(1);
  }

  const user = await db.select().from(users).where(eq(users.email, email)).get();

  if (!user) {
    console.error(`Error: User with email '${email}' not found in the database.`);
    process.exit(1);
  }

  const confirm = prompt(`Are you sure you want to reset the password for ${email}? [y/N]: `);
  
  if (confirm?.toLowerCase() !== 'y') {
    console.log("Password reset cancelled.");
    process.exit(0);
  }

  // Generate a random 12-character alphanumeric password
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let newPassword = '';
  for (let i = 0; i < 12; i++) {
    newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const passwordHash = await Bun.password.hash(newPassword);

  await db.update(users)
    .set({ 
      passwordHash, 
      tokenVersion: sql`${users.tokenVersion} + 1` 
    })
    .where(eq(users.email, email));

  console.log("\n=========================================");
  console.log("✅ Password reset successful!");
  console.log("-----------------------------------------");
  console.log(`Email:    ${email}`);
  console.log(`Password: ${newPassword}`);
  console.log("-----------------------------------------");
  console.log("Please login and change this temporary password immediately.");
  console.log("=========================================\n");

  process.exit(0);
}

main().catch(err => {
  console.error("An error occurred:", err);
  process.exit(1);
});
