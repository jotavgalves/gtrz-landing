import { useEffect,useMemo,useState } from 'react';
import { api } from '../../lib/api';
import { Empty,Panel } from '../../components/StateViews';

type Section={id:string;type:string;position:number;enabled:number;config_json:string;locales:Record<string,Record<string,any>>};
function ValueEditor({label,value,onChange}:{label:string;value:any;onChange:(value:any)=>void}){
  if(Array.isArray(value)) return <label className="field"><span>{label}</span><textarea value={JSON.stringify(value,null,2)} onChange={e=>{try{onChange(JSON.parse(e.target.value))}catch{}}}/><small>Lista estruturada. Mantenha o formato JSON.</small></label>;
  const multiline=typeof value==='string'&&value.length>90;
  return <label className="field"><span>{label}</span>{multiline?<textarea value={value??''} onChange={e=>onChange(e.target.value)}/>:<input value={value??''} onChange={e=>onChange(e.target.value)}/>}</label>;
}
function LocaleEditor({title,value,onChange}:{title:string;value:Record<string,any>;onChange:(v:Record<string,any>)=>void}){return <div className="locale-editor"><h4>{title}</h4>{Object.entries(value||{}).map(([key,val])=><ValueEditor key={key} label={key} value={val} onChange={next=>onChange({...value,[key]:next})}/>)}{!Object.keys(value||{}).length&&<p className="muted">Este bloco ainda não possui campos nesse idioma.</p>}</div>}

export function Content(){
  const [pages,setPages]=useState<any[]>([]);const [page,setPage]=useState<any>(null);const [sections,setSections]=useState<Section[]>([]);const [selected,setSelected]=useState<string>('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  useEffect(()=>{api<any>('/api/admin/pages').then(r=>setPages(r.results||[])).catch(()=>{});},[]);
  const openPage=async(id:string)=>{const data=await api<any>(`/api/admin/pages/${id}`);setPage(data.page);setSections(data.sections||[]);setSelected(data.sections?.[0]?.id||'');};
  const current=useMemo(()=>sections.find(s=>s.id===selected),[sections,selected]);
  const patchCurrent=(patch:Partial<Section>)=>setSections(list=>list.map(s=>s.id===selected?{...s,...patch}:s));
  const patchLocale=(locale:string,next:Record<string,any>)=>{if(!current)return;patchCurrent({locales:{...(current.locales||{}),[locale]:next}})};
  const save=async()=>{if(!page||!current)return;setBusy(true);setMessage('');try{await api(`/api/admin/pages/${page.id}/sections/${current.id}`,{method:'PUT',body:JSON.stringify({position:Number(current.position),enabled:Boolean(current.enabled),config:JSON.parse(current.config_json||'{}'),locales:current.locales})});setMessage('Bloco salvo.');}catch(e:any){setMessage(e.message)}finally{setBusy(false)}};
  if(!page)return <Panel title="Páginas e seções" eyebrow="CMS">{pages.length?<div className="list">{pages.map(p=><article key={p.id}><div><strong>/{p.slug}</strong><span>{p.template} · {p.status}</span></div><button className="primary" onClick={()=>openPage(p.id)}>Editar página</button></article>)}</div>:<Empty>Nenhuma página retornada pelo ambiente atual.</Empty>}<p className="hint">O conteúdo é dividido em blocos tipados. A edição altera o D1; componentes e segurança continuam protegidos no código.</p></Panel>;
  return <Panel title={`/${page.slug}`} eyebrow="Editor por blocos" action={<button onClick={()=>{setPage(null);setSections([])}}>Voltar</button>}><div className="block-editor"><aside className="block-list">{sections.sort((a,b)=>a.position-b.position).map(s=><button key={s.id} className={selected===s.id?'active':''} onClick={()=>setSelected(s.id)}><strong>{s.type}</strong><small>posição {s.position} · {s.enabled?'ativo':'oculto'}</small></button>)}</aside>{current&&<div className="block-form"><div className="block-toolbar"><label>Ordem<input type="number" value={current.position} onChange={e=>patchCurrent({position:Number(e.target.value)})}/></label><label className="toggle"><input type="checkbox" checked={Boolean(current.enabled)} onChange={e=>patchCurrent({enabled:e.target.checked?1:0})}/> Exibir seção</label></div><div className="locale-grid"><LocaleEditor title="Português" value={current.locales?.['pt-BR']||{}} onChange={v=>patchLocale('pt-BR',v)}/><LocaleEditor title="Español" value={current.locales?.es||{}} onChange={v=>patchLocale('es',v)}/></div><div className="editor-footer"><span>{message}</span><button className="primary" disabled={busy} onClick={save}>{busy?'Salvando…':'Salvar bloco'}</button></div></div>}</div></Panel>;
}
