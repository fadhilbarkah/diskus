import { Context, Next } from 'hono';
import { verifyToken } from '../utils/jwt';

export type AuthVariables = {
  user?: {
    userId: string;
    email: string;
    role: string;
    name?: string;
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

  c.set('user', payload);
  await next();
};

export const optionalAuthMiddleware = async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);
    if (payload) {
      c.set('user', payload);
    }
  }
  await next();
};
