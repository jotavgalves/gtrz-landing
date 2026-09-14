import { useEffect,useState } from 'react';
import { api } from '../../lib/api';
import { Empty,Panel } from '../../components/StateViews';

export function System(){
  const [logs,setLogs]=useState<any[]>([]);const [error,setError]=useState('');
  const load=()=>api<any>('/api/admin/audit?limit=250').then(r=>setLogs(r.results||[])).catch(e=>setError(e.message));
  useEffect(()=>{load();},[]);
  return <Panel title="Sistema" eyebrow="Governança" action={<button onClick={load}>Atualizar</button>}>
    <div className="feature-cards"><article><strong>Sessões protegidas</strong><p>Cookies HttpOnly, tokens HMAC, expiração e revogação.</p></article><article><strong>Revisões</strong><p>Conteúdo e eventos preservam estados anteriores antes de alterações.</p></article><article><strong>Auditoria</strong><p>Login, edição, restauração, mídia, leads e alterações administrativas.</p></article></div>
    <div className="editor-section"><div className="editor-section-head"><h4>Log de auditoria</h4><small className="muted">250 ações mais recentes</small></div>{error&&<p className="error">{error}</p>}{logs.length?<div className="table"><div className="thead"><span>Data</span><span>Ação</span><span>Entidade</span><span>ID</span></div>{logs.map(x=><div key={x.id}><span>{new Date(x.created_at).toLocaleString('pt-BR')}</span><span>{x.action}</span><span>{x.entity_type||'—'}</span><span>{x.entity_id||'—'}</span></div>)}</div>:<Empty>Nenhuma ação auditada ainda.</Empty>}</div>
  </Panel>;
}
