import { json, verifyAdmin } from '../../../src/functions-lib.js';
export async function onRequestPost({ request, env }) {
  if (!(await verifyAdmin(request, env))) return json({ ok:false, error:'Não autorizado' }, 401);
  if (!env.MEDIA) return json({ ok:false, error:'Binding R2 MEDIA não configurado. Você ainda pode usar uma URL de imagem.' }, 503);
  const form = await request.formData();
  const file = form.get('file');
  const slot = String(form.get('slot') || 'upload').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  if (!(file instanceof File)) return json({ ok:false, error:'Arquivo não enviado' }, 400);
  if (!file.type.startsWith('image/')) return json({ ok:false, error:'Envie uma imagem' }, 400);
  if (file.size > 8 * 1024 * 1024) return json({ ok:false, error:'Imagem maior que 8 MB' }, 413);
  const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const key = `djs/${slot}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key, file.stream(), { httpMetadata:{ contentType:file.type }, customMetadata:{ originalName:file.name } });
  return json({ ok:true, url:`/media/${key}` });
}