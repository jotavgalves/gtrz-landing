import { driveRedirectUri, saveDriveRefreshToken, verifyDriveState } from '../../../../src/google-drive.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) return Response.redirect(new URL('/admin/?drive=denied', request.url).toString(), 302);
  if (!code || !(await verifyDriveState(env, request, state))) {
    return new Response('Autorização do Google Drive inválida ou expirada.', { status:400 });
  }
  if (!env.GOOGLE_DRIVE_CLIENT_ID || !env.GOOGLE_DRIVE_CLIENT_SECRET) {
    return new Response('Credenciais OAuth do Google Drive não configuradas.', { status:503 });
  }

  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_DRIVE_CLIENT_ID,
    client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET,
    redirect_uri: driveRedirectUri(request),
    grant_type: 'authorization_code'
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST',
    headers:{ 'content-type':'application/x-www-form-urlencoded' },
    body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.refresh_token) {
    return new Response(data.error_description || data.error || 'Google não retornou refresh token. Tente conectar novamente.', { status:502 });
  }

  await saveDriveRefreshToken(env, data.refresh_token);
  return Response.redirect(new URL('/admin/?drive=connected', request.url).toString(), 302);
}
