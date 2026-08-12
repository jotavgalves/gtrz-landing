(() => {
  const $ = id => document.getElementById(id);
  const MAX_WIDTH = 1600;
  const MAX_HEIGHT = 2000;
  const MAX_UPLOAD_BYTES = 7 * 1024 * 1024;
  let sharePatched = false;

  function setLocalPreview(container, url, label) {
    if (!container) return;
    container.innerHTML = '';
    if (url) {
      const img = new Image();
      img.src = url;
      img.alt = label;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      container.appendChild(img);
    } else container.textContent = label;
  }

  function ensureShareSection() {
    const map = $('mapa');
    if (!map) return;
    if (!$('compartilhamento')) {
      const section = document.createElement('section');
      section.className = 'section';
      section.id = 'compartilhamento';
      section.innerHTML = `<div class="section-head"><h2>Compartilhamento do link</h2><p>Edite o preview que aparece quando o link é enviado no WhatsApp, Facebook, Telegram e outras plataformas.</p></div><div class="section-body"><div class="grid2"><div class="field"><label>Título do preview</label><input id="shareTitle" maxlength="100" placeholder="La Rumba Jampa — 29 AGO 2026"><div class="help">É o título mostrado junto ao link compartilhado.</div></div><div class="field"><label>Descrição do preview</label><textarea id="shareDescription" maxlength="220" placeholder="Uma noite latina em João Pessoa..."></textarea><div class="help">Texto curto mostrado abaixo do título.</div></div></div><div class="photo-row" style="margin-top:18px"><div class="photo-preview" id="sharePreview" style="aspect-ratio:1200/630;min-height:0;overflow:hidden">IMAGEM DO LINK</div><div><div class="field"><label>Imagem do preview · URL</label><input id="sharePhoto" placeholder="/media/drive/..."><div class="help">Use <strong>1200 × 630 px</strong> (proporção 1,91:1). Se enviar outra proporção, o painel centraliza, recorta e converte automaticamente para 1200 × 630.</div></div><div class="upload-line"><input id="shareFile" type="file" accept="image/*"><button class="btn" data-upload="share" type="button">Enviar imagem</button></div></div></div></div>`;
      map.parentNode.insertBefore(section, map);
    }
    const nav = document.querySelector('.nav');
    if (nav && !nav.querySelector('a[href="#compartilhamento"]')) {
      const mapLink = nav.querySelector('a[href="#mapa"]');
      const a = document.createElement('a'); a.href='#compartilhamento'; a.textContent='Compartilhar'; nav.insertBefore(a,mapLink||null);
    }
    const input=$('sharePhoto');
    if(input&&!input.dataset.previewBound){input.dataset.previewBound='1';input.addEventListener('input',()=>setLocalPreview($('sharePreview'),input.value.trim(),'IMAGEM DO LINK'));}
  }

  function applyShareConfig(c){ensureShareSection();if($('shareTitle'))$('shareTitle').value=c?.shareTitle||'La Rumba Jampa — 29 AGO 2026';if($('shareDescription'))$('shareDescription').value=c?.shareDescription||'João Pessoa recebe a La Rumba Jampa em 29 de agosto. Uma noite latina das 21h às 5h.';if($('sharePhoto'))$('sharePhoto').value=c?.shareImage||'';setLocalPreview($('sharePreview'),c?.shareImage||'','IMAGEM DO LINK');}

  function patchAdminState(){if(sharePatched)return;try{if(typeof fill==='function'){const originalFill=fill;fill=function(c){const result=originalFill(c);applyShareConfig(c);return result;};}if(typeof collect==='function'){const originalCollect=collect;collect=function(updateAdvanced=true){const c=originalCollect(false);ensureShareSection();c.shareTitle=$('shareTitle')?.value.trim()||'La Rumba Jampa — 29 AGO 2026';c.shareDescription=$('shareDescription')?.value.trim()||'';c.shareImage=$('sharePhoto')?.value.trim()||'';if(updateAdvanced&&$('advancedConfig'))$('advancedConfig').value=JSON.stringify(c,null,2);return c;};}sharePatched=true;}catch{}}

  function ensureDriveBox(){const body=document.querySelector('#djs .section-body');if(!body||$('driveStorageBox'))return;const box=document.createElement('div');box.id='driveStorageBox';box.className='note';box.style.marginBottom='22px';box.innerHTML=`<strong>Armazenamento das fotos: Google Drive</strong><div id="driveStatus" style="margin-top:7px">Verificando conexão…</div><div class="upload-line" style="margin-top:12px"><button class="btn" id="connectDriveBtn" type="button">Conectar Google Drive</button></div><div class="help" style="margin-top:8px">As fotos enviadas pelo painel serão gravadas diretamente na pasta configurada do Google Drive. Fotos grandes são redimensionadas e convertidas automaticamente para WebP antes do envio. R2 não é necessário.</div>`;body.prepend(box);$('connectDriveBtn').onclick=()=>{location.href='/api/admin/google/connect';};}

  async function refreshDriveStatus(){ensureDriveBox();const label=$('driveStatus'),button=$('connectDriveBtn');if(!label||!button)return;try{const response=await fetch('/api/admin/google/status',{cache:'no-store'});const data=await response.json().catch(()=>({}));if(response.status===401){label.textContent='Entre no painel para verificar o Google Drive.';return}if(!response.ok){label.textContent=data.error||'Não foi possível verificar o Google Drive.';return}if(data.connected){label.textContent='Conectado e pronto para receber uploads.';button.textContent='Reconectar Google Drive';button.disabled=false}else if(data.clientConfigured){label.textContent='Credenciais configuradas. Falta autorizar sua conta Google.';button.textContent='Conectar Google Drive';button.disabled=false}else{label.textContent='Faltam GOOGLE_DRIVE_CLIENT_ID e GOOGLE_DRIVE_CLIENT_SECRET no Cloudflare.';button.disabled=true}}catch{label.textContent='Falha ao verificar a conexão com o Google Drive.'}}

  async function decodeImage(file){if('createImageBitmap'in window){try{const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});return{source:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close?.()}}catch{}}return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>resolve({source:img,width:img.naturalWidth,height:img.naturalHeight,close:()=>URL.revokeObjectURL(url)});img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Este formato de imagem não pôde ser aberto pelo navegador.'))};img.src=url;});}
  function canvasBlob(canvas,type,quality){return new Promise(resolve=>canvas.toBlob(resolve,type,quality));}

  async function optimizeImage(file){if(!file?.type?.startsWith('image/'))throw new Error('Selecione uma imagem válida.');const decoded=await decodeImage(file);try{let width=decoded.width,height=decoded.height;if(!width||!height)throw new Error('Não foi possível identificar as dimensões da imagem.');const scale=Math.min(1,MAX_WIDTH/width,MAX_HEIGHT/height);width=Math.max(1,Math.round(width*scale));height=Math.max(1,Math.round(height*scale));const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw new Error('Seu navegador não conseguiu preparar a imagem.');const render=async(w,h,quality)=>{canvas.width=w;canvas.height=h;ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(decoded.source,0,0,w,h);let blob=await canvasBlob(canvas,'image/webp',quality);if(blob?.type==='image/webp')return blob;return canvasBlob(canvas,'image/jpeg',quality);};let quality=.88,blob=await render(width,height,quality);if(!blob)throw new Error('Não foi possível converter a imagem.');while(blob.size>MAX_UPLOAD_BYTES&&quality>.52){quality-=.1;blob=await render(width,height,quality)}while(blob.size>MAX_UPLOAD_BYTES&&width>640&&height>640){width=Math.max(640,Math.round(width*.82));height=Math.max(640,Math.round(height*.82));blob=await render(width,height,.72)}if(!blob||blob.size>MAX_UPLOAD_BYTES)throw new Error('A imagem é grande demais para ser processada automaticamente neste navegador.');const ext=blob.type==='image/webp'?'webp':'jpg',base=(file.name||'foto').replace(/\.[^.]+$/,'').replace(/[^a-z0-9._-]+/gi,'-');return new File([blob],`${base}.${ext}`,{type:blob.type,lastModified:Date.now()});}finally{decoded.close?.();}}

  async function optimizeShareImage(file){if(!file?.type?.startsWith('image/'))throw new Error('Selecione uma imagem válida.');const decoded=await decodeImage(file);try{const targetW=1200,targetH=630,targetRatio=targetW/targetH,sourceRatio=decoded.width/decoded.height;let sx=0,sy=0,sw=decoded.width,sh=decoded.height;if(sourceRatio>targetRatio){sw=decoded.height*targetRatio;sx=(decoded.width-sw)/2}else if(sourceRatio<targetRatio){sh=decoded.width/targetRatio;sy=(decoded.height-sh)/2}const canvas=document.createElement('canvas');canvas.width=targetW;canvas.height=targetH;const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Seu navegador não conseguiu preparar a imagem.');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(decoded.source,sx,sy,sw,sh,0,0,targetW,targetH);let blob=await canvasBlob(canvas,'image/webp',.88);if(!blob)blob=await canvasBlob(canvas,'image/jpeg',.88);if(!blob)throw new Error('Não foi possível converter a imagem do compartilhamento.');const ext=blob.type==='image/webp'?'webp':'jpg';return new File([blob],`la-rumba-share-${Date.now()}.${ext}`,{type:blob.type,lastModified:Date.now()});}finally{decoded.close?.();}}

  document.addEventListener('click',async event=>{const btn=event.target.closest?.('[data-upload]');if(!btn)return;event.preventDefault();event.stopImmediatePropagation();const slot=btn.dataset.upload,original=$(slot+'File')?.files?.[0];if(!original)return alert('Selecione uma imagem');btn.disabled=true;try{btn.textContent='Otimizando…';const file=slot==='share'?await optimizeShareImage(original):await optimizeImage(original);const beforeMb=(original.size/1024/1024).toFixed(1),afterMb=(file.size/1024/1024).toFixed(1),statusEl=$('status');if(statusEl)statusEl.textContent=`Imagem otimizada: ${beforeMb} MB → ${afterMb} MB. Enviando…`;btn.textContent='Enviando…';const fd=new FormData();fd.append('file',file);fd.append('slot',slot);const response=await fetch('/api/admin/upload',{method:'POST',body:fd});const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||'Falha no upload');const target=$(slot+'Photo');if(target)target.value=data.url;const preview=$(slot+'Preview');if(preview)setLocalPreview(preview,data.url,slot==='share'?'IMAGEM DO LINK':slot);if(statusEl){statusEl.textContent=`Imagem enviada (${afterMb} MB). Salve as alterações.`;statusEl.classList.add('ok')}}catch(error){alert(error?.message||'Falha ao processar a imagem')}finally{btn.disabled=false;btn.textContent=slot==='share'?'Enviar imagem':'Enviar foto'}},true);

  ensureShareSection();patchAdminState();try{if(typeof config!=='undefined'&&config)applyShareConfig(config)}catch{}
  const observer=new MutationObserver(()=>{ensureShareSection();patchAdminState();if(!document.getElementById('appView')?.classList.contains('hidden'))refreshDriveStatus()});observer.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['class']});
  addEventListener('DOMContentLoaded',()=>{ensureShareSection();patchAdminState();ensureDriveBox();const query=new URLSearchParams(location.search);if(query.get('drive')==='connected'){setTimeout(()=>{refreshDriveStatus();const status=$('status');if(status){status.textContent='Google Drive conectado';status.classList.add('ok')}},300);history.replaceState({},'',location.pathname)}else if(query.get('drive')==='denied'){const status=$('status');if(status)status.textContent='Autorização do Google Drive cancelada';history.replaceState({},'',location.pathname)}setTimeout(refreshDriveStatus,800)});
})();
