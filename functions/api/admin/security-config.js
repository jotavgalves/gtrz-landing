import { json } from '../../../src/functions-lib.js';

export async function onRequestGet({ env }) {
  const hasSite = Boolean(env.TURNSTILE_SITE_KEY);
  const hasSecret = Boolean(env.TURNSTILE_SECRET_KEY);
  return json({
    ok:true,
    turnstile:{
      enabled:hasSite && hasSecret,
      siteKey:hasSite && hasSecret ? env.TURNSTILE_SITE_KEY : '',
      misconfigured:hasSite !== hasSecret
    },
    sessionHours:12,
    maxFailedAttempts:3,
    lockMinutes:30
  }, 200, { 'cache-control':'no-store' });
}
