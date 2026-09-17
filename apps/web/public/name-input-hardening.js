(() => {
  const invalidNameChars = /[^\p{L}\p{M}\s'’-]/gu;
  const sanitizeName = (value) => String(value || '').replace(invalidNameChars, '').toLocaleUpperCase('pt-BR');

  const bind = (input) => {
    if (!(input instanceof HTMLInputElement) || input.dataset.nameHardened === '1') return;
    input.dataset.nameHardened = '1';

    input.addEventListener('beforeinput', (event) => {
      if (!event.data) return;
      if (/[^\p{L}\p{M}\s'’-]/u.test(event.data)) event.preventDefault();
    });

    input.addEventListener('input', () => {
      const cursor = input.selectionStart ?? input.value.length;
      const sanitizedBefore = sanitizeName(input.value.slice(0, cursor));
      const sanitized = sanitizeName(input.value);
      if (sanitized !== input.value) {
        input.value = sanitized;
        try { input.setSelectionRange(sanitizedBefore.length, sanitizedBefore.length); } catch {}
      }
    });
  };

  const apply = () => document.querySelectorAll('[data-person-name]').forEach(bind);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
})();
