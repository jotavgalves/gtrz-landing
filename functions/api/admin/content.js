import { getConfig, json, saveConfig } from '../../../src/functions-lib.js';
import { maskConfigMedia, verifyAdmin } from '../../../src/security.js';

export async function onRequestGet({ request, env }) {
  if (!(await verifyAdmin(request, env))) return json({ ok:false, error:'Não autorizado' }, 401);
  try {
    const config = await maskConfigMedia(env, await getConfig(env));
    return json({ ok:true, config });
  } catch (e) {
    return json({ ok:false, error:String(e?.message || e) }, 503);
  }
}

export async function onRequestPut({ request, env }) {
  if (!(await verifyAdmin(request, env))) return json({ ok:false, error:'Não autorizado' }, 401);
  let body;
  try { body = await request.json(); }
  catch { return json({ ok:false, error:'JSON inválido' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ ok:false, error:'Configuração inválida' }, 400);
  try {
    const sanitized = await maskConfigMedia(env, body);
    const config = await saveConfig(env, sanitized);
    return json({ ok:true, config:await maskConfigMedia(env, config) });
  } catch (e) {
    return json({ ok:false, error:String(e?.message || e) }, 503);
  }
}
