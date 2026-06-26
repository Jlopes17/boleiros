(() => {
  'use strict';
  window.BoleirosCompletePro = { version: 'complete-pro-2' };
  window.addEventListener('keydown', event => {
    if (['w','a','s','d','h','j','l'].includes(event.key.toLowerCase())) {
      window.BoleirosCompletePro.lastKey = event.key.toLowerCase();
    }
  });
})();
