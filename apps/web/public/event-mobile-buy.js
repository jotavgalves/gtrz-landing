(()=>{
  const lifecycleKey='__gtrzEventMobileBuyLifecycleBound';

  const bind=()=>{
    const bar=document.querySelector('[data-event-mobile-buy]');
    const hero=document.querySelector('.event-premium-hero');
    const tickets=document.querySelector('#ingressos');

    if(window.__gtrzEventMobileBuyCleanup){
      try{window.__gtrzEventMobileBuyCleanup();}catch{}
      window.__gtrzEventMobileBuyCleanup=null;
    }

    if(!bar||!hero||!tickets)return;

    let raf=0;
    const setVisible=(visible)=>{
      bar.classList.toggle('is-visible',visible);
      bar.setAttribute('aria-hidden',visible?'false':'true');
    };

    const update=()=>{
      raf=0;
      if(window.innerWidth>620){
        setVisible(false);
        return;
      }

      const heroRect=hero.getBoundingClientRect();
      const ticketRect=tickets.getBoundingClientRect();
      const heroPassed=heroRect.bottom<=72;
      const ticketsApproaching=ticketRect.top<=window.innerHeight*.86;
      const ticketsPassed=ticketRect.bottom<=0;

      setVisible(heroPassed&&!ticketsApproaching&&!ticketsPassed);
    };

    const schedule=()=>{
      if(raf)return;
      raf=requestAnimationFrame(update);
    };

    addEventListener('scroll',schedule,{passive:true});
    addEventListener('resize',schedule,{passive:true});
    update();

    window.__gtrzEventMobileBuyCleanup=()=>{
      removeEventListener('scroll',schedule);
      removeEventListener('resize',schedule);
      if(raf)cancelAnimationFrame(raf);
      setVisible(false);
    };
  };

  bind();

  if(!window[lifecycleKey]){
    window[lifecycleKey]=true;
    document.addEventListener('astro:page-load',bind);
    document.addEventListener('astro:after-swap',bind);
  }
})();