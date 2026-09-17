import { Hono } from 'hono';
import type { Env } from '../../env';
import { audit } from '../../services/audit';

export const peopleAdminRoutes = new Hono<{ Bindings: Env }>();
const has=(value:unknown,key:string)=>Object.prototype.hasOwnProperty.call(value||{},key);
const digits=(value:unknown)=>String(value??'').replace(/\D/g,'');
const upper=(value:unknown,max=100)=>String(value??'').trim().replace(/\s+/g,' ').toLocaleUpperCase('pt-BR').slice(0,max);
const defaultRoles=['DJ','FOTÓGRAFO(A)','VIDEOMAKER','SEGURANÇA','BOMBEIRO(A)','RECEPÇÃO','BARMAN','GARÇOM','LIMPEZA','OUTROS'];
const defaultPartnerTypes=['LOCAL / CASA / BAR / BOATE','MARCA','EMPRESA','FORNECEDOR','PRODUTORA / PROJETO','ARTISTA / AGÊNCIA','IMPRENSA / MÍDIA','OUTRO'];
const defaultProposalTypes=['PATROCÍNIO','APOIO','LOCAÇÃO DE ESPAÇO','REALIZAÇÃO DE EVENTO','CO-PRODUÇÃO','FORNECIMENTO DE PRODUTO','FORNECIMENTO DE SERVIÇO','AÇÃO DE MARCA','DIVULGAÇÃO / MÍDIA','PERMUTA','CONTRATAÇÃO DA GTRZ','OUTRO'];

async function deleteOwnedMedia(env:Env,mediaId:string|null|undefined){
  if(!mediaId)return;
  const media=await env.DB.prepare('SELECT r2_key FROM media_assets WHERE id=? LIMIT 1').bind(mediaId).first<{r2_key:string}>();
  if(media?.r2_key)await env.MEDIA.delete(media.r2_key);
  await env.DB.prepare('DELETE FROM media_assets WHERE id=?').bind(mediaId).run();
}

peopleAdminRoutes.get('/freelancer-config',async(c)=>{
  const row=await c.env.DB.prepare("SELECT value_json FROM site_settings WHERE key='recruitment' LIMIT 1").first<{value_json:string}>();
  try{return c.json(JSON.parse(row?.value_json||'{}'))}catch{return c.json({whatsapp:'',roles:defaultRoles})}
});
peopleAdminRoutes.patch('/freelancer-config',async(c)=>{
  const b=await c.req.json<any>().catch(()=>({}));const roles=[...new Set((Array.isArray(b.roles)?b.roles:[]).map((x:unknown)=>upper(x,80)).filter(Boolean))].slice(0,40);if(!roles.length)return c.json({error:'roles_required'},400);if(!roles.includes('OUTROS'))roles.push('OUTROS');const config={whatsapp:digits(b.whatsapp).slice(0,15),roles};await c.env.DB.prepare(`INSERT INTO site_settings(key,value_json,updated_at) VALUES('recruitment',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`).bind(JSON.stringify(config)).run();await audit(c.env,'update','site_setting','recruitment');return c.json(config);
});

peopleAdminRoutes.get('/partnership-config',async(c)=>{const row=await c.env.DB.prepare("SELECT value_json FROM site_settings WHERE key='partnership' LIMIT 1").first<{value_json:string}>();try{const p=JSON.parse(row?.value_json||'{}');return c.json({whatsapp:digits(p.whatsapp),partnerTypes:Array.isArray(p.partnerTypes)&&p.partnerTypes.length?p.partnerTypes:defaultPartnerTypes,proposalTypes:Array.isArray(p.proposalTypes)&&p.proposalTypes.length?p.proposalTypes:defaultProposalTypes})}catch{return c.json({whatsapp:'',partnerTypes:defaultPartnerTypes,proposalTypes:defaultProposalTypes})}});
peopleAdminRoutes.patch('/partnership-config',async(c)=>{const b=await c.req.json<any>().catch(()=>({}));const partnerTypes=[...new Set((Array.isArray(b.partnerTypes)?b.partnerTypes:[]).map((x:unknown)=>upper(x,100)).filter(Boolean))].slice(0,30);const proposalTypes=[...new Set((Array.isArray(b.proposalTypes)?b.proposalTypes:[]).map((x:unknown)=>upper(x,100)).filter(Boolean))].slice(0,40);if(!partnerTypes.length||!proposalTypes.length)return c.json({error:'options_required'},400);if(!partnerTypes.includes('OUTRO'))partnerTypes.push('OUTRO');if(!proposalTypes.includes('OUTRO'))proposalTypes.push('OUTRO');const config={whatsapp:digits(b.whatsapp).slice(0,15),partnerTypes,proposalTypes};await c.env.DB.prepare(`INSERT INTO site_settings(key,value_json,updated_at) VALUES('partnership',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`).bind(JSON.stringify(config)).run();await audit(c.env,'update','site_setting','partnership');return c.json(config)});

peopleAdminRoutes.get('/freelancers',async(c)=>c.json(await c.env.DB.prepare('SELECT * FROM freelancer_applications ORDER BY created_at DESC LIMIT 500').all()));
peopleAdminRoutes.patch('/freelancers/:id',async(c)=>{const id=c.req.param('id');const b=await c.req.json<any>();await c.env.DB.prepare(`UPDATE freelancer_applications SET status=COALESCE(?,status),notes=CASE WHEN ? THEN ? ELSE notes END,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(b.status??null,has(b,'notes')?1:0,b.notes||null,id).run();await audit(c.env,'update','freelancer',id);return c.json({ok:true})});
peopleAdminRoutes.delete('/freelancers/:id',async(c)=>{
  const id=c.req.param('id');
  const row=await c.env.DB.prepare('SELECT resume_media_id FROM freelancer_applications WHERE id=? LIMIT 1').bind(id).first<{resume_media_id:string|null}>();
  if(!row)return c.json({error:'not_found'},404);
  await c.env.DB.prepare('DELETE FROM freelancer_applications WHERE id=?').bind(id).run();
  await deleteOwnedMedia(c.env,row.resume_media_id);
  await audit(c.env,'delete','freelancer',id);
  return c.json({ok:true});
});

peopleAdminRoutes.get('/partnerships',async(c)=>c.json(await c.env.DB.prepare('SELECT * FROM partnership_leads ORDER BY created_at DESC LIMIT 500').all()));
peopleAdminRoutes.patch('/partnerships/:id',async(c)=>{const id=c.req.param('id');const b=await c.req.json<any>();await c.env.DB.prepare(`UPDATE partnership_leads SET status=COALESCE(?,status),notes=CASE WHEN ? THEN ? ELSE notes END,owner_user_id=CASE WHEN ? THEN ? ELSE owner_user_id END,next_contact_at=CASE WHEN ? THEN ? ELSE next_contact_at END,potential_value_cents=CASE WHEN ? THEN ? ELSE potential_value_cents END,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(b.status??null,has(b,'notes')?1:0,b.notes||null,has(b,'ownerUserId')?1:0,b.ownerUserId||null,has(b,'nextContactAt')?1:0,b.nextContactAt||null,has(b,'potentialValueCents')?1:0,b.potentialValueCents??null,id).run();await audit(c.env,'update','partnership',id);return c.json({ok:true})});
peopleAdminRoutes.delete('/partnerships/:id',async(c)=>{
  const id=c.req.param('id');
  const row=await c.env.DB.prepare('SELECT proposal_media_id FROM partnership_leads WHERE id=? LIMIT 1').bind(id).first<{proposal_media_id:string|null}>();
  if(!row)return c.json({error:'not_found'},404);
  await c.env.DB.prepare('DELETE FROM partnership_leads WHERE id=?').bind(id).run();
  await deleteOwnedMedia(c.env,row.proposal_media_id);
  await audit(c.env,'delete','partnership',id);
  return c.json({ok:true});
});

peopleAdminRoutes.get('/team',async(c)=>{const rows=await c.env.DB.prepare(`SELECT t.*,l.locale,l.role_label,l.bio FROM team_members t LEFT JOIN team_localizations l ON l.team_member_id=t.id ORDER BY t.position,l.locale`).all<any>();const map=new Map<string,any>();for(const row of rows.results){const item=map.get(row.id)||{id:row.id,name:row.name,role_key:row.role_key,media_id:row.media_id,instagram_url:row.instagram_url,position:row.position,active:row.active,locales:{}};if(row.locale)item.locales[row.locale]={roleLabel:row.role_label,bio:row.bio};map.set(row.id,item)}return c.json({results:[...map.values()]})});
peopleAdminRoutes.post('/team',async(c)=>{const b=await c.req.json<any>();if(!b?.name)return c.json({error:'name_required'},400);const id=crypto.randomUUID();await c.env.DB.prepare('INSERT INTO team_members(id,name,role_key,media_id,instagram_url,position,active) VALUES(?,?,?,?,?,?,?)').bind(id,b.name,b.roleKey||null,b.mediaId||null,b.instagramUrl||null,Number(b.position||0),b.active===false?0:1).run();for(const [locale,l] of Object.entries<any>(b.locales||{})){if(!['pt-BR','es'].includes(locale))continue;await c.env.DB.prepare('INSERT INTO team_localizations(team_member_id,locale,role_label,bio) VALUES(?,?,?,?)').bind(id,locale,l.roleLabel||null,l.bio||null).run()}await audit(c.env,'create','team_member',id);return c.json({id},201)});
peopleAdminRoutes.patch('/team/:id',async(c)=>{const id=c.req.param('id'),b=await c.req.json<any>();await c.env.DB.prepare(`UPDATE team_members SET name=CASE WHEN ? THEN ? ELSE name END,role_key=CASE WHEN ? THEN ? ELSE role_key END,media_id=CASE WHEN ? THEN ? ELSE media_id END,instagram_url=CASE WHEN ? THEN ? ELSE instagram_url END,position=CASE WHEN ? THEN ? ELSE position END,active=CASE WHEN ? THEN ? ELSE active END WHERE id=?`).bind(has(b,'name')?1:0,b.name??null,has(b,'roleKey')?1:0,b.roleKey||null,has(b,'mediaId')?1:0,b.mediaId||null,has(b,'instagramUrl')?1:0,b.instagramUrl||null,has(b,'position')?1:0,b.position??null,has(b,'active')?1:0,b.active?1:0,id).run();for(const [locale,l] of Object.entries<any>(b.locales||{})){if(!['pt-BR','es'].includes(locale))continue;await c.env.DB.prepare(`INSERT INTO team_localizations(team_member_id,locale,role_label,bio) VALUES(?,?,?,?) ON CONFLICT(team_member_id,locale) DO UPDATE SET role_label=excluded.role_label,bio=excluded.bio`).bind(id,locale,l.roleLabel||null,l.bio||null).run()}await audit(c.env,'update','team_member',id);return c.json({ok:true})});
peopleAdminRoutes.delete('/team/:id',async(c)=>{const id=c.req.param('id');await c.env.DB.prepare('DELETE FROM team_members WHERE id=?').bind(id).run();await audit(c.env,'delete','team_member',id);return c.json({ok:true})});