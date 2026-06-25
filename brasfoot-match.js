(() => {
  'use strict';

  const SAVE_KEYS = ['boleiros_save_v8','boleiros_save_v7','boleiros_live_v6','boleiros_ux_v5'];
  const box = document.getElementById('box');

  const esc = value => String(value ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, Math.round(n)));

  function loadState() {
    for (const key of SAVE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  function teamName(state, id) {
    const team = state?.teams?.find(t => t.id === id);
    return team?.name || team?.n || id || 'Time';
  }

  function userTeamId(state) {
    return state?.user?.teamId || state?.user?.club;
  }

  function fixtures(state) {
    return state?.fixtures || state?.calendar || [];
  }

  function fixtureHome(f) { return f.home || f.h; }
  function fixtureAway(f) { return f.away || f.a; }
  function fixtureDone(f) { return Boolean(f.done || f.ok); }
  function fixtureHomeGoals(f) { return f.homeGoals ?? f.gh ?? 0; }
  function fixtureAwayGoals(f) { return f.awayGoals ?? f.ga ?? 0; }
  function fixtureRound(f) { return f.round || f.rod || 1; }
  function fixtureComp(f) { return f.competition || f.comp || 'Partida'; }

  function currentFixture(state) {
    const uid = userTeamId(state);
    return fixtures(state).find(f => !fixtureDone(f) && (fixtureHome(f) === uid || fixtureAway(f) === uid)) || fixtures(state)[0];
  }

  function parseScoreFromTitle(title) {
    const match = title.match(/(.+?)\s+(\d+)\s*x\s*(\d+)\s+(.+)/i);
    if (!match) return null;
    return { home: match[1].trim(), hg: Number(match[2]), ag: Number(match[3]), away: match[4].trim() };
  }

  function modalInfo(root, state, current) {
    const title = root.querySelector('h2')?.textContent?.trim() || '';
    const parsed = parseScoreFromTitle(title);
    const text = root.textContent || '';
    const minuteMatch = text.match(/(\d{1,2})'/);
    const minute = minuteMatch ? Number(minuteMatch[1]) : 0;
    const mode = /Completo/i.test(text) ? 'completo' : /Técnico|Tecnico/i.test(text) ? 'tecnico' : 'momentos';
    return {
      minute,
      mode,
      comp: current ? fixtureComp(current) : 'Partida',
      round: current ? fixtureRound(current) : 1,
      home: parsed?.home || teamName(state, fixtureHome(current)),
      away: parsed?.away || teamName(state, fixtureAway(current)),
      hg: parsed?.hg ?? 0,
      ag: parsed?.ag ?? 0,
      homeId: fixtureHome(current),
      awayId: fixtureAway(current)
    };
  }

  function rating(player) {
    const ov = player.overall || player.ov || 50;
    const form = player.form || player.forma || 60;
    const morale = player.morale || player.mor || 60;
    const seed = String(player.name || player.nome || '').split('').reduce((s,c)=>s+c.charCodeAt(0),0) % 9;
    return (clamp(45 + (ov - 45) * 0.8 + form * 0.08 + morale * 0.05 + seed, 45, 96) / 10).toFixed(1).replace('.', ',');
  }

  function lineup(state, teamId) {
    const players = (state?.players || []).filter(p => (p.teamId || p.team) === teamId);
    return players.sort((a,b) => Number(Boolean(b.starter || b.tit)) - Number(Boolean(a.starter || a.tit)) || (b.overall || b.ov || 0) - (a.overall || a.ov || 0)).slice(0, 11);
  }

  function fallbackLineup(side) {
    const names = side === 'home' ? ['César','Evandro','Lino','Douglas','Silas','Luiz','Branco','Marcos','Cléber','Júlio','Caio'] : ['Rafael','Marcos','Gil','Fabrício','Henrique','Pedro','Roger','Bernardo','Gilberto','Eliandro','Guerón'];
    const pos = ['G','L','Z','Z','M','M','M','M','A','A','A'];
    return names.map((name, index) => ({ name, nome:name, pos:pos[index], overall:58 + index % 6, form:70, morale:70 }));
  }

  function lineupRows(players, side) {
    const rows = (players.length ? players : fallbackLineup(side)).slice(0, 11);
    return rows.map(p => `<div class="bf-player"><span class="bf-pos">${esc(p.pos || 'M')}</span><span class="bf-name">${esc(p.name || p.nome)}</span><span class="bf-rate">${rating(p)}</span></div>`).join('');
  }

  function roundRows(state, current, info) {
    const comp = current ? fixtureComp(current) : info.comp;
    const round = current ? fixtureRound(current) : info.round;
    let rows = fixtures(state).filter(f => fixtureComp(f) === comp && fixtureRound(f) === round).slice(0, 10);
    if (!rows.length && current) rows = [current];
    return rows.map(f => {
      const mine = fixtureHome(f) === info.homeId && fixtureAway(f) === info.awayId;
      const hg = fixtureDone(f) ? fixtureHomeGoals(f) : (mine ? info.hg : 0);
      const ag = fixtureDone(f) ? fixtureAwayGoals(f) : (mine ? info.ag : 0);
      return `<div class="bf-fixture ${mine ? 'me' : ''}"><span>${esc(teamName(state, fixtureHome(f)))}</span><b>${hg}</b><b>${ag}</b><span>${esc(teamName(state, fixtureAway(f)))}</span></div>`;
    }).join('');
  }

  function events(root) {
    const logs = [...root.querySelectorAll('.matchSide .item, .stack .item')].map(el => el.textContent.trim()).filter(Boolean).slice(0, 5);
    if (!logs.length) return '<div class="bf-event">A bola vai rolar.</div>';
    return logs.map(log => `<div class="bf-event">${esc(log)}</div>`).join('');
  }

  function statValue(root, label, fallback) {
    const text = root.textContent || '';
    const re = new RegExp(label + '\\s*(\\d+%?)', 'i');
    const found = text.match(re);
    return found ? found[1] : fallback;
  }

  function buildBoard(root) {
    if (!root.querySelector('canvas')) return null;
    const state = loadState();
    const current = currentFixture(state);
    const info = modalInfo(root, state, current);
    const progress = Math.max(2, Math.min(100, info.minute / 90 * 100));
    const homeLine = lineup(state, info.homeId);
    const awayLine = lineup(state, info.awayId);
    const shots = statValue(root, 'Chutes', '0');
    const against = statValue(root, 'Contra', '0');
    const possession = statValue(root, 'Posse', '50%');

    return `<div class="bf-board" data-bf-board="1">
      <div class="bf-top"><div>${esc(info.comp)} - ${info.round}ª rodada</div><div class="bf-clock"><div class="bf-clockbar"><span style="width:${progress}%"></span></div><span>${info.minute}' ${info.minute < 46 ? '1º tempo' : '2º tempo'}</span></div></div>
      <div class="bf-score"><div class="bf-club home"><span class="bf-crest">${esc(info.home[0] || 'C')}</span>${esc(info.home)}</div><div class="bf-goal">${info.hg}</div><div class="bf-x">x</div><div class="bf-goal">${info.ag}</div><div class="bf-club away"><span class="bf-crest">${esc(info.away[0] || 'F')}</span>${esc(info.away)}</div></div>
      <div class="bf-grid">
        <div class="bf-panel round"><h3>Rodada</h3>${roundRows(state, current, info)}</div>
        <div class="bf-panel home"><h3>${esc(info.home)}</h3>${lineupRows(homeLine, 'home')}</div>
        <div class="bf-panel center"><h3>Lances e estatísticas</h3><div class="bf-events">${events(root)}</div><div class="bf-stats"><div class="bf-stat"><span>Finalizações</span><b>${esc(shots)}</b></div><div class="bf-stat"><span>Finalizações sofridas</span><b>${esc(against)}</b></div><div class="bf-stat"><span>Posse de bola</span><b>${esc(possession)}</b></div></div></div>
        <div class="bf-panel away"><h3>${esc(info.away)}</h3>${lineupRows(awayLine, 'away')}</div>
      </div>
    </div>`;
  }

  function enhance() {
    if (!box || !box.querySelector('canvas')) return;
    const state = loadState();
    const current = currentFixture(state);
    const info = modalInfo(box, state, current);
    const old = box.querySelector('[data-bf-board]');
    if (info.mode !== 'tecnico') {
      old?.remove();
      box.classList.remove('bf-enhanced','bf-mode-momentos','bf-mode-tecnico','bf-mode-completo');
      return;
    }
    box.classList.add('bf-enhanced', 'bf-mode-tecnico');
    box.classList.remove('bf-mode-momentos','bf-mode-completo');
    const boardHtml = buildBoard(box);
    if (!boardHtml) return;
    if (old) old.outerHTML = boardHtml;
    else box.insertAdjacentHTML('afterbegin', boardHtml);
  }

  const observer = new MutationObserver(() => requestAnimationFrame(enhance));
  window.addEventListener('DOMContentLoaded', () => {
    observer.observe(box, { childList:true, subtree:true, characterData:true });
    enhance();
  });
})();
