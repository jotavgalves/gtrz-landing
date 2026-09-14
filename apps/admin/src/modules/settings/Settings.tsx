import { useEffect,useMemo,useState } from 'react';
import { api } from '../../lib/api';
import { Icon } from '../../components/Icons';
import { Empty,Notice,Panel } from '../../components/StateViews';

type SettingRow={key:string;value_json:string;updated_at:string};
const generalDefaults={siteName:'GTRZ Eventos',tagline:'Produção · cultura · experiência',contactEmail:'gtrzeventos@gmail.com',contactWhatsapp:'',defaultLocale:'pt-BR'};
const socialDefaults={instagram:'https://instagram.com/gtrzeventos',tiktok:'',youtube:'',whatsapp:'',x:''};

function safeParse(value:string,fallback:any={}){try{return JSON.parse(value)}catch{return fallback}}

export function Settings(){
  const [rows,setRows]=useState<SettingRow[]>([]);const [general,setGeneral]=useState<any>(generalDefaults);const [social,setSocial]=useState<any>(socialDefaults);const [selected,setSelected]=useState<string>('');const [raw,setRaw]=useState('{}');const [newKey,setNewKey]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  const load=async()=>{const data=await api<any>('/api/admin/settings');const next=data.results||[];setRows(next);const g=next.find((x:SettingRow)=>x.key==='general');const s=next.find((x:SettingRow)=>x.key==='social');setGeneral({...generalDefaults,...(g?safeParse(g.value_json):{})});setSocial({...socialDefaults,...(s?safeParse(s.value_json):{})});if(selected){const current=next.find((x:SettingRow)=>x.key===selected);if(current)setRaw(JSON.stringify(safeParse(current.value_json),null,2))}};
  useEffect(()=>{load().catch(e=>setMessage(e.message));},[]);
  const saveKey=async(key:string,value:any)=>{setBusy(true);setMessage('');try{await api(`/api/admin/settings/${encodeURIComponent(key)}`,{method:'PUT',body:JSON.stringify(value)});setMessage(`Configuração “${key}” salva.`);await load();}catch(e:any){setMessage(e.message)}finally{setBusy(false)}};
  const openAdvanced=(row:SettingRow)=>{setSelected(row.key);setRaw(JSON.stringify(safeParse(row.value_json),null,2));};
  const saveRaw=async()=>{try{await saveKey(selected,JSON.parse(raw));}catch{setMessage('JSON inválido. Corrija o conteúdo antes de salvar.')}};
  const createSetting=async()=>{const key=newKey.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'_');if(!key)return;await saveKey(key,{});setNewKey('');setSelected(key);setRaw('{}')};
  const advancedRows=useMemo(()=>rows.filter(r=>!['general','social','event_popup'].includes(r.key)),[rows]);
  return <div className="module-stack">
    <Panel title="Site e identidade" eyebrow="Configurações" description="Dados institucionais globais que podem ser consumidos pelo site, formulários e integrações.">
      <div className="settings-grid">
        <section className="settings-card"><div className="settings-card-head"><div><span>GERAL</span><h3>Identidade institucional</h3></div><Icon name="globe"/></div><div className="form-grid"><label><span>Nome da marca</span><input value={general.siteName||''} onChange={e=>setGeneral((v:any)=>({...v,siteName:e.target.value}))}/></label><label><span>Idioma padrão</span><select value={general.defaultLocale||'pt-BR'} onChange={e=>setGeneral((v:any)=>({...v,defaultLocale:e.target.value}))}><option value="pt-BR">Português</option><option value="es">Español</option></select></label><label className="wide"><span>Assinatura / tagline</span><input value={general.tagline||''} onChange={e=>setGeneral((v:any)=>({...v,tagline:e.target.value}))}/></label><label><span>E-mail de contato</span><input type="email" value={general.contactEmail||''} onChange={e=>setGeneral((v:any)=>({...v,contactEmail:e.target.value}))}/></label><label><span>WhatsApp institucional</span><input value={general.contactWhatsapp||''} onChange={e=>setGeneral((v:any)=>({...v,contactWhatsapp:e.target.value}))}/></label></div><button className="primary" disabled={busy} onClick={()=>saveKey('general',general)}><Icon name="save" size={16}/> Salvar geral</button></section>
        <section className="settings-card"><div className="settings-card-head"><div><span>SOCIAL</span><h3>Canais oficiais</h3></div><Icon name="link"/></div><div className="form-grid"><label className="wide"><span>Instagram</span><input value={social.instagram||''} onChange={e=>setSocial((v:any)=>({...v,instagram:e.target.value}))}/></label><label><span>TikTok</span><input value={social.tiktok||''} onChange={e=>setSocial((v:any)=>({...v,tiktok:e.target.value}))}/></label><label><span>YouTube</span><input value={social.youtube||''} onChange={e=>setSocial((v:any)=>({...v,youtube:e.target.value}))}/></label><label><span>WhatsApp</span><input value={social.whatsapp||''} onChange={e=>setSocial((v:any)=>({...v,whatsapp:e.target.value}))}/></label><label><span>X / Twitter</span><input value={social.x||''} onChange={e=>setSocial((v:any)=>({...v,x:e.target.value}))}/></label></div><button className="primary" disabled={busy} onClick={()=>saveKey('social',social)}><Icon name="save" size={16}/> Salvar redes</button></section>
      </div>{message&&<Notice tone={message.toLowerCase().includes('inválido')||message.toLowerCase().includes('error')?'error':'success'}>{message}</Notice>}
    </Panel>

    <Panel title="Configurações avançadas" eyebrow="Chaves do site" description="Tudo que existe em site_settings pode ser inspecionado e editado. As chaves do popup ficam no módulo Marketing.">
      <div className="advanced-settings">
        <aside className="settings-key-list"><div className="settings-new-key"><input value={newKey} onChange={e=>setNewKey(e.target.value)} placeholder="nova_chave"/><button className="icon-button" onClick={createSetting} title="Criar chave"><Icon name="plus"/></button></div>{advancedRows.length?advancedRows.map(row=><button key={row.key} className={selected===row.key?'active':''} onClick={()=>openAdvanced(row)}><strong>{row.key}</strong><small>{new Date(row.updated_at).toLocaleString('pt-BR')}</small></button>):<Empty icon="settings">Nenhuma chave adicional.</Empty>}</aside>
        <div className="settings-json-editor">{selected?<><div className="editor-section-head"><div><small>CHAVE</small><h3>{selected}</h3></div><button className="primary" onClick={saveRaw} disabled={busy}><Icon name="save" size={16}/> Salvar JSON</button></div><textarea className="code-editor" spellCheck={false} value={raw} onChange={e=>setRaw(e.target.value)}/><p className="hint">Objeto JSON persistido no D1. Use este editor para opções que ainda não possuem formulário visual dedicado.</p></>:<div className="settings-empty"><Icon name="settings" size={28}/><strong>Selecione uma chave</strong><span>Você verá o JSON completo e poderá editar qualquer propriedade.</span></div>}</div>
      </div>
    </Panel>
  </div>;
}
