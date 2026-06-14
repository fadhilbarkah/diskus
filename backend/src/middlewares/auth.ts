import { Context, Next } from 'hono';
import { verifyToken } from '../utils/jwt';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export type AuthVariables = {
  user?: {
    userId: string;
    email: string;
    role: string;
    name?: string;
    tokenVersion?: number;
    type?: string;
    origin_url?: string;
  };
};

export const authMiddleware = async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split(' ')[1];
  const payload = await verifyToken(token);
  
  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  // Verify tokenVersion matches the current version in database
  // This invalidates all old tokens when password is changed
  if (payload.tokenVersion !== undefined) {
    const dbUser = await db.select({ tokenVersion: users.tokenVersion }).from(users).where(eq(users.id, payload.userId)).get();
    if (dbUser && dbUser.tokenVersion !== payload.tokenVersion) {
      return c.json({ error: 'Token has been revoked. Please login again.' }, 401);
    }
  }

  c.set('user', payload as any);
  await next();
};

export const optionalAuthMiddleware = async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);
    if (payload) {
      // Also verify tokenVersion for optional auth
      if (payload.tokenVersion !== undefined) {
        const dbUser = await db.select({ tokenVersion: users.tokenVersion }).from(users).where(eq(users.id, payload.userId)).get();
        if (dbUser && dbUser.tokenVersion !== payload.tokenVersion) {
          // Token revoked — treat as unauthenticated, don't block
          await next();
          return;
        }
      }
      c.set('user', payload as any);
    }
  }
  await next();
};
