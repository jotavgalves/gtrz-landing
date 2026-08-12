import { json, verifyAdmin } from '../../../src/functions-lib.js';
import { uploadDriveFile } from '../../../src/google-drive.js';

export async function onRequestPost({ request, env }) {
  if (!(await verifyAdmin(request, env))) return json({ ok:false, error:'Não autorizado' }, 401);

  const form = await request.formData();
  const file = form.get('file');
  const slot = String(form.get('slot') || 'upload').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();

  if (!(file instanceof File)) return json({ ok:false, error:'Arquivo não enviado' }, 400);
  if (!file.type.startsWith('image/')) return json({ ok:false, error:'Envie uma imagem' }, 400);
  if (file.size > 8 * 1024 * 1024) return json({ ok:false, error:'Imagem maior que 8 MB' }, 413);

  const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const name = `${slot}-${Date.now()}-${crypto.randomUUID()}.${ext}`;

  try {
    const uploaded = await uploadDriveFile(env, file, name);
    return json({ ok:true, url:`/media/drive/${uploaded.id}`, provider:'google-drive', fileId:uploaded.id });
  } catch (error) {
    return json({ ok:false, error:error?.message || 'Falha ao enviar imagem para o Google Drive' }, 503);
  }
}
