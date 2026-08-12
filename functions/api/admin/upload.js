import { json } from '../../../src/functions-lib.js';
import { uploadDriveFile } from '../../../src/google-drive.js';
import { createMediaPublicId, verifyAdmin } from '../../../src/security.js';

const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp']
]);

async function hasValidSignature(file) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (file.type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === 'image/png') return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (file.type === 'image/webp') {
    const text = String.fromCharCode(...bytes.slice(0, 12));
    return text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP';
  }
  return false;
}

export async function onRequestPost({ request, env }) {
  if (!(await verifyAdmin(request, env))) return json({ ok:false, error:'Não autorizado' }, 401);

  const form = await request.formData();
  const file = form.get('file');
  const slot = String(form.get('slot') || 'upload').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();

  if (!(file instanceof File)) return json({ ok:false, error:'Arquivo não enviado' }, 400);
  if (!ALLOWED.has(file.type)) return json({ ok:false, error:'Envie somente JPEG, PNG ou WebP.' }, 400);
  if (file.size > 8 * 1024 * 1024) return json({ ok:false, error:'Imagem maior que 8 MB' }, 413);
  if (!(await hasValidSignature(file))) return json({ ok:false, error:'O conteúdo do arquivo não corresponde a uma imagem válida.' }, 400);

  const ext = ALLOWED.get(file.type);
  const name = `${slot}-${Date.now()}-${crypto.randomUUID()}.${ext}`;

  try {
    const uploaded = await uploadDriveFile(env, file, name);
    const publicId = await createMediaPublicId(env, uploaded.id);
    return json({ ok:true, url:`/media/${publicId}` });
  } catch (error) {
    return json({ ok:false, error:error?.message || 'Falha ao enviar imagem' }, 503);
  }
}
