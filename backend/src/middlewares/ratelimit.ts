import { Context, Next } from 'hono';

const rateLimits = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimits.entries()) {
    if (val.resetAt < now) rateLimits.delete(key);
  }
}, 5 * 60 * 1000);

export const rateLimitMiddleware = (limit: number, windowMs: number) => {
  return async (c: Context, next: Next) => {
    // NOTE: x-forwarded-for can be spoofed. In production behind a reverse proxy,
    // configure the proxy to set a trusted client IP header.
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown-ip';
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
    
    await next();
  };
};
