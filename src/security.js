const encoder = new TextEncoder();

export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;
export const LOGIN_FAILURE_LIMIT = 3;
export const LOGIN_LOCK_SECONDS = 30 * 60;

function b64url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

function cookies(request) {
  const header = request.headers.get('cookie') || '';
  return Object.fromEntries(header.split(';').map(v => v.trim()).filter(Boolean).map(v => {
    const i = v.indexOf('=');
    return i === -1 ? [v, ''] : [v.slice(0, i), decodeURIComponent(v.slice(i + 1))];
  }));
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

async function ensureAdminSecuritySchema(env) {
  if (!env.DB) throw new Error('D1 binding DB não configurado');
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    revoked_at INTEGER
  )`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_login_attempts (
    ip_hash TEXT PRIMARY KEY,
    failures INTEGER NOT NULL DEFAULT 0,
    last_failed_at INTEGER NOT NULL,
    locked_until INTEGER
  )`).run();
}

async function clientIpHash(request, env) {
  if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET não configurado');
  const ip = request.headers.get('CF-Connecting-IP') || (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() || 'unknown';
  return hmac(env.SESSION_SECRET, `login-ip:${ip}`);
}

export async function createAdminSession(env) {
  if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET não configurado');
  await ensureAdminSecuritySchema(env);
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = b64url(bytes);
  const tokenHash = await hmac(env.SESSION_SECRET, `session:${token}`);
  const now = nowSeconds();
  const expires = now + ADMIN_SESSION_TTL_SECONDS;
  await env.DB.prepare('INSERT INTO admin_sessions (token_hash, created_at, expires_at, revoked_at) VALUES (?, ?, ?, NULL)')
    .bind(tokenHash, now, expires).run();
  await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?)')
    .bind(now - 86400, now - 86400).run().catch(() => {});
  return token;
}

export function adminSessionCookie(request, token, maxAge = ADMIN_SESSION_TTL_SECONDS) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `lr_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.max(0, Number(maxAge) || 0)}${secure}; Priority=High`;
}

export async function verifyAdmin(request, env) {
  if (!env.DB || !env.SESSION_SECRET) return false;
  const token = cookies(request).lr_admin;
  if (!token) return false;
  try {
    await ensureAdminSecuritySchema(env);
    const tokenHash = await hmac(env.SESSION_SECRET, `session:${token}`);
    const row = await env.DB.prepare('SELECT expires_at, revoked_at FROM admin_sessions WHERE token_hash = ?').bind(tokenHash).first();
    if (!row || row.revoked_at != null || Number(row.expires_at) <= nowSeconds()) return false;
    return true;
  } catch {
    return false;
  }
}

export async function revokeAdminSession(request, env) {
  if (!env.DB || !env.SESSION_SECRET) return;
  const token = cookies(request).lr_admin;
  if (!token) return;
  await ensureAdminSecuritySchema(env);
  const tokenHash = await hmac(env.SESSION_SECRET, `session:${token}`);
  await env.DB.prepare('UPDATE admin_sessions SET revoked_at = ? WHERE token_hash = ?').bind(nowSeconds(), tokenHash).run();
}

export async function getLoginGuard(request, env) {
  await ensureAdminSecuritySchema(env);
  const ipHash = await clientIpHash(request, env);
  const now = nowSeconds();
  const row = await env.DB.prepare('SELECT failures, last_failed_at, locked_until FROM admin_login_attempts WHERE ip_hash = ?').bind(ipHash).first();
  if (!row) return { allowed:true, ipHash, failures:0, attemptsRemaining:LOGIN_FAILURE_LIMIT };
  const lockedUntil = Number(row.locked_until) || 0;
  if (lockedUntil > now) return { allowed:false, ipHash, failures:Number(row.failures) || LOGIN_FAILURE_LIMIT, retryAfter:lockedUntil - now };
  if (now - Number(row.last_failed_at || 0) >= LOGIN_LOCK_SECONDS) {
    await env.DB.prepare('DELETE FROM admin_login_attempts WHERE ip_hash = ?').bind(ipHash).run();
    return { allowed:true, ipHash, failures:0, attemptsRemaining:LOGIN_FAILURE_LIMIT };
  }
  const failures = Math.max(0, Number(row.failures) || 0);
  return { allowed:true, ipHash, failures, attemptsRemaining:Math.max(0, LOGIN_FAILURE_LIMIT - failures) };
}

export async function recordLoginFailure(request, env) {
  const state = await getLoginGuard(request, env);
  if (!state.allowed) return { locked:true, retryAfter:state.retryAfter, attemptsRemaining:0 };
  const now = nowSeconds();
  const failures = state.failures + 1;
  const locked = failures >= LOGIN_FAILURE_LIMIT;
  const lockedUntil = locked ? now + LOGIN_LOCK_SECONDS : null;
  await env.DB.prepare(`INSERT INTO admin_login_attempts (ip_hash, failures, last_failed_at, locked_until)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(ip_hash) DO UPDATE SET failures=excluded.failures, last_failed_at=excluded.last_failed_at, locked_until=excluded.locked_until`)
    .bind(state.ipHash, failures, now, lockedUntil).run();
  return { locked, retryAfter:locked ? LOGIN_LOCK_SECONDS : 0, attemptsRemaining:Math.max(0, LOGIN_FAILURE_LIMIT - failures) };
}

export async function clearLoginFailures(request, env) {
  await ensureAdminSecuritySchema(env);
  const ipHash = await clientIpHash(request, env);
  await env.DB.prepare('DELETE FROM admin_login_attempts WHERE ip_hash = ?').bind(ipHash).run();
}

export async function validateTurnstile(request, env, token) {
  const hasSite = Boolean(env.TURNSTILE_SITE_KEY);
  const hasSecret = Boolean(env.TURNSTILE_SECRET_KEY);
  if (hasSite !== hasSecret) return { ok:false, configurationError:true, error:'TURNSTILE_SITE_KEY e TURNSTILE_SECRET_KEY precisam ser configurados juntos.' };
  if (!hasSecret) return { ok:true, enabled:false };
  if (!token) return { ok:false, enabled:true, error:'Conclua a verificação de segurança.' };

  const body = new FormData();
  body.set('secret', env.TURNSTILE_SECRET_KEY);
  body.set('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) body.set('remoteip', ip);
  body.set('idempotency_key', crypto.randomUUID());

  let response;
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method:'POST', body });
  } catch {
    return { ok:false, enabled:true, error:'Não foi possível validar o Turnstile agora.' };
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) return { ok:false, enabled:true, error:'Verificação de segurança inválida ou expirada.' };
  const requestHost = new URL(request.url).hostname;
  if (data.hostname && data.hostname !== requestHost) return { ok:false, enabled:true, error:'Verificação de segurança recusada para este domínio.' };
  return { ok:true, enabled:true };
}

async function ensureMediaSchema(env) {
  if (!env.DB) throw new Error('D1 binding DB não configurado');
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS media_assets (
    public_id TEXT PRIMARY KEY,
    drive_file_id TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  )`).run();
}

export async function createMediaPublicId(env, driveFileId) {
  await ensureMediaSchema(env);
  const driveId = String(driveFileId || '').trim();
  if (!driveId) throw new Error('ID de mídia inválido');
  const existing = await env.DB.prepare('SELECT public_id FROM media_assets WHERE drive_file_id = ?').bind(driveId).first();
  if (existing?.public_id) return existing.public_id;
  for (let i = 0; i < 3; i++) {
    const publicId = b64url(crypto.getRandomValues(new Uint8Array(24)));
    try {
      await env.DB.prepare('INSERT INTO media_assets (public_id, drive_file_id, created_at) VALUES (?, ?, ?)').bind(publicId, driveId, nowSeconds()).run();
      return publicId;
    } catch (error) {
      const retryExisting = await env.DB.prepare('SELECT public_id FROM media_assets WHERE drive_file_id = ?').bind(driveId).first();
      if (retryExisting?.public_id) return retryExisting.public_id;
      if (i === 2) throw error;
    }
  }
  throw new Error('Falha ao criar identificador público da mídia');
}

export async function resolveMediaPublicId(env, publicId) {
  await ensureMediaSchema(env);
  const row = await env.DB.prepare('SELECT drive_file_id FROM media_assets WHERE public_id = ?').bind(String(publicId || '')).first();
  return row?.drive_file_id || '';
}

async function maskMediaValue(env, value) {
  if (typeof value === 'string') {
    const match = value.match(/^(?:https?:\/\/[^/]+)?\/media\/drive\/([A-Za-z0-9_-]+)(?:[?#].*)?$/i);
    if (!match) return value;
    const publicId = await createMediaPublicId(env, match[1]);
    return `/media/${publicId}`;
  }
  if (Array.isArray(value)) return Promise.all(value.map(item => maskMediaValue(env, item)));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = await maskMediaValue(env, item);
    return out;
  }
  return value;
}

export async function maskConfigMedia(env, config) {
  if (!env.DB || !config || typeof config !== 'object') return config;
  return maskMediaValue(env, config);
}
