import { useEffect,useMemo,useRef,useState } from 'react';
import './popup-visual-editor.css';

type Props={popup:any;setPopup:(updater:any)=>void;activeEvents:any[];busy:boolean;onSave:()=>void};
type EditorTab='content'|'appearance'|'layout'|'behavior';
type Viewport='desktop'|'tablet'|'mobile';
type Block='headline'|'subtitle'|'cards'|'continue';

const defaults={
  kicker:'AGENDA GTRZ',titleTop:'PRÓXIMAS NOITES GTRZ.',titleBottom:'ESCOLHA A SUA.',subtitle:'Escolha sua próxima noite.',continueText:'CONTINUAR NO SITE',
  kickerColor:'#9a9491',titleColor:'#fffdf8',highlightColor:'#ff2118',subtitleColor:'#9a9491',continueColor:'#ffffff',cardTextColor:'#fffdf8',cardMetaColor:'#8b8582',cardAccent:'#ff2118',ctaBg:'#111111',ctaText:'#ffffff',popupBg:'#090909',popupBorder:'#282828',
  headlineX:0,headlineY:0,subtitleX:0,subtitleY:0,cardsX:0,cardsY:0,continueX:0,continueY:0,cardTitleY:6,modalWidth:940,cardMediaWidth:120,cardHeight:166,gap:12,
  headlineAlign:'left',subtitleAlign:'left',continueAlign:'center',cardsAlign:'stretch'
};
const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
const blockKeys:Record<Block,[string,string]>={headline:['headlineX','headlineY'],subtitle:['subtitleX','subtitleY'],cards:['cardsX','cardsY'],continue:['continueX','continueY']};

export function PopupVisualEditor({popup,setPopup,activeEvents,busy,onSave}:Props){
  const [tab,setTab]=useState<EditorTab>('content');
  const [viewport,setViewport]=useState<Viewport>('desktop');
  const [selected,setSelected]=useState<Block>('headline');
  const [historyTick,setHistoryTick]=useState(0);
  const iframeRef=useRef<HTMLIFrameElement|null>(null);
  const latestRef=useRef<any>(popup);
  const undoRef=useRef<any[]>([]);
  const redoRef=useRef<any[]>([]);
  useEffect(()=>{latestRef.current=popup},[popup]);
  const visual={...defaults,...(popup.visual||{})};
  const canUndo=undoRef.current.length>0,canRedo=redoRef.current.length>0;
  const activeLabel=useMemo(()=>selected==='headline'?'Título principal':selected==='subtitle'?'Texto de apoio':selected==='cards'?'Cards de eventos':'Continuar no site',[selected]);

  const commit=(mutate:(current:any)=>any,record=true)=>{
    const current=clone(latestRef.current||{});
    const next=mutate(clone(current));
    if(record){undoRef.current.push(current);if(undoRef.current.length>80)undoRef.current.shift();redoRef.current=[];setHistoryTick(v=>v+1)}
    latestRef.current=next;setPopup(next);
  };
  const updateVisual=(patch:any,record=true)=>commit(p=>({...p,visual:{...defaults,...(p.visual||{}),...patch}}),record);
  const updateRoot=(patch:any,record=true)=>commit(p=>({...p,...patch}),record);
  const undo=()=>{const previous=undoRef.current.pop();if(!previous)return;redoRef.current.push(clone(latestRef.current));latestRef.current=previous;setPopup(previous);setHistoryTick(v=>v+1)};
  const redo=()=>{const next=redoRef.current.pop();if(!next)return;undoRef.current.push(clone(latestRef.current));latestRef.current=next;setPopup(next);setHistoryTick(v=>v+1)};
  void historyTick;

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z')return;
      e.preventDefault();if(e.shiftKey)redo();else undo();
    };
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[]);

  const postState=()=>{try{iframeRef.current?.contentWindow?.postMessage({type:'gtrz-popup-editor-state',popup:latestRef.current},'https://gtrz.com.br')}catch{}};
  useEffect(()=>{const id=window.setTimeout(postState,40);return()=>window.clearTimeout(id)},[popup]);
  useEffect(()=>{
    const receive=(event:MessageEvent)=>{
      if(event.origin!=='https://gtrz.com.br'||!event.data)return;
      if(event.data.type==='gtrz-popup-editor-ready'){postState();return}
      if(event.data.type==='gtrz-popup-editor-select'&&blockKeys[event.data.block as Block]){setSelected(event.data.block as Block);return}
      if(event.data.type==='gtrz-popup-editor-move'&&blockKeys[event.data.block as Block]){
        const block=event.data.block as Block;const [xKey,yKey]=blockKeys[block];
        updateVisual({[xKey]:Number(event.data.x)||0,[yKey]:Number(event.data.y)||0},true);
      }
    };
    window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
  },[]);

  const color=(label:string,key:string)=><label className="pe-field pe-color"><span>{label}</span><div><input type="color" value={visual[key]} onChange={e=>updateVisual({[key]:e.target.value})}/><input value={visual[key]} onChange={e=>updateVisual({[key]:e.target.value})}/></div></label>;
  const range=(label:string,key:string,min:number,max:number,unit='px')=><label className="pe-field pe-range"><span>{label}<b>{visual[key]}{unit}</b></span><input type="range" min={min} max={max} value={visual[key]} onChange={e=>updateVisual({[key]:Number(e.target.value)})}/></label>;
  const align=(value:'left'|'center'|'right')=>{
    const key=selected==='headline'?'headlineAlign':selected==='subtitle'?'subtitleAlign':selected==='continue'?'continueAlign':null;
    if(key)updateVisual({[key]:value});
  };
  const resetSelected=()=>{const [x,y]=blockKeys[selected];updateVisual({[x]:0,[y]:0})};

  return <div className="pe-shell">
    <aside className="pe-sidebar">
      <div className="pe-sidebar-head"><div><span>EDITOR DO POPUP</span><h3>Popup de eventos</h3><small>Edite o popup real. O preview ao lado é o mesmo componente exibido no site.</small></div><label className="switch"><input type="checkbox" checked={Boolean(popup.enabled)} onChange={e=>updateRoot({enabled:e.target.checked})}/><i/></label></div>
      <nav className="pe-tabs"><button className={tab==='content'?'active':''} onClick={()=>setTab('content')}>Conteúdo</button><button className={tab==='appearance'?'active':''} onClick={()=>setTab('appearance')}>Aparência</button><button className={tab==='layout'?'active':''} onClick={()=>setTab('layout')}>Layout</button><button className={tab==='behavior'?'active':''} onClick={()=>setTab('behavior')}>Comportamento</button></nav>
      <div className="pe-scroll">
        {tab==='content'&&<div className="pe-panel"><div className="pe-section-title"><b>Textos públicos</b><span>Todo o texto principal do popup.</span></div><label className="pe-field"><span>Agenda / kicker</span><input value={visual.kicker} onChange={e=>updateVisual({kicker:e.target.value})}/></label><label className="pe-field"><span>Título principal</span><input value={visual.titleTop} onChange={e=>updateVisual({titleTop:e.target.value})}/></label><label className="pe-field"><span>Destaque</span><input value={visual.titleBottom} onChange={e=>updateVisual({titleBottom:e.target.value})}/></label><label className="pe-field"><span>Texto de apoio</span><textarea value={visual.subtitle} onChange={e=>updateVisual({subtitle:e.target.value})}/></label><label className="pe-field"><span>Continuar no site</span><input value={visual.continueText} onChange={e=>updateVisual({continueText:e.target.value})}/></label></div>}
        {tab==='appearance'&&<div className="pe-panel"><div className="pe-section-title"><b>Cores</b><span>Você pode controlar cada grupo separadamente.</span></div><div className="pe-color-grid">{color('Agenda','kickerColor')}{color('Título','titleColor')}{color('Destaque','highlightColor')}{color('Apoio','subtitleColor')}{color('Continuar','continueColor')}{color('Texto dos cards','cardTextColor')}{color('Meta dos cards','cardMetaColor')}{color('Acento','cardAccent')}{color('CTA fundo','ctaBg')}{color('CTA texto','ctaText')}{color('Fundo do popup','popupBg')}{color('Borda do popup','popupBorder')}</div></div>}
        {tab==='layout'&&<div className="pe-panel"><div className="pe-section-title"><b>Composição</b><span>Clique em um bloco no preview para selecioná-lo e arraste-o diretamente.</span></div><div className="pe-selected"><span>Editando</span><b>{activeLabel}</b></div><div className="pe-align-row"><button onClick={()=>align('left')} disabled={selected==='cards'} title="Alinhar à esquerda">≡</button><button onClick={()=>align('center')} disabled={selected==='cards'} title="Centralizar">≣</button><button onClick={()=>align('right')} disabled={selected==='cards'} title="Alinhar à direita">≡</button><button onClick={resetSelected}>Resetar posição</button></div><div className="pe-ranges">{range('Título do card Y','cardTitleY',-20,50)}{range('Largura do popup','modalWidth',760,1120)}{range('Largura da mídia','cardMediaWidth',0,190)}{range('Altura do card','cardHeight',140,240)}{range('Espaço entre cards','gap',6,32)}</div><p className="pe-hint">Ctrl+Z desfaz. Ctrl+Shift+Z refaz. As posições horizontais são limitadas no mobile para evitar quebra de layout.</p></div>}
        {tab==='behavior'&&<div className="pe-panel"><div className="pe-section-title"><b>Exibição</b><span>Controle quando e para quem o popup aparece.</span></div><label className="pe-field"><span>Frequência</span><select value={popup.frequency} onChange={e=>updateRoot({frequency:e.target.value})}><option value="session">1 vez por sessão</option><option value="day">1 vez por dia</option><option value="always">Sempre que entrar</option></select></label><label className="pe-field"><span>Atraso para abrir</span><input type="number" min="0" max="15000" step="100" value={popup.delayMs} onChange={e=>updateRoot({delayMs:Number(e.target.value)})}/></label><label className="pe-field"><span>Máximo de eventos</span><input type="number" min="1" max="6" value={popup.maxEvents} onChange={e=>updateRoot({maxEvents:Number(e.target.value)})}/></label><label className="pe-field"><span>Evento específico</span><select value={popup.selectedEventId||''} onChange={e=>updateRoot({selectedEventId:e.target.value})}><option value="">Todos os eventos ativos</option>{activeEvents.map(e=><option key={e.id} value={e.id}>{e.title||e.slug}</option>)}</select></label></div>}
      </div>
      <div className="pe-actions"><div><button onClick={undo} disabled={!canUndo}>↶ Desfazer</button><button onClick={redo} disabled={!canRedo}>↷ Refazer</button></div><button className="primary" disabled={busy} onClick={onSave}>Salvar alterações</button></div>
    </aside>
    <section className="pe-workspace">
      <header className="pe-workspace-head"><div><span>PREVIEW EXATO</span><strong>O mesmo popup de gtrz.com.br</strong></div><div className="pe-viewport"><button className={viewport==='desktop'?'active':''} onClick={()=>setViewport('desktop')}>Desktop</button><button className={viewport==='tablet'?'active':''} onClick={()=>setViewport('tablet')}>Tablet</button><button className={viewport==='mobile'?'active':''} onClick={()=>setViewport('mobile')}>Mobile</button></div></header>
      <div className={`pe-canvas ${viewport}`}><div className="pe-frame-wrap"><iframe ref={iframeRef} onLoad={postState} title="Preview exato do popup GTRZ" src="https://gtrz.com.br/?lang=pt-BR&popup=1&popupEditor=1"/></div></div>
      <footer className="pe-status"><span><i/> Preview conectado ao site público</span><span>Selecione e arraste blocos diretamente no popup.</span></footer>
    </section>
  </div>;
}
