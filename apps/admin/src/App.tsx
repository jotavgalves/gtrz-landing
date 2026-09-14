import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api, login, logout } from './lib/api';
import { Turnstile } from './components/Turnstile';
import { Icon, type IconName } from './components/Icons';
import { Dashboard } from './modules/dashboard/Dashboard';
import { Content } from './modules/content/Content';
import { PublicCopy } from './modules/copy/PublicCopy';
import { Events } from './modules/events/Events';
import { People } from './modules/people/People';
import { Commercial } from './modules/commercial/Commercial';
import { Marketing } from './modules/marketing/Marketing';
import { Media } from './modules/media/Media';
import { Analytics } from './modules/analytics/Analytics';
import { Settings } from './modules/settings/Settings';
import { System } from './modules/system/System';

type View='dashboard'|'content'|'copy'|'events'|'people'|'commercial'|'marketing'|'media'|'analytics'|'settings'|'system';
type NavItem={id:View;label:string;desc:string;icon:IconName;group:'Operação'|'Crescimento'|'Plataforma'};
const items:NavItem[]=[
  {id:'dashboard',label:'Dashboard',desc:'Visão geral',icon:'dashboard',group:'Operação'},
  {id:'content',label:'Conteúdo',desc:'Páginas e seções',icon:'content',group:'Operação'},
  {id:'copy',label:'Textos do site',desc:'PT + ES de toda interface pública',icon:'content',group:'Operação'},
  {id:'events',label:'Eventos',desc:'Agenda, identidade e ingressos',icon:'events',group:'Operação'},
  {id:'people',label:'Pessoas',desc:'Equipe e freelancers',icon:'people',group:'Operação'},
  {id:'commercial',label:'Comercial',desc:'Parcerias e leads',icon:'commercial',group:'Crescimento'},
  {id:'marketing',label:'Marketing',desc:'Popups, campanhas e links',icon:'marketing',group:'Crescimento'},
  {id:'analytics',label:'Analytics',desc:'Aquisição e conversão',icon:'analytics',group:'Crescimento'},
  {id:'media',label:'Mídia',desc:'Biblioteca oficial',icon:'media',group:'Plataforma'},
  {id:'settings',label:'Configurações',desc:'Site e integrações',icon:'settings',group:'Plataforma'},
  {id:'system',label:'Sistema',desc:'Auditoria e governança',icon:'system',group:'Plataforma'}
];

function ControlBrand({compact=false}:{compact?:boolean}){
  return <div className={`control-brand ${compact?'compact':''}`}><span className="control-mark">G</span>{!compact&&<div><strong>GTRZ</strong><small>CONTROL</small></div>}</div>;
}

function Login({onDone}:{onDone:()=>void}){
  const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setError('');setBusy(true);
    const formData=new FormData(e.currentTarget);
    const token=String(formData.get('cf-turnstile-response')||'')||undefined;
    try{await login(password,token);onDone();}catch(err:any){setError(err.message)}finally{setBusy(false)}
  };
  return <main className="login-shell">
    <section className="login-art">
      <div className="login-art-top"><ControlBrand/><span>PLATAFORMA DE OPERAÇÃO</span></div>
      <div className="login-statement"><span>GTRZ / BRASIL</span><h1>CONTROLE<br/>SEM <em>RUÍDO.</em></h1><p>Conteúdo, eventos, pessoas, mídia, campanhas e dados em um único lugar.</p></div>
      <div className="login-art-foot"><span>PRODUÇÃO · CULTURA · EXPERIÊNCIA</span><span>VENEZUELA ↔ BRASIL</span></div>
    </section>
    <section className="login-panel"><form onSubmit={submit}>
      <div className="login-form-head"><span className="login-lock"><Icon name="system" size={18}/></span><div><small>ACESSO RESTRITO</small><h2>Entrar no Control</h2></div></div>
      <p>Use a senha administrativa configurada para o ambiente de produção.</p>
      <label className="field"><span>Senha administrativa</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••" autoFocus autoComplete="current-password"/></label>
      <Turnstile/>
      <button className="primary login-submit" disabled={busy||!password}>{busy?'Validando acesso…':<><span>Entrar</span><Icon name="arrow" size={17}/></>}</button>
      {error&&<div className="notice notice-error"><span>{error}</span></div>}
      <small className="login-security">Sessão segura · cookie HttpOnly · expiração automática</small>
    </form></section>
  </main>;
}

function SessionCheck(){return <main className="session-screen"><div className="session-check"><ControlBrand/><span className="loader-line"/><p>Verificando sessão segura…</p></div></main>}

export function App(){
  const initial=typeof window!=='undefined'&&items.some(i=>`#${i.id}`===window.location.hash)?window.location.hash.slice(1) as View:'dashboard';
  const [authenticated,setAuthenticated]=useState(false);const [checking,setChecking]=useState(true);const [view,setView]=useState<View>(initial);const [menuOpen,setMenuOpen]=useState(false);
  const environment=(import.meta.env.VITE_APP_ENV||'production').toUpperCase();
  useEffect(()=>{api('/api/admin/auth/me').then(()=>setAuthenticated(true)).catch(()=>setAuthenticated(false)).finally(()=>setChecking(false));},[]);
  useEffect(()=>{const sync=()=>{const hash=window.location.hash.slice(1) as View;if(items.some(i=>i.id===hash))setView(hash)};window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[]);
  const go=(next:View)=>{setView(next);setMenuOpen(false);if(typeof window!=='undefined'&&window.location.hash!==`#${next}`)window.location.hash=next};
  const current=useMemo(()=>items.find(i=>i.id===view)!,[view]);
  if(checking)return <SessionCheck/>;
  if(!authenticated)return <Login onDone={()=>setAuthenticated(true)}/>;
  const exit=async()=>{try{await logout();}finally{setAuthenticated(false)}};
  const groups=['Operação','Crescimento','Plataforma'] as const;
  return <div className="control-app">
    {menuOpen&&<button className="mobile-backdrop" aria-label="Fechar menu" onClick={()=>setMenuOpen(false)}/>}
    <aside className={`sidebar ${menuOpen?'open':''}`}>
      <div className="sidebar-head"><ControlBrand/><button className="icon-button sidebar-close" onClick={()=>setMenuOpen(false)} aria-label="Fechar menu"><Icon name="close"/></button></div>
      <nav className="sidebar-nav">{groups.map(group=><div className="nav-group" key={group}><span className="nav-group-label">{group}</span>{items.filter(i=>i.group===group).map(item=><button className={`nav-item ${view===item.id?'active':''}`} onClick={()=>go(item.id)} key={item.id}><i><Icon name={item.icon} size={18}/></i><span><strong>{item.label}</strong><small>{item.desc}</small></span>{view===item.id&&<b/>}</button>)}</div>)}</nav>
      <div className="sidebar-foot"><a href="https://gtrz.com.br/" target="_blank" rel="noreferrer"><Icon name="external" size={16}/><span>Ver site publicado</span></a><div className="sidebar-runtime"><span className="runtime-dot"/><div><strong>{environment}</strong><small>Cloudflare</small></div></div></div>
    </aside>
    <main className="workspace">
      <header className="topbar">
        <div className="topbar-context"><button className="icon-button mobile-menu" onClick={()=>setMenuOpen(true)} aria-label="Abrir menu"><Icon name="menu"/></button><div><small>GTRZ CONTROL / {current.group.toUpperCase()}</small><strong>{current.label}</strong></div></div>
        <div className="topbar-actions"><a className="topbar-link" href="https://gtrz.com.br/" target="_blank" rel="noreferrer"><span>Visualizar site</span><Icon name="external" size={15}/></a><div className="environment"><span/>{environment}</div><button className="icon-button" onClick={exit} title="Sair"><Icon name="logout" size={18}/></button></div>
      </header>
      <div className="content-shell">
        <div className="page-intro"><div><span>{current.group}</span><h1>{current.label}</h1><p>{current.desc}</p></div><div className="page-intro-line"/></div>
        <div className="content">{view==='dashboard'?<Dashboard onNavigate={go}/>:view==='content'?<Content/>:view==='copy'?<PublicCopy/>:view==='events'?<Events/>:view==='people'?<People/>:view==='commercial'?<Commercial/>:view==='marketing'?<Marketing/>:view==='media'?<Media/>:view==='analytics'?<Analytics/>:view==='settings'?<Settings/>:<System/>}</div>
      </div>
    </main>
  </div>;
}
