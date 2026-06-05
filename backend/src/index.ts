import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth';
import widgetRoutes from './routes/widget';
import adminRoutes from './routes/admin';

import { securityHeadersMiddleware, corsMiddleware } from './middlewares/security';

const app = new Hono();

// Global middlewares
app.use('*', securityHeadersMiddleware);
app.use('*', corsMiddleware);

// Mount routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/widget', widgetRoutes);
app.route('/api/v1/admin', adminRoutes);

app.get('/', (c) => {
  return c.json({ message: 'Diskus API is running!', version: '1.0.0' });
});

export default {
  port: 3000,
  fetch: app.fetch,
};
