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
import { Feedback } from './modules/feedback/Feedback';
import { Settings } from './modules/settings/Settings';
import { System } from './modules/system/System';

type View='dashboard'|'content'|'copy'|'events'|'people'|'feedback'|'commercial'|'marketing'|'media'|'analytics'|'settings'|'system';
type NavItem={id:View;label:string;desc:string;icon:IconName;group:'Operação'|'Crescimento'|'Plataforma'};
const items:NavItem[]=[
  {id:'dashboard',label:'Dashboard',desc:'Visão geral',icon:'dashboard',group:'Operação'},
  {id:'content',label:'Conteúdo',desc:'Páginas e seções',icon:'content',group:'Operação'},
  {id:'copy',label:'Textos do site',desc:'Interface pública · PT/ES',icon:'content',group:'Operação'},
  {id:'events',label:'Eventos',desc:'Agenda, identidade e ingressos',icon:'events',group:'Operação'},
  {id:'people',label:'Pessoas',desc:'Equipe e freelancers',icon:'people',group:'Operação'},
  {id:'feedback',label:'Sugestões',desc:'Feedback das festas',icon:'activity',group:'Operação'},
  {id:'commercial',label:'Comercial',desc:'Parcerias e leads',icon:'commercial',group:'Crescimento'},
  {id:'marketing',label:'Marketing',desc:'Popups, campanhas e links',icon:'marketing',group:'Crescimento'},
  {id:'analytics',label:'Analytics',desc:'Aquisição e conversão',icon:'analytics',group:'Crescimento'},
  {id:'media',label:'Mídia',desc:'Biblioteca oficial',icon:'media',group:'Plataforma'},
  {id:'settings',label:'Configurações',desc:'Site e integrações',icon:'settings',group:'Plataforma'},
  {id:'system',label:'Sistema',desc:'Auditoria e governança',icon:'system',group:'Plataforma'}
];

function ControlBrand({compact=false}:{compact?:boolean}){
  return <div className={`control-brand ${compact?'compact':''}`}>
    <img className="control-brand-logo" src="/brand/gtrz-wordmark.svg" alt="GTRZ" />
    {!compact&&<><span className="control-brand-divider"/><small>CONTROL</small></>}
  </div>;
}

function Login({onDone}:{onDone:()=>void}){
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const [locale,setLocale]=useState<'pt'|'es'>('pt');
  const es=locale==='es';
  const copy=es?{
    eyebrow:'GTRZ / BRASIL',
    titleA:'CONTROL',titleB:'IMPULSA.',
    description:'Toda la operación en un solo lugar. Contenido, eventos, personas, medios, campañas y datos, conectando Venezuela y Brasil.',
    platform:'PLATAFORMA DE OPERACIÓN',restricted:'ACCESO RESTRINGIDO',loginTitle:'Entrar al Control',
    loginBody:'Usa la contraseña administrativa configurada para el ambiente de producción.',password:'CONTRASEÑA ADMINISTRATIVA',enter:'Entrar',validating:'Validando acceso…',
    security:'Sesión segura · cookie HttpOnly · expiración automática',footer:'PRODUCCIÓN · CULTURA · EXPERIENCIA'
  }:{
    eyebrow:'GTRZ / BRASIL',
    titleA:'CONTROLE',titleB:'IMPULSIONA.',
    description:'Toda a operação em um só lugar. Conteúdo, eventos, pessoas, mídia, campanhas e dados, conectando Venezuela e Brasil.',
    platform:'PLATAFORMA DE OPERAÇÃO',restricted:'ACESSO RESTRITO',loginTitle:'Entrar no Control',
    loginBody:'Use a senha administrativa configurada para o ambiente de produção.',password:'SENHA ADMINISTRATIVA',enter:'Entrar',validating:'Validando acesso…',
    security:'Sessão segura · cookie HttpOnly · expiração automática',footer:'PRODUÇÃO · CULTURA · EXPERIÊNCIA'
  };
  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setError('');setBusy(true);
    const formData=new FormData(e.currentTarget);
    const token=String(formData.get('cf-turnstile-response')||'')||undefined;
    try{await login(password,token);onDone();}catch(err:any){setError(err.message)}finally{setBusy(false)}
  };
  return <main className="login-shell login-shell-v2">
    <section className="login-art login-art-v2">
      <img className="login-symbol-watermark" src="/brand/gtrz-symbol.svg" alt="" aria-hidden="true" />
      <div className="login-art-top login-art-top-v2">
        <ControlBrand/>
        <div className="login-platform-label"><span/>{copy.platform}<br/>GTRZ BRASIL</div>
      </div>
      <div className="login-statement login-statement-v2">
        <div className="login-kicker"><strong>{copy.eyebrow}</strong><span/></div>
        <h1>{copy.titleA}<br/><em>QUE</em> <b>{copy.titleB}</b></h1>
        <p>{copy.description}</p>
      </div>
      <div className="login-art-foot login-art-foot-v2"><span>{copy.footer}</span><span>VENEZUELA ↔ BRASIL</span></div>
    </section>
    <section className="login-panel login-panel-v2">
      <form className="login-card-v2" onSubmit={submit}>
        <div className="login-form-head login-form-head-v2">
          <span className="login-lock"><Icon name="system" size={20}/></span>
          <div><small>{copy.restricted}</small><h2>{copy.loginTitle}</h2></div>
        </div>
        <p>{copy.loginBody}</p>
        <label className="field login-password-field"><span>{copy.password}</span><div className="login-password-wrap"><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••" autoFocus autoComplete="current-password"/><button type="button" className="login-password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'}><Icon name="eye" size={18}/></button></div></label>
        <Turnstile/>
        <button className="primary login-submit login-submit-v2" disabled={busy||!password}>{busy?copy.validating:<><span>{copy.enter}</span><Icon name="arrow" size={18}/></>}</button>
        {error&&<div className="notice notice-error"><span>{error}</span></div>}
        <div className="login-security-v2"><Icon name="system" size={15}/><span>{copy.security}</span></div>
      </form>
      <div className="login-language-switch" aria-label="Idioma"><button className={locale==='pt'?'active':''} type="button" onClick={()=>setLocale('pt')}>PT</button><button className={locale==='es'?'active':''} type="button" onClick={()=>setLocale('es')}>ES</button></div>
    </section>
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
      <div className="sidebar-head"><ControlBrand/></div>
      <nav className="sidebar-nav">{groups.map(group=><div className="nav-group" key={group}><span className="nav-group-label">{group}</span>{items.filter(i=>i.group===group).map(item=><button className={`nav-item ${view===item.id?'active':''}`} onClick={()=>go(item.id)} key={item.id}><i><Icon name={item.icon} size={18}/></i><span><strong>{item.label}</strong><small>{item.desc}</small></span>{view===item.id&&<b/>}</button>)}</div>)}</nav>
      <div className="sidebar-foot"><a href="https://gtrz.com.br/" target="_blank" rel="noreferrer"><Icon name="external" size={16}/><span>Ver site publicado</span></a><div className="sidebar-runtime"><span className="runtime-dot"/><div><strong>{environment}</strong><small>Cloudflare</small></div></div></div>
    </aside>
    <main className="workspace">
      <header className="topbar">
        <div className="topbar-context"><button className="icon-button mobile-menu" onClick={()=>setMenuOpen(true)} aria-label="Abrir menu"><Icon name="menu"/></button><div><small>GTRZ CONTROL / {current.group.toUpperCase()}</small><strong>{current.label}</strong></div></div>
        <div className="topbar-actions"><a className="topbar-link" href="https://gtrz.com.br/" target="_blank" rel="noreferrer"><span>Visualizar site</span><Icon name="external" size={15}/></a><div className="environment"><span/>{environment}</div><button className="icon-button" onClick={exit} title="Sair"><Icon name="logout" size={18}/></button></div>
      </header>
      <div className={`content-shell ${view==='copy'?'content-shell-editor':''}`}>
        {view!=='copy'&&<div className="page-intro"><div><span>{current.group}</span><h1>{current.label}</h1><p>{current.desc}</p></div><div className="page-intro-line"/></div>}
        <div className="content">{view==='dashboard'?<Dashboard onNavigate={go}/>:view==='content'?<Content/>:view==='copy'?<PublicCopy/>:view==='events'?<Events/>:view==='people'?<People/>:view==='feedback'?<Feedback/>:view==='commercial'?<Commercial/>:view==='marketing'?<Marketing/>:view==='media'?<Media/>:view==='analytics'?<Analytics/>:view==='settings'?<Settings/>:<System/>}</div>
      </div>
    </main>
  </div>;
}