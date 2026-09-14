import { Hono } from 'hono';
import type { Env } from '../env';

export const publicRoutes = new Hono<{ Bindings: Env }>();

publicRoutes.get('/site', async (c) => {
  const page = await c.env.DB.prepare("SELECT id, slug, template FROM pages WHERE slug='home' AND status='published' LIMIT 1").first<{ id: string; slug: string; template: string }>();
  if (!page) return c.json({ page: null, sections: [], events: [] });

  const sections = await c.env.DB.prepare(`
    SELECT s.id, s.type, s.position, s.enabled, s.config_json, l.locale, l.content_json
    FROM page_sections s
    LEFT JOIN section_localizations l ON l.section_id = s.id
    WHERE s.page_id = ? AND s.enabled = 1
    ORDER BY s.position ASC
  `).bind(page.id).all();

  const events = await c.env.DB.prepare(`
    SELECT e.id, e.slug, e.status, e.city, e.state, e.starts_at, e.ends_at,
           l.locale, l.title, l.summary
    FROM events e
    LEFT JOIN event_localizations l ON l.event_id = e.id
    WHERE e.status IN ('published','sales_open','sold_out')
    ORDER BY e.starts_at ASC
  `).all();

  return c.json({ page, sections: sections.results, events: events.results }, 200, {
    'cache-control': 'public, max-age=30, s-maxage=60'
  });
});

publicRoutes.get('/events/:slug', async (c) => {
  const slug = c.req.param('slug');
  const event = await c.env.DB.prepare('SELECT * FROM events WHERE slug = ? AND status != \'draft\' LIMIT 1').bind(slug).first();
  if (!event) return c.json({ error: 'not_found' }, 404);
  const localizations = await c.env.DB.prepare('SELECT * FROM event_localizations WHERE event_id = ?').bind(event.id).all();
  const tickets = await c.env.DB.prepare('SELECT * FROM event_tickets WHERE event_id = ? ORDER BY position ASC').bind(event.id).all();
  const artists = await c.env.DB.prepare('SELECT * FROM event_artists WHERE event_id = ? ORDER BY position ASC').bind(event.id).all();
  return c.json({ event, localizations: localizations.results, tickets: tickets.results, artists: artists.results });
});
