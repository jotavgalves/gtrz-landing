import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, login, logout } from './lib/api';
import { Dashboard } from './modules/dashboard/Dashboard';
import { Content } from './modules/content/Content';
import { Events } from './modules/events/Events';
import { People } from './modules/people/People';
import { Commercial } from './modules/commercial/Commercial';
import { Marketing } from './modules/marketing/Marketing';
import { Media } from './modules/media/Media';
import { Analytics } from './modules/analytics/Analytics';
import { System } from './modules/system/System';

type View='dashboard'|'content'|'events'|'people'|'commercial'|'marketing'|'media'|'analytics'|'system';
const items:[View,string,string][]=[['dashboard','Dashboard','Visão geral'],['content','Conteúdo','Páginas e seções'],['events','Eventos','Agenda e ingressos'],['people','Pessoas','Equipe e freelancers'],['commercial','Comercial','Parcerias e leads'],['marketing','Marketing','Popups e campanhas'],['media','Mídia','Biblioteca'],['analytics','Analytics','Aquisição e conversão'],['system','Sistema','Usuários e auditoria']];

function Login({onDone}:{onDone:()=>void}){
  const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const submit=async(e:FormEvent)=>{e.preventDefault();setError('');setBusy(true);try{await login(password);onDone();}catch(err:any){setError(err.message)}finally{setBusy(false)}};
  return <main className="login"><form onSubmit={submit}><div className="control-logo">GTRZ <span>CONTROL</span></div><h1>Administração</h1><p>Acesso restrito.</p><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha administrativa" autoFocus/><button className="primary" disabled={busy}>{busy?'Validando…':'Entrar'}</button>{error&&<small className="error">{error}</small>}</form></main>
}

export function App(){
  const [authenticated,setAuthenticated]=useState(false);const [checking,setChecking]=useState(true);const [view,setView]=useState<View>('dashboard');
  useEffect(()=>{api('/api/admin/auth/me').then(()=>setAuthenticated(true)).catch(()=>setAuthenticated(false)).finally(()=>setChecking(false));},[]);
  if(checking)return <main className="login"><div className="session-check"><div className="control-logo">GTRZ <span>CONTROL</span></div><p>Verificando sessão…</p></div></main>;
  if(!authenticated)return <Login onDone={()=>setAuthenticated(true)}/>;
  const C={dashboard:Dashboard,content:Content,events:Events,people:People,commercial:Commercial,marketing:Marketing,media:Media,analytics:Analytics,system:System}[view];
  const exit=async()=>{try{await logout();}finally{setAuthenticated(false)}};
  return <div className="app"><aside><div className="control-logo">GTRZ <span>CONTROL</span></div><nav>{items.map(([id,label,desc])=><button className={view===id?'active':''} onClick={()=>setView(id)} key={id}><strong>{label}</strong><small>{desc}</small></button>)}</nav></aside><main className="workspace"><header className="topbar"><div><small>GTRZ PLATFORM</small><strong>{items.find(x=>x[0]===view)?.[1]}</strong></div><div className="topbar-actions"><div className="environment">STAGING</div><button onClick={exit}>Sair</button></div></header><div className="content"><C/></div></main></div>
}
