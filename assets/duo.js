(()=>{
  const FALLBACK={lot:1,price:50,individualSoldOut:false,duoEnabled:true,duoSoldOut:false,duoDiscountPerTicket:10,doorEnabled:true,doorSoldOut:false,doorPrice:null,wa:'https://wa.me/5581920013249',sympla:'https://www.sympla.com.br/evento/la-rumba-jampa/3534032'};
  let currentConfig={...FALLBACK};

  const money=value=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(value)||0);
  const currentLang=()=>document.documentElement.lang?.toLowerCase().startsWith('es')?'es':'pt';
  const ordinal=n=>`${Math.max(1,Number(n)||1)}º`;
  const clampDiscount=(price,value)=>Math.min(Math.max(0,Number(price)||0),Math.max(0,Number(value)||0));
  const optionalPrice=value=>value===null||value===undefined||String(value).trim()===''?null:Math.max(0,Number(value)||0);

  function waUrl(raw,message){
    let base=String(raw||FALLBACK.wa).trim();
    if(/^\+?[\d\s().-]{8,}$/.test(base))base=`https://wa.me/${base.replace(/\D/g,'')}`;
    try{const u=new URL(base);u.searchParams.set('text',message);return u.toString()}
    catch{const digits=base.replace(/\D/g,'');return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`}
  }

  function copy(config){
    const lang=currentLang();
    const lot=Math.max(1,Number(config.lot)||FALLBACK.lot);
    const price=Math.max(0,Number(config.price)||0);
    const discount=clampDiscount(price,config.duoDiscountPerTicket??FALLBACK.duoDiscountPerTicket);
    const duoUnit=Math.max(0,price-discount);
    const regularTotal=price*2;
    const duoTotal=duoUnit*2;
    const saving=Math.max(0,regularTotal-duoTotal);
    if(lang==='es')return{
      individual:'ENTRADA INDIVIDUAL',singleTitle:'INDIVIDUAL',singleMeta:'1 entrada',singleBuy:'Comprar individual',sympla:'Comprar en Sympla',
      duoType:'PROMO ESPECIAL',duoTitle:'PROMO DUO',best:'MEJOR VALOR',duoMeta:`2 entradas · R$ ${money(duoUnit)} por persona`,
      compare:`Comprando por separado: R$ ${money(regularTotal)}`,save:`AHORRA R$ ${money(saving)}`,duoBuy:'Comprar Promo Duo',
      fine:'Promo válida mientras esté activa y haya disponibilidad en el lote actual.',
      doorType:'VENTA EN EL LUGAR',doorTitle:'ENTRADA EN PUERTA',doorMeta:'Compra disponible solamente en la entrada del evento.',doorBuy:'Venta solamente en puerta',doorPricePending:'PRECIO EN PUERTA',
      soldOut:'AGOTADO',
      individualMessage:`¡Hola! Quiero comprar 1 entrada individual para La Rumba Jampa. Vi en el sitio que el lote ${ordinal(lot)} está por R$ ${money(price)}. ¿Puedes enviarme los datos para el pago y confirmar mi compra?`,
      duoMessage:`¡Hola! Quiero comprar la Promo Duo de La Rumba Jampa: 2 entradas por R$ ${money(duoTotal)} (R$ ${money(duoUnit)} por persona), ahorrando R$ ${money(saving)} frente a dos entradas individuales del lote ${ordinal(lot)}. ¿Puedes enviarme los datos para el pago y confirmar mi compra?`
    };
    return{
      individual:'INGRESSO INDIVIDUAL',singleTitle:'INDIVIDUAL',singleMeta:'1 entrada',singleBuy:'Comprar individual',sympla:'Comprar no Sympla',
      duoType:'PROMO ESPECIAL',duoTitle:'PROMO DUO',best:'MELHOR VALOR',duoMeta:`2 entradas · R$ ${money(duoUnit)} por pessoa`,
      compare:`Comprando separado: R$ ${money(regularTotal)}`,save:`ECONOMIZE R$ ${money(saving)}`,duoBuy:'Comprar Promo Duo',
      fine:'Promo válida enquanto estiver ativa e houver disponibilidade no lote atual.',
      doorType:'VENDA NO LOCAL',doorTitle:'ENTRADA EN PUERTA',doorMeta:'Compra disponível somente na entrada do evento.',doorBuy:'Venda somente na porta',doorPricePending:'VALOR NA PORTA',
      soldOut:'ESGOTADO',
      individualMessage:`Olá! Quero comprar 1 ingresso individual para a La Rumba Jampa. Vi no site que o ${ordinal(lot)} lote está por R$ ${money(price)}. Pode me enviar os dados para pagamento e confirmar minha compra?`,
      duoMessage:`Olá! Quero comprar a Promo Duo da La Rumba Jampa: 2 ingressos por R$ ${money(duoTotal)} (R$ ${money(duoUnit)} por pessoa), economizando R$ ${money(saving)} em relação a dois ingressos individuais do ${ordinal(lot)} lote. Pode me enviar os dados para pagamento e confirmar minha compra?`
    };
  }

  function soldOutButton(label){return `<span class="btn ticket-btn-disabled" aria-disabled="true">${label}</span>`}
  function lockGenericIndividualLinks(){
    if(currentConfig.individualSoldOut!==true)return;
    document.querySelectorAll('.js-wa').forEach(link=>{
      if(link.getAttribute('href')!=='#ingressos')link.setAttribute('href','#ingressos');
      link.removeAttribute('target');link.removeAttribute('rel');
    });
  }

  function render(config){
    const section=document.getElementById('ingressos');
    const grid=section?.querySelector('.tickets-grid');
    if(!grid)return;

    const existingPrice=Number(document.getElementById('priceMain')?.textContent||FALLBACK.price);
    const merged={...FALLBACK,...config};
    if(!Number.isFinite(Number(merged.price)))merged.price=existingPrice;
    const price=Math.max(0,Number(merged.price)||0);
    const discount=clampDiscount(price,merged.duoDiscountPerTicket??FALLBACK.duoDiscountPerTicket);
    const duoUnit=Math.max(0,price-discount);
    const duoTotal=duoUnit*2;
    const doorPrice=optionalPrice(merged.doorPrice);
    const c=copy(merged);
    currentConfig=merged;

    grid.classList.add('duo-ready');
    let host=grid.querySelector('.ticket-options');
    const old=grid.querySelector('.tickets-purchase');
    if(!host){
      host=document.createElement('div');
      host.className='ticket-options reveal in';
      if(old)old.replaceWith(host);else grid.appendChild(host);
    }

    const individualHref=waUrl(merged.wa,c.individualMessage);
    const duoHref=waUrl(merged.wa,c.duoMessage);
    const sympla=merged.sympla||FALLBACK.sympla;
    const individualSoldOut=merged.individualSoldOut===true;
    const duoEnabled=merged.duoEnabled!==false;
    const duoSoldOut=merged.duoSoldOut===true;
    const doorEnabled=merged.doorEnabled!==false;
    const doorSoldOut=merged.doorSoldOut===true;

    const individualActions=individualSoldOut?soldOutButton(c.soldOut):`<a class="btn btn-primary" href="${individualHref}" target="_blank" rel="noopener">${c.singleBuy}</a><a class="btn btn-secondary" href="${sympla}" target="_blank" rel="noopener">${c.sympla}</a>`;
    const duoActions=duoSoldOut?soldOutButton(c.soldOut):`<a class="btn btn-primary" href="${duoHref}" target="_blank" rel="noopener">${c.duoBuy}</a>`;
    const doorActions=doorSoldOut?soldOutButton(c.soldOut):`<div class="ticket-door-status">${c.doorBuy}</div>`;
    const doorPriceHtml=doorPrice===null?`<div class="ticket-card__price ticket-card__price--pending">${c.doorPricePending}</div>`:`<div class="ticket-card__price"><small>R$</small>${money(doorPrice)}</div>`;

    host.innerHTML=`
      <article class="ticket-card ticket-card--single${individualSoldOut?' is-sold-out':''}">
        <div class="ticket-card__top"><span class="ticket-card__type">${c.individual}</span>${individualSoldOut?`<span class="ticket-card__badge ticket-card__badge--sold">${c.soldOut}</span>`:''}</div>
        <h3 class="ticket-card__title">${c.singleTitle}</h3>
        <div class="ticket-card__price"><small>R$</small>${money(price)}</div>
        <p class="ticket-card__meta">${c.singleMeta} · ${ordinal(merged.lot)} lote</p>
        <div class="ticket-card__actions">${individualActions}</div>
      </article>
      ${duoEnabled?`<article class="ticket-card ticket-card--duo${duoSoldOut?' is-sold-out':''}">
        <div class="ticket-card__top"><span class="ticket-card__type">${c.duoType}</span><span class="ticket-card__badge${duoSoldOut?' ticket-card__badge--sold':''}">${duoSoldOut?c.soldOut:c.best}</span></div>
        <h3 class="ticket-card__title">${c.duoTitle}</h3>
        <div class="ticket-card__price"><small>R$</small>${money(duoTotal)}</div>
        <p class="ticket-card__meta">${c.duoMeta}</p>
        <div class="ticket-card__compare"><s>${c.compare}</s></div>
        <div class="ticket-card__saving">${c.save}</div>
        <div class="ticket-card__actions">${duoActions}</div>
        <p class="ticket-card__fine">${c.fine}</p>
      </article>`:''}
      ${doorEnabled?`<article class="ticket-card ticket-card--door${doorSoldOut?' is-sold-out':''}">
        <div class="ticket-card__top"><span class="ticket-card__type">${c.doorType}</span>${doorSoldOut?`<span class="ticket-card__badge ticket-card__badge--sold">${c.soldOut}</span>`:''}</div>
        <h3 class="ticket-card__title">${c.doorTitle}</h3>
        ${doorPriceHtml}
        <p class="ticket-card__meta">${c.doorMeta}</p>
        <div class="ticket-card__actions">${doorActions}</div>
      </article>`:''}`;

    lockGenericIndividualLinks();
  }

  async function load(){
    try{
      const response=await fetch('/api/site',{cache:'no-store'});
      const data=await response.json();
      if(response.ok&&data?.config)currentConfig={...FALLBACK,...data.config};
    }catch{}
    render(currentConfig);
  }

  const start=()=>{
    load();
    new MutationObserver(()=>render(currentConfig)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    new MutationObserver(mutations=>{
      if(currentConfig.individualSoldOut!==true)return;
      if(mutations.some(m=>m.target?.matches?.('.js-wa')))lockGenericIndividualLinks();
    }).observe(document.body,{subtree:true,attributes:true,attributeFilter:['href']});
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-lang-btn],[data-modal-lang]'))setTimeout(()=>render(currentConfig),0);
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();