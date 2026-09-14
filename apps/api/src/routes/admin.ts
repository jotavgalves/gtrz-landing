import { Hono } from 'hono';
import type { Env } from '../env';
import { createSession, requireAdmin } from '../security';

export const adminRoutes = new Hono<{ Bindings: Env }>();
const id = () => crypto.randomUUID();
async function audit(env:Env, action:string, entityType?:string, entityId?:string, metadata:unknown={}){ await env.DB.prepare('INSERT INTO audit_logs (action, entity_type, entity_id, metadata_json) VALUES (?,?,?,?)').bind(action,entityType||null,entityId||null,JSON.stringify(metadata)).run(); }

adminRoutes.post('/auth/login', async (c) => {
  const body = await c.req.json<{ password?: string }>().catch(() => ({}));
  if (!c.env.ADMIN_PASSWORD || !c.env.SESSION_SECRET) return c.json({ error: 'admin_not_configured' }, 503);
  if (!body.password || body.password !== c.env.ADMIN_PASSWORD) return c.json({ error: 'invalid_credentials' }, 401);
  const session = await createSession(c.env); await audit(c.env,'login');
  c.header('set-cookie', `gtrz_admin=${session.raw}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`);
  return c.json({ ok: true, expiresAt: session.expiresAt });
});

adminRoutes.use('*', requireAdmin);
adminRoutes.post('/auth/logout', async (c)=>{ c.header('set-cookie','gtrz_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'); await audit(c.env,'logout'); return c.json({ok:true}); });

adminRoutes.get('/dashboard', async (c) => {
  const [events, freelancers, partnerships] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) total FROM events WHERE status IN ('published','sales_open','sold_out')").first<{ total:number }>(),
    c.env.DB.prepare("SELECT COUNT(*) total FROM freelancer_applications WHERE status='new'").first<{ total:number }>(),
    c.env.DB.prepare("SELECT COUNT(*) total FROM partnership_leads WHERE status='new'").first<{ total:number }>()
  ]);
  const metrics = await c.env.DB.prepare("SELECT metric, SUM(value) value FROM analytics_daily WHERE day >= date('now','-30 days') GROUP BY metric").all();
  return c.json({ activeEvents:events?.total||0,newFreelancers:freelancers?.total||0,newPartnerships:partnerships?.total||0,metrics:metrics.results });
});

adminRoutes.get('/settings', async(c)=>c.json(await c.env.DB.prepare('SELECT key,value_json,updated_at FROM site_settings').all()));
adminRoutes.put('/settings/:key', async(c)=>{const key=c.req.param('key');const body=await c.req.json();await c.env.DB.prepare('INSERT INTO site_settings(key,value_json,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP').bind(key,JSON.stringify(body)).run();await audit(c.env,'update','site_setting',key);return c.json({ok:true});});

adminRoutes.get('/pages', async (c) => c.json(await c.env.DB.prepare('SELECT * FROM pages ORDER BY created_at DESC').all()));
adminRoutes.get('/pages/:id', async(c)=>{
  const pageId=c.req.param('id');
  const page=await c.env.DB.prepare('SELECT * FROM pages WHERE id=?').bind(pageId).first();
  const localizations=await c.env.DB.prepare('SELECT * FROM page_localizations WHERE page_id=?').bind(pageId).all();
  const sectionRows=await c.env.DB.prepare(`
    SELECT s.id,s.page_id,s.type,s.position,s.enabled,s.config_json,s.updated_at,l.locale,l.content_json
    FROM page_sections s
    LEFT JOIN section_localizations l ON l.section_id=s.id
    WHERE s.page_id=? ORDER BY s.position,l.locale
  `).bind(pageId).all<any>();
  const sectionsMap=new Map<string,any>();
  for(const row of sectionRows.results){
    const section=sectionsMap.get(row.id)||{id:row.id,page_id:row.page_id,type:row.type,position:row.position,enabled:row.enabled,config_json:row.config_json,updated_at:row.updated_at,locales:{}};
    if(row.locale)section.locales[row.locale]=JSON.parse(row.content_json||'{}');
    sectionsMap.set(row.id,section);
  }
  return c.json({page,localizations:localizations.results,sections:[...sectionsMap.values()]});
});
adminRoutes.post('/pages/:id/sections',async(c)=>{const pageId=c.req.param('id');const body=await c.req.json<any>();const sectionId=id();await c.env.DB.prepare('INSERT INTO page_sections(id,page_id,type,position,enabled,config_json) VALUES(?,?,?,?,?,?)').bind(sectionId,pageId,body.type,Number(body.position||0),body.enabled===false?0:1,JSON.stringify(body.config||{})).run();for(const [locale,content] of Object.entries(body.locales||{})){await c.env.DB.prepare('INSERT INTO section_localizations(section_id,locale,content_json) VALUES(?,?,?)').bind(sectionId,locale,JSON.stringify(content)).run();}await audit(c.env,'create','page_section',sectionId,{pageId,type:body.type});return c.json({id:sectionId},201);});
adminRoutes.put('/pages/:pageId/sections/:sectionId',async(c)=>{const sectionId=c.req.param('sectionId');const body=await c.req.json<any>();await c.env.DB.prepare('UPDATE page_sections SET position=COALESCE(?,position),enabled=COALESCE(?,enabled),config_json=COALESCE(?,config_json),updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(body.position??null,body.enabled===undefined?null:(body.enabled?1:0),body.config?JSON.stringify(body.config):null,sectionId).run();for(const [locale,content] of Object.entries(body.locales||{})){await c.env.DB.prepare('INSERT INTO section_localizations(section_id,locale,content_json) VALUES(?,?,?) ON CONFLICT(section_id,locale) DO UPDATE SET content_json=excluded.content_json').bind(sectionId,locale,JSON.stringify(content)).run();}await audit(c.env,'update','page_section',sectionId);return c.json({ok:true});});

adminRoutes.get('/events', async (c) => c.json(await c.env.DB.prepare('SELECT * FROM events ORDER BY starts_at DESC').all()));
adminRoutes.post('/events',async(c)=>{const b=await c.req.json<any>();if(!b.slug||!b.city||!b.startsAt)return c.json({error:'invalid_event'},400);const eventId=id();await c.env.DB.prepare('INSERT INTO events(id,slug,status,city,state,country,venue_name,venue_address,starts_at,ends_at,theme_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(eventId,b.slug,'draft',b.city,b.state||null,b.country||'BR',b.venueName||null,b.venueAddress||null,b.startsAt,b.endsAt||null,JSON.stringify(b.theme||{})).run();for(const [locale,l] of Object.entries<any>(b.locales||{})){if(!l?.title)continue;await c.env.DB.prepare('INSERT INTO event_localizations(event_id,locale,title,summary,description,seo_title,seo_description) VALUES(?,?,?,?,?,?,?)').bind(eventId,locale,l.title,l.summary||null,l.description||null,l.seoTitle||null,l.seoDescription||null).run();}await audit(c.env,'create','event',eventId,{slug:b.slug});return c.json({id:eventId},201);});
adminRoutes.patch('/events/:id',async(c)=>{const eventId=c.req.param('id');const b=await c.req.json<any>();await c.env.DB.prepare('UPDATE events SET status=COALESCE(?,status),city=COALESCE(?,city),state=COALESCE(?,state),venue_name=COALESCE(?,venue_name),venue_address=COALESCE(?,venue_address),starts_at=COALESCE(?,starts_at),ends_at=COALESCE(?,ends_at),theme_json=COALESCE(?,theme_json),updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b.status??null,b.city??null,b.state??null,b.venueName??null,b.venueAddress??null,b.startsAt??null,b.endsAt??null,b.theme?JSON.stringify(b.theme):null,eventId).run();await audit(c.env,'update','event',eventId,b);return c.json({ok:true});});

adminRoutes.get('/freelancers', async (c) => c.json(await c.env.DB.prepare('SELECT * FROM freelancer_applications ORDER BY created_at DESC LIMIT 250').all()));
adminRoutes.patch('/freelancers/:id',async(c)=>{const appId=c.req.param('id');const b=await c.req.json<any>();await c.env.DB.prepare('UPDATE freelancer_applications SET status=COALESCE(?,status),notes=COALESCE(?,notes),updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b.status??null,b.notes??null,appId).run();await audit(c.env,'update','freelancer',appId);return c.json({ok:true});});
adminRoutes.get('/partnerships', async (c) => c.json(await c.env.DB.prepare('SELECT * FROM partnership_leads ORDER BY created_at DESC LIMIT 250').all()));
adminRoutes.patch('/partnerships/:id',async(c)=>{const leadId=c.req.param('id');const b=await c.req.json<any>();await c.env.DB.prepare('UPDATE partnership_leads SET status=COALESCE(?,status),notes=COALESCE(?,notes),updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b.status??null,b.notes??null,leadId).run();await audit(c.env,'update','partnership',leadId);return c.json({ok:true});});

adminRoutes.get('/tracking-links',async(c)=>c.json(await c.env.DB.prepare('SELECT * FROM tracking_links ORDER BY created_at DESC LIMIT 250').all()));
adminRoutes.post('/tracking-links',async(c)=>{const b=await c.req.json<any>();if(!b.slug||!b.destinationPath||!b.source||!b.medium)return c.json({error:'invalid_tracking_link'},400);const linkId=id();await c.env.DB.prepare('INSERT INTO tracking_links(id,slug,destination_path,campaign_id,source,medium,content) VALUES(?,?,?,?,?,?,?)').bind(linkId,b.slug,b.destinationPath,b.campaignId||null,b.source,b.medium,b.content||null).run();await audit(c.env,'create','tracking_link',linkId,{slug:b.slug});return c.json({id:linkId,url:`/r/${b.slug}`},201);});
adminRoutes.get('/analytics/overview', async (c) => c.json(await c.env.DB.prepare("SELECT day,metric,dimension_key,value FROM analytics_daily WHERE day >= date('now','-90 days') ORDER BY day ASC").all()));
