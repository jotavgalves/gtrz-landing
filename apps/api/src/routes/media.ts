import { Hono } from 'hono';
import type { Env } from '../env';
import { requireAdmin } from '../security';
import { audit } from '../services/audit';

export const mediaRoutes = new Hono<{ Bindings: Env }>();
const MAX_BYTES = 8 * 1024 * 1024;
const allowed = new Map([
  ['image/jpeg','jpg'],
  ['image/png','png'],
  ['image/webp','webp'],
  ['image/svg+xml','svg'],
  ['font/woff2','woff2'],
  ['font/woff','woff'],
  ['application/font-woff','woff'],
  ['font/ttf','ttf'],
  ['application/x-font-ttf','ttf'],
  ['font/otf','otf'],
  ['application/x-font-opentype','otf']
]);

function bytesText(bytes:Uint8Array){return new TextDecoder().decode(bytes)}
function safeSvg(bytes:Uint8Array){
  const text=bytesText(bytes).trim();
  if(!/^<svg[\s>]/i.test(text)&&!/^<\?xml[\s\S]*?<svg[\s>]/i.test(text))return false;
  return !/<script\b|<foreignObject\b|\bon\w+\s*=|javascript\s*:|data\s*:\s*text\/html/i.test(text);
}
function validMagic(type:string, bytes:Uint8Array){
  if(type==='image/jpeg') return bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  if(type==='image/png') return bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47;
  if(type==='image/webp') return String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(type==='image/svg+xml') return safeSvg(bytes);
  if(type==='font/woff2') return String.fromCharCode(...bytes.slice(0,4))==='wOF2';
  if(type==='font/woff'||type==='application/font-woff') return String.fromCharCode(...bytes.slice(0,4))==='wOFF';
  if(type==='font/ttf'||type==='application/x-font-ttf') return (bytes[0]===0x00&&bytes[1]===0x01&&bytes[2]===0x00&&bytes[3]===0x00)||String.fromCharCode(...bytes.slice(0,4))==='true';
  if(type==='font/otf'||type==='application/x-font-opentype') return String.fromCharCode(...bytes.slice(0,4))==='OTTO';
  return false;
}

mediaRoutes.get('/', requireAdmin, async(c)=>{
  const rows=await c.env.DB.prepare(`
    SELECT m.id,m.file_name,m.mime_type,m.size_bytes,m.width,m.height,m.alt_pt,m.alt_es,m.created_at,
      (
        (SELECT COUNT(*) FROM events e WHERE e.hero_media_id=m.id OR e.logo_media_id=m.id OR e.theme_json LIKE '%' || m.id || '%') +
        (SELECT COUNT(*) FROM event_artists a WHERE a.media_id=m.id) +
        (SELECT COUNT(*) FROM team_members t WHERE t.media_id=m.id) +
        (SELECT COUNT(*) FROM freelancer_applications f WHERE f.resume_media_id=m.id) +
        (SELECT COUNT(*) FROM page_localizations p WHERE p.og_media_id=m.id)
      ) usage_count
    FROM media_assets m
    ORDER BY m.created_at DESC LIMIT 500
  `).all();
  return c.json(rows);
});

mediaRoutes.post('/', requireAdmin, async(c)=>{
  const form=await c.req.formData();
  const file=form.get('file');
  if(!(file instanceof File)) return c.json({error:'file_required'},400);
  if(file.size<=0||file.size>MAX_BYTES) return c.json({error:'invalid_file_size'},400);
  const ext=allowed.get(file.type);
  if(!ext) return c.json({error:'unsupported_media_type'},415);
  const data=new Uint8Array(await file.arrayBuffer());
  if(!validMagic(file.type,data)) return c.json({error:'invalid_file_signature'},400);
  const now=new Date();
  const key=`uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth()+1).padStart(2,'0')}/${crypto.randomUUID()}.${ext}`;
  const id=crypto.randomUUID();
  await c.env.MEDIA.put(key,data,{httpMetadata:{contentType:file.type,cacheControl:'public, max-age=31536000, immutable'},customMetadata:{assetId:id}});
  await c.env.DB.prepare('INSERT INTO media_assets(id,r2_key,mime_type,file_name,size_bytes,alt_pt,alt_es) VALUES(?,?,?,?,?,?,?)').bind(id,key,file.type,file.name,file.size,String(form.get('altPt')||'').slice(0,300)||null,String(form.get('altEs')||'').slice(0,300)||null).run();
  await audit(c.env,'create','media_asset',id,{fileName:file.name,mimeType:file.type,sizeBytes:file.size});
  return c.json({id,url:`/api/media/${id}`,fileName:file.name,mimeType:file.type,sizeBytes:file.size},201);
});

mediaRoutes.patch('/:id', requireAdmin, async(c)=>{
  const id=c.req.param('id');
  const body=await c.req.json<any>().catch(()=>({}));
  const existing=await c.env.DB.prepare('SELECT id FROM media_assets WHERE id=?').bind(id).first();
  if(!existing)return c.json({error:'not_found'},404);
  await c.env.DB.prepare(`
    UPDATE media_assets SET
      file_name=CASE WHEN ? THEN ? ELSE file_name END,
      alt_pt=CASE WHEN ? THEN ? ELSE alt_pt END,
      alt_es=CASE WHEN ? THEN ? ELSE alt_es END
    WHERE id=?
  `).bind(
    Object.prototype.hasOwnProperty.call(body,'fileName')?1:0,String(body.fileName||'').slice(0,240)||'asset',
    Object.prototype.hasOwnProperty.call(body,'altPt')?1:0,String(body.altPt||'').slice(0,300)||null,
    Object.prototype.hasOwnProperty.call(body,'altEs')?1:0,String(body.altEs||'').slice(0,300)||null,
    id
  ).run();
  await audit(c.env,'update','media_asset',id);
  return c.json({ok:true});
});

mediaRoutes.delete('/:id', requireAdmin, async(c)=>{
  const id=c.req.param('id');
  const asset=await c.env.DB.prepare('SELECT id,r2_key FROM media_assets WHERE id=? LIMIT 1').bind(id).first<{id:string;r2_key:string}>();
  if(!asset)return c.json({error:'not_found'},404);
  const usage=await c.env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM events WHERE hero_media_id=? OR logo_media_id=? OR theme_json LIKE '%' || ? || '%') +
      (SELECT COUNT(*) FROM event_artists WHERE media_id=?) +
      (SELECT COUNT(*) FROM team_members WHERE media_id=?) +
      (SELECT COUNT(*) FROM freelancer_applications WHERE resume_media_id=?) +
      (SELECT COUNT(*) FROM page_localizations WHERE og_media_id=?) total
  `).bind(id,id,id,id,id,id,id).first<{total:number}>();
  if((usage?.total||0)>0)return c.json({error:'media_in_use',usageCount:usage?.total||0},409);
  await c.env.MEDIA.delete(asset.r2_key);
  await c.env.DB.prepare('DELETE FROM media_assets WHERE id=?').bind(id).run();
  await audit(c.env,'delete','media_asset',id);
  return c.json({ok:true});
});

mediaRoutes.get('/:id',async(c)=>{
  const id=c.req.param('id');
  const asset=await c.env.DB.prepare('SELECT r2_key,mime_type FROM media_assets WHERE id=? LIMIT 1').bind(id).first<{r2_key:string;mime_type:string}>();
  if(!asset) return c.json({error:'not_found'},404);
  const object=await c.env.MEDIA.get(asset.r2_key);
  if(!object) return c.json({error:'not_found'},404);
  const headers=new Headers();
  object.writeHttpMetadata(headers);
  headers.set('content-type',asset.mime_type);
  headers.set('cache-control','public, max-age=86400, s-maxage=604800');
  headers.set('x-content-type-options','nosniff');
  return new Response(object.body,{headers});
});
