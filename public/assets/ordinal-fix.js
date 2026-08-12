(()=>{
  function renderLotOrdinal(){
    const host=document.getElementById('lotNumberBig');
    if(!host||host.querySelector('.lot-number-core'))return;
    const match=String(host.textContent||'').trim().match(/\d+/);
    if(!match)return;
    const number=match[0];
    host.setAttribute('aria-label',`${number}º`);
    host.innerHTML=`<span class="lot-number-core">${number}</span><span class="lot-ordinal-o" aria-hidden="true">O</span>`;
  }
  const start=()=>{
    renderLotOrdinal();
    const host=document.getElementById('lotNumberBig');
    if(!host)return;
    new MutationObserver(()=>renderLotOrdinal()).observe(host,{childList:true,subtree:true,characterData:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
