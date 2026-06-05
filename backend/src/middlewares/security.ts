import { secureHeaders } from 'hono/secure-headers';
import { cors } from 'hono/cors';

export const securityHeadersMiddleware = secureHeaders();

export const corsMiddleware = cors({
  origin: '*', // In production, this should be configurable or restricted
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
});
