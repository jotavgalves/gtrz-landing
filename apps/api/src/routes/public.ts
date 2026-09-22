import { Hono } from 'hono';
import type { Env } from '../env';
import { consumePublicFormQuota, verifyTurnstile } from '../security';

export const publicRoutes = new Hono<{ Bindings: Env }>();
const id=()=>crypto.randomUUID();
const upper=(value:unknown,max=300)=>String(value??'').trim().replace(/\s+/g,' ').toLocaleUpperCase('pt-BR').slice(0,max);
const digits=(value:unknown)=>String(value??'').replace(/\D/g,'');
const defaultRoles=['DJ','FOTÓGRAFO(A)','VIDEOMAKER','SEGURANÇA','BOMBEIRO(A)','RECEPÇÃO','BARMAN','GARÇOM','LIMPEZA','OUTROS'];
const PRIVACY_NOTICE_VERSION='1.0';
const AVAILABILITY_MAX_LENGTH=800;
const RECRUITMENT_MAX_BODY_BYTES=6*1024*1024;
const privacyNotice=(locale:string)=>locale==='es'
?'Al enviar la candidatura, declaro que leí y comprendí el Aviso de Privacidad y autorizo a GTRZ a tratar los datos personales informados para reclutamiento, mantenimiento de una base de profesionales, contacto para futuras oportunidades, contratación y gestión de la prestación de servicios. Los datos no serán comercializados ni utilizados para publicidad de terceros. Podrán conservarse mientras sean pertinentes y necesarios para estas finalidades, respetando la legislación aplicable y los derechos del titular.'
:'Ao enviar a candidatura, declaro que li e compreendi o Aviso de Privacidade e autorizo a GTRZ a tratar os dados pessoais informados para recrutamento, manutenção de banco de profissionais, contato para futuras oportunidades, contratação e gestão da prestação de serviços. Os dados não serão comercializados nem utilizados para publicidade de terceiros. Poderão ser conservados enquanto forem pertinentes e necessários para essas finalidades, respeitada a legislação aplicável e os direitos do titular.';
function validCpf(raw:unknown){const cpf=digits(raw);if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;const calc=(len:number)=>{let sum=0;for(let i=0;i<len;i++)sum+=Number(cpf[i])*(len+1-i);const r=(sum*10)%11;return r===10?0:r};return calc(9)===Number(cpf[9])&&calc(10)===Number(cpf[10])}
function normalizeBirthDate(value:unknown){const raw=String(value??'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;const m=raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)return '';const iso=`${m[3]}-${m[2]}-${m[1]}`;const d=new Date(`${iso}T12:00:00Z`);if(Number.isNaN(d.getTime())||d.getUTCFullYear()!==Number(m[3])||d.getUTCMonth()+1!==Number(m[2])||d.getUTCDate()!==Number(m[1]))return '';return iso}
function ageFromBirth(dateValue:unknown){const value=normalizeBirthDate(dateValue);if(!value)return -1;const birth=new Date(`${value}T12:00:00Z`);const now=new Date();let age=now.getUTCFullYear()-birth.getUTCFullYear();const m=now.getUTCMonth()-birth.getUTCMonth();if(m<0||(m===0&&now.getUTCDate()<birth.getUTCDate()))age--;return age}
function validName(name:string){return name.length>=5&&/^[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇÜÑ' -]+$/u.test(name)&&/[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇÜÑ]/u.test(name)}
function validEmail(email:string){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)&&email.length<=200}
function parseFlags(value:unknown){try{const parsed=JSON.parse(String(value||'[]'));return Array.isArray(parsed)?parsed.map(String):[]}catch{return []}}
async function recruitmentConfig(env:Env){const row=await env.DB.prepare("SELECT value_json FROM site_settings WHERE key='recruitment' LIMIT 1").first<{value_json:string}>();try{const parsed=JSON.parse(row?.value_json||'{}');return {whatsapp:digits(parsed.whatsapp),roles:Array.isArray(parsed.roles)&&parsed.roles.length?parsed.roles.map((x:unknown)=>upper(x,80)):defaultRoles}}catch{return {whatsapp:'',roles:defaultRoles}}}
async function markUnderage(env:Env,cpf:string,birthDate:string){await env.DB.prepare(`INSERT INTO recruitment_risk_state(cpf,first_birth_date,underage_attempts,first_underage_at,last_underage_at,updated_at) VALUES(?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(cpf) DO UPDATE SET first_birth_date=COALESCE(recruitment_risk_state.first_birth_date,excluded.first_birth_date),underage_attempts=recruitment_risk_state.underage_attempts+1,last_underage_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`).bind(cpf,birthDate).run()}
async function markDuplicate(env:Env,cpf:string,applicationId:string,currentFlags:unknown){await env.DB.prepare(`INSERT INTO recruitment_risk_state(cpf,duplicate_attempts,last_duplicate_at,updated_at) VALUES(?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(cpf) DO UPDATE SET duplicate_attempts=recruitment_risk_state.duplicate_attempts+1,last_duplicate_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`).bind(cpf).run();const flags=[...new Set([...parseFlags(currentFlags),'DUPLICATE_CPF_ATTEMPT'])];await env.DB.prepare('UPDATE freelancer_applications SET risk_flags_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(JSON.stringify(flags),applicationId).run()}

publicRoutes.get('/site',async(c)=>{const page=await c.env.DB.prepare("SELECT id,slug,template FROM pages WHERE slug='home' AND status='published' LIMIT 1").first<{id:string;slug:string;template:string}>();if(!page)return c.json({page:null,sections:[],events:[],team:[],settings:{}});const [sections,events,team,settingsRows]=await Promise.all([c.env.DB.prepare(`SELECT s.id,s.type,s.position,s.enabled,s.config_json,l.locale,l.content_json FROM page_sections s LEFT JOIN section_localizations l ON l.section_id=s.id WHERE s.page_id=? AND s.enabled=1 ORDER BY s.position`).bind(page.id).all(),c.env.DB.prepare(`SELECT e.id,e.slug,e.status,e.city,e.state,e.starts_at,e.ends_at,e.venue_name,e.hero_media_id,e.logo_media_id,e.theme_json,(SELECT MIN(t.price_cents) FROM event_tickets t WHERE t.event_id=e.id AND t.visible=1 AND t.price_cents IS NOT NULL) AS min_price_cents,l.locale,l.title,l.summary FROM events e LEFT JOIN event_localizations l ON l.event_id=e.id WHERE e.status IN ('published','sales_open','sold_out') ORDER BY e.starts_at`).all(),c.env.DB.prepare(`SELECT t.id,t.name,t.media_id,t.instagram_url,t.position,l.locale,l.role_label,l.bio FROM team_members t LEFT JOIN team_localizations l ON l.team_member_id=t.id WHERE t.active=1 ORDER BY t.position,l.locale`).all(),c.env.DB.prepare("SELECT key,value_json FROM site_settings WHERE key IN ('event_popup','social','general','chrome','copy','recruitment')").all<any>()]);const settings:Record<string,unknown>={};for(const row of settingsRows.results){try{settings[row.key]=JSON.parse(row.value_json)}catch{settings[row.key]={}}}return c.json({page,sections:sections.results,events:events.results,team:team.results,settings},200,{'cache-control':'public,max-age=30,s-maxage=60'})});
publicRoutes.get('/events/:slug',async(c)=>{const slug=c.req.param('slug');const event=await c.env.DB.prepare("SELECT * FROM events WHERE slug=? AND status IN ('published','sales_open','sold_out','finished') LIMIT 1").bind(slug).first();if(!event)return c.json({error:'not_found'},404);const [localizations,tickets,artists]=await Promise.all([c.env.DB.prepare('SELECT * FROM event_localizations WHERE event_id=?').bind(event.id).all(),c.env.DB.prepare('SELECT * FROM event_tickets WHERE event_id=? AND visible=1 ORDER BY featured DESC,position,id').bind(event.id).all(),c.env.DB.prepare('SELECT * FROM event_artists WHERE event_id=? ORDER BY position').bind(event.id).all()]);return c.json({event,localizations:localizations.results,tickets:tickets.results,artists:artists.results},200,{'cache-control':'public,max-age=15,s-maxage=30'})});
publicRoutes.get('/recruitment/config',async(c)=>c.json({...await recruitmentConfig(c.env),privacyNoticeVersion:PRIVACY_NOTICE_VERSION},200,{'cache-control':'public,max-age=120,s-maxage=300'}));
publicRoutes.get('/locations/states',async(c)=>{const r=await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');if(!r.ok)return c.json({error:'location_provider_failed'},502);const data=await r.json<any[]>();return c.json(data.map(x=>({id:x.id,code:x.sigla,name:upper(x.nome,80)})),200,{'cache-control':'public,max-age=86400,s-maxage=604800'})});
publicRoutes.get('/locations/cities/:uf',async(c)=>{const uf=c.req.param('uf').toUpperCase();if(!/^[A-Z]{2}$/.test(uf))return c.json({error:'invalid_state'},400);const r=await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`);if(!r.ok)return c.json({error:'location_provider_failed'},502);const data=await r.json<any[]>();return c.json(data.map(x=>({id:x.id,name:upper(x.nome,120)})),200,{'cache-control':'public,max-age=86400,s-maxage=604800'})});
publicRoutes.get('/locations/cep/:cep',async(c)=>{const cep=digits(c.req.param('cep'));if(cep.length!==8)return c.json({error:'invalid_cep'},400);try{const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{headers:{accept:'application/json'}});if(!r.ok)return c.json({error:'location_provider_failed'},502);const data=await r.json<any>();if(data?.erro)return c.json({error:'cep_not_found'},404);return c.json({postalCode:digits(data.cep),state:upper(data.uf,2),city:upper(data.localidade,120),neighborhood:upper(data.bairro,120),street:upper(data.logradouro,180),complement:upper(data.complemento,160)},200,{'cache-control':'public,max-age=86400,s-maxage=604800'})}catch{return c.json({error:'location_provider_failed'},502)}});

publicRoutes.post('/freelancers',async(c)=>{const contentLength=Number(c.req.header('content-length')||0);if(Number.isFinite(contentLength)&&contentLength>RECRUITMENT_MAX_BODY_BYTES)return c.json({error:'payload_too_large'},413);const contentType=c.req.header('content-type')||'';const isMultipart=contentType.includes('multipart/form-data');const form=isMultipart?await c.req.formData():null;let body:any=null;if(isMultipart&&form){body={};form.forEach((value,key)=>{if(!(value instanceof File))body[key]=value})}else body=await c.req.json<any>().catch(()=>null);if(!body)return c.json({error:'invalid_form'},400);
const rawAvailability=String(body.availability||'');if(rawAvailability.length>AVAILABILITY_MAX_LENGTH)return c.json({error:'availability_too_long'},413);const availability=rawAvailability?upper(rawAvailability,AVAILABILITY_MAX_LENGTH):null;const name=upper(body.name,160),cpf=digits(body.cpf),whatsapp=digits(body.whatsapp),birthDate=normalizeBirthDate(body.birthDate),age=ageFromBirth(birthDate),email=String(body.email||'').trim().toLowerCase(),postalCode=digits(body.postalCode).slice(0,8),state=upper(body.state,2),city=upper(body.city,120),neighborhood=upper(body.neighborhood,120),street=upper(body.street,180),addressNumber=upper(body.addressNumber,30),complement=upper(body.complement,160),privacyAccepted=String(body.privacyAccepted||'')==='1',privacyLocale=String(body.privacyNoticeLocale||'pt-BR')==='es'?'es':'pt-BR',privacyVersion=String(body.privacyNoticeVersion||'');const rolesRaw:string[]=isMultipart&&form?form.getAll('roles').map(value=>String(value)):Array.isArray(body.roles)?body.roles.map((value:unknown)=>String(value)):[];const roles:string[]=[...new Set<string>(rolesRaw.map((x:string)=>upper(x,80)).filter((x:string)=>Boolean(x)))].slice(0,20);const otherRole=upper(body.otherRole,160);
if(validCpf(cpf)&&birthDate&&age>=0&&age<18){if(await consumePublicFormQuota(c,'freelancer-underage'))await markUnderage(c.env,cpf,birthDate);return c.json({error:'age_restricted'},422)}
if(postalCode&&postalCode.length!==8)return c.json({error:'invalid_cep'},400);if(!privacyAccepted||privacyVersion!==PRIVACY_NOTICE_VERSION)return c.json({error:'privacy_required'},400);if(!validName(name)||!validCpf(cpf)||!birthDate||age<18||age>109||whatsapp.length!==11||!validEmail(email)||!state||!city||!neighborhood||!street||!addressNumber||!roles.length)return c.json({error:'invalid_form'},400);const config=await recruitmentConfig(c.env);if(roles.some((role:string)=>!config.roles.includes(role)))return c.json({error:'invalid_role'},400);if(roles.includes('OUTROS')&&!otherRole)return c.json({error:'other_role_required'},400);if(!(await verifyTurnstile(c,body.turnstileToken)))return c.json({error:'challenge_failed'},400);if(!(await consumePublicFormQuota(c,'freelancer')))return c.json({error:'rate_limited'},429);
const existing=await c.env.DB.prepare('SELECT id,risk_flags_json FROM freelancer_applications WHERE cpf=? LIMIT 1').bind(cpf).first<{id:string;risk_flags_json:string}>();if(existing){await markDuplicate(c.env,cpf,existing.id,existing.risk_flags_json);return c.json({error:'cpf_already_registered'},409)}const risk=await c.env.DB.prepare('SELECT underage_attempts FROM recruitment_risk_state WHERE cpf=? LIMIT 1').bind(cpf).first<{underage_attempts:number}>();const riskFlags:string[]=[];if((risk?.underage_attempts||0)>0)riskFlags.push('AGE_CHANGED_AFTER_UNDERAGE_ATTEMPT');
let resumeMediaId:string|null=null,resumeFileName:string|null=null;const file=isMultipart&&form?form.get('resume'):null;if(file instanceof File&&file.size>0){if(file.size>5*1024*1024)return c.json({error:'resume_too_large'},400);if(file.type!=='application/pdf')return c.json({error:'resume_pdf_only'},415);const bytes=new Uint8Array(await file.arrayBuffer());if(!(bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46))return c.json({error:'invalid_resume'},400);resumeMediaId=id();resumeFileName=upper(file.name,240);const key=`recruitment/${new Date().toISOString().slice(0,7)}/${resumeMediaId}.pdf`;await c.env.MEDIA.put(key,bytes,{httpMetadata:{contentType:'application/pdf'},customMetadata:{assetId:resumeMediaId,kind:'resume'}});await c.env.DB.prepare('INSERT INTO media_assets(id,r2_key,mime_type,file_name,size_bytes) VALUES(?,?,?,?,?)').bind(resumeMediaId,key,'application/pdf',file.name,file.size).run()}
const appId=id(),noticeText=privacyNotice(privacyLocale);await c.env.DB.prepare(`INSERT INTO freelancer_applications(id,name,cpf,birth_date,email,whatsapp,postal_code,city,state,neighborhood,street,address_number,complement,instagram,roles_json,other_role,portfolio_url,resume_media_id,resume_file_name,availability,source,risk_flags_json,privacy_accepted,privacy_accepted_at,privacy_notice_version,privacy_notice_locale,privacy_notice_text) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,CURRENT_TIMESTAMP,?,?,?)`).bind(appId,name,cpf,birthDate,email,whatsapp,postalCode||null,city,state,neighborhood,street,addressNumber,complement||null,body.instagram?upper(body.instagram,160):null,JSON.stringify(roles),otherRole||null,body.portfolioUrl?String(body.portfolioUrl).trim().slice(0,1000):null,resumeMediaId,resumeFileName,availability,body.source?String(body.source).slice(0,160):null,JSON.stringify(riskFlags),PRIVACY_NOTICE_VERSION,privacyLocale,noticeText).run();return c.json({ok:true,id:appId,whatsapp:config.whatsapp},201)});

publicRoutes.post('/partnerships',async(c)=>{const b=await c.req.json<any>().catch(()=>null);if(!b?.contactName||!b?.partnershipType)return c.json({error:'invalid_form'},400);if(!(await verifyTurnstile(c,b.turnstileToken)))return c.json({error:'challenge_failed'},400);if(!(await consumePublicFormQuota(c,'partnership')))return c.json({error:'rate_limited'},429);const leadId=id();await c.env.DB.prepare('INSERT INTO partnership_leads(id,contact_name,company_name,partnership_type,email,whatsapp,city,message,source,campaign) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(leadId,String(b.contactName).slice(0,160),b.companyName?String(b.companyName).slice(0,200):null,String(b.partnershipType).slice(0,80),b.email?String(b.email).slice(0,200):null,b.whatsapp?String(b.whatsapp).slice(0,50):null,b.city?String(b.city).slice(0,100):null,b.message?String(b.message).slice(0,5000):null,b.source?String(b.source).slice(0,160):null,b.campaign?String(b.campaign).slice(0,160):null).run();return c.json({ok:true,id:leadId},201)});

const FEEDBACK_MAX_BODY_BYTES=12*1024;
const feedbackSingleLine=(value:unknown,max:number)=>String(value??'')
  .normalize('NFKC')
  .replace(/[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g,' ')
  .replace(/[<>]/g,'')
  .replace(/\s+/g,' ')
  .trim()
  .slice(0,max);
const feedbackMultiline=(value:unknown,max:number)=>String(value??'')
  .normalize('NFKC')
  .replace(/\r\n?/g,'\n')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g,'')
  .replace(/[<>]/g,'')
  .split('\n')
  .map(line=>line.replace(/[ \t]+/g,' ').trimEnd())
  .join('\n')
  .trim()
  .slice(0,max);
const feedbackSourcePath=(value:unknown)=>{
  const cleaned=feedbackSingleLine(value,220);
  return cleaned.startsWith('/')?cleaned:'/sugestoes';
};

publicRoutes.post('/feedback',async(c)=>{
  const contentType=(c.req.header('content-type')||'').toLowerCase();
  if(!contentType.includes('application/json'))return c.json({error:'unsupported_media_type'},415);

  const declaredLength=Number(c.req.header('content-length')||0);
  if(Number.isFinite(declaredLength)&&declaredLength>FEEDBACK_MAX_BODY_BYTES)return c.json({error:'payload_too_large'},413);

  const raw=await c.req.text();
  if(new TextEncoder().encode(raw).byteLength>FEEDBACK_MAX_BODY_BYTES)return c.json({error:'payload_too_large'},413);

  let body:any=null;
  try{body=JSON.parse(raw)}catch{return c.json({error:'invalid_form'},400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return c.json({error:'invalid_form'},400);

  // Honeypot: accept silently without persisting to avoid teaching simple bots how they were detected.
  if(feedbackSingleLine(body.website,200)){
    await consumePublicFormQuota(c,'feedback-bot').catch(()=>false);
    return c.json({ok:true},201,{'cache-control':'no-store'});
  }

  if(typeof body.anonymous!=='boolean')return c.json({error:'invalid_form'},400);

  const eventName=feedbackSingleLine(body.eventName,80);
  const anonymous=body.anonymous;
  const name=anonymous?'':feedbackSingleLine(body.name,80);
  const message=feedbackMultiline(body.message,1500);
  const locale=body.locale==='es'?'es':'pt-BR';
  const sourcePath=feedbackSourcePath(body.sourcePath);

  if(eventName.length<2||eventName.length>80||message.length<5||message.length>1500||(!anonymous&&(name.length<2||name.length>80))){
    return c.json({error:'invalid_form'},400);
  }

  if(!(await verifyTurnstile(c,typeof body.turnstileToken==='string'?body.turnstileToken:undefined))){
    return c.json({error:'challenge_failed'},400);
  }
  if(!(await consumePublicFormQuota(c,'feedback')))return c.json({error:'rate_limited'},429);

  const feedbackId=id();
  await c.env.DB.prepare(`
    INSERT INTO event_feedback(id,event_name,anonymous,name,message,locale,source_path,status)
    VALUES(?,?,?,?,?,?,?,'new')
  `).bind(
    feedbackId,
    eventName,
    anonymous?1:0,
    anonymous?null:name,
    message,
    locale,
    sourcePath
  ).run();

  return c.json({ok:true,id:feedbackId},201,{'cache-control':'no-store'});
});

