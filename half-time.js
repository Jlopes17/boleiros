(() => {
  'use strict';
  function readMinute(root) {
    const text = root.textContent || '';
    const found = text.match(/(\d{1,2})'/);
    return found ? Number(found[1]) : null;
  }
  function addBreak(root) {
    if (root.querySelector('.forcedHalfTime')) return;
    const minute = readMinute(root);
    if (minute === null || minute < 45 || minute > 70) return;
    const canvas = root.querySelector('canvas');
    if (!canvas) return;
    const overlay = document.createElement('div');
    overlay.className = 'halfOverlay forcedHalfTime';
    overlay.innerHTML = '<div class="card"><span class="tag warn">Intervalo obrigatório</span><h2>45 minutos</h2><p class="mut">Parada obrigatória para ajustes.</p><button class="pri wide" data-half-resume="1">Entendi</button></div>';
    canvas.parentElement.appendChild(overlay);
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-half-resume]')) {
      event.target.closest('.forcedHalfTime')?.remove();
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
