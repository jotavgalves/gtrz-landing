import { driveRedirectUri, saveDriveRefreshToken, verifyDriveState } from '../../../../src/google-drive.js';

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) return Response.redirect(new URL('/admin/?drive=denied', request.url).toString(), 302);
    if (!code || !(await verifyDriveState(env, request, state))) {
      return new Response('Autorização do Google Drive inválida ou expirada.', { status:400 });
    }
    if (!env.GOOGLE_DRIVE_CLIENT_ID || !env.GOOGLE_DRIVE_CLIENT_SECRET) {
      return new Response('Credenciais OAuth do Google Drive não configuradas no Cloudflare.', { status:503 });
    }
    if (!env.DB) {
      return new Response('D1 binding DB não configurado. Vincule seu banco D1 ao projeto usando o nome DB e faça um novo deploy.', { status:503 });
    }
    if (!env.SESSION_SECRET) {
      return new Response('SESSION_SECRET não configurado. Crie esse secret no Cloudflare e faça um novo deploy.', { status:503 });
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
  } catch (error) {
    console.error('Google Drive OAuth callback failed', error);
    const message = String(error?.message || error || 'Erro desconhecido');
    return new Response(`Falha ao concluir a conexão com o Google Drive: ${message}`, {
      status:503,
      headers:{ 'content-type':'text/plain; charset=utf-8', 'cache-control':'no-store' }
    });
  }
}
