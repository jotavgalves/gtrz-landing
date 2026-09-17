import { useMemo,useRef } from 'react';
import './popup-visual-editor.css';

type Props={popup:any;setPopup:(updater:any)=>void;activeEvents:any[];busy:boolean;onSave:()=>void};
const defaults={
  kicker:'AGENDA GTRZ',titleTop:'PRÓXIMAS NOITES GTRZ.',titleBottom:'ESCOLHA A SUA.',subtitle:'Escolha sua próxima noite.',continueText:'CONTINUAR NO SITE',
  kickerColor:'#9a9491',titleColor:'#fffdf8',highlightColor:'#ff2118',subtitleColor:'#9a9491',continueColor:'#ffffff',cardTextColor:'#fffdf8',cardMetaColor:'#8b8582',cardAccent:'#ff2118',ctaBg:'#111111',ctaText:'#ffffff',
  headlineX:0,headlineY:0,subtitleX:0,subtitleY:0,cardsX:0,cardsY:0,continueX:0,continueY:0,cardTitleY:6,modalWidth:940,cardMediaWidth:120
};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function PopupVisualEditor({popup,setPopup,activeEvents,busy,onSave}:Props){
  const visual={...defaults,...(popup.visual||{})};
  const update=(patch:any)=>setPopup((p:any)=>({...p,visual:{...defaults,...(p.visual||{}),...patch}}));
  const previewEvents=useMemo(()=>activeEvents.slice(0,2),[activeEvents]);
  const stageRef=useRef<HTMLDivElement|null>(null);
  const drag=(keyX:string,keyY:string)=>(e:any)=>{
    e.preventDefault();
    const startX=e.clientX,startY=e.clientY,baseX=Number(visual[keyX]||0),baseY=Number(visual[keyY]||0);
    const move=(ev:PointerEvent)=>update({[keyX]:clamp(baseX+ev.clientX-startX,-120,120),[keyY]:clamp(baseY+ev.clientY-startY,-100,100)});
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
  };
  const color=(label:string,key:string)=><label className="popup-editor-color"><span>{label}</span><div><input type="color" value={visual[key]} onChange={e=>update({[key]:e.target.value})}/><code>{visual[key]}</code></div></label>;
  const range=(label:string,key:string,min:number,max:number,unit='px')=><label className="popup-editor-range"><span>{label}<b>{visual[key]}{unit}</b></span><input type="range" min={min} max={max} value={visual[key]} onChange={e=>update({[key]:Number(e.target.value)})}/></label>;
  return <div className="popup-editor-shell">
    <section className="settings-card popup-editor-controls">
      <div className="settings-card-head"><div><span>EDITOR VISUAL</span><h3>Popup de eventos</h3></div><label className="switch"><input type="checkbox" checked={Boolean(popup.enabled)} onChange={e=>setPopup((p:any)=>({...p,enabled:e.target.checked}))}/><i/></label></div>
      <div className="popup-editor-group"><strong>Comportamento</strong><div className="form-grid"><label><span>Frequência</span><select value={popup.frequency} onChange={e=>setPopup((p:any)=>({...p,frequency:e.target.value}))}><option value="session">1 vez por sessão</option><option value="day">1 vez por dia</option><option value="always">Sempre que entrar</option></select></label><label><span>Atraso</span><input type="number" min="0" max="15000" step="100" value={popup.delayMs} onChange={e=>setPopup((p:any)=>({...p,delayMs:Number(e.target.value)}))}/></label><label><span>Máximo de eventos</span><input type="number" min="1" max="6" value={popup.maxEvents} onChange={e=>setPopup((p:any)=>({...p,maxEvents:Number(e.target.value)}))}/></label><label><span>Evento específico</span><select value={popup.selectedEventId||''} onChange={e=>setPopup((p:any)=>({...p,selectedEventId:e.target.value}))}><option value="">Todos os eventos ativos</option>{activeEvents.map(e=><option key={e.id} value={e.id}>{e.title||e.slug}</option>)}</select></label></div></div>
      <div className="popup-editor-group"><strong>Textos</strong><div className="form-grid"><label><span>Agenda / kicker</span><input value={visual.kicker} onChange={e=>update({kicker:e.target.value})}/></label><label><span>Título principal</span><input value={visual.titleTop} onChange={e=>update({titleTop:e.target.value})}/></label><label><span>Destaque</span><input value={visual.titleBottom} onChange={e=>update({titleBottom:e.target.value})}/></label><label><span>Texto de apoio</span><input value={visual.subtitle} onChange={e=>update({subtitle:e.target.value})}/></label><label className="wide"><span>Continuar</span><input value={visual.continueText} onChange={e=>update({continueText:e.target.value})}/></label></div></div>
      <div className="popup-editor-group"><strong>Cores</strong><div className="popup-editor-colors">{color('Agenda', 'kickerColor')}{color('Título','titleColor')}{color('Destaque','highlightColor')}{color('Apoio','subtitleColor')}{color('Continuar','continueColor')}{color('Texto dos cards','cardTextColor')}{color('Meta dos cards','cardMetaColor')}{color('Acento','cardAccent')}{color('CTA fundo','ctaBg')}{color('CTA texto','ctaText')}</div></div>
      <div className="popup-editor-group"><strong>Posição e tamanho</strong><p className="muted">Arraste os blocos na prévia ou use os controles abaixo. Os deslocamentos são limitados para preservar o mobile.</p><div className="popup-editor-ranges">{range('Título X','headlineX',-120,120)}{range('Título Y','headlineY',-80,80)}{range('Apoio X','subtitleX',-120,120)}{range('Apoio Y','subtitleY',-80,80)}{range('Cards X','cardsX',-80,80)}{range('Cards Y','cardsY',-60,60)}{range('Continuar X','continueX',-120,120)}{range('Continuar Y','continueY',-60,60)}{range('Título dentro do card','cardTitleY',-20,50)}{range('Largura do modal','modalWidth',760,1120)}{range('Largura da mídia','cardMediaWidth',80,190)}</div></div>
      <button className="primary" disabled={busy} onClick={onSave}>Salvar e publicar visual</button>
    </section>
    <section className="popup-editor-preview"><div className="popup-editor-preview-head"><div><span>PREVIEW AO VIVO</span><strong>Desktop</strong></div><small>Arraste título, apoio, cards e botão de continuar.</small></div><div ref={stageRef} className="popup-editor-stage"><div className="popup-editor-modal" style={{maxWidth:`${visual.modalWidth}px`}}>
      <div className="popup-editor-brand"><span>◇</span><b style={{color:visual.kickerColor}}>{visual.kicker}</b></div>
      <div className="popup-editor-heading" onPointerDown={drag('headlineX','headlineY')} style={{transform:`translate(${visual.headlineX}px,${visual.headlineY}px)`}}><h4 style={{color:visual.titleColor}}>{visual.titleTop}</h4><h4 style={{color:visual.highlightColor}}>{visual.titleBottom}</h4></div>
      <p className="popup-editor-subtitle" onPointerDown={drag('subtitleX','subtitleY')} style={{color:visual.subtitleColor,transform:`translate(${visual.subtitleX}px,${visual.subtitleY}px)`}}>{visual.subtitle}</p>
      <div className="popup-editor-event-grid" onPointerDown={drag('cardsX','cardsY')} style={{transform:`translate(${visual.cardsX}px,${visual.cardsY}px)`}}>{(previewEvents.length?previewEvents:[{title:'MISTÉRIO',city:'JOÃO PESSOA'},{title:'MACABRA',city:'RECIFE'}]).map((e:any,i:number)=><article key={e.id||i}><div className="popup-editor-media" style={{width:visual.cardMediaWidth}}><span>POSTER</span></div><div className="popup-editor-card-copy"><small style={{color:visual.cardMetaColor}}>{e.city||'CIDADE'} · 24 OUT · 21H</small><b style={{color:visual.cardTextColor,transform:`translateY(${visual.cardTitleY}px)`}}>{e.title||e.slug}</b><span>LOCAL</span><strong>Local do evento</strong><button style={{background:visual.ctaBg,color:visual.ctaText,borderColor:visual.cardAccent}}>VER EVENTO →</button></div></article>)}</div>
      <button className="popup-editor-continue" onPointerDown={drag('continueX','continueY')} style={{color:visual.continueColor,transform:`translate(${visual.continueX}px,${visual.continueY}px)`}}>{visual.continueText} →</button>
    </div></div></section>
  </div>;
}
