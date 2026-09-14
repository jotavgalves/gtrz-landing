import { useEffect,useState } from 'react';
import { api } from '../../lib/api';
import { Metric,Panel } from '../../components/StateViews';
export function Dashboard(){
  const [data,setData]=useState<any>(null); const [error,setError]=useState('');
  useEffect(()=>{api<any>('/api/admin/dashboard').then(setData).catch(e=>setError(e.message));},[]);
  const pageViews=(data?.metrics||[]).find((x:any)=>x.metric==='page_view')?.value;
  const ticketClicks=(data?.metrics||[]).find((x:any)=>x.metric==='ticket_click')?.value;
  return <><div className="metric-grid"><Metric label="Visitantes únicos · 30d" value={data?.uniqueVisitors30d??'—'}/><Metric label="Page views · 30d" value={pageViews??'—'}/><Metric label="Cliques em ingressos" value={ticketClicks??'—'}/><Metric label="Eventos ativos" value={data?.activeEvents??'—'}/><Metric label="Freelancers novos" value={data?.newFreelancers??'—'}/><Metric label="Parcerias novas" value={data?.newPartnerships??'—'}/></div><Panel title="Visão geral" eyebrow="GTRZ Control">{error?<p className="error">{error}</p>:<p className="muted">O dashboard separa sessões anônimas de volume bruto de eventos. Assim, por exemplo, 30 cliques de uma mesma pessoa não são apresentados como 30 visitantes.</p>}</Panel></>;
}
