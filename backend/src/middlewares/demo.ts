import { Context, Next } from 'hono';

export const demoMiddleware = async (c: Context, next: Next) => {
  if (process.env.DEMO_MODE !== 'true') {
    return next();
  }

  const method = c.req.method;
  const path = c.req.path;

  if (method === 'DELETE' || method === 'PUT' || method === 'PATCH') {
    return c.json({ error: "Demo mode: write operations are disabled", demo: true }, 403);
  }

  if (method === 'POST') {
    // Allow public comment submission, liking, and unliking
    if (path.endsWith('/comments') || path.endsWith('/like') || path.endsWith('/unlike')) {
      return next();
    }
    // Allow login so the dashboard can be accessed
    if (path.includes('/auth/login') || path.includes('/auth/register') || path.includes('/auth/setup-status')) {
      return next();
    }
    
    return c.json({ error: "Demo mode: write operations are disabled", demo: true }, 403);
  }

  await next();
};
