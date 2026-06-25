(() => {
  'use strict';
  let handledKey = '';
  function readMinute(root) {
    const text = root.textContent || '';
    const found = text.match(/(\d{1,2})'/);
    return found ? Number(found[1]) : null;
  }
  function matchKey(root) {
    return (root.querySelector('h2')?.textContent || 'match').replace(/\s+/g, ' ').trim();
  }
  function pressPause(root) {
    const pause = [...root.querySelectorAll('[data-match="pause"]')].find(button => /Pausar/i.test(button.textContent || ''));
    if (pause) pause.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
  function pressContinue(root) {
    const cont = [...root.querySelectorAll('[data-match="pause"]')].find(button => /Continuar/i.test(button.textContent || ''));
    if (cont) cont.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
  function addBreak(root) {
    if (root.querySelector('.forcedHalfTime')) return;
    const minute = readMinute(root);
    if (minute === null || minute < 45 || minute > 70) return;
    const key = matchKey(root);
    if (handledKey === key) return;
    const canvas = root.querySelector('canvas');
    if (!canvas) return;
    handledKey = key;
    pressPause(root);
    const overlay = document.createElement('div');
    overlay.className = 'halfOverlay forcedHalfTime';
    overlay.innerHTML = '<div class="card"><span class="tag warn">Intervalo obrigatório</span><h2>45 minutos</h2><p class="mut">Parada obrigatória para ajustes.</p><button class="pri wide" data-half-resume="1">Começar 2º tempo</button></div>';
    canvas.parentElement.appendChild(overlay);
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-half-resume]')) {
      const root = document.getElementById('box');
      event.target.closest('.forcedHalfTime')?.remove();
      if (root) pressContinue(root);
    }
  });
  const observer = new MutationObserver(() => {
    const root = document.getElementById('box');
    if (root) addBreak(root);
  });
  window.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('box');
    if (root) observer.observe(root, { childList: true, subtree: true });
  });
})();
