import { useEffect,useState } from 'react';
import { api } from '../../lib/api';
import { Metric,Panel } from '../../components/StateViews';
export function Dashboard(){
  const [data,setData]=useState<any>(null); const [error,setError]=useState('');
  useEffect(()=>{api<any>('/api/admin/dashboard').then(setData).catch(e=>setError(e.message));},[]);
  return <><div className="metric-grid"><Metric label="Eventos ativos" value={data?.activeEvents??'—'}/><Metric label="Freelancers novos" value={data?.newFreelancers??'—'}/><Metric label="Parcerias novas" value={data?.newPartnerships??'—'}/><Metric label="Janela analytics" value="30 dias"/></div><Panel title="Visão geral" eyebrow="GTRZ Control">{error?<p className="error">{error}</p>:<p className="muted">Conteúdo, operação e aquisição em um único painel. Os cards passam a receber os agregados de analytics conforme o pipeline diário for ativado.</p>}</Panel></>;
}
