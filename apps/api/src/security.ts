import type { Context, Next } from 'hono';
import type { Env } from './env';

const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
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

export async function requireAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const secret = c.env.SESSION_SECRET;
  if (!secret) return c.json({ error: 'admin_not_configured' }, 503);
  const cookie = c.req.header('cookie') || '';
  const token = cookie.split(';').map((v) => v.trim()).find((v) => v.startsWith('gtrz_admin='))?.slice('gtrz_admin='.length);
  if (!token) return c.json({ error: 'unauthorized' }, 401);
  const hash = await hmac(secret, token);
  const row = await c.env.DB.prepare('SELECT id FROM admin_sessions WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > datetime(\'now\') LIMIT 1').bind(hash).first();
  if (!row) return c.json({ error: 'unauthorized' }, 401);
  await next();
}
