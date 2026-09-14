import { useEffect,useState } from 'react';
import { api } from '../../lib/api';
import { Empty,Panel } from '../../components/StateViews';

export function Commercial(){
  const [items,setItems]=useState<any[]>([]);const [selected,setSelected]=useState<any|null>(null);const [notes,setNotes]=useState('');
  const load=()=>api<any>('/api/admin/partnerships').then(r=>setItems(r.results||[])).catch(()=>{});
  useEffect(()=>{load();},[]);
  const update=async(id:string,patch:any)=>{await api(`/api/admin/partnerships/${id}`,{method:'PATCH',body:JSON.stringify(patch)});await load();if(selected?.id===id)setSelected((s:any)=>({...s,...patch}))};
  const open=(x:any)=>{setSelected(x);setNotes(x.notes||'')};
  return <Panel title="Parcerias" eyebrow="Comercial">
    <div className="pipeline"><span>Novo · {items.filter(x=>x.status==='new').length}</span><span>Em análise · {items.filter(x=>x.status==='reviewing').length}</span><span>Contato · {items.filter(x=>x.status==='contacted').length}</span><span>Negociação · {items.filter(x=>x.status==='negotiating').length}</span><span>Fechado · {items.filter(x=>x.status==='won').length}</span></div>
    {selected&&<div className="editor-section"><div className="editor-section-head"><div><h4>{selected.company_name||selected.contact_name}</h4><small className="muted">{selected.partnership_type} · {selected.city||'cidade não informada'}</small></div><button onClick={()=>setSelected(null)}>Fechar</button></div><div className="form-grid"><label><span>Status</span><select value={selected.status} onChange={e=>{setSelected((s:any)=>({...s,status:e.target.value}));update(selected.id,{status:e.target.value})}}><option value="new">Novo</option><option value="reviewing">Em análise</option><option value="contacted">Contato realizado</option><option value="negotiating">Negociação</option><option value="won">Fechado</option><option value="lost">Recusado</option></select></label><label><span>Contato</span><input value={[selected.email,selected.whatsapp].filter(Boolean).join(' · ')} readOnly/></label><label className="wide"><span>Mensagem recebida</span><textarea value={selected.message||''} readOnly/></label><label className="wide"><span>Notas internas</span><textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label></div><button className="primary" onClick={()=>update(selected.id,{notes})}>Salvar notas</button></div>}
    {items.length?<div className="list">{items.map(x=><article key={x.id}><div><strong>{x.company_name||x.contact_name}</strong><span>{x.partnership_type} · {x.status}{x.source?` · origem: ${x.source}`:''}</span></div><button onClick={()=>open(x)}>Abrir</button></article>)}</div>:<Empty>Nenhuma proposta de parceria recebida ainda.</Empty>}
  </Panel>;
}
