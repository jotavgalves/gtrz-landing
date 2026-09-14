import type { Context, Next } from 'hono';
import type { Env } from './env';

const encoder = new TextEncoder();
const LOGIN_MAX_FAILURES = 3;
const LOGIN_LOCK_MS = 30 * 60 * 1000;
const FORM_WINDOW_MS = 60 * 60 * 1000;
const FORM_MAX_REQUESTS = 10;

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

export async function safeSecretEqual(a: string, b: string) {
  const [left, right] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i]! ^ right[i]!;
  return diff === 0;
}

function clientAddress(c: Context<{ Bindings: Env }>) {
  return c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function clientHash(c: Context<{ Bindings: Env }>, scope: string) {
  if (!c.env.SESSION_SECRET) throw new Error('SESSION_SECRET missing');
  const address = clientAddress(c);
  const ua = (c.req.header('user-agent') || '').slice(0, 180);
  return hmac(c.env.SESSION_SECRET, `${scope}:${address}:${ua}`);
}

export async function checkLoginLock(env: Env, actorHash: string) {
  const row = await env.DB.prepare('SELECT failures, locked_until FROM login_attempts WHERE actor_hash = ? LIMIT 1')
    .bind(actorHash).first<{ failures: number; locked_until: string | null }>();
  if (!row?.locked_until) return { locked: false, retryAfterSeconds: 0 };
  const retry = Math.ceil((Date.parse(row.locked_until) - Date.now()) / 1000);
  return { locked: retry > 0, retryAfterSeconds: Math.max(0, retry) };
}

export async function registerLoginFailure(env: Env, actorHash: string) {
  const row = await env.DB.prepare('SELECT failures FROM login_attempts WHERE actor_hash = ? LIMIT 1')
    .bind(actorHash).first<{ failures: number }>();
  const failures = (row?.failures || 0) + 1;
  const lockedUntil = failures >= LOGIN_MAX_FAILURES ? new Date(Date.now() + LOGIN_LOCK_MS).toISOString() : null;
  await env.DB.prepare(`
    INSERT INTO login_attempts(actor_hash, failures, locked_until, updated_at)
    VALUES(?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(actor_hash) DO UPDATE SET failures=excluded.failures, locked_until=excluded.locked_until, updated_at=CURRENT_TIMESTAMP
  `).bind(actorHash, failures, lockedUntil).run();
  return { failures, lockedUntil };
}

export async function clearLoginFailures(env: Env, actorHash: string) {
  await env.DB.prepare('DELETE FROM login_attempts WHERE actor_hash = ?').bind(actorHash).run();
}

export async function consumePublicFormQuota(c: Context<{ Bindings: Env }>, scope: string) {
  const keyHash = await clientHash(c, `form:${scope}`);
  const row = await c.env.DB.prepare('SELECT window_started_at, request_count FROM form_rate_limits WHERE key_hash = ? LIMIT 1')
    .bind(keyHash).first<{ window_started_at: string; request_count: number }>();
  const now = Date.now();
  if (!row || now - Date.parse(row.window_started_at) >= FORM_WINDOW_MS) {
    await c.env.DB.prepare(`
      INSERT INTO form_rate_limits(key_hash, window_started_at, request_count, updated_at)
      VALUES(?,CURRENT_TIMESTAMP,1,CURRENT_TIMESTAMP)
      ON CONFLICT(key_hash) DO UPDATE SET window_started_at=CURRENT_TIMESTAMP, request_count=1, updated_at=CURRENT_TIMESTAMP
    `).bind(keyHash).run();
    return true;
  }
  if (row.request_count >= FORM_MAX_REQUESTS) return false;
  await c.env.DB.prepare('UPDATE form_rate_limits SET request_count=request_count+1, updated_at=CURRENT_TIMESTAMP WHERE key_hash=?')
    .bind(keyHash).run();
  return true;
}

export async function verifyTurnstile(c: Context<{ Bindings: Env }>, token?: string) {
  if (!c.env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  const body = new URLSearchParams();
  body.set('secret', c.env.TURNSTILE_SECRET_KEY);
  body.set('response', token);
  const ip = clientAddress(c);
  if (ip !== 'unknown') body.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) return false;
  const result = await response.json<{ success?: boolean }>().catch(() => ({ success: false }));
  return result.success === true;
}

export async function createSession(env: Env) {
  if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET missing');
  const raw = crypto.randomUUID() + crypto.randomUUID();
  const hash = await hmac(env.SESSION_SECRET, raw);
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare('INSERT INTO admin_sessions (id, token_hash, expires_at) VALUES (?, ?, ?)')
    .bind(crypto.randomUUID(), hash, expiresAt).run();
  return { raw, expiresAt };
}

export function readAdminToken(c: Context<{ Bindings: Env }>) {
  const cookie = c.req.header('cookie') || '';
  return cookie.split(';').map((v) => v.trim()).find((v) => v.startsWith('gtrz_admin='))?.slice('gtrz_admin='.length);
}

export async function revokeSession(env: Env, rawToken?: string) {
  if (!env.SESSION_SECRET || !rawToken) return;
  const hash = await hmac(env.SESSION_SECRET, rawToken);
  await env.DB.prepare('UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?').bind(hash).run();
}

export async function requireAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const secret = c.env.SESSION_SECRET;
  if (!secret) return c.json({ error: 'admin_not_configured' }, 503);
  const token = readAdminToken(c);
  if (!token) return c.json({ error: 'unauthorized' }, 401);
  const hash = await hmac(secret, token);
  const row = await c.env.DB.prepare("SELECT id FROM admin_sessions WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > datetime('now') LIMIT 1").bind(hash).first();
  if (!row) return c.json({ error: 'unauthorized' }, 401);
  await next();
}
