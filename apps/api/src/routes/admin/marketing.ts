import { Hono } from 'hono';
import type { Env } from '../../env';
import { audit } from '../../services/audit';

export const marketingAdminRoutes = new Hono<{ Bindings: Env }>();
const has=(value:unknown,key:string)=>Object.prototype.hasOwnProperty.call(value||{},key);

marketingAdminRoutes.get('/tracking-links',async(c)=>{
  return c.json(await c.env.DB.prepare(`
    SELECT l.*,c.name campaign_name
    FROM tracking_links l
    LEFT JOIN campaigns c ON c.id=l.campaign_id
    ORDER BY l.created_at DESC LIMIT 500
  `).all());
});

marketingAdminRoutes.post('/tracking-links',async(c)=>{
  const b=await c.req.json<any>().catch(()=>null);
  if(!b?.slug||!b?.destinationPath||!b?.source||!b?.medium)return c.json({error:'invalid_tracking_link'},400);
  const id=crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO tracking_links(id,slug,destination_path,campaign_id,source,medium,content,active)
    VALUES(?,?,?,?,?,?,?,?)
  `).bind(id,String(b.slug).trim().toLowerCase(),b.destinationPath,b.campaignId||null,b.source,b.medium,b.content||null,b.active===false?0:1).run();
  await audit(c.env,'create','tracking_link',id,{slug:b.slug});
  return c.json({id,url:`https://gtrz.com.br/r/${String(b.slug).trim().toLowerCase()}`},201);
});

marketingAdminRoutes.patch('/tracking-links/:id',async(c)=>{
  const id=c.req.param('id'),b=await c.req.json<any>();
  await c.env.DB.prepare(`
    UPDATE tracking_links SET
      slug=CASE WHEN ? THEN ? ELSE slug END,
      destination_path=CASE WHEN ? THEN ? ELSE destination_path END,
      campaign_id=CASE WHEN ? THEN ? ELSE campaign_id END,
      source=CASE WHEN ? THEN ? ELSE source END,
      medium=CASE WHEN ? THEN ? ELSE medium END,
      content=CASE WHEN ? THEN ? ELSE content END,
      active=CASE WHEN ? THEN ? ELSE active END
    WHERE id=?
  `).bind(
    has(b,'slug')?1:0,has(b,'slug')?String(b.slug||'').trim().toLowerCase():null,
    has(b,'destinationPath')?1:0,b.destinationPath??null,
    has(b,'campaignId')?1:0,b.campaignId||null,
    has(b,'source')?1:0,b.source??null,
    has(b,'medium')?1:0,b.medium??null,
    has(b,'content')?1:0,b.content||null,
    has(b,'active')?1:0,b.active?1:0,
    id
  ).run();
  await audit(c.env,'update','tracking_link',id,b);return c.json({ok:true});
});

marketingAdminRoutes.delete('/tracking-links/:id',async(c)=>{
  const id=c.req.param('id');
  const row=await c.env.DB.prepare('SELECT id FROM tracking_links WHERE id=?').bind(id).first();
  if(!row)return c.json({error:'not_found'},404);
  await c.env.DB.prepare('DELETE FROM tracking_links WHERE id=?').bind(id).run();
  await audit(c.env,'delete','tracking_link',id);return c.json({ok:true});
});

marketingAdminRoutes.get('/campaigns',async(c)=>{
  return c.json(await c.env.DB.prepare(`
    SELECT c.*,e.slug event_slug,
      COALESCE(pt.title,es.title,e.slug) event_title,
      (SELECT COUNT(*) FROM tracking_links l WHERE l.campaign_id=c.id) links_count
    FROM campaigns c
    LEFT JOIN events e ON e.id=c.event_id
    LEFT JOIN event_localizations pt ON pt.event_id=e.id AND pt.locale='pt-BR'
    LEFT JOIN event_localizations es ON es.event_id=e.id AND es.locale='es'
    ORDER BY c.created_at DESC LIMIT 500
  `).all());
});

marketingAdminRoutes.post('/campaigns',async(c)=>{
  const b=await c.req.json<any>();if(!b?.name)return c.json({error:'name_required'},400);const id=crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO campaigns(id,name,event_id,status,starts_at,ends_at) VALUES(?,?,?,?,?,?)')
    .bind(id,b.name,b.eventId||null,b.status||'draft',b.startsAt||null,b.endsAt||null).run();
  await audit(c.env,'create','campaign',id);return c.json({id},201);
});

marketingAdminRoutes.patch('/campaigns/:id',async(c)=>{
  const id=c.req.param('id'),b=await c.req.json<any>();
  await c.env.DB.prepare(`
    UPDATE campaigns SET
      name=CASE WHEN ? THEN ? ELSE name END,
      event_id=CASE WHEN ? THEN ? ELSE event_id END,
      status=CASE WHEN ? THEN ? ELSE status END,
      starts_at=CASE WHEN ? THEN ? ELSE starts_at END,
      ends_at=CASE WHEN ? THEN ? ELSE ends_at END
    WHERE id=?
  `).bind(
    has(b,'name')?1:0,b.name??null,
    has(b,'eventId')?1:0,b.eventId||null,
    has(b,'status')?1:0,b.status??null,
    has(b,'startsAt')?1:0,b.startsAt||null,
    has(b,'endsAt')?1:0,b.endsAt||null,
    id
  ).run();
  await audit(c.env,'update','campaign',id,b);return c.json({ok:true});
});

marketingAdminRoutes.delete('/campaigns/:id',async(c)=>{
  const id=c.req.param('id');
  const row=await c.env.DB.prepare('SELECT id FROM campaigns WHERE id=?').bind(id).first();
  if(!row)return c.json({error:'not_found'},404);
  await c.env.DB.prepare('DELETE FROM campaigns WHERE id=?').bind(id).run();
  await audit(c.env,'delete','campaign',id);return c.json({ok:true});
});

marketingAdminRoutes.get('/analytics/overview',async(c)=>{
  const [daily,sources,links,campaigns]=await Promise.all([
    c.env.DB.prepare("SELECT day,metric,dimension_key,value FROM analytics_daily WHERE day >= date('now','-90 days') ORDER BY day ASC").all(),
    c.env.DB.prepare(`SELECT source,COUNT(DISTINCT session_hash) visitors FROM analytics_sessions_daily WHERE day >= date('now','-30 days') GROUP BY source ORDER BY visitors DESC LIMIT 30`).all(),
    c.env.DB.prepare(`SELECT tracking_link,COUNT(DISTINCT session_hash) visitors FROM analytics_sessions_daily WHERE day >= date('now','-30 days') AND tracking_link IS NOT NULL GROUP BY tracking_link ORDER BY visitors DESC LIMIT 50`).all(),
    c.env.DB.prepare(`SELECT campaign,COUNT(DISTINCT session_hash) visitors FROM analytics_sessions_daily WHERE day >= date('now','-30 days') AND campaign IS NOT NULL GROUP BY campaign ORDER BY visitors DESC LIMIT 50`).all()
  ]);
  return c.json({daily:daily.results,sources:sources.results,links:links.results,campaigns:campaigns.results});
});
