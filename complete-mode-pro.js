(() => {
  'use strict';
  window.BoleirosCompletePro = { version: 'complete-pro-shell' };
  const html = value => String(value ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
  function loadState() {
    try { return JSON.parse(localStorage.getItem('boleiros_save_v9') || 'null'); } catch { return null; }
  }
  function nextFixture(state) {
    const id = state?.user?.teamId;
    return state?.fixtures?.find(f => !f.done && (f.home === id || f.away === id));
  }
  function teamName(state, id) {
    return state?.teams?.find(t => t.id === id)?.name || id || 'Time';
  }
  function openComplete(state, fixture) {
    document.body.classList.add('cm-lock');
    document.body.insertAdjacentHTML('beforeend', `
      <div class="cm-game" data-cm-game>
        <canvas id="cmCanvas"></canvas>
        <div class="cm-hud">
          <div class="cm-box cm-team">${html(teamName(state, fixture.home))}</div>
          <div class="cm-score"><b>0 x 0</b><span>0' • 1º tempo</span></div>
          <div class="cm-box cm-team away">${html(teamName(state, fixture.away))}</div>
        </div>
        <div class="cm-top-actions"><button data-cm-fullscreen>Full screen</button><button data-cm-close>Sair</button></div>
        <div class="cm-floating">WASD move. H passe. J cruza ou carrinho. L chuta ou pede passe.</div>
        <div class="cm-rating">Nota <span>6.0</span></div>
        <div class="cm-player"><h3>Boleiro</h3><div class="cm-meta">Com bola<br>Gols 0 • Assists 0 • Toques 0</div><div class="cm-stamina"><span style="width:100%"></span></div></div>
        <div class="cm-controls"><button>H<br>Passe</button><button>J<br>Cruz./Carrinho</button><button class="main">L<br>Chute/Pedir</button><button>Shift<br>Arranque</button></div>
      </div>`);
    drawShell();
  }
  function drawShell() {
    const canvas = document.getElementById('cmCanvas');
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#236d12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = i % 2 ? '#2d7617' : '#236d12';
      ctx.fillRect(i * canvas.width / 14, 0, canvas.width / 14, canvas.height);
    }
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3 * ratio;
    ctx.strokeRect(42 * ratio, 42 * ratio, canvas.width - 84 * ratio, canvas.height - 84 * ratio);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 42 * ratio);
    ctx.lineTo(canvas.width / 2, canvas.height - 42 * ratio);
    ctx.stroke();
    ctx.fillStyle = '#d7ff4f';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 18 * ratio, 0, Math.PI * 2);
    ctx.fill();
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-action="match"]');
    if (button) {
      const state = loadState();
      const fixture = nextFixture(state);
      if (state && state.matchMode === 'completo' && fixture) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openComplete(state, fixture);
        return;
      }
    }
    if (event.target.closest('[data-cm-close]')) {
      document.querySelector('[data-cm-game]')?.remove();
      document.body.classList.remove('cm-lock');
    }
    if (event.target.closest('[data-cm-fullscreen]')) document.querySelector('[data-cm-game]')?.requestFullscreen?.();
  }, true);
  addEventListener('resize', drawShell);
})();
