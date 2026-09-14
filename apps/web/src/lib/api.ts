const API_BASE = import.meta.env.PUBLIC_API_BASE || '';

export async function publicApi<T>(path:string, init:RequestInit={}):Promise<T>{
  const response=await fetch(`${API_BASE}${path}`,{...init,headers:{accept:'application/json','content-type':'application/json',...(init.headers||{})}});
  if(!response.ok){const body=await response.json().catch(()=>({error:`HTTP_${response.status}`}));throw new Error(body.error||`HTTP_${response.status}`)}
  return response.json();
}

export { API_BASE };
