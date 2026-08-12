import { json } from '../../../../src/functions-lib.js';
import { driveRedirectUri, makeDriveState } from '../../../../src/google-drive.js';
import { verifyAdmin } from '../../../../src/security.js';

export async function onRequestGet({ request, env }) {
  if (!(await verifyAdmin(request, env))) return json({ ok:false, error:'Não autorizado' }, 401);
  if (!env.GOOGLE_DRIVE_CLIENT_ID || !env.GOOGLE_DRIVE_CLIENT_SECRET) {
    return json({ ok:false, error:'Configure GOOGLE_DRIVE_CLIENT_ID e GOOGLE_DRIVE_CLIENT_SECRET no Cloudflare.' }, 503);
  }
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.GOOGLE_DRIVE_CLIENT_ID);
  url.searchParams.set('redirect_uri', driveRedirectUri(request));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/drive');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', await makeDriveState(env, request));
  return Response.redirect(url.toString(), 302);
}
