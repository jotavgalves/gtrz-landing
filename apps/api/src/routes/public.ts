import { Hono } from 'hono';
import type { Env } from '../env';
import { consumePublicFormQuota, verifyTurnstile } from '../security';

export const publicRoutes = new Hono<{ Bindings: Env }>();
const id=()=>crypto.randomUUID();
const upper=(value:unknown,max=300)=>String(value??'').trim().replace(/\s+/g,' ').toLocaleUpperCase('pt-BR').slice(0,max);
const digits=(value:unknown)=>String(value??'').replace(/\D/g,'');
const defaultRoles=['DJ','FOTÓGRAFO(A)','VIDEOMAKER','SEGURANÇA','BOMBEIRO(A)','RECEPÇÃO','BARMAN','GARÇOM','LIMPEZA','OUTROS'];

function validCpf(raw:unknown){
  const cpf=digits(raw);
  if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;
  const calc=(len:number)=>{
    let sum=0;
    for(let i=0;i<len;i++)sum+=Number(cpf[i])*(len+1-i);
    const r=(sum*10)%11;
    return r===10?0:r;
  };
  return calc(9)===Number(cpf[9])&&calc(10)===Number(cpf[10]);
}

function isAdult(dateValue:unknown){
  const value=String(dateValue??'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const birth=new Date(`${value}T12:00:00Z`);
  if(Number.isNaN(birth.getTime()))return false;
  const now=new Date();
  let age=now.getUTCFullYear()-birth.getUTCFullYear();
  const m=now.getUTCMonth()-birth.getUTCMonth();
  if(m<0||(m===0&&now.getUTCDate()<birth.getUTCDate()))age--;
  return age>=18&&age<110;
}

function validName(name:string){
  return name.length>=5&&/^[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇÜÑ' -]+$/u.test(name)&&/[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇÜÑ]/u.test(name);
}

async function recruitmentConfig(env:Env){
  const row=await env.DB.prepare("SELECT value_json FROM site_settings WHERE key='recruitment' LIMIT 1").first<{value_json:string}>();
  try{
    const parsed=JSON.parse(row?.value_json||'{}');
    return {whatsapp:digits(parsed.whatsapp),roles:Array.isArray(parsed.roles)&&parsed.roles.length?parsed.roles.map((x:unknown)=>upper(x,80)):defaultRoles};
  }catch{return {whatsapp:'',roles:defaultRoles};}
}

publicRoutes.get('/site', async (c) => {
  const page = await c.env.DB.prepare("SELECT id,slug,template FROM pages WHERE slug='home' AND status='published' LIMIT 1").first<{id:string;slug:string;template:string}>();
  if (!page) return c.json({page:null,sections:[],events:[],team:[],settings:{}});
  const [sections,events,team,settingsRows] = await Promise.all([
    c.env.DB.prepare(`SELECT s.id,s.type,s.position,s.enabled,s.config_json,l.locale,l.content_json FROM page_sections s LEFT JOIN section_localizations l ON l.section_id=s.id WHERE s.page_id=? AND s.enabled=1 ORDER BY s.position`).bind(page.id).all(),
    c.env.DB.prepare(`SELECT e.id,e.slug,e.status,e.city,e.state,e.starts_at,e.ends_at,e.venue_name,e.hero_media_id,e.logo_media_id,e.theme_json,(SELECT MIN(t.price_cents) FROM event_tickets t WHERE t.event_id=e.id AND t.visible=1 AND t.price_cents IS NOT NULL) AS min_price_cents,l.locale,l.title,l.summary FROM events e LEFT JOIN event_localizations l ON l.event_id=e.id WHERE e.status IN ('published','sales_open','sold_out') ORDER BY e.starts_at`).all(),
    c.env.DB.prepare(`SELECT t.id,t.name,t.media_id,t.instagram_url,t.position,l.locale,l.role_label,l.bio FROM team_members t LEFT JOIN team_localizations l ON l.team_member_id=t.id WHERE t.active=1 ORDER BY t.position,l.locale`).all(),
    c.env.DB.prepare("SELECT key,value_json FROM site_settings WHERE key IN ('event_popup','social','general','chrome','copy','recruitment')").all<any>()
  ]);
  const settings:Record<string,unknown>={};
  for(const row of settingsRows.results){try{settings[row.key]=JSON.parse(row.value_json)}catch{settings[row.key]={}}}
  return c.json({page,sections:sections.results,events:events.results,team:team.results,settings},200,{'cache-control':'public,max-age=30,s-maxage=60'});
});

publicRoutes.get('/events/:slug',async(c)=>{
  const slug=c.req.param('slug');
  const event=await c.env.DB.prepare("SELECT * FROM events WHERE slug=? AND status IN ('published','sales_open','sold_out','finished') LIMIT 1").bind(slug).first();
  if(!event)return c.json({error:'not_found'},404);
  const [localizations,tickets,artists]=await Promise.all([
    c.env.DB.prepare('SELECT * FROM event_localizations WHERE event_id=?').bind(event.id).all(),
    c.env.DB.prepare('SELECT * FROM event_tickets WHERE event_id=? AND visible=1 ORDER BY featured DESC,position,id').bind(event.id).all(),
    c.env.DB.prepare('SELECT * FROM event_artists WHERE event_id=? ORDER BY position').bind(event.id).all()
  ]);
  return c.json({event,localizations:localizations.results,tickets:tickets.results,artists:artists.results},200,{'cache-control':'public,max-age=15,s-maxage=30'});
});

publicRoutes.get('/recruitment/config',async(c)=>c.json(await recruitmentConfig(c.env),200,{'cache-control':'public,max-age=120,s-maxage=300'}));

publicRoutes.get('/locations/states',async(c)=>{
  const r=await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
  if(!r.ok)return c.json({error:'location_provider_failed'},502);
  const data=await r.json<any[]>();
  return c.json(data.map(x=>({id:x.id,code:x.sigla,name:upper(x.nome,80)})),200,{'cache-control':'public,max-age=86400,s-maxage=604800'});
});

publicRoutes.get('/locations/cities/:uf',async(c)=>{
  const uf=c.req.param('uf').toUpperCase();
  if(!/^[A-Z]{2}$/.test(uf))return c.json({error:'invalid_state'},400);
  const r=await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`);
  if(!r.ok)return c.json({error:'location_provider_failed'},502);
  const data=await r.json<any[]>();
  return c.json(data.map(x=>({id:x.id,name:upper(x.nome,120)})),200,{'cache-control':'public,max-age=86400,s-maxage=604800'});
});

publicRoutes.get('/locations/neighborhoods',async(c)=>{
  const city=upper(c.req.query('city'),120),state=upper(c.req.query('state'),2);
  if(!city||!state)return c.json({error:'city_state_required'},400);
  const query=`[out:json][timeout:18];area["ISO3166-2"="BR-${state}"][boundary=administrative]->.state;area(area.state)[name="${city.replace(/"/g,'')}"][boundary=administrative]->.city;(nwr(area.city)[place~"suburb|neighbourhood|quarter"];nwr(area.city)[boundary=administrative][admin_level~"9|10|11"];);out tags;`;
  try{
    const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8'},body:`data=${encodeURIComponent(query)}`});
    if(!r.ok)throw new Error('overpass');
    const data=await r.json<any>();
    const names:string[]=[...new Set<string>((data.elements||[]).map((x:any)=>upper(x.tags?.name,120)).filter((x:string)=>Boolean(x)))].sort((a:string,b:string)=>a.localeCompare(b,'pt-BR'));
    return c.json(names.map((name:string)=>({name})),200,{'cache-control':'public,max-age=21600,s-maxage=86400'});
  }catch{return c.json([],200,{'cache-control':'public,max-age=300'});}
});

publicRoutes.post('/freelancers',async(c)=>{
  const contentType=c.req.header('content-type')||'';
  const isMultipart=contentType.includes('multipart/form-data');
  const form=isMultipart?await c.req.formData():null;
  let body:any=null;
  if(isMultipart&&form){
    body={};
    form.forEach((value,key)=>{if(!(value instanceof File))body[key]=value;});
  }else{
    body=await c.req.json<any>().catch(()=>null);
  }
  if(!body)return c.json({error:'invalid_form'},400);
  const name=upper(body.name,160),cpf=digits(body.cpf),whatsapp=digits(body.whatsapp),birthDate=String(body.birthDate||''),state=upper(body.state,2),city=upper(body.city,120),neighborhood=upper(body.neighborhood,120);
  const rolesRaw:string[]=isMultipart&&form?form.getAll('roles').map(value=>String(value)):Array.isArray(body.roles)?body.roles.map((value:unknown)=>String(value)):[];
  const roles:string[]=[...new Set<string>(rolesRaw.map((x:string)=>upper(x,80)).filter((x:string)=>Boolean(x)))].slice(0,20);
  const otherRole=upper(body.otherRole,160);
  if(!validName(name)||!validCpf(cpf)||!isAdult(birthDate)||whatsapp.length<10||whatsapp.length>13||!state||!city||!neighborhood||!roles.length)return c.json({error:'invalid_form'},400);
  const config=await recruitmentConfig(c.env);
  if(roles.some((role:string)=>!config.roles.includes(role)))return c.json({error:'invalid_role'},400);
  if(roles.includes('OUTROS')&&!otherRole)return c.json({error:'other_role_required'},400);
  if(!(await verifyTurnstile(c,body.turnstileToken)))return c.json({error:'challenge_failed'},400);
  if(!(await consumePublicFormQuota(c,'freelancer')))return c.json({error:'rate_limited'},429);

  let resumeMediaId:string|null=null,resumeFileName:string|null=null;
  const file=isMultipart&&form?form.get('resume'):null;
  if(file instanceof File&&file.size>0){
    if(file.size>5*1024*1024)return c.json({error:'resume_too_large'},400);
    if(file.type!=='application/pdf')return c.json({error:'resume_pdf_only'},415);
    const bytes=new Uint8Array(await file.arrayBuffer());
    if(!(bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46))return c.json({error:'invalid_resume'},400);
    resumeMediaId=id();resumeFileName=upper(file.name,240);
    const key=`recruitment/${new Date().toISOString().slice(0,7)}/${resumeMediaId}.pdf`;
    await c.env.MEDIA.put(key,bytes,{httpMetadata:{contentType:'application/pdf'},customMetadata:{assetId:resumeMediaId,kind:'resume'}});
    await c.env.DB.prepare('INSERT INTO media_assets(id,r2_key,mime_type,file_name,size_bytes) VALUES(?,?,?,?,?)').bind(resumeMediaId,key,'application/pdf',file.name,file.size).run();
  }

  const existing=await c.env.DB.prepare('SELECT id FROM freelancer_applications WHERE cpf=? LIMIT 1').bind(cpf).first<{id:string}>();
  if(existing)return c.json({error:'cpf_already_registered'},409);
  const appId=id();
  await c.env.DB.prepare(`INSERT INTO freelancer_applications(id,name,cpf,birth_date,email,whatsapp,city,state,neighborhood,instagram,roles_json,other_role,portfolio_url,resume_media_id,resume_file_name,availability,source)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(appId,name,cpf,birthDate,body.email?String(body.email).trim().slice(0,200):null,whatsapp,city,state,neighborhood,body.instagram?upper(body.instagram,160):null,JSON.stringify(roles),otherRole||null,body.portfolioUrl?String(body.portfolioUrl).trim().slice(0,1000):null,resumeMediaId,resumeFileName,body.availability?upper(body.availability,3000):null,body.source?String(body.source).slice(0,160):null).run();
  return c.json({ok:true,id:appId,whatsapp:config.whatsapp},201);
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
