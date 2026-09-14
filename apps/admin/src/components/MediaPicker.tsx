import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, api } from '../lib/api';
import { Icon } from './Icons';

type Asset={id:string;file_name:string;mime_type:string;alt_pt?:string;alt_es?:string;created_at:string};

export function MediaPicker({label,value,onChange,allowEmpty=true}:{label:string;value?:string|null;onChange:(id:string|null)=>void;allowEmpty?:boolean}){
  const [assets,setAssets]=useState<Asset[]>([]);const [open,setOpen]=useState(false);const [query,setQuery]=useState('');const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{api<any>('/api/media').then(r=>setAssets(r.results||[])).catch(()=>{});},[]);
  useEffect(()=>{if(!open)return;const close=(event:MouseEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[open]);
  const selected=useMemo(()=>assets.find(a=>a.id===value),[assets,value]);
  const filtered=useMemo(()=>assets.filter(a=>!query||`${a.file_name} ${a.alt_pt||''} ${a.alt_es||''}`.toLowerCase().includes(query.toLowerCase())),[assets,query]);
  return <div className="media-picker" ref={root}>
    <span className="field-label">{label}</span>
    <button type="button" className={`media-picker-current ${selected?'has-media':''}`} onClick={()=>setOpen(v=>!v)}>
      {selected?<><img src={`${API_BASE}/api/media/${selected.id}`} alt=""/><span><strong>{selected.file_name}</strong><small>Selecionar outra imagem</small></span></>:<><i><Icon name="image" size={20}/></i><span><strong>Nenhuma imagem</strong><small>Abrir biblioteca</small></span></>}
      <Icon name="arrow" size={15}/>
    </button>
    {open&&<div className="media-picker-popover">
      <div className="media-picker-head"><label className="search-box"><Icon name="search" size={15}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar na biblioteca…"/></label><button type="button" className="icon-button" onClick={()=>setOpen(false)}><Icon name="close" size={16}/></button></div>
      {allowEmpty&&<button type="button" className={`media-picker-empty ${!value?'selected':''}`} onClick={()=>{onChange(null);setOpen(false)}}><span><Icon name="trash" size={15}/></span><div><strong>Sem imagem</strong><small>Remover a mídia deste campo</small></div></button>}
      <div className="media-picker-grid">{filtered.map(asset=><button type="button" key={asset.id} className={value===asset.id?'selected':''} onClick={()=>{onChange(asset.id);setOpen(false);setQuery('')}}><div><img src={`${API_BASE}/api/media/${asset.id}`} alt={asset.alt_pt||''} loading="lazy"/>{value===asset.id&&<i><Icon name="check" size={13}/></i>}</div><span>{asset.file_name}</span></button>)}</div>
      {!filtered.length&&<div className="media-picker-no-results"><Icon name="media" size={22}/><strong>{assets.length?'Nenhuma imagem encontrada':'Biblioteca vazia'}</strong><span>{assets.length?'Tente outro termo de busca.':'Envie imagens no módulo Mídia.'}</span></div>}
    </div>}
  </div>;
}
