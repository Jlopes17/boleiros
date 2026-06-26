(() => {
  'use strict';
  const POS_ORDER = { GOL:1, GK:1, ZAG:2, LE:3, LD:4, VOL:5, MC:6, MEI:7, PE:8, PD:9, ATA:10 };
  const SAVE_KEYS = ['boleiros_save_v9','boleiros_save_v8','boleiros_save_v7'];
  const esc = value => String(value ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
  function saveKey() { for (const k of SAVE_KEYS) { try { if (localStorage.getItem(k)) return k; } catch {} } return 'boleiros_save_v9'; }
  function loadState() { try { return JSON.parse(localStorage.getItem(saveKey()) || 'null'); } catch { return null; } }
  function writeState(state) { try { localStorage.setItem(saveKey(), JSON.stringify(state)); } catch {} }
  function posRank(pos) { return POS_ORDER[pos] || 99; }
  function allPlayers(state) { return (state?.players || []).filter(p => p.teamId === state.user?.teamId); }
  function ordered(list) { return list.slice().sort((a,b) => posRank(a.pos) - posRank(b.pos) || (b.overall || 0) - (a.overall || 0) || a.name.localeCompare(b.name)); }
  function starters(state) { return ordered(allPlayers(state).filter(p => p.starter && !p.injury && !p.suspended)).slice(0,11); }
  function bench(state) { const ids = new Set(starters(state).map(p => p.id)); return ordered(allPlayers(state).filter(p => !ids.has(p.id))); }
  function role(pos) { if (pos === 'GOL') return 'gol'; if (['ZAG','LE','LD','VOL'].includes(pos)) return 'def'; if (['MC','MEI'].includes(pos)) return 'mid'; return 'att'; }
  function xy(list, p) {
    const r = role(p.pos);
    const def = [[18,73],[38,76],[62,76],[82,73],[50,66]];
    const mid = [[24,50],[50,49],[76,50],[36,39],[64,39]];
    const att = [[25,25],[50,20],[75,25],[39,31],[61,31]];
    const rank = list.filter(x => role(x.pos) === r).findIndex(x => x.id === p.id);
    if (r === 'gol') return [50,91];
    if (r === 'def') return def[Math.max(0, rank) % def.length];
    if (r === 'mid') return mid[Math.max(0, rank) % mid.length];
    return att[Math.max(0, rank) % att.length];
  }
  function playerRow(p, sub) {
    return `<div class="bf-row ${sub ? 'sub' : ''}"><span class="bf-pos">${esc(p.pos)}</span><b>${esc(p.name)}${p.star ? ' ⭐' : ''}</b><span class="bf-ov">${p.overall}</span><button data-bf-toggle="${p.id}">${sub ? 'Titular' : 'Banco'}</button></div>`;
  }
  function boardHtml(state, title) {
    const line = starters(state);
    const subs = bench(state);
    const t = state.tactics || { formation:'4-3-3', mentality:'Equilibrada', pressing:'Média', tempo:50, risk:45, line:50 };
    return `<section class="bf-panel"><div class="bf-head"><div><h2>${esc(title)}</h2><p>Organize o onze inicial, banco e plano de jogo no estilo Brasfoot.</p></div><span>${line.length}/11 titulares</span></div><div class="bf-board"><div class="bf-field"><div class="bf-circle"></div><div class="bf-box top"></div><div class="bf-box bottom"></div>${line.map(p => { const point = xy(line,p); return `<div class="bf-shirt ${role(p.pos)}" style="left:${point[0]}%;top:${point[1]}%"><div class="bf-kit"></div><div class="bf-name">${esc(p.name)}</div><div class="bf-meta">${esc(p.pos)} • ${p.overall}</div></div>`; }).join('')}</div><aside class="bf-side"><div class="bf-tabs"><button class="on">Elenco</button><button>Tática</button></div><div class="bf-tactics"><label>Formação<select data-bf-tactic="formation">${['4-3-3','4-4-2','4-2-3-1','3-5-2','5-3-2'].map(x => `<option ${t.formation === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Mentalidade<select data-bf-tactic="mentality">${['Defensiva','Equilibrada','Ofensiva'].map(x => `<option ${t.mentality === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Pressão<select data-bf-tactic="pressing">${['Baixa','Média','Alta'].map(x => `<option ${t.pressing === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Ritmo<input type="range" min="0" max="100" value="${t.tempo || 50}" data-bf-slider="tempo"></label><label>Risco<input type="range" min="0" max="100" value="${t.risk || 45}" data-bf-slider="risk"></label><label>Linha<input type="range" min="0" max="100" value="${t.line || 50}" data-bf-slider="line"></label></div><div class="bf-list"><div class="bf-row"><span class="bf-pos">POS</span><b>Titulares</b><span class="bf-ov">OV</span><span></span></div>${line.map(p => playerRow(p,false)).join('')}<div class="bf-row sub"><span class="bf-pos">SUB</span><b>Banco</b><span></span><span></span></div>${subs.slice(0,18).map(p => playerRow(p,true)).join('')}<p class="bf-note">Ao escolher um novo titular com 11 em campo, o jogador mais fraco da mesma linha sai automaticamente.</p></div></aside></div></section>`;
  }
  function currentPageTitle() { return document.querySelector('.pageHead h1')?.textContent || ''; }
  function isTargetPage() { return /Escalação|Táticas/i.test(currentPageTitle()); }
  function renderPageBoard() {
    const main = document.querySelector('.main');
    if (!main) return;
    if (!isTargetPage()) { main.classList.remove('bf-core-active'); main.querySelector('.bf-host')?.remove(); return; }
    const state = loadState();
    if (!state?.user?.teamId) return;
    main.classList.add('bf-core-active');
    let host = main.querySelector('.bf-host');
    if (!host) { host = document.createElement('div'); host.className = 'bf-host'; main.querySelector('.pageHead')?.insertAdjacentElement('afterend', host); }
    host.innerHTML = boardHtml(state, /Táticas/i.test(currentPageTitle()) ? 'Campo tático' : 'Escalação');
  }
  function togglePlayer(id) {
    const state = loadState(); if (!state) return;
    const p = state.players.find(x => x.id === id); if (!p || p.injury || p.suspended) return;
    if (p.starter) p.starter = false;
    else {
      const line = starters(state);
      if (line.length >= 11) {
        const sameRole = line.filter(x => role(x.pos) === role(p.pos) && !x.star).sort((a,b) => (a.overall || 0) - (b.overall || 0))[0];
        const fallback = line.filter(x => !x.star).sort((a,b) => (a.overall || 0) - (b.overall || 0))[0];
        const out = sameRole || fallback;
        if (out) out.starter = false;
      }
      p.starter = true;
    }
    state.preparation = state.preparation || {}; state.preparation.lineup = starters(state).length === 11;
    writeState(state); renderPageBoard(); renderOverlayContent();
  }
  function updateTactic(key, value) {
    const state = loadState(); if (!state) return;
    state.tactics = state.tactics || {}; state.tactics[key] = ['tempo','risk','line'].includes(key) ? Number(value) : value;
    state.preparation = state.preparation || {}; state.preparation.tactics = true;
    writeState(state); renderPageBoard(); renderOverlayContent();
  }
  function renderOverlayContent() {
    const overlay = document.querySelector('.bf-overlay-card [data-bf-content]');
    if (!overlay) return;
    const state = loadState(); if (!state) return;
    overlay.innerHTML = boardHtml(state, overlay.dataset.title || 'Ajuste tático');
  }
  function showOverlay(title) {
    const box = document.getElementById('box');
    if (!box || !document.querySelector('.modal.open')) return;
    if (box.querySelector('.bf-overlay')) return;
    const state = loadState(); if (!state) return;
    box.insertAdjacentHTML('beforeend', `<div class="bf-overlay"><div class="bf-overlay-card"><div data-bf-content data-title="${esc(title)}">${boardHtml(state,title)}</div><div class="bf-overlay-actions"><button class="bf-close" data-bf-close="1">Voltar para a partida</button></div></div></div>`);
  }
  function watchMatch() {
    const box = document.getElementById('box');
    if (!box || !document.querySelector('.modal.open')) return;
    const text = box.textContent || '';
    if (/Intervalo/i.test(text) && !box.querySelector('.bf-overlay')) showOverlay('Intervalo: ajuste o time');
  }
  document.addEventListener('click', event => {
    const toggle = event.target.closest('[data-bf-toggle]');
    if (toggle) { event.preventDefault(); togglePlayer(toggle.dataset.bfToggle); return; }
    const close = event.target.closest('[data-bf-close]');
    if (close) { close.closest('.bf-overlay')?.remove(); return; }
    const pause = event.target.closest('[data-match="pause"]');
    if (pause && /Pausar/i.test(pause.textContent || '')) setTimeout(() => showOverlay('Jogo pausado: ajuste o time'), 120);
  }, true);
  document.addEventListener('change', event => {
    const tactic = event.target.closest('[data-bf-tactic]');
    if (tactic) updateTactic(tactic.dataset.bfTactic, tactic.value);
  });
  document.addEventListener('input', event => {
    const slider = event.target.closest('[data-bf-slider]');
    if (slider) updateTactic(slider.dataset.bfSlider, slider.value);
  });
  window.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(() => requestAnimationFrame(() => { renderPageBoard(); watchMatch(); }));
    observer.observe(document.body, { childList:true, subtree:true, characterData:true });
    renderPageBoard();
  });
})();