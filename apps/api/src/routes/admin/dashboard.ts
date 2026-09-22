import { Hono } from 'hono';
import type { Env } from '../../env';
import { audit } from '../../services/audit';

export const dashboardAdminRoutes = new Hono<{ Bindings: Env }>();

dashboardAdminRoutes.get('/dashboard', async (c) => {
  const [events, freelancers, partnerships, feedback, visitors] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) total FROM events WHERE status IN ('published','sales_open','sold_out')").first<{ total:number }>(),
    c.env.DB.prepare("SELECT COUNT(*) total FROM freelancer_applications WHERE status='new'").first<{ total:number }>(),
    c.env.DB.prepare("SELECT COUNT(*) total FROM partnership_leads WHERE status='new'").first<{ total:number }>(),
    c.env.DB.prepare("SELECT COUNT(*) total FROM event_feedback WHERE status='new'").first<{ total:number }>(),
    c.env.DB.prepare("SELECT COUNT(DISTINCT session_hash) total FROM analytics_sessions_daily WHERE day >= date('now','-30 days')").first<{ total:number }>()
  ]);
  const metrics = await c.env.DB.prepare(
    "SELECT metric, SUM(value) value FROM analytics_daily WHERE day >= date('now','-30 days') GROUP BY metric ORDER BY metric"
  ).all();
  return c.json({
    activeEvents: events?.total || 0,
    newFreelancers: freelancers?.total || 0,
    newPartnerships: partnerships?.total || 0,
    newFeedback: feedback?.total || 0,
    uniqueVisitors30d: visitors?.total || 0,
    metrics: metrics.results
  });
});

dashboardAdminRoutes.get('/settings', async (c) => {
  return c.json(await c.env.DB.prepare('SELECT key,value_json,updated_at FROM site_settings ORDER BY key').all());
});

dashboardAdminRoutes.put('/settings/:key', async (c) => {
  const key = c.req.param('key');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    INSERT INTO site_settings(key,value_json,updated_at)
    VALUES(?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP
  `).bind(key, JSON.stringify(body)).run();
  await audit(c.env, 'update', 'site_setting', key);
  return c.json({ ok: true });
});

dashboardAdminRoutes.get('/audit',async(c)=>{
  const limit=Math.min(500,Math.max(1,Number(c.req.query('limit')||200)));
  return c.json(await c.env.DB.prepare(`
    SELECT id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at
    FROM audit_logs ORDER BY created_at DESC LIMIT ?
  `).bind(limit).all());
});
