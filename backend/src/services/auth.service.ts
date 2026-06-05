import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export class AuthService {
  static async hashPassword(password: string) { return await Bun.password.hash(password); }
  static async verifyPassword(password: string, hash: string) { return await Bun.password.verify(password, hash); }

  static async getUserByEmail(email: string) {
    return await db.select().from(users).where(eq(users.email, email)).get();
  }

  static async registerUser(email: string, passwordHash: string) {
    const [newUser] = await db.insert(users).values({ 
      id: crypto.randomUUID(), 
      email, 
      passwordHash 
    }).returning();
    return newUser;
  }
}
