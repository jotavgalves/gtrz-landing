(() => {
  const $ = id => document.getElementById(id);
  function ensureDriveBox() {
    const body = document.querySelector('#djs .section-body');
    if (!body || $('driveStorageBox')) return;
    const box = document.createElement('div');
    box.id = 'driveStorageBox';
    box.className = 'note';
    box.style.marginBottom = '22px';
    box.innerHTML = `<strong>Armazenamento das fotos: Google Drive</strong><div id="driveStatus" style="margin-top:7px">Verificando conexão…</div><div class="upload-line" style="margin-top:12px"><button class="btn" id="connectDriveBtn" type="button">Conectar Google Drive</button></div><div class="help" style="margin-top:8px">As fotos enviadas pelo painel serão gravadas diretamente na pasta configurada do Google Drive. R2 não é necessário.</div>`;
    body.prepend(box);
    $('connectDriveBtn').onclick = () => { location.href = '/api/admin/google/connect'; };
  }
  async function refreshDriveStatus() {
    ensureDriveBox(); const label=$('driveStatus'),button=$('connectDriveBtn'); if(!label||!button)return;
    try{const response=await fetch('/api/admin/google/status',{cache:'no-store'}),data=await response.json().catch(()=>({}));if(response.status===401){label.textContent='Entre no painel para verificar o Google Drive.';return}if(!response.ok){label.textContent=data.error||'Não foi possível verificar o Google Drive.';return}if(data.connected){label.textContent='Conectado e pronto para receber uploads.';button.textContent='Reconectar Google Drive';button.disabled=false}else if(data.clientConfigured){label.textContent='Credenciais configuradas. Falta autorizar sua conta Google.';button.textContent='Conectar Google Drive';button.disabled=false}else{label.textContent='Faltam GOOGLE_DRIVE_CLIENT_ID e GOOGLE_DRIVE_CLIENT_SECRET no Cloudflare.';button.disabled=true}}catch{label.textContent='Falha ao verificar a conexão com o Google Drive.'}}
  const observer=new MutationObserver(()=>{if(!document.getElementById('appView')?.classList.contains('hidden'))refreshDriveStatus()});observer.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['class']});
  addEventListener('DOMContentLoaded',()=>{ensureDriveBox();const query=new URLSearchParams(location.search);if(query.get('drive')==='connected'){setTimeout(()=>{refreshDriveStatus();const s=$('status');if(s){s.textContent='Google Drive conectado';s.classList.add('ok')}},300);history.replaceState({},'',location.pathname)}else if(query.get('drive')==='denied'){const s=$('status');if(s)s.textContent='Autorização do Google Drive cancelada';history.replaceState({},'',location.pathname)}setTimeout(refreshDriveStatus,800)});
})();
