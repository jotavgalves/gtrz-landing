import { useEffect,useState } from 'react';
import { api } from '../../lib/api';
import { Panel,Empty } from '../../components/StateViews';

type Draft={slug:string;city:string;state:string;startsAt:string;endsAt:string;venueName:string;titlePt:string;titleEs:string};
const empty:Draft={slug:'',city:'',state:'',startsAt:'',endsAt:'',venueName:'',titlePt:'',titleEs:''};
export function Events(){
  const [items,setItems]=useState<any[]>([]);const [creating,setCreating]=useState(false);const [draft,setDraft]=useState<Draft>(empty);const [message,setMessage]=useState('');
  const load=()=>api<any>('/api/admin/events').then(r=>setItems(r.results||[])).catch(()=>{});
  useEffect(()=>{load();},[]);
  const set=(key:keyof Draft,value:string)=>setDraft(d=>({...d,[key]:value}));
  const create=async()=>{setMessage('');try{await api('/api/admin/events',{method:'POST',body:JSON.stringify({slug:draft.slug,city:draft.city,state:draft.state||undefined,startsAt:draft.startsAt,endsAt:draft.endsAt||undefined,venueName:draft.venueName||undefined,locales:{'pt-BR':{title:draft.titlePt||draft.slug},es:{title:draft.titleEs||draft.titlePt||draft.slug}}})});setDraft(empty);setCreating(false);setMessage('Evento criado como rascunho.');load();}catch(e:any){setMessage(e.message)}};
  return <Panel title="Eventos" eyebrow="Agenda" action={<button className="primary" onClick={()=>setCreating(v=>!v)}>{creating?'Cancelar':'Criar evento'}</button>}>
    {creating&&<div className="create-form"><div className="form-grid"><label><span>Slug</span><input value={draft.slug} onChange={e=>set('slug',e.target.value)} placeholder="el-perreo-de-mas-alla"/></label><label><span>Cidade</span><input value={draft.city} onChange={e=>set('city',e.target.value)} placeholder="Recife"/></label><label><span>UF</span><input value={draft.state} onChange={e=>set('state',e.target.value)} placeholder="PE"/></label><label><span>Local</span><input value={draft.venueName} onChange={e=>set('venueName',e.target.value)} placeholder="Nome da casa"/></label><label><span>Início</span><input type="datetime-local" value={draft.startsAt} onChange={e=>set('startsAt',e.target.value)}/></label><label><span>Fim</span><input type="datetime-local" value={draft.endsAt} onChange={e=>set('endsAt',e.target.value)}/></label><label><span>Título PT</span><input value={draft.titlePt} onChange={e=>set('titlePt',e.target.value)}/></label><label><span>Título ES</span><input value={draft.titleEs} onChange={e=>set('titleEs',e.target.value)}/></label></div><div className="editor-footer"><span>{message}</span><button className="primary" onClick={create}>Criar rascunho</button></div></div>}
    {!creating&&message&&<p className="hint">{message}</p>}
    {items.length?<div className="list">{items.map(e=><article key={e.id}><div><strong>{e.slug}</strong><span>{e.city}{e.state?' · '+e.state:''} · {e.status}</span></div><div className="row-actions"><select value={e.status} onChange={async ev=>{await api(`/api/admin/events/${e.id}`,{method:'PATCH',body:JSON.stringify({status:ev.target.value})});load();}}><option value="draft">Rascunho</option><option value="scheduled">Agendado</option><option value="published">Publicado</option><option value="sales_open">Vendas abertas</option><option value="sold_out">Esgotado</option><option value="finished">Realizado</option><option value="archived">Arquivado</option></select><button>Gerenciar</button></div></article>)}</div>:<Empty>Nenhum evento no novo banco ainda.</Empty>}
  </Panel>;
}
