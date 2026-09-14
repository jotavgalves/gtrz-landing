import { Hono } from 'hono';
import type { Env } from '../../env';
import { audit } from '../../services/audit';

export const peopleAdminRoutes = new Hono<{ Bindings: Env }>();
const has=(value:unknown,key:string)=>Object.prototype.hasOwnProperty.call(value||{},key);

peopleAdminRoutes.get('/freelancers',async(c)=>{
  return c.json(await c.env.DB.prepare('SELECT * FROM freelancer_applications ORDER BY created_at DESC LIMIT 500').all());
});

peopleAdminRoutes.patch('/freelancers/:id',async(c)=>{
  const id=c.req.param('id');const b=await c.req.json<any>();
  await c.env.DB.prepare(`
    UPDATE freelancer_applications
    SET status=COALESCE(?,status),notes=CASE WHEN ? THEN ? ELSE notes END,updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).bind(b.status??null,has(b,'notes')?1:0,b.notes||null,id).run();
  await audit(c.env,'update','freelancer',id);
  return c.json({ok:true});
});

peopleAdminRoutes.get('/partnerships',async(c)=>{
  return c.json(await c.env.DB.prepare('SELECT * FROM partnership_leads ORDER BY created_at DESC LIMIT 500').all());
});

peopleAdminRoutes.patch('/partnerships/:id',async(c)=>{
  const id=c.req.param('id');const b=await c.req.json<any>();
  await c.env.DB.prepare(`
    UPDATE partnership_leads
    SET status=COALESCE(?,status),notes=CASE WHEN ? THEN ? ELSE notes END,owner_user_id=CASE WHEN ? THEN ? ELSE owner_user_id END,updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).bind(b.status??null,has(b,'notes')?1:0,b.notes||null,has(b,'ownerUserId')?1:0,b.ownerUserId||null,id).run();
  await audit(c.env,'update','partnership',id);
  return c.json({ok:true});
});

peopleAdminRoutes.get('/team',async(c)=>{
  const rows=await c.env.DB.prepare(`
    SELECT t.*,l.locale,l.role_label,l.bio
    FROM team_members t
    LEFT JOIN team_localizations l ON l.team_member_id=t.id
    ORDER BY t.position,l.locale
  `).all<any>();
  const map=new Map<string,any>();
  for(const row of rows.results){
    const item=map.get(row.id)||{id:row.id,name:row.name,role_key:row.role_key,media_id:row.media_id,instagram_url:row.instagram_url,position:row.position,active:row.active,locales:{}};
    if(row.locale)item.locales[row.locale]={roleLabel:row.role_label,bio:row.bio};
    map.set(row.id,item);
  }
  return c.json({results:[...map.values()]});
});

peopleAdminRoutes.post('/team',async(c)=>{
  const b=await c.req.json<any>();if(!b?.name)return c.json({error:'name_required'},400);const id=crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO team_members(id,name,role_key,media_id,instagram_url,position,active) VALUES(?,?,?,?,?,?,?)')
    .bind(id,b.name,b.roleKey||null,b.mediaId||null,b.instagramUrl||null,Number(b.position||0),b.active===false?0:1).run();
  for(const [locale,l] of Object.entries<any>(b.locales||{})){
    if(!['pt-BR','es'].includes(locale))continue;
    await c.env.DB.prepare('INSERT INTO team_localizations(team_member_id,locale,role_label,bio) VALUES(?,?,?,?)')
      .bind(id,locale,l.roleLabel||null,l.bio||null).run();
  }
  await audit(c.env,'create','team_member',id);return c.json({id},201);
});

peopleAdminRoutes.patch('/team/:id',async(c)=>{
  const id=c.req.param('id'),b=await c.req.json<any>();
  await c.env.DB.prepare(`UPDATE team_members SET
    name=CASE WHEN ? THEN ? ELSE name END,
    role_key=CASE WHEN ? THEN ? ELSE role_key END,
    media_id=CASE WHEN ? THEN ? ELSE media_id END,
    instagram_url=CASE WHEN ? THEN ? ELSE instagram_url END,
    position=CASE WHEN ? THEN ? ELSE position END,
    active=CASE WHEN ? THEN ? ELSE active END
    WHERE id=?`)
    .bind(
      has(b,'name')?1:0,b.name??null,
      has(b,'roleKey')?1:0,b.roleKey||null,
      has(b,'mediaId')?1:0,b.mediaId||null,
      has(b,'instagramUrl')?1:0,b.instagramUrl||null,
      has(b,'position')?1:0,b.position??null,
      has(b,'active')?1:0,b.active?1:0,
      id
    ).run();
  for(const [locale,l] of Object.entries<any>(b.locales||{})){
    if(!['pt-BR','es'].includes(locale))continue;
    await c.env.DB.prepare(`INSERT INTO team_localizations(team_member_id,locale,role_label,bio) VALUES(?,?,?,?) ON CONFLICT(team_member_id,locale) DO UPDATE SET role_label=excluded.role_label,bio=excluded.bio`)
      .bind(id,locale,l.roleLabel||null,l.bio||null).run();
  }
  await audit(c.env,'update','team_member',id);return c.json({ok:true});
});

peopleAdminRoutes.delete('/team/:id',async(c)=>{
  const id=c.req.param('id');
  await c.env.DB.prepare('DELETE FROM team_members WHERE id=?').bind(id).run();
  await audit(c.env,'delete','team_member',id);
  return c.json({ok:true});
});
