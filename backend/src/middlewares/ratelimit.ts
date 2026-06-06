import { Context, Next } from 'hono';

const rateLimits = new Map<string, { count: number; resetAt: number }>();

export const rateLimitMiddleware = (limit: number, windowMs: number) => {
  return async (c: Context, next: Next) => {
    // Get IP or a fallback string
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown-ip';
    const now = Date.now();
    
    let record = rateLimits.get(ip);
    
    if (!record || record.resetAt < now) {
      record = { count: 0, resetAt: now + windowMs };
    }
    
    if (record.count >= limit) {
      return c.json({ error: 'Too many requests. Please try again later.' }, 429);
    }
    
    record.count++;
    rateLimits.set(ip, record);
    
    // Optional: cleanup old entries to prevent memory leaks in a real production env
    // (In a real app, you'd use Redis or a similar persistent store)
    if (Math.random() < 0.01) {
      for (const [key, val] of rateLimits.entries()) {
        if (val.resetAt < now) rateLimits.delete(key);
      }
    }
    
    await next();
  };
};
