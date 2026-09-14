import { Hono } from 'hono';
import type { Env } from '../env';
import { consumePublicFormQuota, verifyTurnstile } from '../security';

export const publicRoutes = new Hono<{ Bindings: Env }>();
const id=()=>crypto.randomUUID();

publicRoutes.get('/site', async (c) => {
  const page = await c.env.DB.prepare("SELECT id,slug,template FROM pages WHERE slug='home' AND status='published' LIMIT 1").first<{id:string;slug:string;template:string}>();
  if (!page) return c.json({page:null,sections:[],events:[],team:[],settings:{}});
  const [sections,events,team,settingsRows] = await Promise.all([
    c.env.DB.prepare(`SELECT s.id,s.type,s.position,s.enabled,s.config_json,l.locale,l.content_json FROM page_sections s LEFT JOIN section_localizations l ON l.section_id=s.id WHERE s.page_id=? AND s.enabled=1 ORDER BY s.position`).bind(page.id).all(),
    c.env.DB.prepare(`SELECT e.id,e.slug,e.status,e.city,e.state,e.starts_at,e.ends_at,l.locale,l.title,l.summary FROM events e LEFT JOIN event_localizations l ON l.event_id=e.id WHERE e.status IN ('published','sales_open','sold_out') ORDER BY e.starts_at`).all(),
    c.env.DB.prepare(`SELECT t.id,t.name,t.media_id,t.instagram_url,t.position,l.locale,l.role_label,l.bio FROM team_members t LEFT JOIN team_localizations l ON l.team_member_id=t.id WHERE t.active=1 ORDER BY t.position,l.locale`).all(),
    c.env.DB.prepare("SELECT key,value_json FROM site_settings WHERE key IN ('event_popup','social','general','chrome','copy')").all<any>()
  ]);
  const settings:Record<string,unknown>={};
  for(const row of settingsRows.results){try{settings[row.key]=JSON.parse(row.value_json)}catch{settings[row.key]={}}}
  return c.json({page,sections:sections.results,events:events.results,team:team.results,settings},200,{'cache-control':'public,max-age=30,s-maxage=60'});
});

publicRoutes.get('/events/:slug',async(c)=>{
  const slug=c.req.param('slug');
  const event=await c.env.DB.prepare("SELECT * FROM events WHERE slug=? AND status!='draft' LIMIT 1").bind(slug).first();
  if(!event)return c.json({error:'not_found'},404);
  const localizations=await c.env.DB.prepare('SELECT * FROM event_localizations WHERE event_id=?').bind(event.id).all();
  const tickets=await c.env.DB.prepare('SELECT * FROM event_tickets WHERE event_id=? ORDER BY position').bind(event.id).all();
  const artists=await c.env.DB.prepare('SELECT * FROM event_artists WHERE event_id=? ORDER BY position').bind(event.id).all();
  return c.json({event,localizations:localizations.results,tickets:tickets.results,artists:artists.results});
});

publicRoutes.post('/freelancers',async(c)=>{
  const b=await c.req.json<any>().catch(()=>null);
  if(!b?.name||!b?.whatsapp||!b?.city)return c.json({error:'invalid_form'},400);
  if(!(await verifyTurnstile(c,b.turnstileToken)))return c.json({error:'challenge_failed'},400);
  if(!(await consumePublicFormQuota(c,'freelancer')))return c.json({error:'rate_limited'},429);
  const appId=id();
  await c.env.DB.prepare('INSERT INTO freelancer_applications(id,name,email,whatsapp,city,state,instagram,roles_json,portfolio_url,availability,source) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
    .bind(appId,String(b.name).slice(0,160),b.email?String(b.email).slice(0,200):null,String(b.whatsapp).slice(0,50),String(b.city).slice(0,100),b.state?String(b.state).slice(0,60):null,b.instagram?String(b.instagram).slice(0,160):null,JSON.stringify(Array.isArray(b.roles)?b.roles.slice(0,20):[]),b.portfolioUrl?String(b.portfolioUrl).slice(0,1000):null,b.availability?String(b.availability).slice(0,3000):null,b.source?String(b.source).slice(0,160):null).run();
  return c.json({ok:true,id:appId},201);
});

publicRoutes.post('/partnerships',async(c)=>{
  const b=await c.req.json<any>().catch(()=>null);
  if(!b?.contactName||!b?.partnershipType)return c.json({error:'invalid_form'},400);
  if(!(await verifyTurnstile(c,b.turnstileToken)))return c.json({error:'challenge_failed'},400);
  if(!(await consumePublicFormQuota(c,'partnership')))return c.json({error:'rate_limited'},429);
  const leadId=id();
  await c.env.DB.prepare('INSERT INTO partnership_leads(id,contact_name,company_name,partnership_type,email,whatsapp,city,message,source,campaign) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .bind(leadId,String(b.contactName).slice(0,160),b.companyName?String(b.companyName).slice(0,200):null,String(b.partnershipType).slice(0,80),b.email?String(b.email).slice(0,200):null,b.whatsapp?String(b.whatsapp).slice(0,50):null,b.city?String(b.city).slice(0,100):null,b.message?String(b.message).slice(0,5000):null,b.source?String(b.source).slice(0,160):null,b.campaign?String(b.campaign).slice(0,160):null).run();
  return c.json({ok:true,id:leadId},201);
});
