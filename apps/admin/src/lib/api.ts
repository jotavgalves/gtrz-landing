const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function api<T>(path:string, init:RequestInit = {}):Promise<T>{
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials:'include',
    headers:{ 'content-type':'application/json', ...(init.headers||{}) }
  });
  if (!response.ok) throw new Error((await response.json().catch(()=>({error:`HTTP ${response.status}`}))).error || `HTTP ${response.status}`);
  return response.json();
}

export async function login(password:string){ return api('/api/admin/auth/login',{method:'POST',body:JSON.stringify({password})}); }
export async function logout(){ return api('/api/admin/auth/logout',{method:'POST'}); }
