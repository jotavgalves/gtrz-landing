(() => {
  let enabled = false;
  let widgetId = null;
  let apiReady = false;
  let lockedUntil = 0;

  const $ = id => document.getElementById(id);
  const form = () => $('loginForm');
  const errorBox = () => $('loginError');
  const submitButton = () => form()?.querySelector('button[type="submit"]');

  function setError(message) {
    const box = errorBox();
    if (box) box.textContent = message || '';
  }

  function ensureTurnstileField() {
    const f = form();
    if (!f) return null;
    let host = $('turnstileSecurityField');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'turnstileSecurityField';
    host.className = 'field';
    host.hidden = true;
    host.innerHTML = '<label>Verificação de segurança</label><div id="turnstileWidget"></div><div class="help" id="turnstileHelp">Proteção Cloudflare Turnstile.</div>';
    const button = submitButton();
    f.insertBefore(host, button || null);
    return host;
  }

  function loadTurnstileApi() {
    return new Promise((resolve, reject) => {
      if (window.turnstile) return resolve();
      const existing = document.querySelector('script[data-rumba-turnstile]');
      if (existing) {
        existing.addEventListener('load', resolve, { once:true });
        existing.addEventListener('error', reject, { once:true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.rumbaTurnstile = '1';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function startLockCountdown(seconds) {
    lockedUntil = Date.now() + Math.max(1, Number(seconds) || 1800) * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      const button = submitButton();
      if (!remaining) {
        if (button) { button.disabled = false; button.textContent = 'Entrar'; }
        setError('O bloqueio terminou. Você pode tentar novamente.');
        return;
      }
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;
      if (button) { button.disabled = true; button.textContent = `Bloqueado ${min}:${String(sec).padStart(2, '0')}`; }
      setError(`Login bloqueado após 3 tentativas inválidas. Aguarde ${min}:${String(sec).padStart(2, '0')}.`);
      setTimeout(tick, 1000);
    };
    tick();
  }

  async function init() {
    ensureTurnstileField();
    try {
      const response = await fetch('/api/admin/security-config', { cache:'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) return;
      if (data.turnstile?.misconfigured) {
        setError('Turnstile incompleto no Cloudflare: configure a Site Key e a Secret Key.');
        return;
      }
      enabled = Boolean(data.turnstile?.enabled && data.turnstile?.siteKey);
      if (!enabled) return;
      const host = ensureTurnstileField();
      if (host) host.hidden = false;
      await loadTurnstileApi();
      if (!window.turnstile) throw new Error('Turnstile indisponível');
      widgetId = window.turnstile.render('#turnstileWidget', {
        sitekey:data.turnstile.siteKey,
        theme:'dark',
        appearance:'always',
        callback:() => setError(''),
        'expired-callback':() => setError('A verificação expirou. Faça novamente.'),
        'error-callback':() => setError('Não foi possível carregar a verificação de segurança.')
      });
      apiReady = true;
    } catch {
      if (enabled) setError('Não foi possível carregar a proteção Turnstile. Recarregue a página.');
    }
  }

  document.addEventListener('submit', async event => {
    if (event.target?.id !== 'loginForm' || !enabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if (Date.now() < lockedUntil) return;
    if (!apiReady || widgetId === null || !window.turnstile) {
      setError('A verificação de segurança ainda está carregando.');
      return;
    }

    const token = window.turnstile.getResponse(widgetId);
    if (!token) {
      setError('Conclua a verificação de segurança.');
      return;
    }

    const button = submitButton();
    if (button) { button.disabled = true; button.textContent = 'Verificando…'; }
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method:'POST',
        headers:{ 'content-type':'application/json' },
        body:JSON.stringify({ password:$('password')?.value || '', turnstileToken:token })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        if (response.status === 429 && data.retryAfter) startLockCountdown(data.retryAfter);
        else setError(data.error || 'Erro ao entrar');
        try { window.turnstile.reset(widgetId); } catch {}
        return;
      }
      if ($('password')) $('password').value = '';
      location.reload();
    } catch {
      setError('Falha de conexão ao tentar entrar.');
      try { window.turnstile.reset(widgetId); } catch {}
    } finally {
      if (button && Date.now() >= lockedUntil) { button.disabled = false; button.textContent = 'Entrar'; }
    }
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
