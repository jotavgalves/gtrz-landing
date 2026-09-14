import { useEffect, useMemo, useState } from 'react';
import { API_BASE, api } from '../lib/api';

type Asset={id:string;file_name:string;mime_type:string;alt_pt?:string;alt_es?:string;created_at:string};

export function MediaPicker({
  label,
  value,
  onChange,
  allowEmpty=true
}:{
  label:string;
  value?:string|null;
  onChange:(id:string|null)=>void;
  allowEmpty?:boolean;
}){
  const [assets,setAssets]=useState<Asset[]>([]);
  const [open,setOpen]=useState(false);
  useEffect(()=>{api<any>('/api/media').then(r=>setAssets(r.results||[])).catch(()=>{});},[]);
  const selected=useMemo(()=>assets.find(a=>a.id===value),[assets,value]);
  return <div className="media-picker">
    <span className="field-label">{label}</span>
    <button type="button" className="media-picker-current" onClick={()=>setOpen(v=>!v)}>
      {selected?<><img src={`${API_BASE}/api/media/${selected.id}`} alt=""/><span><strong>{selected.file_name}</strong><small>Trocar imagem</small></span></>:<span><strong>Nenhuma imagem</strong><small>Selecionar da biblioteca</small></span>}
    </button>
    {open&&<div className="media-picker-popover">
      {allowEmpty&&<button type="button" className={!value?'selected':''} onClick={()=>{onChange(null);setOpen(false)}}>Sem imagem</button>}
      <div className="media-picker-grid">{assets.map(asset=><button type="button" key={asset.id} className={value===asset.id?'selected':''} onClick={()=>{onChange(asset.id);setOpen(false)}}><img src={`${API_BASE}/api/media/${asset.id}`} alt={asset.alt_pt||''}/><span>{asset.file_name}</span></button>)}</div>
      {!assets.length&&<p className="muted">Envie imagens primeiro na Biblioteca de mídia.</p>}
    </div>}
  </div>;
}
