export const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function api<T>(path:string, init:RequestInit = {}):Promise<T>{
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const headers: HeadersInit = { ...(init.headers || {}) };
  if (!isForm && init.body && !('content-type' in Object.fromEntries(new Headers(headers).entries()))) {
    (headers as Record<string,string>)['content-type'] = 'application/json';
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials:'include',
    headers
  });
  if (!response.ok) throw new Error((await response.json().catch(()=>({error:`HTTP ${response.status}`}))).error || `HTTP ${response.status}`);
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function login(password:string){ return api('/api/admin/auth/login',{method:'POST',body:JSON.stringify({password})}); }
export async function logout(){ return api('/api/admin/auth/logout',{method:'POST'}); }
