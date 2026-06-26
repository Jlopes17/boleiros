(() => {
  'use strict';
  window.BoleirosCompletePro = { version: 'complete-pro-ball-actions' };
  const html = value => String(value ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
  let active = false, frame = null;
  let keys = Object.create(null);
  let player = { x: 640, y: 360, stamina: 100 };
  let ball = { x: 660, y: 360, vx: 0, vy: 0, owner: 'player' };
  let direction = { x: 1, y: 0 };
  let score = { h: 0, a: 0 }, note = 6, goals = 0, assists = 0, touches = 0, withBall = true;
  function loadState() { try { return JSON.parse(localStorage.getItem('boleiros_save_v9') || 'null'); } catch { return null; } }
  function nextFixture(state) { const id = state?.user?.teamId; return state?.fixtures?.find(f => !f.done && (f.home === id || f.away === id)); }
  function teamName(state, id) { return state?.teams?.find(t => t.id === id)?.name || id || 'Time'; }
  function openComplete(state, fixture) {
    active = true; score = { h: 0, a: 0 }; note = 6; goals = 0; assists = 0; touches = 0; withBall = true;
    document.body.classList.add('cm-lock');
    document.body.insertAdjacentHTML('beforeend', `
      <div class="cm-game" data-cm-game>
        <canvas id="cmCanvas"></canvas>
        <div class="cm-hud"><div class="cm-box cm-team">${html(teamName(state, fixture.home))}</div><div class="cm-score"><b><span data-cm-h>0</span> x <span data-cm-a>0</span></b><span data-cm-time>0' • 1º tempo</span></div><div class="cm-box cm-team away">${html(teamName(state, fixture.away))}</div></div>
        <div class="cm-top-actions"><button data-cm-fullscreen>Full screen</button><button data-cm-close>Sair</button></div>
        <div class="cm-floating" data-cm-msg>WASD move. H passe. J cruza ou carrinho. L chuta ou pede passe.</div>
        <div class="cm-rating">Nota <span data-cm-note>6.0</span></div>
        <div class="cm-player"><h3>Boleiro</h3><div class="cm-meta"><span data-cm-state>Com bola</span><br>Gols <span data-cm-goals>0</span> • Assists <span data-cm-assists>0</span> • Toques <span data-cm-touches>0</span></div><div class="cm-stamina"><span data-cm-stamina style="width:100%"></span></div></div>
        <div class="cm-controls"><button data-cm-action="h">H<br>Passe</button><button data-cm-action="j">J<br>Cruz./Carrinho</button><button class="main" data-cm-action="l">L<br>Chute/Pedir</button><button data-cm-action="shift">Shift<br>Arranque</button></div>
      </div>`);
    resizeCanvas();
    loop();
  }
  function closeComplete() { active = false; cancelAnimationFrame(frame); document.querySelector('[data-cm-game]')?.remove(); document.body.classList.remove('cm-lock'); }
  function input() {
    const x = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    const y = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
    const mag = Math.hypot(x, y);
    if (mag > 0.1) direction = { x: x / mag, y: y / mag };
    return mag > 0.1 ? direction : { x: 0, y: 0 };
  }
  function loop() {
    if (!active) return;
    const canvas = document.getElementById('cmCanvas'); if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const move = input(); const sprint = keys.shift || keys[' '];
    const speed = (sprint ? 5.2 : 3.4) * ratio * (0.55 + player.stamina / 150);
    player.x = Math.max(48 * ratio, Math.min(canvas.width - 48 * ratio, player.x + move.x * speed));
    player.y = Math.max(58 * ratio, Math.min(canvas.height - 58 * ratio, player.y + move.y * speed));
    if (Math.hypot(move.x, move.y) > 0.1) player.stamina = Math.max(0, player.stamina - (sprint ? 0.1 : 0.04)); else player.stamina = Math.min(100, player.stamina + 0.035);
    if (ball.owner === 'player') { ball.x = player.x + direction.x * 22 * ratio; ball.y = player.y + direction.y * 22 * ratio; }
    else { ball.x += ball.vx * ratio; ball.y += ball.vy * ratio; ball.vx *= 0.985; ball.vy *= 0.985; if (Math.hypot(ball.x - player.x, ball.y - player.y) < 25 * ratio) takeBall(); if (Math.hypot(ball.vx, ball.vy) < 0.2) withBall = false; }
    updateHud(); draw(); frame = requestAnimationFrame(loop);
  }
  function resizeCanvas() {
    const canvas = document.getElementById('cmCanvas'); if (!canvas) return;
    const ratio = window.devicePixelRatio || 1; canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio;
    player.x = canvas.width / 2; player.y = canvas.height / 2; ball.x = player.x + 22 * ratio; ball.y = player.y;
  }
  function updateHud() {
    const st = document.querySelector('[data-cm-stamina]'); if (st) st.style.width = player.stamina + '%';
    document.querySelector('[data-cm-state]') && (document.querySelector('[data-cm-state]').textContent = withBall ? 'Com bola' : 'Sem bola');
    document.querySelector('[data-cm-note]') && (document.querySelector('[data-cm-note]').textContent = note.toFixed(1));
    document.querySelector('[data-cm-goals]') && (document.querySelector('[data-cm-goals]').textContent = goals);
    document.querySelector('[data-cm-assists]') && (document.querySelector('[data-cm-assists]').textContent = assists);
    document.querySelector('[data-cm-touches]') && (document.querySelector('[data-cm-touches]').textContent = touches);
    document.querySelector('[data-cm-h]') && (document.querySelector('[data-cm-h]').textContent = score.h);
    document.querySelector('[data-cm-a]') && (document.querySelector('[data-cm-a]').textContent = score.a);
  }
  function draw() {
    const canvas = document.getElementById('cmCanvas'); if (!canvas) return;
    const ratio = window.devicePixelRatio || 1; const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#236d12'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? '#2d7617' : '#236d12'; ctx.fillRect(i * canvas.width / 14, 0, canvas.width / 14, canvas.height); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * ratio; ctx.strokeRect(42 * ratio, 42 * ratio, canvas.width - 84 * ratio, canvas.height - 84 * ratio);
    ctx.beginPath(); ctx.moveTo(canvas.width / 2, 42 * ratio); ctx.lineTo(canvas.width / 2, canvas.height - 42 * ratio); ctx.stroke();
    ctx.fillStyle = '#ffcf62'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc((250 + i % 3 * 180) * ratio, (150 + Math.floor(i / 3) * 190) * ratio, 13 * ratio, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#55e58f'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc((700 + i % 3 * 170) * ratio, (150 + Math.floor(i / 3) * 190) * ratio, 13 * ratio, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#d7ff4f'; ctx.beginPath(); ctx.arc(player.x, player.y, 17 * ratio, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.strokeStyle = '#d7ff4f'; ctx.lineWidth = 4 * ratio; ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(player.x + direction.x * 46 * ratio, player.y + direction.y * 46 * ratio); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, 7 * ratio, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#111'; ctx.stroke();
  }
  function feedback(text) { const msg = document.querySelector('[data-cm-msg]'); if (msg) msg.textContent = text; }
  function takeBall() { ball.owner = 'player'; withBall = true; touches += 1; note = Math.min(10, note + 0.02); feedback('Domínio do Boleiro'); }
  function release(power, text) { const ratio = window.devicePixelRatio || 1; ball.owner = null; withBall = false; ball.vx = direction.x * power; ball.vy = direction.y * power; ball.x = player.x + direction.x * 25 * ratio; ball.y = player.y + direction.y * 25 * ratio; feedback(text); }
  function action(key) {
    if (key === 'h') { if (withBall) { release(9.5, 'Passe na direção WASD'); note = Math.min(10, note + 0.04); } else feedback('Sem bola: posicione para receber'); }
    if (key === 'j') { if (withBall) { release(13, 'Cruzamento na direção WASD'); if (Math.random() < 0.25) { assists += 1; score.h += 1; feedback('Assistência do Boleiro!'); } } else { if (Math.hypot(ball.x - player.x, ball.y - player.y) < 90) takeBall(); else feedback('Carrinho na direção WASD'); } }
    if (key === 'l') { if (withBall) { release(16, 'Chute na direção WASD'); const chance = 0.12 + (direction.x > 0 ? 0.18 : 0) + player.stamina / 500; if (Math.random() < chance) { goals += 1; score.h += 1; note = Math.min(10, note + 0.55); feedback('GOOOL do Boleiro!'); } } else { ball.x = player.x + direction.x * 120; ball.y = player.y + direction.y * 120; ball.vx = -direction.x * 5; ball.vy = -direction.y * 5; feedback('Pedido de passe na direção WASD'); } }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-action="match"]');
    if (button) { const state = loadState(); const fixture = nextFixture(state); if (state && state.matchMode === 'completo' && fixture) { event.preventDefault(); event.stopImmediatePropagation(); openComplete(state, fixture); return; } }
    const act = event.target.closest('[data-cm-action]')?.dataset.cmAction; if (act === 'h' || act === 'j' || act === 'l') action(act); if (act === 'shift') { keys.shift = true; setTimeout(() => keys.shift = false, 500); }
    if (event.target.closest('[data-cm-close]')) closeComplete(); if (event.target.closest('[data-cm-fullscreen]')) document.querySelector('[data-cm-game]')?.requestFullscreen?.();
  }, true);
  document.addEventListener('keydown', event => { const key = event.key.toLowerCase(); keys[key] = true; if (key === 'h' || key === 'j' || key === 'l') { event.preventDefault(); action(key); } });
  document.addEventListener('keyup', event => { keys[event.key.toLowerCase()] = false; });
  addEventListener('resize', resizeCanvas);
})();
