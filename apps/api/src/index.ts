import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { publicRoutes } from './routes/public';
import { partnershipRoutes } from './routes/partnerships';
import { adminRoutes } from './routes/admin';
import { analyticsRoutes } from './routes/analytics';
import { mediaRoutes } from './routes/media';
import { authRoutes } from './routes/auth';

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const allowed = (c.env.CORS_ALLOWED_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean);
  return cors({
    origin: (origin) => allowed.includes(origin) ? origin : allowed[0] || '',
    credentials: true,
    allowHeaders: ['Content-Type'],
    allowMethods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
  })(c, next);
});

app.get('/health', (c) => c.json({ ok: true, service: 'gtrz-api', env: c.env.APP_ENV }));
app.route('/api/public/partnerships', partnershipRoutes);
app.route('/api/public', publicRoutes);
app.route('/api/admin/auth', authRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/media', mediaRoutes);
app.get('/r/:slug', async (c) => analyticsRoutes.fetch(new Request(new URL(`/redirect/${c.req.param('slug')}`, c.req.url), c.req.raw), c.env, c.executionCtx));

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: 'internal_error' }, 500);
});

export default app;
