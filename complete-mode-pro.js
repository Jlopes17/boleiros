(() => {
  'use strict';
  window.BoleirosCompletePro = { version: 'complete-pro-hook' };
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-action="match"]');
    if (!button) return;
    try {
      const state = JSON.parse(localStorage.getItem('boleiros_save_v9') || 'null');
      if (state && state.matchMode === 'completo') {
        event.preventDefault();
        event.stopImmediatePropagation();
        alert('Complete Pro hook active. Próximo passo: renderizar o jogo full screen.');
      }
    } catch {}
  }, true);
})();
