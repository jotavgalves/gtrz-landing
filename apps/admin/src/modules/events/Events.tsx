import { useEffect,useRef,useState } from 'react';
import { API_BASE,api } from '../../lib/api';
import { MediaPicker } from '../../components/MediaPicker';
import { EventsV2 } from './EventsV2';
import './events-lifecycle.css';

type EventRow={id:string;slug:string;status:string;title?:string};
type TitleDesign={mode:'text'|'artwork';text:string;fontMediaId:string|null;artworkMediaId:string|null;artworkMime:string;color:string;glowEnabled:boolean;glowColor:string;glowBlur:number;glowOpacity:number;scale:number};
const defaultTitleDesign=(text='EVENTO'):TitleDesign=>({mode:'text',text,fontMediaId:null,artworkMediaId:null,artworkMime:'',color:'#fffdf8',glowEnabled:false,glowColor:'#ff1a12',glowBlur:18,glowOpacity:.7,scale:100});
const publicStatuses=new Set(['published','sales_open','sold_out','finished']);
const statusLabel:Record<string,string>={draft:'Rascunho',scheduled:'Agendado',published:'Publicado',sales_open:'Vendas abertas',sold_out:'Esgotado',finished:'Realizado',archived:'Arquivado'};
const parseTheme=(value:any)=>{if(value&&typeof value==='object')return value;try{return JSON.parse(value||'{}')}catch{return {}}};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

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
  const [titleDesign,setTitleDesign]=useState<TitleDesign>(defaultTitleDesign());
  const [assetUploading,setAssetUploading]=useState(false);
  const reopenSlug=useRef<string|null>(null);
  const lastDetectedSlug=useRef('');

  const loadPoster=async(id:string)=>{
    setPosterReady(false);
    try{
      const data=await api<any>(`/api/admin/events/${id}`);
      const theme=parseTheme(data?.event?.theme_json);
      setPosterMediaId(theme.posterMediaId||theme.poster_media_id||null);
      const saved=theme.posterTitle||{};
      setTitleDesign({...defaultTitleDesign(data?.localizations?.find?.((x:any)=>x.locale==='pt-BR')?.title||active?.title||'EVENTO'),...saved});
    }catch{
      setPosterMediaId(null);
      setTitleDesign(defaultTitleDesign(active?.title||'EVENTO'));
    }finally{setPosterReady(true)}
  };

  const refreshActive=async(slug:string)=>{
    if(!slug)return;
    try{const result=await api<any>('/api/admin/events');const row=(result.results||[]).find((item:any)=>item.slug===slug);if(row){const next={id:row.id,slug:row.slug,status:row.status,title:row.title};setActive(next);void loadPoster(row.id)}}catch{}
  };

  useEffect(()=>{
    const root=rootRef.current;if(!root)return;let timer:number|undefined;
    const sync=()=>{
      if(reopenSlug.current){const cards=Array.from(root.querySelectorAll<HTMLElement>('.event-admin-card'));const card=cards.find(node=>node.querySelector('code')?.textContent?.trim()===`/${reopenSlug.current}`);const button=card?.querySelector<HTMLButtonElement>('button.primary');if(button){const slug=reopenSlug.current;reopenSlug.current=null;button.click();if(slug)window.setTimeout(()=>refreshActive(slug),120);return}}
      const preview=root.querySelector<HTMLAnchorElement>('a[href*="gtrz.com.br/eventos/"]');
      if(!preview){if(lastDetectedSlug.current){lastDetectedSlug.current='';setActive(null);setPosterMediaId(null);setPosterReady(false)}return}
      try{const url=new URL(preview.href);const marker='/eventos/';const index=url.pathname.indexOf(marker);const slug=index>=0?decodeURIComponent(url.pathname.slice(index+marker.length)).replace(/^\/+|\/+$/g,''):'';if(slug&&slug!==lastDetectedSlug.current){lastDetectedSlug.current=slug;void refreshActive(slug)}}catch{}
    };
    const observer=new MutationObserver(()=>{if(timer)window.clearTimeout(timer);timer=window.setTimeout(sync,40)});observer.observe(root,{childList:true,subtree:true,attributes:true});sync();return()=>{observer.disconnect();if(timer)window.clearTimeout(timer)};
  },[instance]);

  useEffect(()=>{
    const root=rootRef.current;if(!root)return;
    const onClick=(event:MouseEvent)=>{const element=event.target as HTMLElement|null;const preview=element?.closest<HTMLAnchorElement>('a[href*="gtrz.com.br/eventos/"]');if(preview&&active&&!publicStatuses.has(active.status)){event.preventDefault();event.stopPropagation();setNoticeError(true);setNotice('Este evento ainda não está público. Use “Publicar evento” antes de abrir a página pública.')}};
    root.addEventListener('click',onClick,true);return()=>root.removeEventListener('click',onClick,true);
  },[active]);

  const transition=async(status:string)=>{if(!active||busy)return;setBusy(true);setNotice('');setNoticeError(false);try{await api(`/api/admin/events/${active.id}`,{method:'PATCH',body:JSON.stringify({status})});const previous=active;setActive({...active,status});reopenSlug.current=previous.slug;lastDetectedSlug.current='';setInstance(value=>value+1);if(status==='published')setNotice('Evento publicado. A página pública já pode ser acessada.');else if(status==='sales_open')setNotice('Evento publicado com vendas abertas.');else if(status==='draft')setNotice('Evento retirado do site e mantido como rascunho.');else setNotice(`Status alterado para ${statusLabel[status]||status}.`)}catch(error:any){setNoticeError(true);setNotice(error?.message||'Não foi possível alterar a publicação do evento.')}finally{setBusy(false)}};

  const savePoster=async()=>{if(!active||posterSaving)return;setPosterSaving(true);setNotice('');setNoticeError(false);try{const detail=await api<any>(`/api/admin/events/${active.id}`);const theme=parseTheme(detail?.event?.theme_json);const nextTheme={...theme,posterMediaId:posterMediaId||null,posterTitle:titleDesign};await api(`/api/admin/events/${active.id}`,{method:'PATCH',body:JSON.stringify({theme:nextTheme})});const slug=active.slug;reopenSlug.current=slug;lastDetectedSlug.current='';setInstance(value=>value+1);setNotice('Identidade do pôster salva. O título e o post oficial já estão vinculados ao evento.')}catch(error:any){setNoticeError(true);setNotice(error?.message||'Não foi possível salvar a identidade do pôster.')}finally{setPosterSaving(false)}};

  const uploadTitleAsset=async(file:File,kind:'font'|'artwork')=>{if(!file||assetUploading)return;setAssetUploading(true);setNotice('');setNoticeError(false);try{const form=new FormData();form.set('file',file);const result=await api<any>('/api/media',{method:'POST',body:form});if(kind==='font')setTitleDesign(v=>({...v,mode:'text',fontMediaId:result.id}));else setTitleDesign(v=>({...v,mode:'artwork',artworkMediaId:result.id,artworkMime:result.mimeType||file.type}));setNotice(kind==='font'?'Fonte enviada. Ajuste o preview e salve a identidade do pôster.':'Lettering enviado. Ajuste escala e glow e salve a identidade do pôster.')}catch(error:any){setNoticeError(true);setNotice(error?.message||'Falha ao enviar o arquivo.')}finally{setAssetUploading(false)}};

  const isPublic=!!active&&publicStatuses.has(active.status);
  const lifecycleTitle=active?.status==='draft'?'Este evento ainda não está no site':active?.status==='sales_open'?'Evento publicado · vendas abertas':active?.status==='published'?'Evento publicado no site':active?`Status: ${statusLabel[active.status]||active.status}`:'';
  const lifecycleDescription=active?.status==='draft'?'O rascunho só aparece no Control. Publique quando a página estiver pronta.':active?.status==='sales_open'?'A página está pública e os ingressos podem ser vendidos normalmente.':active?.status==='published'?'A página pública está disponível, mas o evento não está marcado como vendas abertas.':active?'Controle abaixo se este evento deve permanecer acessível ao público.':'';
  const glow=titleDesign.glowEnabled?`0 0 ${titleDesign.glowBlur}px color-mix(in srgb, ${titleDesign.glowColor} ${Math.round(titleDesign.glowOpacity*100)}%, transparent)`:undefined;
  const fontFace=titleDesign.fontMediaId?`url(${API_BASE}/api/media/${encodeURIComponent(titleDesign.fontMediaId)})`:'';

  return <div ref={rootRef} className="events-publish-shell" data-public={isPublic?'true':'false'}>
    {fontFace&&<style>{`@font-face{font-family:GTRZEventTitlePreview;src:${fontFace};font-display:swap}`}</style>}
    {active&&<div className="event-lifecycle-bar" data-state={active.status}><div className="event-lifecycle-copy"><span className="event-lifecycle-dot"/><div><strong>{lifecycleTitle}</strong><small>{lifecycleDescription}</small></div></div><div className="event-lifecycle-actions">{active.status==='draft'&&<><button className="publish" disabled={busy} onClick={()=>transition('published')}>{busy?'Publicando…':'Publicar evento'}</button><button className="secondary-strong" disabled={busy} onClick={()=>transition('sales_open')}>Publicar com vendas abertas</button></>}{active.status==='published'&&<button className="secondary-strong" disabled={busy} onClick={()=>transition('sales_open')}>Abrir vendas</button>}{active.status==='sales_open'&&<button className="secondary-strong" disabled={busy} onClick={()=>transition('published')}>Pausar vendas</button>}{isPublic&&<a href={`https://gtrz.com.br/eventos/${encodeURIComponent(active.slug)}`} target="_blank" rel="noreferrer">Ver página pública</a>}{isPublic&&<button className="withdraw" disabled={busy} onClick={()=>transition('draft')}>Retirar do ar</button>}</div></div>}

    {active&&posterReady&&<section className="event-poster-editor event-title-designer">
      <div className="event-poster-designer-main">
        <div className="event-poster-editor-copy"><span>IDENTIDADE DO PÔSTER</span><strong>Post e lettering do evento</strong><p>Use texto com fonte própria ou envie um lettering pronto em SVG, PNG ou WebP. O preview atualiza em tempo real.</p></div>
        <div className="poster-mode-switch"><button className={titleDesign.mode==='text'?'active':''} onClick={()=>setTitleDesign(v=>({...v,mode:'text'}))}>TEXTO + FONTE</button><button className={titleDesign.mode==='artwork'?'active':''} onClick={()=>setTitleDesign(v=>({...v,mode:'artwork'}))}>ARTE PRONTA</button></div>
        <div className="poster-designer-grid">
          <MediaPicker label="Post oficial / flyer" value={posterMediaId} onChange={setPosterMediaId}/>
          {titleDesign.mode==='text'?<>
            <label className="field"><span>Texto do título</span><input value={titleDesign.text} maxLength={80} onChange={e=>setTitleDesign(v=>({...v,text:e.target.value}))}/></label>
            <label className="file-drop compact-file"><input type="file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" onChange={e=>{const f=e.target.files?.[0];if(f)void uploadTitleAsset(f,'font')}}/><span>{assetUploading?'ENVIANDO…':titleDesign.fontMediaId?'TROCAR FONTE':'ENVIAR FONTE'}</span><small>WOFF2, WOFF, TTF ou OTF · até 8 MB</small></label>
          </>:<label className="file-drop compact-file"><input type="file" accept="image/svg+xml,image/png,image/webp,.svg,.png,.webp" onChange={e=>{const f=e.target.files?.[0];if(f)void uploadTitleAsset(f,'artwork')}}/><span>{assetUploading?'ENVIANDO…':titleDesign.artworkMediaId?'TROCAR LETTERING':'ENVIAR LETTERING'}</span><small>SVG, PNG ou WebP · até 8 MB</small></label>}
          <label className="color-field"><span>Cor</span><div><input type="color" value={titleDesign.color} onChange={e=>setTitleDesign(v=>({...v,color:e.target.value}))}/><code>{titleDesign.color}</code></div></label>
          <label className="poster-range"><span>Escala <b>{titleDesign.scale}%</b></span><input type="range" min="50" max="180" value={titleDesign.scale} onChange={e=>setTitleDesign(v=>({...v,scale:Number(e.target.value)}))}/></label>
          <label className="ticket-toggle poster-glow-toggle"><span>Glow</span><input type="checkbox" checked={titleDesign.glowEnabled} onChange={e=>setTitleDesign(v=>({...v,glowEnabled:e.target.checked}))}/></label>
          {titleDesign.glowEnabled&&<><label className="color-field"><span>Cor do glow</span><div><input type="color" value={titleDesign.glowColor} onChange={e=>setTitleDesign(v=>({...v,glowColor:e.target.value}))}/><code>{titleDesign.glowColor}</code></div></label><label className="poster-range"><span>Intensidade <b>{titleDesign.glowBlur}px</b></span><input type="range" min="0" max="48" value={titleDesign.glowBlur} onChange={e=>setTitleDesign(v=>({...v,glowBlur:clamp(Number(e.target.value),0,48)}))}/></label><label className="poster-range"><span>Opacidade <b>{Math.round(titleDesign.glowOpacity*100)}%</b></span><input type="range" min="0" max="100" value={Math.round(titleDesign.glowOpacity*100)} onChange={e=>setTitleDesign(v=>({...v,glowOpacity:clamp(Number(e.target.value)/100,0,1)}))}/></label></>}
        </div>
      </div>
      <div className="poster-live-preview" style={{backgroundImage:posterMediaId?`linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.5)),url(${API_BASE}/api/media/${posterMediaId})`:undefined}}>
        <span className="preview-label">PREVIEW AO VIVO</span>
        <div className="poster-preview-title" style={{transform:`scale(${titleDesign.scale/100})`,filter:titleDesign.mode==='artwork'&&titleDesign.glowEnabled?`drop-shadow(0 0 ${titleDesign.glowBlur}px ${titleDesign.glowColor})`:undefined}}>
          {titleDesign.mode==='artwork'&&titleDesign.artworkMediaId?<img src={`${API_BASE}/api/media/${titleDesign.artworkMediaId}`} alt=""/>:<strong style={{fontFamily:titleDesign.fontMediaId?'GTRZEventTitlePreview':'inherit',color:titleDesign.color,textShadow:glow}}>{titleDesign.text||active.title||active.slug}</strong>}
        </div>
        <button className="event-poster-save" disabled={posterSaving||assetUploading} onClick={savePoster}>{posterSaving?'Salvando…':'Salvar identidade do pôster'}</button>
      </div>
    </section>}

    {notice&&<div className={`event-lifecycle-notice ${noticeError?'error':''}`}>{notice}</div>}
    <EventsV2 key={instance}/>
  </div>;
}
