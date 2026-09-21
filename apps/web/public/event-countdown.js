(()=>{
  const pad=(value)=>String(value).padStart(2,'0');

  const startCountdown=(root)=>{
    if(root.dataset.countdownReady==='1')return;
    root.dataset.countdownReady='1';

    const raw=root.getAttribute('data-countdown-end')||'';
    const end=Date.parse(raw);
    if(!Number.isFinite(end))return;

    const nodes={
      days:root.querySelector('[data-clock="days"]'),
      hours:root.querySelector('[data-clock="hours"]'),
      minutes:root.querySelector('[data-clock="minutes"]'),
      seconds:root.querySelector('[data-clock="seconds"]')
    };

    const render=()=>{
      let remaining=Math.max(0,end-Date.now());
      const days=Math.floor(remaining/86400000);
      remaining%=86400000;
      const hours=Math.floor(remaining/3600000);
      remaining%=3600000;
      const minutes=Math.floor(remaining/60000);
      const seconds=Math.floor((remaining%60000)/1000);

      if(nodes.days)nodes.days.textContent=pad(days);
      if(nodes.hours)nodes.hours.textContent=pad(hours);
      if(nodes.minutes)nodes.minutes.textContent=pad(minutes);
      if(nodes.seconds)nodes.seconds.textContent=pad(seconds);

      return remaining>0||days>0||hours>0||minutes>0||seconds>0;
    };

    render();
    const timer=window.setInterval(()=>{
      const active=render();
      if(!active)window.clearInterval(timer);
    },1000);
  };

  const init=()=>document.querySelectorAll('[data-countdown-end]').forEach(startCountdown);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }

  document.addEventListener('astro:page-load',init);
})();