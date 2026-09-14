import { Hono } from 'hono';
import type { Env } from '../env';
export const publicRoutes = new Hono<{ Bindings: Env }>();
const id=()=>crypto.randomUUID();

publicRoutes.get('/site', async (c) => {
  const page = await c.env.DB.prepare("SELECT id,slug,template FROM pages WHERE slug='home' AND status='published' LIMIT 1").first<{id:string;slug:string;template:string}>();
  if (!page) return c.json({page:null,sections:[],events:[]});
  const sections = await c.env.DB.prepare(`SELECT s.id,s.type,s.position,s.enabled,s.config_json,l.locale,l.content_json FROM page_sections s LEFT JOIN section_localizations l ON l.section_id=s.id WHERE s.page_id=? AND s.enabled=1 ORDER BY s.position`).bind(page.id).all();
  const events = await c.env.DB.prepare(`SELECT e.id,e.slug,e.status,e.city,e.state,e.starts_at,e.ends_at,l.locale,l.title,l.summary FROM events e LEFT JOIN event_localizations l ON l.event_id=e.id WHERE e.status IN ('published','sales_open','sold_out') ORDER BY e.starts_at`).all();
  return c.json({page,sections:sections.results,events:events.results},200,{'cache-control':'public,max-age=30,s-maxage=60'});
});

publicRoutes.get('/events/:slug',async(c)=>{const slug=c.req.param('slug');const event=await c.env.DB.prepare("SELECT * FROM events WHERE slug=? AND status!='draft' LIMIT 1").bind(slug).first();if(!event)return c.json({error:'not_found'},404);const localizations=await c.env.DB.prepare('SELECT * FROM event_localizations WHERE event_id=?').bind(event.id).all();const tickets=await c.env.DB.prepare('SELECT * FROM event_tickets WHERE event_id=? ORDER BY position').bind(event.id).all();const artists=await c.env.DB.prepare('SELECT * FROM event_artists WHERE event_id=? ORDER BY position').bind(event.id).all();return c.json({event,localizations:localizations.results,tickets:tickets.results,artists:artists.results});});

publicRoutes.post('/freelancers',async(c)=>{const b=await c.req.json<any>().catch(()=>null);if(!b?.name||!b?.whatsapp||!b?.city)return c.json({error:'invalid_form'},400);const appId=id();await c.env.DB.prepare('INSERT INTO freelancer_applications(id,name,email,whatsapp,city,state,instagram,roles_json,portfolio_url,availability,source) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(appId,String(b.name).slice(0,160),b.email||null,String(b.whatsapp).slice(0,50),String(b.city).slice(0,100),b.state||null,b.instagram||null,JSON.stringify(Array.isArray(b.roles)?b.roles:[]),b.portfolioUrl||null,b.availability||null,b.source||null).run();return c.json({ok:true,id:appId},201);});
publicRoutes.post('/partnerships',async(c)=>{const b=await c.req.json<any>().catch(()=>null);if(!b?.contactName||!b?.partnershipType)return c.json({error:'invalid_form'},400);const leadId=id();await c.env.DB.prepare('INSERT INTO partnership_leads(id,contact_name,company_name,partnership_type,email,whatsapp,city,message,source,campaign) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(leadId,String(b.contactName).slice(0,160),b.companyName||null,String(b.partnershipType).slice(0,80),b.email||null,b.whatsapp||null,b.city||null,b.message||null,b.source||null,b.campaign||null).run();return c.json({ok:true,id:leadId},201);});
