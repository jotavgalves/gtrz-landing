import { json, makeSession, safePasswordEqual, sessionCookie } from '../../../src/functions-lib.js';
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return json({ ok:false, error:'Configure ADMIN_PASSWORD e SESSION_SECRET no Cloudflare.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ ok:false, error:'JSON inválido' }, 400); }
  if (!safePasswordEqual(body?.password, env.ADMIN_PASSWORD)) return json({ ok:false, error:'Senha inválida' }, 401);
  const token = await makeSession(env);
  return json({ ok:true }, 200, { 'set-cookie': sessionCookie(request, token) });
}