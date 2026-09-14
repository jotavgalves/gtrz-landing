import { useEffect,useState } from 'react';
import { api } from '../../lib/api';
import { Panel } from '../../components/StateViews';

type LinkDraft={slug:string;destinationPath:string;source:string;medium:string;content:string};
const initial:LinkDraft={slug:'',destinationPath:'/eventos/',source:'instagram',medium:'social',content:''};
export function Marketing(){
  const [links,setLinks]=useState<any[]>([]);const [draft,setDraft]=useState<LinkDraft>(initial);const [message,setMessage]=useState('');
  const load=()=>api<any>('/api/admin/tracking-links').then(r=>setLinks(r.results||[])).catch(()=>{});
  useEffect(()=>{load();},[]);
  const set=(key:keyof LinkDraft,value:string)=>setDraft(d=>({...d,[key]:value}));
  const create=async()=>{setMessage('');try{const result=await api<any>('/api/admin/tracking-links',{method:'POST',body:JSON.stringify(draft)});setMessage(`Criado: ${result.url}`);setDraft(initial);load();}catch(e:any){setMessage(e.message)}};
  return <Panel title="Marketing" eyebrow="Campanhas e aquisição">
    <div className="feature-cards"><article><strong>Popups</strong><p>Ative por evento, cidade, período, idioma e frequência.</p></article><article><strong>Links rastreáveis</strong><p>Crie /r/influencer, /r/parceiro e acompanhe a origem até a conversão.</p></article><article><strong>Campanhas</strong><p>Agrupe links, UTMs, eventos e resultados em uma única campanha.</p></article></div>
    <div className="create-form tracking-form"><h3>Novo link rastreável</h3><div className="form-grid"><label><span>Slug</span><input value={draft.slug} onChange={e=>set('slug',e.target.value)} placeholder="delicias-colombianas"/></label><label><span>Destino</span><input value={draft.destinationPath} onChange={e=>set('destinationPath',e.target.value)} placeholder="/eventos/el-perreo-de-mas-alla"/></label><label><span>Origem</span><input value={draft.source} onChange={e=>set('source',e.target.value)} placeholder="instagram"/></label><label><span>Meio</span><input value={draft.medium} onChange={e=>set('medium',e.target.value)} placeholder="social"/></label><label><span>Identificação</span><input value={draft.content} onChange={e=>set('content',e.target.value)} placeholder="parceiro-x"/></label></div><div className="editor-footer"><span>{message}</span><button className="primary" onClick={create}>Gerar link</button></div></div>
    <div className="list">{links.map(link=><article key={link.id}><div><strong>/r/{link.slug}</strong><span>{link.source} · {link.medium} → {link.destination_path}</span></div><div className="link-stats"><b>{link.click_count||0}</b><small>cliques</small></div></article>)}</div>
  </Panel>;
}
