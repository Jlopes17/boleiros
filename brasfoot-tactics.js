(() => {
  'use strict';
  const POS_ORDER = { GOL:1, GK:1, ZAG:2, LE:3, LD:4, VOL:5, MC:6, MEI:7, PE:8, PD:9, ATA:10 };
  const SAVE_KEYS = ['boleiros_save_v9','boleiros_save_v8','boleiros_save_v7'];
  const esc = value => String(value ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
  function loadState() {
    for (const key of SAVE_KEYS) {
      try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch {}
    }
    return null;
  }
  function posRank(pos) { return POS_ORDER[pos] || 99; }
  function players(state) { return (state?.players || []).filter(p => p.teamId === state.user?.teamId); }
  function starters(state) { return players(state).filter(p => p.starter && !p.injury && !p.suspended).sort((a,b) => posRank(a.pos) - posRank(b.pos) || (b.overall || 0) - (a.overall || 0)).slice(0,11); }
  function bench(state) { const ids = new Set(starters(state).map(p => p.id)); return players(state).filter(p => !ids.has(p.id)).sort((a,b) => posRank(a.pos) - posRank(b.pos) || (b.overall || 0) - (a.overall || 0)); }
  function xy(list, p, index) {
    const role = p.pos === 'GOL' ? 'gol' : ['ZAG','LE','LD','VOL'].includes(p.pos) ? 'def' : ['MC','MEI'].includes(p.pos) ? 'mid' : 'att';
    const def = [[18,73],[38,76],[62,76],[82,73],[50,66]];
    const mid = [[24,50],[50,49],[76,50],[36,39],[64,39]];
    const att = [[25,25],[50,20],[75,25],[39,31],[61,31]];
    const rank = list.filter(x => (x.pos === p.pos || (['ZAG','LE','LD','VOL'].includes(x.pos) && role === 'def') || (['MC','MEI'].includes(x.pos) && role === 'mid') || (['PE','PD','ATA'].includes(x.pos) && role === 'att'))).findIndex(x => x.id === p.id);
    if (role === 'gol') return [50,91];
    if (role === 'def') return def[Math.max(0, rank) % def.length];
    if (role === 'mid') return mid[Math.max(0, rank) % mid.length];
    return att[Math.max(0, rank) % att.length];
  }
  function shirtClass(pos) {
    if (pos === 'GOL') return 'gol';
    if (['ZAG','LE','LD','VOL'].includes(pos)) return 'def';
    if (['MC','MEI'].includes(pos)) return 'mid';
    return 'att';
  }
  function boardHtml(state, title = 'Escalação') {
    const line = starters(state);
    const subs = bench(state);
    const formation = state?.tactics?.formation || '4-3-3';
    const mentality = state?.tactics?.mentality || 'Equilibrada';
    return `<div class="bf-board" data-bf-board="1">
      <div class="bf-field"><div class="bf-circle"></div><div class="bf-box top"></div><div class="bf-box bottom"></div>${line.map((p,i) => { const point = xy(line,p,i); return `<div class="bf-shirt ${shirtClass(p.pos)}" style="left:${point[0]}%;top:${point[1]}%"><div class="bf-kit"></div><div class="bf-name">${esc(p.name)}</div><div class="bf-meta">${esc(p.pos)} • ${p.overall}</div></div>`; }).join('')}</div>
      <aside class="bf-side"><h3>${esc(title)}</h3><div class="bf-controls"><label>Formação<br><select disabled><option>${esc(formation)}</option></select></label><label>Estilo<br><select disabled><option>${esc(mentality)}</option></select></label></div><div class="bf-list"><div class="bf-player"><span class="bf-pos">POS</span><b>Titulares</b><span class="bf-ov">OVR</span></div>${line.map(p => `<div class="bf-player"><span class="bf-pos">${esc(p.pos)}</span><b>${esc(p.name)}</b><span class="bf-ov">${p.overall}</span></div>`).join('')}<div class="bf-player sub"><span class="bf-pos">SUB</span><b>Banco</b><span></span></div>${subs.slice(0,12).map(p => `<div class="bf-player sub"><span class="bf-pos">${esc(p.pos)}</span><b>${esc(p.name)}</b><span class="bf-ov">${p.overall}</span></div>`).join('')}</div></aside>
    </div>`;
  }
  function onPage() {
    const title = document.querySelector('.pageHead h1')?.textContent || '';
    if (!/Escalação|Táticas/i.test(title)) return false;
    return true;
  }
  function injectPageBoard() {
    if (!onPage()) return;
    const panel = document.querySelector('.panel');
    if (!panel || panel.querySelector('[data-bf-board]')) return;
    const state = loadState();
    if (!state?.user?.teamId) return;
    panel.insertAdjacentHTML('afterbegin', boardHtml(state, /Táticas/i.test(document.querySelector('.pageHead h1')?.textContent || '') ? 'Campo tático' : 'Onze inicial'));
  }
  function cleanRunningCoachPitch() {
    document.querySelectorAll('.mr-modal .mr-pitch, .mr-modal [data-sq-field], .mr-modal .sq-match-field, .mr-modal .sq-bench-strip').forEach(el => el.remove());
  }
  function showOverlay(title) {
    const modal = document.querySelector('.mr-modal');
    if (!modal || modal.querySelector('.bf-overlay')) return;
    const state = loadState();
    if (!state?.user?.teamId) return;
    modal.insertAdjacentHTML('beforeend', `<div class="bf-overlay"><div class="bf-overlay-card"><h2>${esc(title)}</h2>${boardHtml(state, title)}<button class="bf-close" data-bf-close="1">Voltar para o jogo</button></div></div>`);
  }
  function watchMatch() {
    const modal = document.querySelector('.mr-modal');
    if (!modal) return;
    cleanRunningCoachPitch();
    const text = modal.textContent || '';
    if (/Intervalo/i.test(text)) showOverlay('Intervalo: ajuste o time');
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-bf-close]')) event.target.closest('.bf-overlay')?.remove();
    const pause = event.target.closest('[data-mr="pause"]');
    if (pause) setTimeout(() => showOverlay('Jogo pausado: ajuste o time'), 80);
    const second = event.target.closest('[data-mr="second"]');
    if (second) document.querySelector('.bf-overlay')?.remove();
  }, true);
  window.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(() => requestAnimationFrame(() => { injectPageBoard(); watchMatch(); }));
    observer.observe(document.body, { childList:true, subtree:true, characterData:true });
    injectPageBoard(); watchMatch();
  });
})();