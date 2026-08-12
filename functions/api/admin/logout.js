import { json } from '../../../src/functions-lib.js';
import { adminSessionCookie, revokeAdminSession } from '../../../src/security.js';

export async function onRequestPost({ request, env }) {
  try { await revokeAdminSession(request, env); } catch {}
  return json({ ok:true }, 200, { 'set-cookie':adminSessionCookie(request, '', 0) });
}
