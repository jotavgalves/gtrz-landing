import { useEffect,useRef,useState } from 'react';
import { api } from '../../lib/api';
import { MediaPicker } from '../../components/MediaPicker';
import { EventsV2 } from './EventsV2';
import './events-lifecycle.css';

type EventRow={id:string;slug:string;status:string;title?:string};

const publicStatuses=new Set(['published','sales_open','sold_out','finished']);
const statusLabel:Record<string,string>={draft:'Rascunho',scheduled:'Agendado',published:'Publicado',sales_open:'Vendas abertas',sold_out:'Esgotado',finished:'Realizado',archived:'Arquivado'};
const parseTheme=(value:any)=>{if(value&&typeof value==='object')return value;try{return JSON.parse(value||'{}')}catch{return {}}};

export function Events(){
  const rootRef=useRef<HTMLDivElement|null>(null);
  const [active,setActive]=useState<EventRow|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [noticeError,setNoticeError]=useState(false);
  const [instance,setInstance]=useState(0);
  const [posterMediaId,setPosterMediaId]=useState<string|null>(null);
  const [posterSaving,setPosterSaving]=useState(false);
  const [posterReady,setPosterReady]=useState(false);
  const reopenSlug=useRef<string|null>(null);
  const lastDetectedSlug=useRef('');

  const loadPoster=async(id:string)=>{
    setPosterReady(false);
    try{
      const data=await api<any>(`/api/admin/events/${id}`);
      const theme=parseTheme(data?.event?.theme_json);
      setPosterMediaId(theme.posterMediaId||theme.poster_media_id||null);
    }catch{
      setPosterMediaId(null);
    }finally{
      setPosterReady(true);
    }
  };

  const refreshActive=async(slug:string)=>{
    if(!slug)return;
    try{
      const result=await api<any>('/api/admin/events');
      const row=(result.results||[]).find((item:any)=>item.slug===slug);
      if(row){
        const next={id:row.id,slug:row.slug,status:row.status,title:row.title};
        setActive(next);
        void loadPoster(row.id);
      }
    }catch{}
  };

  useEffect(()=>{
    const root=rootRef.current;
    if(!root)return;
    let timer:number|undefined;
    const sync=()=>{
      if(reopenSlug.current){
        const cards=Array.from(root.querySelectorAll<HTMLElement>('.event-admin-card'));
        const card=cards.find(node=>node.querySelector('code')?.textContent?.trim()===`/${reopenSlug.current}`);
        const button=card?.querySelector<HTMLButtonElement>('button.primary');
        if(button){
          const slug=reopenSlug.current;
          reopenSlug.current=null;
          button.click();
          if(slug)window.setTimeout(()=>refreshActive(slug),120);
          return;
        }
      }
      const preview=root.querySelector<HTMLAnchorElement>('a[href*="gtrz.com.br/eventos/"]');
      if(!preview){
        if(lastDetectedSlug.current){
          lastDetectedSlug.current='';
          setActive(null);
          setPosterMediaId(null);
          setPosterReady(false);
        }
        return;
      }
      try{
        const url=new URL(preview.href);
        const marker='/eventos/';
        const index=url.pathname.indexOf(marker);
        const slug=index>=0?decodeURIComponent(url.pathname.slice(index+marker.length)).replace(/^\/+|\/+$/g,''):'';
        if(slug&&slug!==lastDetectedSlug.current){
          lastDetectedSlug.current=slug;
          void refreshActive(slug);
        }
      }catch{}
    };
    const observer=new MutationObserver(()=>{
      if(timer)window.clearTimeout(timer);
      timer=window.setTimeout(sync,40);
    });
    observer.observe(root,{childList:true,subtree:true,attributes:true});
    sync();
    return()=>{observer.disconnect();if(timer)window.clearTimeout(timer)};
  },[instance]);

  useEffect(()=>{
    const root=rootRef.current;
    if(!root)return;
    const onClick=(event:MouseEvent)=>{
      const element=event.target as HTMLElement|null;
      const preview=element?.closest<HTMLAnchorElement>('a[href*="gtrz.com.br/eventos/"]');
      if(preview&&active&&!publicStatuses.has(active.status)){
        event.preventDefault();
        event.stopPropagation();
        setNoticeError(true);
        setNotice('Este evento ainda não está público. Use “Publicar evento” antes de abrir a página pública.');
      }
    };
    root.addEventListener('click',onClick,true);
    return()=>root.removeEventListener('click',onClick,true);
  },[active]);

  const transition=async(status:string)=>{
    if(!active||busy)return;
    setBusy(true);setNotice('');setNoticeError(false);
    try{
      await api(`/api/admin/events/${active.id}`,{method:'PATCH',body:JSON.stringify({status})});
      const previous=active;
      setActive({...active,status});
      reopenSlug.current=previous.slug;
      lastDetectedSlug.current='';
      setInstance(value=>value+1);
      if(status==='published')setNotice('Evento publicado. A página pública já pode ser acessada.');
      else if(status==='sales_open')setNotice('Evento publicado com vendas abertas.');
      else if(status==='draft')setNotice('Evento retirado do site e mantido como rascunho.');
      else setNotice(`Status alterado para ${statusLabel[status]||status}.`);
    }catch(error:any){
      setNoticeError(true);
      setNotice(error?.message||'Não foi possível alterar a publicação do evento.');
    }finally{setBusy(false)}
  };

  const savePoster=async()=>{
    if(!active||posterSaving)return;
    setPosterSaving(true);setNotice('');setNoticeError(false);
    try{
      const detail=await api<any>(`/api/admin/events/${active.id}`);
      const theme=parseTheme(detail?.event?.theme_json);
      const nextTheme={...theme,posterMediaId:posterMediaId||null};
      await api(`/api/admin/events/${active.id}`,{method:'PATCH',body:JSON.stringify({theme:nextTheme})});
      setNotice(posterMediaId?'Post oficial salvo. A arte já está vinculada à página pública do evento.':'Post oficial removido da página pública.');
    }catch(error:any){
      setNoticeError(true);
      setNotice(error?.message||'Não foi possível salvar o post oficial.');
    }finally{setPosterSaving(false)}
  };

  const isPublic=!!active&&publicStatuses.has(active.status);
  const lifecycleTitle=active?.status==='draft'?'Este evento ainda não está no site':active?.status==='sales_open'?'Evento publicado · vendas abertas':active?.status==='published'?'Evento publicado no site':active?`Status: ${statusLabel[active.status]||active.status}`:'';
  const lifecycleDescription=active?.status==='draft'?'O rascunho só aparece no Control. Publique quando a página estiver pronta.':active?.status==='sales_open'?'A página está pública e os ingressos podem ser vendidos normalmente.':active?.status==='published'?'A página pública está disponível, mas o evento não está marcado como vendas abertas.':active?'Controle abaixo se este evento deve permanecer acessível ao público.':'';

  return <div ref={rootRef} className="events-publish-shell" data-public={isPublic?'true':'false'}>
    {active&&<div className="event-lifecycle-bar" data-state={active.status}>
      <div className="event-lifecycle-copy"><span className="event-lifecycle-dot"/><div><strong>{lifecycleTitle}</strong><small>{lifecycleDescription}</small></div></div>
      <div className="event-lifecycle-actions">
        {active.status==='draft'&&<><button className="publish" disabled={busy} onClick={()=>transition('published')}>{busy?'Publicando…':'Publicar evento'}</button><button className="secondary-strong" disabled={busy} onClick={()=>transition('sales_open')}>Publicar com vendas abertas</button></>}
        {active.status==='published'&&<button className="secondary-strong" disabled={busy} onClick={()=>transition('sales_open')}>Abrir vendas</button>}
        {active.status==='sales_open'&&<button className="secondary-strong" disabled={busy} onClick={()=>transition('published')}>Pausar vendas</button>}
        {isPublic&&<a href={`https://gtrz.com.br/eventos/${encodeURIComponent(active.slug)}`} target="_blank" rel="noreferrer">Ver página pública</a>}
        {isPublic&&<button className="withdraw" disabled={busy} onClick={()=>transition('draft')}>Retirar do ar</button>}
      </div>
    </div>}

    {active&&posterReady&&<section className="event-poster-editor">
      <div className="event-poster-editor-copy">
        <span>ARTE OFICIAL DA EDIÇÃO</span>
        <strong>Post / flyer principal</strong>
        <p>Selecione a arte vertical que representa esta edição. Ela aparece em destaque no topo da página pública. Recomendado: proporção 4:5, como 1080 × 1350 px.</p>
      </div>
      <div className="event-poster-editor-control">
        <MediaPicker label="Post oficial / flyer" value={posterMediaId} onChange={setPosterMediaId}/>
        <button className="event-poster-save" disabled={posterSaving} onClick={savePoster}>{posterSaving?'Salvando…':'Salvar post oficial'}</button>
      </div>
    </section>}

    {notice&&<div className={`event-lifecycle-notice ${noticeError?'error':''}`}>{notice}</div>}
    <EventsV2 key={instance}/>
  </div>;
}
