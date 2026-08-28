const COPY_FIELDS=[
['navSound','Navegação · Música'],['navDjs','Navegação · DJs'],['navVenue','Navegação · Local'],
['dateLabel','Label · Data'],['timeLabel','Label · Horário'],['cityLabel','Label · Cidade'],['venueLabel','Label · Local'],
['heroTitle','Título do Hero'],['heroCopy','Texto do Hero'],['buyNoFee','Botão · Comprar sem taxa'],['buySympla','Botão · Sympla'],
['cityTitle','Título João Pessoa'],['cityCopy','Texto João Pessoa'],
['soundKicker','Kicker da música'],['soundTitle','Título da música'],['soundCopy','Texto da música'],
['refsKicker','Kicker das referências'],['refsTitle','Título das referências'],['refsCopy','Texto das referências'],
['lineupTitle','Título dos DJs'],['lineupIntro','Introdução dos DJs'],
['venueKicker','Kicker do local'],['venueCopy','Texto do local'],['openMap','Botão · Como chegar'],
['currentLot','Label · Lote atual'],['lotWord','Palavra · LOTE'],['ticketNote','Texto do ingresso'],
['countKicker','Kicker da contagem'],['countTitle','Título da contagem'],['countCopy','Texto da contagem'],['days','Label · Dias'],['hours','Label · Horas'],['mins','Label · Min'],['secs','Label · Seg'],
['faqTitle','Título do FAQ'],['q1','FAQ · Pergunta 1'],['a1','FAQ · Resposta 1'],['q2','FAQ · Pergunta 2'],['q3','FAQ · Pergunta 3'],['a3','FAQ · Resposta 3'],['q4','FAQ · Pergunta 4'],['a4','FAQ · Resposta 4'],
['finalTitle','Título final'],['finalCopy','Texto final'],['floatBtn','Botão flutuante']
];
const SECTION_LABELS={hero:'Hero',runner:'Faixa animada',statement:'João Pessoa',sound:'Música',references:'Cards de artistas',djs:'DJs',date:'Data do evento',venue:'Local + Google Maps',tickets:'Ingressos',countdown:'Contagem regressiva',faq:'FAQ',final:'CTA final'};
const ARTISTS=['ANITTA','BAD BUNNY','CARLOS VIVES','DADDY YANKEE','DIOMENDES DÍAS','DON OMAR','EL ALFA','JUAN LUIS GUERRA','KAROL G','OSCAR D LEON','ROMEO SANTOS','SHAKIRA'];
let config=null;const $=id=>document.getElementById(id);
function status(msg,ok=false){$('status').textContent=msg;$('status').classList.toggle('ok',ok)}
function showLogin(msg=''){loginView.classList.remove('hidden');appView.classList.add('hidden');loginError.textContent=msg}
function showApp(){loginView.classList.add('hidden');appView.classList.remove('hidden')}
function buildCopyFields(){for(const lang of ['pt','es']){const panel=document.querySelector(`[data-panel="${lang}"]`);panel.innerHTML='';COPY_FIELDS.forEach(([key,label])=>{const d=document.createElement('div');d.className='field';d.innerHTML=`<label>${label}</label><textarea id="copy-${lang}-${key}"></textarea>`;panel.appendChild(d)})}}
function buildSections(){sectionSwitches.innerHTML=Object.entries(SECTION_LABELS).map(([key,label])=>`<label class="switch"><span>${label}</span><input type="checkbox" data-section-key="${key}"></label>`).join('')}
function buildTicketControls(){
 const body=document.querySelector('#evento .section-body');if(!body||$('ticketAdminBlock'))return;
 const block=document.createElement('div');block.id='ticketAdminBlock';block.style.cssText='margin-top:26px;padding-top:24px;border-top:1px solid #2b2b2b';
 block.innerHTML=`
 <div style="margin-bottom:18px"><strong style="display:block;font-size:.95rem;margin-bottom:5px">Controle dos ingressos</strong><div class="help">Marcar como esgotado mantém o card visível, mas bloqueia a compra. Desativar Promo Duo ou Entrada en Puerta remove o card da landing.</div></div>
 <div style="padding:16px 0;border-bottom:1px solid #242424">
   <div style="margin-bottom:12px"><strong>Ingresso individual · lote atual</strong></div>
   <div class="grid3"><label class="switch" style="min-height:46px"><span>Individual esgotado</span><input id="individualSoldOut" type="checkbox"></label></div>
 </div>
 <div style="padding:18px 0;border-bottom:1px solid #242424">
   <div style="margin-bottom:12px"><strong>Promo Duo</strong><div class="help">O preço é calculado automaticamente: 2 × (preço atual − desconto por pessoa).</div></div>
   <div class="grid3"><label class="switch" style="min-height:46px"><span>Promo Duo ativa</span><input id="duoEnabled" type="checkbox"></label><label class="switch" style="min-height:46px"><span>Promo Duo esgotada</span><input id="duoSoldOut" type="checkbox"></label><div class="field"><label>Desconto por pessoa · R$</label><input id="duoDiscountPerTicket" type="number" min="0" step="1" value="10"></div></div>
   <div class="field" style="margin-top:12px"><label>Prévia calculada</label><div id="duoPreview" style="min-height:46px;display:flex;align-items:center;padding:0 12px;border:1px solid #333;background:#111;font-weight:800">—</div></div>
 </div>
 <div style="padding-top:18px">
   <div style="margin-bottom:12px"><strong>Entrada en Puerta</strong><div class="help">Ingresso vendido presencialmente na entrada do evento. Deixe o preço vazio se ainda não quiser divulgar o valor.</div></div>
   <div class="grid3"><label class="switch" style="min-height:46px"><span>Entrada en Puerta ativa</span><input id="doorEnabled" type="checkbox"></label><label class="switch" style="min-height:46px"><span>Entrada en Puerta esgotada</span><input id="doorSoldOut" type="checkbox"></label><div class="field"><label>Preço na porta · R$</label><input id="doorPrice" type="number" min="0" step="1" placeholder="Deixe vazio para não divulgar"></div></div>
 </div>`;
 body.appendChild(block);
}
function updateDuoPreview(){const out=$('duoPreview');if(!out)return;const p=Math.max(0,Number($('price')?.value||0));const raw=Math.max(0,Number($('duoDiscountPerTicket')?.value||0));const d=Math.min(p,raw);const unit=Math.max(0,p-d);const total=unit*2;const saving=d*2;out.textContent=`2 por R$ ${total.toLocaleString('pt-BR')} · R$ ${unit.toLocaleString('pt-BR')} por pessoa · economiza R$ ${saving.toLocaleString('pt-BR')}`}
function setPreview(container,url,label){container.innerHTML='';if(url){const img=new Image();img.src=url;img.alt=label;container.appendChild(img)}else container.textContent=label}
function autoMapUrl(){const q=address.value.replace(/\n/g,', ').trim();return q?`https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`:''}
function fill(c){
 config=structuredClone(c||{});
 for(const k of ['lot','price','date','eventDateLabel','eventTimeLabel','city','venue','wa','sympla','insta','email','address','mapLink','mapEmbedUrl','vognPhoto','glitzyPhoto','tickerSeconds'])if($(k))$(k).value=config[k]??'';
 if($('individualSoldOut'))$('individualSoldOut').checked=config.individualSoldOut===true;
 if($('duoEnabled'))$('duoEnabled').checked=config.duoEnabled!==false;
 if($('duoSoldOut'))$('duoSoldOut').checked=config.duoSoldOut===true;
 if($('duoDiscountPerTicket'))$('duoDiscountPerTicket').value=config.duoDiscountPerTicket??10;
 if($('doorEnabled'))$('doorEnabled').checked=config.doorEnabled!==false;
 if($('doorSoldOut'))$('doorSoldOut').checked=config.doorSoldOut===true;
 if($('doorPrice'))$('doorPrice').value=config.doorPrice??'';
 updateDuoPreview();
 waMessagePt.value=config.waMessage?.pt||'';waMessageEs.value=config.waMessage?.es||'';
 genresPt.value=(config.genres?.pt||[]).join('\n');genresEs.value=(config.genres?.es||[]).join('\n');tickerItems.value=(config.tickerItems||[]).join('\n');artistCards.value=(config.artistCards||ARTISTS).join('\n');
 const preview=config.mapEmbedUrl||autoMapUrl();mapPreview.src=preview||'about:blank';setPreview(vognPreview,config.vognPhoto,'DJ VOGN');setPreview(glitzyPreview,config.glitzyPhoto,'DJ GLITZY');
 for(const lang of ['pt','es'])for(const [key] of COPY_FIELDS){const e=$(`copy-${lang}-${key}`);if(e)e.value=config.copy?.[lang]?.[key]??''}
 vognTextPt.value=config.copy?.pt?.vognText||'';vognTextEs.value=config.copy?.es?.vognText||'';glitzyTextPt.value=config.copy?.pt?.glitzyText||'';glitzyTextEs.value=config.copy?.es?.glitzyText||'';
 document.querySelectorAll('[data-section-key]').forEach(x=>x.checked=config.sections?.[x.dataset.sectionKey]!==false);
 advancedConfig.value=JSON.stringify(config,null,2)
}
async function load(){status('Carregando…');const r=await fetch('/api/admin/content',{cache:'no-store'});if(r.status===401)return showLogin();const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok){showLogin(d.error||'Não foi possível carregar o painel');return}fill(d.config);showApp();status('Conteúdo carregado',true)}
function lines(value){return value.split('\n').map(x=>x.trim()).filter(Boolean)}
function collect(updateAdvanced=true){
 const c=structuredClone(config||{});
 for(const k of ['date','eventDateLabel','eventTimeLabel','city','venue','wa','sympla','insta','email','address','mapLink','mapEmbedUrl','vognPhoto','glitzyPhoto'])c[k]=$(k).value.trim();
 c.waMessage={pt:waMessagePt.value.trim(),es:waMessageEs.value.trim()};
 c.lot=Math.max(1,Number(lot.value||1));c.price=Math.max(0,Number(price.value||0));
 c.individualSoldOut=$('individualSoldOut')?$('individualSoldOut').checked:false;
 c.duoEnabled=$('duoEnabled')?$('duoEnabled').checked:true;
 c.duoSoldOut=$('duoSoldOut')?$('duoSoldOut').checked:false;
 c.duoDiscountPerTicket=Math.min(c.price,Math.max(0,Number($('duoDiscountPerTicket')?.value??10)));
 c.doorEnabled=$('doorEnabled')?$('doorEnabled').checked:true;
 c.doorSoldOut=$('doorSoldOut')?$('doorSoldOut').checked:false;
 const rawDoorPrice=$('doorPrice')?.value.trim()??'';c.doorPrice=rawDoorPrice===''?null:Math.max(0,Number(rawDoorPrice)||0);
 c.tickerSeconds=Math.min(120,Math.max(18,Number(tickerSeconds.value)||42));c.tickerItems=lines(tickerItems.value);c.artistCards=lines(artistCards.value).filter(x=>ARTISTS.includes(x));
 c.genres={pt:lines(genresPt.value),es:lines(genresEs.value)};c.copy=c.copy||{pt:{},es:{}};
 for(const lang of ['pt','es']){c.copy[lang]=c.copy[lang]||{};for(const [key] of COPY_FIELDS)c.copy[lang][key]=$(`copy-${lang}-${key}`).value.trim()}
 c.copy.pt.vognText=vognTextPt.value.trim();c.copy.es.vognText=vognTextEs.value.trim();c.copy.pt.glitzyText=glitzyTextPt.value.trim();c.copy.es.glitzyText=glitzyTextEs.value.trim();
 c.sections={};document.querySelectorAll('[data-section-key]').forEach(x=>c.sections[x.dataset.sectionKey]=x.checked);
 if(updateAdvanced)advancedConfig.value=JSON.stringify(c,null,2);return c
}
async function save(){status('Salvando…');let payload;try{payload=collect()}catch(e){return alert(e.message)}const r=await fetch('/api/admin/content',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});if(r.status===401)return showLogin('Sessão expirada');const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok){status(d.error||'Erro ao salvar');alert(d.error||'Erro ao salvar');return}fill(d.config);status('Alterações publicadas',true)}
loginForm.addEventListener('submit',async e=>{e.preventDefault();loginError.textContent='';const r=await fetch('/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:password.value})});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok){loginError.textContent=d.error||'Erro ao entrar';return}password.value='';await load()});
logoutBtn.addEventListener('click',async()=>{await fetch('/api/admin/logout',{method:'POST'});showLogin()});reloadBtn.onclick=load;saveTop.onclick=save;saveBottom.onclick=save;
generateMapBtn.onclick=()=>{mapEmbedUrl.value=autoMapUrl();mapPreview.src=mapEmbedUrl.value||'about:blank';status('Iframe gerado. Salve as alterações.',true)};
mapEmbedUrl.addEventListener('input',()=>{mapPreview.src=mapEmbedUrl.value||autoMapUrl()||'about:blank'});address.addEventListener('input',()=>{if(!mapEmbedUrl.value.trim())mapPreview.src=autoMapUrl()||'about:blank'});vognPhoto.addEventListener('input',()=>setPreview(vognPreview,vognPhoto.value,'DJ VOGN'));glitzyPhoto.addEventListener('input',()=>setPreview(glitzyPreview,glitzyPhoto.value,'DJ GLITZY'));
document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-lang]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('[data-panel]').forEach(p=>p.classList.toggle('active',p.dataset.panel===b.dataset.lang))});
document.querySelectorAll('[data-upload]').forEach(btn=>btn.onclick=async()=>{const slot=btn.dataset.upload,file=$(slot+'File').files[0];if(!file)return alert('Selecione uma imagem');btn.disabled=true;btn.textContent='Enviando…';try{const fd=new FormData();fd.append('file',file);fd.append('slot',slot);const r=await fetch('/api/admin/upload',{method:'POST',body:fd});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.error||'Falha no upload');$(slot+'Photo').value=d.url;setPreview($(slot+'Preview'),d.url,slot);status('Imagem enviada. Salve as alterações.',true)}catch(e){alert(e.message)}finally{btn.disabled=false;btn.textContent='Enviar foto'}});
refreshJsonBtn.onclick=()=>{advancedConfig.value=JSON.stringify(collect(false),null,2);status('JSON atualizado pelo formulário.',true)};
applyJsonBtn.onclick=()=>{try{const parsed=JSON.parse(advancedConfig.value);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('O JSON precisa ser um objeto.');fill(parsed);status('JSON aplicado ao formulário. Salve para publicar.',true)}catch(e){alert('JSON inválido: '+e.message)}};
buildCopyFields();buildSections();buildTicketControls();
$('price')?.addEventListener('input',updateDuoPreview);$('duoDiscountPerTicket')?.addEventListener('input',updateDuoPreview);$('duoEnabled')?.addEventListener('change',updateDuoPreview);
load();