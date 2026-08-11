import { getConfig, json, saveConfig, verifyAdmin } from '../../../src/functions-lib.js';
export async function onRequestGet({ request, env }) {
  if (!(await verifyAdmin(request, env))) return json({ ok:false, error:'Não autorizado' }, 401);
  try { return json({ ok:true, config:await getConfig(env) }); }
  catch (e) { return json({ ok:false, error:String(e?.message || e) }, 503); }
}
export async function onRequestPut({ request, env }) {
  if (!(await verifyAdmin(request, env))) return json({ ok:false, error:'Não autorizado' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ ok:false, error:'JSON inválido' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ ok:false, error:'Configuração inválida' }, 400);
  try { return json({ ok:true, config:await saveConfig(env, body) }); }
  catch (e) { return json({ ok:false, error:String(e?.message || e) }, 503); }
}