(() => {
  'use strict';
  window.BoleirosCompletePro = { version: 'complete-pro-movement' };
  const html = value => String(value ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
  let active = false, frame = null;
  let keys = Object.create(null);
  let player = { x: 640, y: 360, stamina: 100 };
  let direction = { x: 1, y: 0 };
  function loadState() { try { return JSON.parse(localStorage.getItem('boleiros_save_v9') || 'null'); } catch { return null; } }
  function nextFixture(state) { const id = state?.user?.teamId; return state?.fixtures?.find(f => !f.done && (f.home === id || f.away === id)); }
  function teamName(state, id) { return state?.teams?.find(t => t.id === id)?.name || id || 'Time'; }
  function openComplete(state, fixture) {
    active = true;
    document.body.classList.add('cm-lock');
    document.body.insertAdjacentHTML('beforeend', `
      <div class="cm-game" data-cm-game>
        <canvas id="cmCanvas"></canvas>
        <div class="cm-hud"><div class="cm-box cm-team">${html(teamName(state, fixture.home))}</div><div class="cm-score"><b>0 x 0</b><span data-cm-time>0' • 1º tempo</span></div><div class="cm-box cm-team away">${html(teamName(state, fixture.away))}</div></div>
        <div class="cm-top-actions"><button data-cm-fullscreen>Full screen</button><button data-cm-close>Sair</button></div>
        <div class="cm-floating" data-cm-msg>WASD move. H passe. J cruza ou carrinho. L chuta ou pede passe.</div>
        <div class="cm-rating">Nota <span>6.0</span></div>
        <div class="cm-player"><h3>Boleiro</h3><div class="cm-meta">Com bola<br>Gols 0 • Assists 0 • Toques 0</div><div class="cm-stamina"><span data-cm-stamina style="width:100%"></span></div></div>
        <div class="cm-controls"><button data-cm-action="h">H<br>Passe</button><button data-cm-action="j">J<br>Cruz./Carrinho</button><button class="main" data-cm-action="l">L<br>Chute/Pedir</button><button data-cm-action="shift">Shift<br>Arranque</button></div>
      </div>`);
    resizeCanvas();
    loop();
  }
  function closeComplete() {
    active = false;
    cancelAnimationFrame(frame);
    document.querySelector('[data-cm-game]')?.remove();
    document.body.classList.remove('cm-lock');
  }
  function input() {
    const x = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    const y = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
    const mag = Math.hypot(x, y);
    if (mag > 0.1) direction = { x: x / mag, y: y / mag };
    return mag > 0.1 ? direction : { x: 0, y: 0 };
  }
  function loop() {
    if (!active) return;
    const canvas = document.getElementById('cmCanvas');
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const move = input();
    const sprint = keys.shift || keys[' '];
    const speed = (sprint ? 5.2 : 3.4) * ratio * (0.55 + player.stamina / 150);
    player.x = Math.max(48 * ratio, Math.min(canvas.width - 48 * ratio, player.x + move.x * speed));
    player.y = Math.max(58 * ratio, Math.min(canvas.height - 58 * ratio, player.y + move.y * speed));
    if (Math.hypot(move.x, move.y) > 0.1) player.stamina = Math.max(0, player.stamina - (sprint ? 0.1 : 0.04));
    else player.stamina = Math.min(100, player.stamina + 0.035);
    const st = document.querySelector('[data-cm-stamina]');
    if (st) st.style.width = player.stamina + '%';
    draw();
    frame = requestAnimationFrame(loop);
  }
  function resizeCanvas() {
    const canvas = document.getElementById('cmCanvas');
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    if (!player.x || player.x > canvas.width) player.x = canvas.width / 2;
    if (!player.y || player.y > canvas.height) player.y = canvas.height / 2;
  }
  function draw() {
    const canvas = document.getElementById('cmCanvas');
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#236d12'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? '#2d7617' : '#236d12'; ctx.fillRect(i * canvas.width / 14, 0, canvas.width / 14, canvas.height); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * ratio; ctx.strokeRect(42 * ratio, 42 * ratio, canvas.width - 84 * ratio, canvas.height - 84 * ratio);
    ctx.beginPath(); ctx.moveTo(canvas.width / 2, 42 * ratio); ctx.lineTo(canvas.width / 2, canvas.height - 42 * ratio); ctx.stroke();
    ctx.fillStyle = '#ffcf62'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc((250 + i % 3 * 180) * ratio, (150 + Math.floor(i / 3) * 190) * ratio, 13 * ratio, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#55e58f'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc((700 + i % 3 * 170) * ratio, (150 + Math.floor(i / 3) * 190) * ratio, 13 * ratio, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#d7ff4f'; ctx.beginPath(); ctx.arc(player.x, player.y, 17 * ratio, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.strokeStyle = '#d7ff4f'; ctx.lineWidth = 4 * ratio; ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(player.x + direction.x * 46 * ratio, player.y + direction.y * 46 * ratio); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(player.x + direction.x * 22 * ratio, player.y + direction.y * 22 * ratio, 7 * ratio, 0, Math.PI * 2); ctx.fill();
  }
  function feedback(text) { const msg = document.querySelector('[data-cm-msg]'); if (msg) msg.textContent = text; }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-action="match"]');
    if (button) {
      const state = loadState(); const fixture = nextFixture(state);
      if (state && state.matchMode === 'completo' && fixture) { event.preventDefault(); event.stopImmediatePropagation(); openComplete(state, fixture); return; }
    }
    const action = event.target.closest('[data-cm-action]')?.dataset.cmAction;
    if (action === 'h') feedback('H: passe na direção WASD');
    if (action === 'j') feedback('J: cruzamento com bola, carrinho sem bola, sempre na direção WASD');
    if (action === 'l') feedback('L: chute com bola, pedir passe sem bola, sempre na direção WASD');
    if (event.target.closest('[data-cm-close]')) closeComplete();
    if (event.target.closest('[data-cm-fullscreen]')) document.querySelector('[data-cm-game]')?.requestFullscreen?.();
  }, true);
  document.addEventListener('keydown', event => { const key = event.key.toLowerCase(); keys[key] = true; if (key === 'h') feedback('H: passe na direção WASD'); if (key === 'j') feedback('J: cruzamento/carrinho na direção WASD'); if (key === 'l') feedback('L: chute/pedir passe na direção WASD'); });
  document.addEventListener('keyup', event => { keys[event.key.toLowerCase()] = false; });
  addEventListener('resize', resizeCanvas);
})();
