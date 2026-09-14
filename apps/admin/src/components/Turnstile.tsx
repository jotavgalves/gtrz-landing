import { useEffect } from 'react';

export function Turnstile({action='admin-login'}:{action?:string}){
  const siteKey=import.meta.env.VITE_TURNSTILE_SITE_KEY as string|undefined;
  useEffect(()=>{
    if(!siteKey||document.querySelector('script[data-gtrz-turnstile]'))return;
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async=true;script.defer=true;script.dataset.gtrzTurnstile='1';
    document.head.appendChild(script);
  },[siteKey]);
  if(!siteKey)return null;
  return <div className="turnstile-admin"><div className="cf-turnstile" data-sitekey={siteKey} data-action={action} data-theme="dark"/></div>;
}
