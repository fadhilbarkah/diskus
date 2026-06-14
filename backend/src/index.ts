import { Hono } from 'hono';
import authRoutes from './routes/auth';
import widgetRoutes from './routes/widget';
import adminRoutes from './routes/admin';
import oauthRoutes from './routes/oauth';
import { securityHeadersMiddleware, widgetCorsMiddleware, adminCorsMiddleware } from './middlewares/security';
import { demoMiddleware } from './middlewares/demo';

const app = new Hono();

// Global security headers
app.use('*', securityHeadersMiddleware);

// Route-specific CORS policies
// Widget routes: open CORS required since the widget is embedded on third-party sites
app.use('/api/v1/widget/*', widgetCorsMiddleware);
// Admin & auth routes: restricted to dashboard origin (configurable via DASHBOARD_ORIGIN env var)
app.use('/api/v1/admin/*', adminCorsMiddleware);
app.use('/api/v1/auth/*', adminCorsMiddleware);
app.use('/api/v1/demo', adminCorsMiddleware);

// Global error handler — prevents stack trace leaks in production
app.onError((err, c) => {
  console.error(`[Error] ${c.req.method} ${c.req.url}:`, err.message);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// Mount routes
app.get('/api/v1/demo', (c) => c.json({ demo: process.env.DEMO_MODE === 'true' }));

app.use('*', demoMiddleware);

app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/oauth', oauthRoutes);
app.route('/api/v1/widget', widgetRoutes);
app.route('/api/v1/admin', adminRoutes);

app.get('/', (c) => {
  return c.json({ message: 'Diskus API is running!', version: '1.0.0' });
});

export default {
  port: 3000,
  fetch: app.fetch,
};
