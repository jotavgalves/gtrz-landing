import { useEffect,useState } from 'react';
import { api } from '../../lib/api';
import { Empty,Panel } from '../../components/StateViews';

type View='overview'|'sources'|'links'|'campaigns';
export function Analytics(){
  const [data,setData]=useState<any>({daily:[],sources:[],links:[],campaigns:[]});const [view,setView]=useState<View>('overview');const [error,setError]=useState('');
  useEffect(()=>{api<any>('/api/admin/analytics/overview').then(setData).catch(e=>setError(e.message));},[]);
  const rows=view==='overview'?data.daily:view==='sources'?data.sources:view==='links'?data.links:data.campaigns;
  return <Panel title="Analytics" eyebrow="Aquisição e comportamento">
    <div className="analytics-intro"><div><strong>Origem</strong><span>UTM + links /r/:slug + referrer</span></div><div><strong>Comportamento</strong><span>page, seção, CTA, popup, scroll, ingresso</span></div><div><strong>Pessoas</strong><span>sessões anônimas únicas, sem IP bruto</span></div></div>
    <div className="subnav"><button className={view==='overview'?'active':''} onClick={()=>setView('overview')}>Métricas</button><button className={view==='sources'?'active':''} onClick={()=>setView('sources')}>Origens</button><button className={view==='links'?'active':''} onClick={()=>setView('links')}>Links rastreáveis</button><button className={view==='campaigns'?'active':''} onClick={()=>setView('campaigns')}>Campanhas</button></div>
    {error&&<p className="error">{error}</p>}
    {view==='overview'&&(rows.length?<div className="table"><div className="thead"><span>Dia</span><span>Métrica</span><span>Dimensão</span><span>Valor</span></div>{rows.slice(-250).map((r:any,i:number)=><div key={i}><span>{r.day}</span><span>{r.metric}</span><span>{r.dimension_key||'—'}</span><span>{r.value}</span></div>)}</div>:<Empty>Ainda não há métricas agregadas.</Empty>)}
    {view==='sources'&&(rows.length?<div className="table"><div className="thead"><span>Origem</span><span>Visitantes</span><span></span><span></span></div>{rows.map((r:any,i:number)=><div key={i}><span>{r.source||'direct'}</span><span>{r.visitors}</span><span></span><span></span></div>)}</div>:<Empty>Ainda não há dados de aquisição.</Empty>)}
    {view==='links'&&(rows.length?<div className="table"><div className="thead"><span>Link</span><span>Visitantes</span><span></span><span></span></div>{rows.map((r:any,i:number)=><div key={i}><span>{r.tracking_link}</span><span>{r.visitors}</span><span></span><span></span></div>)}</div>:<Empty>Nenhum link rastreável trouxe sessões ainda.</Empty>)}
    {view==='campaigns'&&(rows.length?<div className="table"><div className="thead"><span>Campanha</span><span>Visitantes</span><span></span><span></span></div>{rows.map((r:any,i:number)=><div key={i}><span>{r.campaign}</span><span>{r.visitors}</span><span></span><span></span></div>)}</div>:<Empty>Nenhuma campanha atribuída ainda.</Empty>)}
  </Panel>;
}
