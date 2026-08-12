import { json, safePasswordEqual } from '../../../src/functions-lib.js';
import {
  adminSessionCookie,
  clearLoginFailures,
  createAdminSession,
  getLoginGuard,
  LOGIN_FAILURE_LIMIT,
  LOGIN_LOCK_SECONDS,
  recordLoginFailure,
  validateTurnstile
} from '../../../src/security.js';

function lockResponse(retryAfter) {
  const seconds = Math.max(1, Number(retryAfter) || LOGIN_LOCK_SECONDS);
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return json({
    ok:false,
    locked:true,
    retryAfter:seconds,
    error:`Login bloqueado após ${LOGIN_FAILURE_LIMIT} tentativas inválidas. Tente novamente em ${minutes} minuto${minutes === 1 ? '' : 's'}.`
  }, 429, { 'retry-after':String(seconds) });
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET || !env.DB) {
    return json({ ok:false, error:'Configure ADMIN_PASSWORD, SESSION_SECRET e o binding DB no Cloudflare.' }, 503);
  }

  let guard;
  try {
    guard = await getLoginGuard(request, env);
  } catch (error) {
    return json({ ok:false, error:String(error?.message || error) }, 503);
  }
  if (!guard.allowed) return lockResponse(guard.retryAfter);

  let body;
  try { body = await request.json(); }
  catch { return json({ ok:false, error:'JSON inválido' }, 400); }

  const turnstile = await validateTurnstile(request, env, body?.turnstileToken);
  if (!turnstile.ok) {
    return json({ ok:false, error:turnstile.error || 'Falha na verificação de segurança.' }, turnstile.configurationError ? 503 : 400);
  }

  if (!safePasswordEqual(body?.password, env.ADMIN_PASSWORD)) {
    const failure = await recordLoginFailure(request, env);
    if (failure.locked) return lockResponse(failure.retryAfter);
    return json({
      ok:false,
      attemptsRemaining:failure.attemptsRemaining,
      error:`Senha inválida. Restam ${failure.attemptsRemaining} tentativa${failure.attemptsRemaining === 1 ? '' : 's'} antes do bloqueio de 30 minutos.`
    }, 401);
  }

  await clearLoginFailures(request, env);
  const token = await createAdminSession(env);
  return json({ ok:true, expiresIn:12 * 60 * 60 }, 200, { 'set-cookie':adminSessionCookie(request, token) });
}
