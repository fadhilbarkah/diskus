import { secureHeaders } from 'hono/secure-headers';
import { cors } from 'hono/cors';

export const securityHeadersMiddleware = secureHeaders();

// Widget routes: open CORS required since the widget is embedded on third-party sites
export const widgetCorsMiddleware = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
});

// Admin/auth routes: restricted to dashboard origin when configured via DASHBOARD_ORIGIN env var
export const adminCorsMiddleware = cors({
  origin: Bun.env.DASHBOARD_ORIGIN?.split(',') || '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
});
