import { Hono } from 'hono';
import type { Env } from '../env';
import { requireAdmin } from '../security';

export const mediaRoutes = new Hono<{ Bindings: Env }>();
const MAX_BYTES = 8 * 1024 * 1024;
const allowed = new Map([
  ['image/jpeg','jpg'],
  ['image/png','png'],
  ['image/webp','webp']
]);

function validMagic(type:string, bytes:Uint8Array){
  if(type==='image/jpeg') return bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  if(type==='image/png') return bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47;
  if(type==='image/webp') return String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  return false;
}

mediaRoutes.get('/', requireAdmin, async(c)=>{
  const rows=await c.env.DB.prepare('SELECT id,file_name,mime_type,size_bytes,width,height,alt_pt,alt_es,created_at FROM media_assets ORDER BY created_at DESC LIMIT 500').all();
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
  return c.json({id,url:`/api/media/${id}`,fileName:file.name,mimeType:file.type,sizeBytes:file.size},201);
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
