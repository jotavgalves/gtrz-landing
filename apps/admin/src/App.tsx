import { useState } from 'react';
import { login } from './lib/api';
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

function Login({onDone}:{onDone:()=>void}){const [password,setPassword]=useState('');const [error,setError]=useState('');const submit=async(e:React.FormEvent)=>{e.preventDefault();setError('');try{await login(password);onDone();}catch(err:any){setError(err.message)}};return <main className="login"><form onSubmit={submit}><div className="control-logo">GTRZ <span>CONTROL</span></div><h1>Administração</h1><p>Acesso restrito.</p><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha administrativa" autoFocus/><button className="primary">Entrar</button>{error&&<small className="error">{error}</small>}</form></main>}

export function App(){const [authenticated,setAuthenticated]=useState(false);const [view,setView]=useState<View>('dashboard');if(!authenticated)return <Login onDone={()=>setAuthenticated(true)}/>;const C={dashboard:Dashboard,content:Content,events:Events,people:People,commercial:Commercial,marketing:Marketing,media:Media,analytics:Analytics,system:System}[view];return <div className="app"><aside><div className="control-logo">GTRZ <span>CONTROL</span></div><nav>{items.map(([id,label,desc])=><button className={view===id?'active':''} onClick={()=>setView(id)} key={id}><strong>{label}</strong><small>{desc}</small></button>)}</nav></aside><main className="workspace"><header className="topbar"><div><small>GTRZ PLATFORM</small><strong>{items.find(x=>x[0]===view)?.[1]}</strong></div><div className="environment">STAGING</div></header><div className="content"><C/></div></main></div>}
