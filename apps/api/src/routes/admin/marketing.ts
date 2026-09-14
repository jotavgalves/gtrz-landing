import { Hono } from 'hono';
import type { Env } from '../../env';
import { audit } from '../../services/audit';

export const marketingAdminRoutes = new Hono<{ Bindings: Env }>();

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
    INSERT INTO tracking_links(id,slug,destination_path,campaign_id,source,medium,content)
    VALUES(?,?,?,?,?,?,?)
  `).bind(id,b.slug,b.destinationPath,b.campaignId||null,b.source,b.medium,b.content||null).run();
  await audit(c.env,'create','tracking_link',id,{slug:b.slug});
  return c.json({id,url:`https://gtrz.com.br/r/${b.slug}`},201);
});

marketingAdminRoutes.patch('/tracking-links/:id',async(c)=>{
  const id=c.req.param('id'),b=await c.req.json<any>();
  await c.env.DB.prepare(`
    UPDATE tracking_links SET destination_path=COALESCE(?,destination_path),source=COALESCE(?,source),medium=COALESCE(?,medium),content=COALESCE(?,content),active=COALESCE(?,active)
    WHERE id=?
  `).bind(b.destinationPath??null,b.source??null,b.medium??null,b.content??null,b.active===undefined?null:(b.active?1:0),id).run();
  await audit(c.env,'update','tracking_link',id);return c.json({ok:true});
});

marketingAdminRoutes.get('/campaigns',async(c)=>{
  return c.json(await c.env.DB.prepare('SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 500').all());
});

marketingAdminRoutes.post('/campaigns',async(c)=>{
  const b=await c.req.json<any>();if(!b?.name)return c.json({error:'name_required'},400);const id=crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO campaigns(id,name,event_id,status,starts_at,ends_at) VALUES(?,?,?,?,?,?)')
    .bind(id,b.name,b.eventId||null,b.status||'draft',b.startsAt||null,b.endsAt||null).run();
  await audit(c.env,'create','campaign',id);return c.json({id},201);
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
