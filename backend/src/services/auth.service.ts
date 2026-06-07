import { db } from '../db';
import { users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

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

  /** Returns the total number of dashboard users in the system */
  static async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users).get();
    return result?.count ?? 0;
  }

  /** Increments the user's tokenVersion, invalidating all existing JWTs */
  static async incrementTokenVersion(userId: string): Promise<number> {
    const [updated] = await db.update(users)
      .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(eq(users.id, userId))
      .returning({ tokenVersion: users.tokenVersion });
    return updated?.tokenVersion ?? 0;
  }
}
