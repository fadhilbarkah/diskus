import { secureHeaders } from 'hono/secure-headers';
import { cors } from 'hono/cors';

export const securityHeadersMiddleware = secureHeaders({
  crossOriginResourcePolicy: 'cross-origin',
});

// Widget routes: open CORS required since the widget is embedded on third-party sites
export const widgetCorsMiddleware = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Diskus-Embed-Token'],
});

// Admin/auth routes: restricted to dashboard origin when configured via DASHBOARD_ORIGIN env var
const dashboardOrigin = Bun.env.DASHBOARD_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean);
if (!dashboardOrigin || dashboardOrigin.length === 0) {
  if (Bun.env.NODE_ENV === 'production') {
    console.warn(
      '⚠️  WARNING: DASHBOARD_ORIGIN is not set. Admin CORS will default to wildcard (*). ' +
      'Set DASHBOARD_ORIGIN to your dashboard URL for production security.'
    );
  }
}

export const adminCorsMiddleware = cors({
  origin: dashboardOrigin && dashboardOrigin.length > 0 ? dashboardOrigin : '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
});
