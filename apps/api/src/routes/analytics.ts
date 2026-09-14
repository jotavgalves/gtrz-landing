import { Hono } from 'hono';
import { analyticsEventSchema } from '@gtrz/contracts';
import type { Env } from '../env';

export const analyticsRoutes = new Hono<{ Bindings: Env }>();

function dailyIncrement(env:Env, metric:string, dimensions:string[]){
  const unique=[...new Set(['',...dimensions.filter(Boolean)])].slice(0,8);
  const statements=unique.map((dimension)=>env.DB.prepare(`
    INSERT INTO analytics_daily(day,metric,dimension_key,value)
    VALUES(date('now'),?,?,1)
    ON CONFLICT(day,metric,dimension_key) DO UPDATE SET value=value+1
  `).bind(metric,dimension.slice(0,300)));
  return env.DB.batch(statements);
}

async function sessionHash(sessionId:string){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sessionId));
  return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
}

function referrerHost(referrer?:string){
  if(!referrer)return '';
  try{return new URL(referrer).hostname.slice(0,200)}catch{return ''}
}

async function rememberSession(env:Env,e:any,country:string){
  const hash=await sessionHash(e.sessionId);
  const refHost=referrerHost(e.referrer);
  const source=e.utmSource|| (e.trackingLink ? 'tracked-link' : refHost || 'direct');
  const medium=e.utmMedium|| (refHost ? 'referral' : null);
  await env.DB.prepare(`
    INSERT OR IGNORE INTO analytics_sessions_daily(
      day,session_hash,landing_path,source,medium,campaign,content,tracking_link,referrer_host,country,language
    ) VALUES(date('now'),?,?,?,?,?,?,?,?,?,?)
  `).bind(
    hash,e.path,source,medium,e.utmCampaign||null,e.utmContent||null,e.trackingLink||null,
    refHost||null,country||null,e.language
  ).run();
}

analyticsRoutes.post('/collect', async (c) => {
  const parsed = analyticsEventSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.body(null, 204);
  const e = parsed.data;
  const ua = c.req.header('user-agent') || '';
  const country = c.req.header('cf-ipcountry') || '';

  c.env.ANALYTICS.writeDataPoint({
    indexes: [e.eventName],
    blobs: [
      e.path, e.section || '', e.element || '', e.eventId || '', e.language,
      e.referrer || '', e.utmSource || '', e.utmMedium || '', e.utmCampaign || '',
      e.utmContent || '', e.trackingLink || '', e.sessionId, country, ua.slice(0, 300)
    ],
    doubles: [1]
  });

  const work:Promise<unknown>[]=[dailyIncrement(c.env,e.eventName,[
    `path:${e.path}`,
    e.section ? `section:${e.section}` : '',
    e.element ? `element:${e.element}` : '',
    e.utmSource ? `source:${e.utmSource}` : '',
    e.utmCampaign ? `campaign:${e.utmCampaign}` : '',
    e.trackingLink ? `link:${e.trackingLink}` : '',
    country ? `country:${country}` : ''
  ])];
  if(e.eventName==='page_view')work.push(rememberSession(c.env,e,country));
  c.executionCtx.waitUntil(Promise.all(work).then(()=>undefined));
  return c.body(null, 204);
});

analyticsRoutes.get('/redirect/:slug', async (c) => {
  const slug = c.req.param('slug');
  const link = await c.env.DB.prepare(`
    SELECT id, destination_path, source, medium, campaign_id, content
    FROM tracking_links WHERE slug = ? AND active = 1 LIMIT 1
  `).bind(slug).first<{ id:string; destination_path:string; source:string; medium:string; campaign_id:string|null; content:string|null }>();
  if (!link) return c.redirect('/', 302);

  c.env.ANALYTICS.writeDataPoint({
    indexes: ['tracking_link_click'],
    blobs: [slug, link.destination_path, link.source, link.medium, link.campaign_id || '', link.content || ''],
    doubles: [1]
  });
  c.executionCtx.waitUntil(Promise.all([
    c.env.DB.prepare('UPDATE tracking_links SET click_count = click_count + 1, last_clicked_at = CURRENT_TIMESTAMP WHERE id = ?').bind(link.id).run(),
    dailyIncrement(c.env,'tracking_link_click',[`link:${slug}`,`source:${link.source}`,`medium:${link.medium}`,link.campaign_id?`campaign:${link.campaign_id}`:''])
  ]).then(()=>undefined));

  const url = new URL(link.destination_path, c.req.url);
  url.searchParams.set('utm_source', link.source);
  url.searchParams.set('utm_medium', link.medium);
  url.searchParams.set('gtrz_link',slug);
  if (link.campaign_id) url.searchParams.set('utm_campaign', link.campaign_id);
  if (link.content) url.searchParams.set('utm_content', link.content);
  return c.redirect(url.toString(), 302);
});
