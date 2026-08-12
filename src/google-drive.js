const enc = new TextEncoder(), dec = new TextDecoder();
let tokenCache = { value:'', expires:0 };

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function unb64url(value) {
  const pad = '='.repeat((4 - value.length % 4) % 4);
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function aesKeyFromSecret(secret) {
  if (!secret) throw new Error('Chave de criptografia do Google Drive não configurada');
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', digest, { name:'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function primaryEncryptionSecret(env) {
  return env.DRIVE_ENCRYPTION_KEY || env.SESSION_SECRET || '';
}

async function hmac(env, value) {
  if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET não configurado');
  const key = await crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(value))));
}

export function driveRedirectUri(request) {
  return new URL('/api/admin/google/callback', request.url).toString();
}

export async function makeDriveState(env, request) {
  const payload = b64url(enc.encode(JSON.stringify({ exp:Date.now() + 600000, origin:new URL(request.url).origin, nonce:crypto.randomUUID() })));
  return `${payload}.${await hmac(env, payload)}`;
}

export async function verifyDriveState(env, request, state) {
  try {
    const [payload, sig] = String(state || '').split('.');
    if (!payload || !sig || sig !== await hmac(env, payload)) return false;
    const data = JSON.parse(dec.decode(unb64url(payload)));
    return Number(data.exp) > Date.now() && data.origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function ensureDriveAuth(env) {
  if (!env.DB) throw new Error('D1 binding DB não configurado');
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS drive_auth (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    refresh_token_enc TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

async function encryptRefreshToken(secret, token) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKeyFromSecret(secret);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, enc.encode(token)));
  return `${b64url(iv)}.${b64url(cipher)}`;
}

async function decryptRefreshToken(secret, packed) {
  const [ivPart, cipherPart] = String(packed).split('.');
  if (!ivPart || !cipherPart) throw new Error('Token criptografado inválido');
  const key = await aesKeyFromSecret(secret);
  const plain = await crypto.subtle.decrypt({ name:'AES-GCM', iv:unb64url(ivPart) }, key, unb64url(cipherPart));
  return dec.decode(plain);
}

export async function saveDriveRefreshToken(env, token) {
  await ensureDriveAuth(env);
  const secret = primaryEncryptionSecret(env);
  if (!secret) throw new Error('Configure DRIVE_ENCRYPTION_KEY ou SESSION_SECRET');
  const packed = await encryptRefreshToken(secret, token);
  await env.DB.prepare(`INSERT INTO drive_auth (id,refresh_token_enc,updated_at)
    VALUES (1,?,CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET refresh_token_enc=excluded.refresh_token_enc, updated_at=CURRENT_TIMESTAMP`)
    .bind(packed).run();
}

export async function loadDriveRefreshToken(env) {
  await ensureDriveAuth(env);
  const row = await env.DB.prepare('SELECT refresh_token_enc FROM drive_auth WHERE id=1').first();
  if (!row?.refresh_token_enc) return '';

  const candidates = [];
  if (env.DRIVE_ENCRYPTION_KEY) candidates.push({ secret:env.DRIVE_ENCRYPTION_KEY, primary:true });
  if (env.SESSION_SECRET && env.SESSION_SECRET !== env.DRIVE_ENCRYPTION_KEY) candidates.push({ secret:env.SESSION_SECRET, primary:!env.DRIVE_ENCRYPTION_KEY });
  if (!candidates.length) throw new Error('Chave de criptografia do Google Drive não configurada');

  let lastError;
  for (const candidate of candidates) {
    try {
      const token = await decryptRefreshToken(candidate.secret, row.refresh_token_enc);
      if (!candidate.primary && env.DRIVE_ENCRYPTION_KEY) await saveDriveRefreshToken(env, token);
      return token;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Não foi possível descriptografar o token do Google Drive');
}

export async function driveConnected(env) {
  try { return Boolean(await loadDriveRefreshToken(env)); }
  catch { return false; }
}

export async function getDriveAccessToken(env) {
  if (tokenCache.value && tokenCache.expires > Date.now() + 60000) return tokenCache.value;
  if (!env.GOOGLE_DRIVE_CLIENT_ID || !env.GOOGLE_DRIVE_CLIENT_SECRET) throw new Error('Credenciais OAuth do Google Drive não configuradas');
  const refresh = await loadDriveRefreshToken(env);
  if (!refresh) throw new Error('Google Drive não conectado. Abra o painel e clique em Conectar Google Drive.');

  const body = new URLSearchParams({
    client_id:env.GOOGLE_DRIVE_CLIENT_ID,
    client_secret:env.GOOGLE_DRIVE_CLIENT_SECRET,
    refresh_token:refresh,
    grant_type:'refresh_token'
  });
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST',
    headers:{ 'content-type':'application/x-www-form-urlencoded' },
    body
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error(d.error_description || d.error || 'Falha ao renovar acesso ao Google Drive');
  tokenCache = { value:d.access_token, expires:Date.now() + (Number(d.expires_in) || 3600) * 1000 };
  return d.access_token;
}

export async function uploadDriveFile(env, file, name) {
  const folder = String(env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
  if (!folder) throw new Error('GOOGLE_DRIVE_FOLDER_ID não configurado no Cloudflare');
  const token = await getDriveAccessToken(env);
  const boundary = `rumba_${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name, parents:[folder] });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
    file,
    `\r\n--${boundary}--`
  ]);
  const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,size', {
    method:'POST',
    headers:{ authorization:`Bearer ${token}`, 'content-type':`multipart/related; boundary=${boundary}` },
    body
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.id) throw new Error(d.error?.message || 'Falha ao enviar imagem ao Google Drive');
  return d;
}

export async function fetchDriveFile(env, id) {
  const token = await getDriveAccessToken(env);
  return fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`, {
    headers:{ authorization:`Bearer ${token}` }
  });
}
