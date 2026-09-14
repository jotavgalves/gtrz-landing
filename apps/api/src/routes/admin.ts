import { Hono } from 'hono';
import type { Env } from '../env';
import { createSession, requireAdmin } from '../security';

export const adminRoutes = new Hono<{ Bindings: Env }>();

adminRoutes.post('/auth/login', async (c) => {
  const body = await c.req.json<{ password?: string }>().catch(() => ({}));
  if (!c.env.ADMIN_PASSWORD || !c.env.SESSION_SECRET) return c.json({ error: 'admin_not_configured' }, 503);
  if (!body.password || body.password !== c.env.ADMIN_PASSWORD) return c.json({ error: 'invalid_credentials' }, 401);
  const session = await createSession(c.env);
  c.header('set-cookie', `gtrz_admin=${session.raw}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`);
  return c.json({ ok: true, expiresAt: session.expiresAt });
});

adminRoutes.use('*', requireAdmin);

adminRoutes.get('/dashboard', async (c) => {
  const [events, freelancers, partnerships] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) total FROM events WHERE status IN ('published','sales_open','sold_out')").first<{ total:number }>(),
    c.env.DB.prepare("SELECT COUNT(*) total FROM freelancer_applications WHERE status='new'").first<{ total:number }>(),
    c.env.DB.prepare("SELECT COUNT(*) total FROM partnership_leads WHERE status='new'").first<{ total:number }>()
  ]);
  const metrics = await c.env.DB.prepare("SELECT metric, SUM(value) value FROM analytics_daily WHERE day >= date('now','-30 days') GROUP BY metric").all();
  return c.json({ activeEvents: events?.total || 0, newFreelancers: freelancers?.total || 0, newPartnerships: partnerships?.total || 0, metrics: metrics.results });
});

adminRoutes.get('/pages', async (c) => c.json(await c.env.DB.prepare('SELECT * FROM pages ORDER BY created_at DESC').all()));
adminRoutes.get('/events', async (c) => c.json(await c.env.DB.prepare('SELECT * FROM events ORDER BY starts_at DESC').all()));
adminRoutes.get('/freelancers', async (c) => c.json(await c.env.DB.prepare('SELECT * FROM freelancer_applications ORDER BY created_at DESC LIMIT 250').all()));
adminRoutes.get('/partnerships', async (c) => c.json(await c.env.DB.prepare('SELECT * FROM partnership_leads ORDER BY created_at DESC LIMIT 250').all()));
adminRoutes.get('/analytics/overview', async (c) => c.json(await c.env.DB.prepare("SELECT day, metric, dimension_key, value FROM analytics_daily WHERE day >= date('now','-90 days') ORDER BY day ASC").all()));
