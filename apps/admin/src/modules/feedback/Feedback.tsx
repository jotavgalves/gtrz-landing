import { useEffect,useMemo,useState } from 'react';
import { api } from '../../lib/api';
import { Badge,Empty,Notice,Panel } from '../../components/StateViews';
import { Icon } from '../../components/Icons';

type FeedbackStatus='new'|'reviewed'|'archived';
const labels:Record<FeedbackStatus,string>={new:'Nova',reviewed:'Revisada',archived:'Arquivada'};
const tone=(status:FeedbackStatus):'red'|'green'|'neutral'=>status==='new'?'red':status==='reviewed'?'green':'neutral';

export function Feedback(){
  const [items,setItems]=useState<any[]>([]);
  const [selected,setSelected]=useState<any|null>(null);
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<'all'|FeedbackStatus>('all');
  const [notes,setNotes]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  const load=()=>api<any>('/api/admin/feedback?limit=500')
    .then(r=>setItems(r.results||[]))
    .catch(e=>setMessage(e.message));

  useEffect(()=>{load();},[]);

  const filtered=useMemo(()=>items.filter(x=>{
    const matchesStatus=filter==='all'||x.status===filter;
    const haystack=`${x.event_name||''} ${x.name||''} ${x.message||''} ${x.source_path||''}`.toLowerCase();
    return matchesStatus&&(!query||haystack.includes(query.toLowerCase()));
  }),[items,filter,query]);

  const open=(item:any)=>{
    setSelected(item);
    setNotes(item.admin_notes||'');
  };

  const update=async(id:string,patch:any)=>{
    setBusy(true);
    setMessage('');
    try{
      await api(`/api/admin/feedback/${id}`,{method:'PATCH',body:JSON.stringify(patch)});
      await load();
      setSelected((current:any)=>current?.id===id?{...current,...patch,admin_notes:patch.adminNotes??current.admin_notes}:current);
      if(Object.prototype.hasOwnProperty.call(patch,'adminNotes'))setNotes(patch.adminNotes||'');
      setMessage('Sugestão atualizada.');
    }catch(e:any){
      setMessage(`Erro ao atualizar: ${e.message}`);
    }finally{
      setBusy(false);
    }
  };

  const remove=async(item:any)=>{
    if(!confirm('Excluir permanentemente esta sugestão? Essa ação não pode ser desfeita.'))return;
    setBusy(true);
    try{
      await api(`/api/admin/feedback/${item.id}`,{method:'DELETE'});
      setSelected(null);
      setNotes('');
      await load();
      setMessage('Sugestão excluída.');
    }catch(e:any){
      setMessage(`Erro ao excluir: ${e.message}`);
    }finally{
      setBusy(false);
    }
  };

  const newCount=items.filter(x=>x.status==='new').length;
  const reviewedCount=items.filter(x=>x.status==='reviewed').length;
  const archivedCount=items.filter(x=>x.status==='archived').length;

  return <div className="module-stack">
    <Panel title="Sugestões" eyebrow="Experiência do público" description="Feedback recebido sobre festas, operação e próximas edições.">
      <div className="pipeline-board feedback-pipeline">
        <button className={filter==='new'?'active':''} onClick={()=>setFilter(filter==='new'?'all':'new')}><span>Novas</span><strong>{newCount}</strong></button>
        <button className={filter==='reviewed'?'active':''} onClick={()=>setFilter(filter==='reviewed'?'all':'reviewed')}><span>Revisadas</span><strong>{reviewedCount}</strong></button>
        <button className={filter==='archived'?'active':''} onClick={()=>setFilter(filter==='archived'?'all':'archived')}><span>Arquivadas</span><strong>{archivedCount}</strong></button>
      </div>

      {message&&<Notice tone={message.toLowerCase().includes('erro')?'error':'success'}>{message}</Notice>}

      <div className="split-admin-view feedback-split">
        <div className="lead-list-pane">
          <div className="toolbar">
            <label className="search-box"><Icon name="search" size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar festa, nome ou mensagem…"/></label>
            <select value={filter} onChange={e=>setFilter(e.target.value as any)}>
              <option value="all">Todas</option>
              <option value="new">Novas</option>
              <option value="reviewed">Revisadas</option>
              <option value="archived">Arquivadas</option>
            </select>
          </div>

          {filtered.length?<div className="lead-list feedback-list">{filtered.map(item=>
            <button key={item.id} className={selected?.id===item.id?'active':''} onClick={()=>open(item)}>
              <div>
                <strong>{item.event_name}</strong>
                <span>{item.anonymous?'ANÔNIMA':item.name||'IDENTIFICADA'}</span>
                <small>{String(item.message||'').replace(/\s+/g,' ').slice(0,90)}</small>
              </div>
              <Badge tone={tone(item.status as FeedbackStatus)}>{labels[item.status as FeedbackStatus]||item.status}</Badge>
            </button>
          )}</div>:<Empty icon="activity">Nenhuma sugestão corresponde aos filtros.</Empty>}
        </div>

        <div className="lead-detail-pane feedback-detail">
          {selected?<>
            <div className="lead-detail-head">
              <div>
                <Badge tone={tone(selected.status as FeedbackStatus)}>{labels[selected.status as FeedbackStatus]||selected.status}</Badge>
                <h3>{selected.event_name}</h3>
                <p>Recebida {new Date(selected.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <button className="icon-button" onClick={()=>setSelected(null)}><Icon name="close"/></button>
            </div>

            <div className="lead-info-grid">
              <div><span>Identificação</span><strong>{selected.anonymous?'ANÔNIMA':selected.name||'—'}</strong></div>
              <div><span>Idioma</span><strong>{selected.locale==='es'?'ESPAÑOL':'PORTUGUÊS'}</strong></div>
              <div><span>Origem</span><strong>{selected.source_path||'/sugestoes'}</strong></div>
              <div><span>Status</span><strong>{labels[selected.status as FeedbackStatus]||selected.status}</strong></div>
            </div>

            <div className="feedback-message">
              <span>SUGESTÃO</span>
              <p>{selected.message}</p>
            </div>

            <label className="field">
              <span>Notas internas</span>
              <textarea className="tall" maxLength={3000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Contexto, providência, responsável, decisão tomada…"/>
            </label>

            <div className="feedback-actions">
              <button className="danger" disabled={busy} onClick={()=>remove(selected)}><Icon name="trash" size={15}/> Excluir</button>
              <div>
                {selected.status!=='archived'&&<button disabled={busy} onClick={()=>update(selected.id,{status:'archived',adminNotes:notes})}><Icon name="archive" size={15}/> Arquivar</button>}
                {selected.status!=='reviewed'&&<button disabled={busy} onClick={()=>update(selected.id,{status:'reviewed',adminNotes:notes})}><Icon name="check" size={15}/> Marcar revisada</button>}
                <button className="primary" disabled={busy} onClick={()=>update(selected.id,{adminNotes:notes})}><Icon name="save" size={15}/> Salvar notas</button>
              </div>
            </div>
          </>:<div className="settings-empty"><Icon name="activity" size={30}/><strong>Selecione uma sugestão</strong><span>Abra uma mensagem para ler o feedback completo e registrar a triagem.</span></div>}
        </div>
      </div>
    </Panel>
  </div>;
}
