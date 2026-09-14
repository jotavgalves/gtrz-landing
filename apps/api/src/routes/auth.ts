import { Hono } from 'hono';
import type { Env } from '../env';
import { audit } from '../services/audit';
import {
  checkLoginLock,
  clearLoginFailures,
  clientHash,
  createSession,
  readAdminToken,
  registerLoginFailure,
  requireAdmin,
  revokeSession,
  safeSecretEqual,
  verifyTurnstile
} from '../security';

export const authRoutes = new Hono<{ Bindings: Env }>();

function sessionCookie(c:any, raw:string, maxAge:number){
  const secure = new URL(c.req.url).protocol === 'https:' ? '; Secure' : '';
  return `gtrz_admin=${raw}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=${maxAge}; Priority=High`;
}

authRoutes.post('/login', async(c)=>{
  if(!c.env.ADMIN_PASSWORD || !c.env.SESSION_SECRET) return c.json({error:'admin_not_configured'},503);
  const body:{password?:string;turnstileToken?:string}=await c.req.json<{password?:string;turnstileToken?:string}>().catch((): {password?:string;turnstileToken?:string}=>({}));
  const actorHash=await clientHash(c,'admin-login');
  const lock=await checkLoginLock(c.env,actorHash);
  if(lock.locked){
    c.header('retry-after',String(lock.retryAfterSeconds));
    return c.json({error:'login_locked',retryAfterSeconds:lock.retryAfterSeconds},429);
  }
  if(!(await verifyTurnstile(c,body.turnstileToken))) return c.json({error:'challenge_failed'},400);
  const valid=Boolean(body.password) && await safeSecretEqual(body.password||'',c.env.ADMIN_PASSWORD);
  if(!valid){
    const failed=await registerLoginFailure(c.env,actorHash);
    await audit(c.env,'login_failed','admin_session',undefined,{locked:Boolean(failed.lockedUntil)});
    return c.json({error:'invalid_credentials'},401);
  }
  await clearLoginFailures(c.env,actorHash);
  const session=await createSession(c.env);
  c.header('set-cookie',sessionCookie(c,session.raw,43200));
  await audit(c.env,'login','admin_session');
  return c.json({ok:true,expiresAt:session.expiresAt});
});

authRoutes.get('/me',requireAdmin,async(c)=>c.json({ok:true}));

authRoutes.post('/logout',async(c)=>{
  await revokeSession(c.env,readAdminToken(c));
  c.header('set-cookie',sessionCookie(c,'',0));
  await audit(c.env,'logout','admin_session');
  return c.json({ok:true});
});
