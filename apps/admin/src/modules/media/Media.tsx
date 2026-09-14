import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { API_BASE, api } from '../../lib/api';
import { Empty, Panel } from '../../components/StateViews';

type Asset={id:string;file_name:string;mime_type:string;size_bytes:number;alt_pt?:string;alt_es?:string;created_at:string};

export function Media(){
  const [assets,setAssets]=useState<Asset[]>([]);
  const [file,setFile]=useState<File|null>(null);
  const [altPt,setAltPt]=useState('');
  const [altEs,setAltEs]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const load=()=>api<any>('/api/media').then(r=>setAssets(r.results||[])).catch(e=>setMessage(e.message));
  useEffect(()=>{load();},[]);
  const upload=async(e:FormEvent)=>{
    e.preventDefault(); if(!file)return;
    setBusy(true);setMessage('');
    const form=new FormData();form.set('file',file);form.set('altPt',altPt);form.set('altEs',altEs);
    try{await api('/api/media',{method:'POST',body:form});setFile(null);setAltPt('');setAltEs('');setMessage('Imagem enviada para a biblioteca.');await load();}
    catch(err:any){setMessage(err.message)}finally{setBusy(false)}
  };
  return <Panel title="Biblioteca de mídia" eyebrow="Cloudflare R2">
    <form className="media-upload" onSubmit={upload}>
      <div><strong>Novo asset</strong><p>JPEG, PNG ou WebP. Limite de 8 MB. SVG não é aceito pelo upload do painel.</p></div>
      <div className="form-grid">
        <label><span>Arquivo</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} required/></label>
        <label><span>Texto alternativo PT</span><input value={altPt} onChange={e=>setAltPt(e.target.value)} placeholder="Descrição acessível da imagem"/></label>
        <label><span>Texto alternativo ES</span><input value={altEs} onChange={e=>setAltEs(e.target.value)} placeholder="Descripción accesible de la imagen"/></label>
      </div>
      <div className="editor-footer"><span>{message}</span><button className="primary" disabled={busy||!file}>{busy?'Enviando…':'Enviar imagem'}</button></div>
    </form>
    {assets.length?<div className="media-grid">{assets.map(asset=><article key={asset.id}><div className="media-preview"><img src={`${API_BASE}/api/media/${asset.id}`} alt={asset.alt_pt||''}/></div><div className="media-meta"><strong>{asset.file_name}</strong><span>{asset.mime_type} · {(asset.size_bytes/1024).toFixed(0)} KB</span><small>{asset.alt_pt||'Sem alt PT'} / {asset.alt_es||'Sem alt ES'}</small><code>{asset.id}</code></div></article>)}</div>:<Empty>A biblioteca ainda está vazia neste ambiente.</Empty>}
  </Panel>;
}
