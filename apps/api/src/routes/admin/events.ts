import { Hono } from 'hono';
import type { Env } from '../../env';
import { audit } from '../../services/audit';
import { createRevision, getRevision, listRevisions } from '../../services/revisions';

export const eventsAdminRoutes = new Hono<{ Bindings: Env }>();
const has=(value:unknown,key:string)=>Object.prototype.hasOwnProperty.call(value||{},key);
const text=(value:unknown,max=4000)=>value==null?null:String(value).slice(0,max)||null;
const json=(value:unknown)=>JSON.stringify(value&&typeof value==='object'?value:{});
const availabilityToStatus=(value:unknown,fallback='active')=>{
  switch(String(value||'')){
    case 'coming_soon':return 'draft';
    case 'sold_out':return 'sold_out';
    case 'closed':return 'closed';
    case 'available':case 'last_units':return 'active';
    default:return fallback;
  }
};

async function eventSnapshot(env:Env,eventId:string){
  const event=await env.DB.prepare('SELECT * FROM events WHERE id=? LIMIT 1').bind(eventId).first<any>();
  if(!event)return null;
  const [localizations,tickets,artists]=await Promise.all([
    env.DB.prepare('SELECT * FROM event_localizations WHERE event_id=? ORDER BY locale').bind(eventId).all<any>(),
    env.DB.prepare('SELECT * FROM event_tickets WHERE event_id=? ORDER BY position,id').bind(eventId).all<any>(),
    env.DB.prepare('SELECT * FROM event_artists WHERE event_id=? ORDER BY position,id').bind(eventId).all<any>()
  ]);
  return {event,localizations:localizations.results,tickets:tickets.results,artists:artists.results};
}

async function saveEventRevision(env:Env,eventId:string){
  const snapshot=await eventSnapshot(env,eventId);
  if(snapshot)await createRevision(env,'event',eventId,snapshot);
  return snapshot;
}

eventsAdminRoutes.get('/events',async(c)=>{
  return c.json(await c.env.DB.prepare(`
    SELECT e.*,COALESCE(pt.title,es.title,e.slug) title
    FROM events e
    LEFT JOIN event_localizations pt ON pt.event_id=e.id AND pt.locale='pt-BR'
    LEFT JOIN event_localizations es ON es.event_id=e.id AND es.locale='es'
    ORDER BY e.starts_at DESC
  `).all());
});

eventsAdminRoutes.get('/events/:id',async(c)=>{
  const snapshot=await eventSnapshot(c.env,c.req.param('id'));
  if(!snapshot)return c.json({error:'not_found'},404);
  return c.json(snapshot);
});

eventsAdminRoutes.post('/events',async(c)=>{
  const b=await c.req.json<any>().catch(()=>null);
  if(!b?.slug||!b?.city||!b?.startsAt)return c.json({error:'invalid_event'},400);
  const eventId=crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO events(id,slug,status,city,state,country,venue_name,venue_address,starts_at,ends_at,theme_json,hero_media_id,logo_media_id)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    eventId,String(b.slug).trim(),b.status||'draft',String(b.city).trim(),b.state||null,b.country||'BR',
    b.venueName||null,b.venueAddress||null,b.startsAt,b.endsAt||null,JSON.stringify(b.theme||{}),
    b.heroMediaId||null,b.logoMediaId||null
  ).run();
  for(const [locale,l] of Object.entries<any>(b.locales||{})){
    if(!l?.title)continue;
    await c.env.DB.prepare(`
      INSERT INTO event_localizations(event_id,locale,title,summary,description,seo_title,seo_description)
      VALUES(?,?,?,?,?,?,?)
    `).bind(eventId,locale,l.title,l.summary||null,l.description||null,l.seoTitle||null,l.seoDescription||null).run();
  }
  await audit(c.env,'create','event',eventId,{slug:b.slug});
  return c.json({id:eventId},201);
});

eventsAdminRoutes.patch('/events/:id',async(c)=>{
  const eventId=c.req.param('id');
  const b=await c.req.json<any>().catch(()=>({}));
  const current=await saveEventRevision(c.env,eventId);
  if(!current)return c.json({error:'not_found'},404);
  await c.env.DB.prepare(`
    UPDATE events SET
      slug=CASE WHEN ? THEN ? ELSE slug END,
      status=CASE WHEN ? THEN ? ELSE status END,
      city=CASE WHEN ? THEN ? ELSE city END,
      state=CASE WHEN ? THEN ? ELSE state END,
      country=CASE WHEN ? THEN ? ELSE country END,
      venue_name=CASE WHEN ? THEN ? ELSE venue_name END,
      venue_address=CASE WHEN ? THEN ? ELSE venue_address END,
      starts_at=CASE WHEN ? THEN ? ELSE starts_at END,
      ends_at=CASE WHEN ? THEN ? ELSE ends_at END,
      theme_json=CASE WHEN ? THEN ? ELSE theme_json END,
      hero_media_id=CASE WHEN ? THEN ? ELSE hero_media_id END,
      logo_media_id=CASE WHEN ? THEN ? ELSE logo_media_id END,
      updated_at=CURRENT_TIMESTAMP,
      published_at=CASE WHEN ? IN ('published','sales_open','sold_out') AND published_at IS NULL THEN CURRENT_TIMESTAMP ELSE published_at END
    WHERE id=?
  `).bind(
    has(b,'slug')?1:0,b.slug??null,
    has(b,'status')?1:0,b.status??null,
    has(b,'city')?1:0,b.city??null,
    has(b,'state')?1:0,b.state||null,
    has(b,'country')?1:0,b.country??null,
    has(b,'venueName')?1:0,b.venueName||null,
    has(b,'venueAddress')?1:0,b.venueAddress||null,
    has(b,'startsAt')?1:0,b.startsAt??null,
    has(b,'endsAt')?1:0,b.endsAt||null,
    has(b,'theme')?1:0,has(b,'theme')?JSON.stringify(b.theme||{}):null,
    has(b,'heroMediaId')?1:0,b.heroMediaId||null,
    has(b,'logoMediaId')?1:0,b.logoMediaId||null,
    b.status??null,eventId
  ).run();
  for(const [locale,l] of Object.entries<any>(b.locales||{})){
    if(!l?.title)continue;
    await c.env.DB.prepare(`
      INSERT INTO event_localizations(event_id,locale,title,summary,description,seo_title,seo_description)
      VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(event_id,locale) DO UPDATE SET
        title=excluded.title,summary=excluded.summary,description=excluded.description,
        seo_title=excluded.seo_title,seo_description=excluded.seo_description
    `).bind(eventId,locale,l.title,l.summary||null,l.description||null,l.seoTitle||null,l.seoDescription||null).run();
  }
  await audit(c.env,'update','event',eventId,b);
  return c.json({ok:true});
});

eventsAdminRoutes.delete('/events/:id',async(c)=>{
  const eventId=c.req.param('id');
  const current=await saveEventRevision(c.env,eventId);
  if(!current)return c.json({error:'not_found'},404);
  await c.env.DB.prepare("UPDATE events SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(eventId).run();
  await audit(c.env,'archive','event',eventId);
  return c.json({ok:true});
});

eventsAdminRoutes.get('/events/:id/revisions',async(c)=>{
  return c.json(await listRevisions(c.env,'event',c.req.param('id')));
});

eventsAdminRoutes.post('/events/:id/revisions/:revisionId/restore',async(c)=>{
  const eventId=c.req.param('id');
  const rev=await getRevision(c.env,c.req.param('revisionId'));
  if(!rev||rev.entity_type!=='event'||rev.entity_id!==eventId)return c.json({error:'not_found'},404);
  const snapshot=JSON.parse(rev.snapshot_json||'{}');
  if(!snapshot.event?.id)return c.json({error:'invalid_snapshot'},400);
  await saveEventRevision(c.env,eventId);
  const e=snapshot.event;
  await c.env.DB.prepare(`
    UPDATE events SET slug=?,status=?,city=?,state=?,country=?,venue_name=?,venue_address=?,starts_at=?,ends_at=?,theme_json=?,hero_media_id=?,logo_media_id=?,published_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).bind(e.slug,e.status,e.city,e.state,e.country,e.venue_name,e.venue_address,e.starts_at,e.ends_at,e.theme_json||'{}',e.hero_media_id,e.logo_media_id,e.published_at,eventId).run();
  await c.env.DB.prepare('DELETE FROM event_localizations WHERE event_id=?').bind(eventId).run();
  for(const l of snapshot.localizations||[]){
    await c.env.DB.prepare('INSERT INTO event_localizations(event_id,locale,title,summary,description,seo_title,seo_description) VALUES(?,?,?,?,?,?,?)')
      .bind(eventId,l.locale,l.title,l.summary,l.description,l.seo_title,l.seo_description).run();
  }
  await c.env.DB.prepare('DELETE FROM event_tickets WHERE event_id=?').bind(eventId).run();
  for(const t of snapshot.tickets||[]){
    const availability=t.availability||({active:'available',sold_out:'sold_out',closed:'closed',draft:'coming_soon'} as Record<string,string>)[t.status]||'available';
    await c.env.DB.prepare(`INSERT INTO event_tickets(
      id,event_id,name,price_cents,currency,sales_url,status,position,starts_at,ends_at,
      visible,featured,quantity,compare_price_cents,purchase_mode,whatsapp_url,sympla_url,custom_url,
      availability,theme,content_pt_json,content_es_json
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(
        t.id,eventId,t.name,t.price_cents,t.currency||'BRL',t.sales_url||null,t.status||availabilityToStatus(availability),t.position||0,t.starts_at||null,t.ends_at||null,
        t.visible??1,t.featured??0,t.quantity??1,t.compare_price_cents??null,t.purchase_mode||((t.sales_url||t.sympla_url)?'sympla':'none'),
        t.whatsapp_url||null,t.sympla_url||t.sales_url||null,t.custom_url||null,availability,t.theme||'light',t.content_pt_json||'{}',t.content_es_json||'{}'
      ).run();
  }
  await c.env.DB.prepare('DELETE FROM event_artists WHERE event_id=?').bind(eventId).run();
  for(const a of snapshot.artists||[]){
    await c.env.DB.prepare(`INSERT INTO event_artists(id,event_id,name,role,media_id,instagram_url,position) VALUES(?,?,?,?,?,?,?)`)
      .bind(a.id,eventId,a.name,a.role,a.media_id,a.instagram_url,a.position).run();
  }
  await audit(c.env,'restore','event',eventId,{revisionId:rev.id});
  return c.json({ok:true});
});

eventsAdminRoutes.post('/events/:id/tickets',async(c)=>{
  const eventId=c.req.param('id');const b=await c.req.json<any>().catch(()=>({}));
  const name=String(b.name||b.contentPt?.title||b.contentEs?.title||'').trim();
  if(!name)return c.json({error:'ticket_name_required'},400);
  await saveEventRevision(c.env,eventId);
  const id=crypto.randomUUID();
  const availability=String(b.availability||'available');
  const status=availabilityToStatus(availability,b.status||'active');
  const symplaUrl=text(b.symplaUrl||b.salesUrl,1200);
  await c.env.DB.prepare(`INSERT INTO event_tickets(
    id,event_id,name,price_cents,currency,sales_url,status,position,starts_at,ends_at,
    visible,featured,quantity,compare_price_cents,purchase_mode,whatsapp_url,sympla_url,custom_url,
    availability,theme,content_pt_json,content_es_json
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(
      id,eventId,name,b.priceCents??null,b.currency||'BRL',symplaUrl,status,Number(b.position||0),b.startsAt||null,b.endsAt||null,
      b.visible===false?0:1,b.featured?1:0,Math.max(1,Number(b.quantity||1)),b.comparePriceCents??null,b.purchaseMode||'sympla',
      text(b.whatsappUrl,1200),symplaUrl,text(b.customUrl,1200),availability,b.theme||'light',json(b.contentPt),json(b.contentEs)
    ).run();
  await audit(c.env,'create','event_ticket',id,{eventId,availability,purchaseMode:b.purchaseMode||'sympla'});
  return c.json({id},201);
});

eventsAdminRoutes.patch('/events/:eventId/tickets/:ticketId',async(c)=>{
  const eventId=c.req.param('eventId'),ticketId=c.req.param('ticketId'),b=await c.req.json<any>().catch(()=>({}));
  await saveEventRevision(c.env,eventId);
  const nextStatus=has(b,'availability')?availabilityToStatus(b.availability,b.status||'active'):b.status;
  await c.env.DB.prepare(`UPDATE event_tickets SET
    name=CASE WHEN ? THEN ? ELSE name END,
    price_cents=CASE WHEN ? THEN ? ELSE price_cents END,
    compare_price_cents=CASE WHEN ? THEN ? ELSE compare_price_cents END,
    currency=CASE WHEN ? THEN ? ELSE currency END,
    sales_url=CASE WHEN ? THEN ? ELSE sales_url END,
    status=CASE WHEN ? THEN ? ELSE status END,
    position=CASE WHEN ? THEN ? ELSE position END,
    starts_at=CASE WHEN ? THEN ? ELSE starts_at END,
    ends_at=CASE WHEN ? THEN ? ELSE ends_at END,
    visible=CASE WHEN ? THEN ? ELSE visible END,
    featured=CASE WHEN ? THEN ? ELSE featured END,
    quantity=CASE WHEN ? THEN ? ELSE quantity END,
    purchase_mode=CASE WHEN ? THEN ? ELSE purchase_mode END,
    whatsapp_url=CASE WHEN ? THEN ? ELSE whatsapp_url END,
    sympla_url=CASE WHEN ? THEN ? ELSE sympla_url END,
    custom_url=CASE WHEN ? THEN ? ELSE custom_url END,
    availability=CASE WHEN ? THEN ? ELSE availability END,
    theme=CASE WHEN ? THEN ? ELSE theme END,
    content_pt_json=CASE WHEN ? THEN ? ELSE content_pt_json END,
    content_es_json=CASE WHEN ? THEN ? ELSE content_es_json END
    WHERE id=? AND event_id=?`)
    .bind(
      has(b,'name')?1:0,b.name??null,
      has(b,'priceCents')?1:0,b.priceCents??null,
      has(b,'comparePriceCents')?1:0,b.comparePriceCents??null,
      has(b,'currency')?1:0,b.currency??null,
      has(b,'symplaUrl')||has(b,'salesUrl')?1:0,text(b.symplaUrl||b.salesUrl,1200),
      has(b,'status')||has(b,'availability')?1:0,nextStatus??null,
      has(b,'position')?1:0,b.position??null,
      has(b,'startsAt')?1:0,b.startsAt||null,
      has(b,'endsAt')?1:0,b.endsAt||null,
      has(b,'visible')?1:0,b.visible?1:0,
      has(b,'featured')?1:0,b.featured?1:0,
      has(b,'quantity')?1:0,Math.max(1,Number(b.quantity||1)),
      has(b,'purchaseMode')?1:0,b.purchaseMode??null,
      has(b,'whatsappUrl')?1:0,text(b.whatsappUrl,1200),
      has(b,'symplaUrl')?1:0,text(b.symplaUrl,1200),
      has(b,'customUrl')?1:0,text(b.customUrl,1200),
      has(b,'availability')?1:0,b.availability??null,
      has(b,'theme')?1:0,b.theme??null,
      has(b,'contentPt')?1:0,has(b,'contentPt')?json(b.contentPt):null,
      has(b,'contentEs')?1:0,has(b,'contentEs')?json(b.contentEs):null,
      ticketId,eventId
    ).run();
  await audit(c.env,'update','event_ticket',ticketId,{eventId,fields:Object.keys(b)});
  return c.json({ok:true});
});

eventsAdminRoutes.delete('/events/:eventId/tickets/:ticketId',async(c)=>{
  const eventId=c.req.param('eventId'),ticketId=c.req.param('ticketId');await saveEventRevision(c.env,eventId);
  await c.env.DB.prepare('DELETE FROM event_tickets WHERE id=? AND event_id=?').bind(ticketId,eventId).run();
  await audit(c.env,'delete','event_ticket',ticketId,{eventId});return c.json({ok:true});
});

eventsAdminRoutes.post('/events/:id/artists',async(c)=>{
  const eventId=c.req.param('id'),b=await c.req.json<any>();if(!b?.name)return c.json({error:'artist_name_required'},400);
  await saveEventRevision(c.env,eventId);const id=crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO event_artists(id,event_id,name,role,media_id,instagram_url,position) VALUES(?,?,?,?,?,?,?)')
    .bind(id,eventId,b.name,b.role||null,b.mediaId||null,b.instagramUrl||null,Number(b.position||0)).run();
  await audit(c.env,'create','event_artist',id,{eventId});return c.json({id},201);
});

eventsAdminRoutes.patch('/events/:eventId/artists/:artistId',async(c)=>{
  const eventId=c.req.param('eventId'),artistId=c.req.param('artistId'),b=await c.req.json<any>();await saveEventRevision(c.env,eventId);
  await c.env.DB.prepare(`UPDATE event_artists SET
    name=CASE WHEN ? THEN ? ELSE name END,
    role=CASE WHEN ? THEN ? ELSE role END,
    media_id=CASE WHEN ? THEN ? ELSE media_id END,
    instagram_url=CASE WHEN ? THEN ? ELSE instagram_url END,
    position=CASE WHEN ? THEN ? ELSE position END
    WHERE id=? AND event_id=?`)
    .bind(
      has(b,'name')?1:0,b.name??null,
      has(b,'role')?1:0,b.role||null,
      has(b,'mediaId')?1:0,b.mediaId||null,
      has(b,'instagramUrl')?1:0,b.instagramUrl||null,
      has(b,'position')?1:0,b.position??null,
      artistId,eventId
    ).run();
  await audit(c.env,'update','event_artist',artistId,{eventId});return c.json({ok:true});
});

eventsAdminRoutes.delete('/events/:eventId/artists/:artistId',async(c)=>{
  const eventId=c.req.param('eventId'),artistId=c.req.param('artistId');await saveEventRevision(c.env,eventId);
  await c.env.DB.prepare('DELETE FROM event_artists WHERE id=? AND event_id=?').bind(artistId,eventId).run();
  await audit(c.env,'delete','event_artist',artistId,{eventId});return c.json({ok:true});
});
