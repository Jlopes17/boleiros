(() => {
  'use strict';

  const VERSION = 'sim-quality-2';
  const SAVE_KEYS = ['boleiros_save_v9','boleiros_save_v8','boleiros_save_v7'];
  const POS_SEQUENCE = ['GOL','GOL','LD','ZAG','ZAG','LE','VOL','MC','MEI','PE','PD','ATA','ATA','ZAG','VOL','MC','MEI','PE','PD','LD','LE','ATA','GOL','ZAG','MC','ATA'];
  const POS_ORDER = { GOL:1, GK:1, G:1, ZAG:2, Z:2, LE:3, LD:4, L:4, VOL:5, MC:6, MEI:7, M:7, PE:8, PD:9, ATA:10, A:10 };
  const TACTICAL_XY = {
    GOL:[[50,91]],
    DEF:[[16,72],[38,75],[62,75],[84,72]],
    MID:[[24,50],[50,49],[76,50]],
    ATT:[[24,25],[50,20],[76,25]]
  };
  const TEAM_OVERRIDES = {
    flamengo:'Flarengo Rio', palmeiras:'Palmeyras SP', corinthians:'Corintians Paulista', sao-paulo:'São Paolo FC', santos:'Santista Praiano', botafogo:'Botafolgo Rio', fluminense:'Fluminese Rio', vasco:'Vascão da Gama', 'atletico-mg':'Atlético Mineyro', cruzeiro:'Cruseiro Azul', gremio:'Grêmio Portoalegrense', internacional:'Internacional Sul', bahia:'Bahía Salvador', vitoria:'Vitória da Barra', 'athletico-pr':'Athletico Paranense', coritiba:'Corytiba Verde', chapecoense:'Chapecoense Verde', sport:'Sportivo Recife', fortaleza:'Fortal City', ceara:'Cearense SC', goias:'Goiás Esmeralda', 'vila-nova':'Vila Nova Goiânia', avaí:'Avaí da Ilha', avai:'Avaí da Ilha'
  };

  const hash = value => {
    let h = 2166136261;
    const str = String(value || 'boleiros');
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return Math.abs(h >>> 0);
  };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, Math.round(n)));
  const $ = (selector, ctx = document) => ctx.querySelector(selector);
  const $$ = (selector, ctx = document) => [...ctx.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));

  function slightClubName(team) {
    if (!team) return '';
    if (TEAM_OVERRIDES[team.id]) return TEAM_OVERRIDES[team.id];
    let name = String(team.name || '').trim();
    name = name.replace(/Clube de Regatas/gi, 'Regatas');
    name = name.replace(/Futebol Clube|Football Club|FC\b/gi, 'FC');
    name = name.replace(/Atlético/gi, 'Atlétiko');
    name = name.replace(/America/gi, 'Américo');
    name = name.replace(/América/gi, 'Américo');
    name = name.replace(/Botafogo/gi, 'Botafolgo');
    name = name.replace(/Palmeiras/gi, 'Palmeyras');
    name = name.replace(/Corinthians/gi, 'Corintians');
    name = name.replace(/Flamengo/gi, 'Flarengo');
    name = name.replace(/Fluminense/gi, 'Fluminese');
    name = name.replace(/Cruzeiro/gi, 'Cruseiro');
    name = name.replace(/Paranaense/gi, 'Paranense');
    name = name.replace(/Paulista/gi, 'Paulistano');
    if (name === team.name) {
      const words = name.split(' ');
      const i = Math.min(words.length - 1, Math.max(0, hash(team.id) % words.length));
      if (words[i]?.length > 4) words[i] = words[i].replace(/[aeiouáéíóúãõ]/i, m => ({ a:'e', e:'i', i:'e', o:'u', u:'o', á:'a', é:'e', í:'i', ó:'o', ú:'u', ã:'an', õ:'on' }[m.toLowerCase()] || m));
      name = words.join(' ');
    }
    return name;
  }

  function patchDatabaseNames() {
    const db = window.BOLEIROS_DB;
    if (!db?.clubs) return;
    db.clubs.forEach(team => {
      team.licensedSourceName = team.licensedSourceName || team.name;
      team.name = slightClubName(team);
    });
    db.version = `${db.version || 'db'}-${VERSION}`;
    db.licenseSafeClubs = true;
  }

  function posRank(pos) { return POS_ORDER[pos] || 99; }
  function teamQuality(team) {
    const rep = team?.rep || 55;
    if (team?.div === 'br-a') return { base: rep >= 84 ? 76 : rep >= 80 ? 72 : rep >= 76 ? 68 : 64, floor:55, ceiling:88 };
    if (team?.div === 'br-b') return { base: rep >= 72 ? 65 : rep >= 68 ? 62 : 59, floor:48, ceiling:77 };
    if (team?.div === 'br-c') return { base: rep >= 64 ? 57 : rep >= 60 ? 54 : 51, floor:42, ceiling:69 };
    if (team?.div === 'br-d') return { base: rep >= 60 ? 50 : rep >= 56 ? 47 : 44, floor:35, ceiling:63 };
    return { base: Math.min(76, Math.max(48, rep - 8)), floor:40, ceiling:82 };
  }
  function positionBonus(pos) {
    if (pos === 'GOL') return 1;
    if (pos === 'ZAG') return 0;
    if (pos === 'ATA' || pos === 'MEI') return 1;
    if (pos === 'PE' || pos === 'PD') return 0;
    return -1;
  }
  function naturalOverall(player, team, index) {
    if (player.star) return player.overall || 72;
    const q = teamQuality(team);
    const seed = hash(`${team?.id}-${player.id || player.name}-${index}`);
    const depth = index < 11 ? index * 0.28 : 3.4 + (index - 11) * 0.62;
    const variance = (seed % 7) - 3;
    const veteranBump = player.age >= 28 && player.age <= 32 ? 1 : player.age >= 34 ? -2 : 0;
    return clamp(q.base + positionBonus(player.pos) - depth + variance + veteranBump, q.floor, q.ceiling);
  }
  function assignPositions(players) {
    players.sort((a,b) => Number(b.starter) - Number(a.starter) || posRank(a.pos) - posRank(b.pos) || (b.overall || 0) - (a.overall || 0));
    players.forEach((player, index) => {
      if (!player.pos || player.pos === 'GK' || player.pos === 'G') player.pos = player.pos ? 'GOL' : POS_SEQUENCE[index % POS_SEQUENCE.length];
      player.pos = ({ GK:'GOL', G:'GOL', Z:'ZAG', L:'LD', M:'MC', A:'ATA' }[player.pos] || player.pos);
    });
    if (!players.some(p => p.pos === 'GOL')) players[0].pos = 'GOL';
  }
  function polishPlayersForTeam(players, team) {
    assignPositions(players);
    players.sort((a,b) => posRank(a.pos) - posRank(b.pos) || Number(b.starter) - Number(a.starter) || (b.overall || 0) - (a.overall || 0));
    players.forEach((player, index) => {
      if (player.star) return;
      const ov = naturalOverall(player, team, index);
      const age = player.age || (18 + (hash(player.name) % 17));
      player.age = age;
      player.overall = ov;
      player.potential = clamp(Math.max(ov, player.potential || ov) + (age <= 21 ? 6 : age <= 24 ? 4 : age >= 32 ? 0 : 2), ov, 94);
      player.fitness = clamp(player.fitness || 88, 45, 100);
      player.morale = clamp(player.morale || 70, 35, 100);
      player.sortOrder = posRank(player.pos) * 100 + index;
      player.value = Math.round(ov * ov * (player.potential / 78) * (age < 23 ? 1.22 : age > 32 ? .72 : 1) * 850);
      player.salary = Math.round(ov * ov * (team?.div === 'br-a' ? 25 : team?.div === 'br-b' ? 17 : team?.div === 'br-c' ? 10 : 7));
    });
    players.sort((a,b) => posRank(a.pos) - posRank(b.pos) || (b.overall || 0) - (a.overall || 0));
    players.forEach((player, index) => player.starter = index < 11);
  }
  function polishState(state) {
    if (!state?.teams || !state?.players) return state;
    if (state.simQualityVersion === VERSION) return state;
    state.teams.forEach(team => {
      team.licensedSourceName = team.licensedSourceName || team.name;
      team.name = slightClubName(team);
    });
    const teams = new Map(state.teams.map(team => [team.id, team]));
    const byTeam = new Map();
    state.players.forEach(player => {
      if (!player.teamId || player.teamId === 'market') return;
      if (!byTeam.has(player.teamId)) byTeam.set(player.teamId, []);
      byTeam.get(player.teamId).push(player);
    });
    byTeam.forEach((players, teamId) => polishPlayersForTeam(players, teams.get(teamId)));
    if (Array.isArray(state.market)) polishPlayersForTeam(state.market, { id:'market', div:'br-b', rep:62 });
    state.players.sort((a,b) => String(a.teamId).localeCompare(String(b.teamId)) || (a.sortOrder || posRank(a.pos) * 100) - (b.sortOrder || posRank(b.pos) * 100));
    state.simQualityVersion = VERSION;
    state.news = Array.isArray(state.news) ? state.news : [];
    state.news.unshift('Simulation Quality: clubes licenciáveis, overalls rebalanceados e elenco em ordem real de posição.');
    return state;
  }

  function patchStorage() {
    const original = Storage.prototype.setItem;
    if (Storage.prototype.__boleirosSimQuality) return;
    Storage.prototype.setItem = function patchedSetItem(key, value) {
      if (String(key).startsWith('boleiros_save')) {
        try { value = JSON.stringify(polishState(JSON.parse(value))); } catch {}
      }
      return original.call(this, key, value);
    };
    Storage.prototype.__boleirosSimQuality = true;
  }
  function patchExistingSave() {
    for (const key of SAVE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const state = JSON.parse(raw);
        if (state?.simQualityVersion === VERSION) continue;
        localStorage.setItem(key, JSON.stringify(polishState(state)));
        sessionStorage.setItem('boleiros_sim_quality_reload', '1');
        location.reload();
        return;
      } catch {}
    }
  }
  function loadState() {
    for (const key of SAVE_KEYS) {
      try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch {}
    }
    return null;
  }
  function saveState(state) {
    try { localStorage.setItem('boleiros_save_v9', JSON.stringify(state)); } catch {}
  }

  function starters(state, teamId) {
    return (state?.players || []).filter(p => p.teamId === teamId && p.starter).sort((a,b) => posRank(a.pos) - posRank(b.pos) || (b.overall || 0) - (a.overall || 0)).slice(0,11);
  }
  function bench(state, teamId) {
    const starterIds = new Set(starters(state, teamId).map(p => p.id));
    return (state?.players || []).filter(p => p.teamId === teamId && !starterIds.has(p.id)).sort((a,b) => posRank(a.pos) - posRank(b.pos) || (b.overall || 0) - (a.overall || 0)).slice(0,14);
  }
  function category(pos) {
    if (pos === 'GOL') return 'gk';
    if (['ZAG','LE','LD','VOL'].includes(pos)) return 'def';
    if (['MC','MEI'].includes(pos)) return 'mid';
    return 'att';
  }
  function xyFor(index, player) {
    if (player.pos === 'GOL') return [50,91];
    if (['ZAG','LE','LD','VOL'].includes(player.pos)) return TACTICAL_XY.DEF.shift() || [50,72];
    if (['MC','MEI'].includes(player.pos)) return TACTICAL_XY.MID.shift() || [50,49];
    return TACTICAL_XY.ATT.shift() || [50,24];
  }
  function buildField(players, title = 'Time titular') {
    TACTICAL_XY.DEF = [[16,72],[38,75],[62,75],[84,72]];
    TACTICAL_XY.MID = [[24,50],[50,49],[76,50]];
    TACTICAL_XY.ATT = [[24,25],[50,20],[76,25]];
    return `<div class="sq-section-title">${esc(title)}</div><div class="sq-match-field" data-sq-field="1"><div class="sq-center"></div><div class="sq-box top"></div><div class="sq-box bottom"></div>${players.map((p,i) => { const xy = xyFor(i,p); return `<div class="sq-shirt ${category(p.pos)}" style="left:${xy[0]}%;top:${xy[1]}%"><div class="sq-kit"></div><div class="sq-name">${esc(p.name)}</div><div class="sq-meta">${esc(p.pos)} • ${p.overall}</div></div>`; }).join('')}</div>`;
  }
  function buildBench(players) {
    if (!players.length) return '';
    return `<div class="sq-section-title">Banco</div><div class="sq-bench-strip">${players.slice(0,7).map(p => `<div class="sq-bench-card"><b>${esc(p.name)}</b><span>${esc(p.pos)} • ${p.overall}</span></div>`).join('')}</div>`;
  }
  function injectFields() {
    const state = loadState();
    if (!state?.user?.teamId) return;
    const onEscala = /Escalação|Onze inicial/i.test(document.querySelector('.pageHead h1')?.textContent || '');
    if (onEscala && !document.querySelector('[data-sq-field]')) {
      const panel = [...document.querySelectorAll('.panel')].find(p => /Campo|Onze inicial/i.test(p.textContent || '')) || document.querySelector('.panel');
      if (panel) panel.insertAdjacentHTML('afterbegin', buildField(starters(state, state.user.teamId), 'Time titular no campo') + buildBench(bench(state, state.user.teamId)));
    }
    if (box?.querySelector('canvas') && !box.querySelector('[data-sq-field]')) {
      const minute = Number((box.textContent.match(/(\d{1,2})'/) || [0,0])[1]);
      const title = minute >= 45 && minute <= 46 ? 'Intervalo: revise o time' : 'Escalação inicial';
      const target = box.querySelector('[data-bx-match], .matchHeader, .modalHead') || box.firstElementChild;
      target?.insertAdjacentHTML('afterend', `<div class="sq-match-context"><h3>${title}</h3><p>Campo tático, não animação. Use para entender quem está em campo antes de mexer no time.</p></div>${buildField(starters(state, state.user.teamId), title)}${buildBench(bench(state, state.user.teamId))}`);
    }
  }

  let pendingSub = null;
  let allowSubPass = false;
  function applyPendingSubsToState(state) {
    if (!state || !pendingSub) return state;
    const out = state.players.find(p => p.id === pendingSub.outId);
    const inn = state.players.find(p => p.id === pendingSub.inId);
    if (out && inn && out.teamId === inn.teamId) {
      out.starter = false;
      inn.starter = true;
      state.news = state.news || [];
      state.news.unshift(`Substituição: ${inn.name} entrou no lugar de ${out.name}.`);
    }
    return state;
  }
  const originalSetItemForSubs = Storage.prototype.setItem;
  Storage.prototype.setItem = function subAwareSetItem(key, value) {
    if (String(key).startsWith('boleiros_save') && pendingSub) {
      try { value = JSON.stringify(applyPendingSubsToState(JSON.parse(value))); } catch {}
    }
    return originalSetItemForSubs.call(this, key, value);
  };

  function showSubModal(button) {
    const state = loadState();
    const teamId = state?.user?.teamId;
    if (!teamId) return;
    const outList = starters(state, teamId);
    const inList = bench(state, teamId);
    let outId = outList[0]?.id;
    let inId = inList[0]?.id;
    const layer = document.createElement('div');
    layer.className = 'sq-sub-backdrop';
    layer.innerHTML = `<div class="sq-sub-modal"><h2>Substituição</h2><p>Escolha quem sai e quem entra. Isso substitui o botão genérico de substituição.</p><div class="sq-sub-grid"><div><h3>Sai</h3><div class="sq-list">${outList.map(p => `<button class="sq-choice" data-out="${p.id}"><span>${p.pos}</span><b>${esc(p.name)}</b><span>${p.overall}</span></button>`).join('')}</div></div><div><h3>Entra</h3><div class="sq-list">${inList.map(p => `<button class="sq-choice" data-in="${p.id}"><span>${p.pos}</span><b>${esc(p.name)}</b><span>${p.overall}</span></button>`).join('')}</div></div></div><div class="sq-sub-actions"><button data-close-sub="1">Cancelar</button><button class="pri" data-confirm-sub="1">Confirmar substituição</button></div></div>`;
    document.body.appendChild(layer);
    const mark = () => {
      $$('[data-out]', layer).forEach(b => b.classList.toggle('on', b.dataset.out === outId));
      $$('[data-in]', layer).forEach(b => b.classList.toggle('on', b.dataset.in === inId));
    };
    mark();
    layer.addEventListener('click', event => {
      const out = event.target.closest('[data-out]');
      const inn = event.target.closest('[data-in]');
      if (out) { outId = out.dataset.out; mark(); }
      if (inn) { inId = inn.dataset.in; mark(); }
      if (event.target.closest('[data-close-sub]')) layer.remove();
      if (event.target.closest('[data-confirm-sub]')) {
        pendingSub = { outId, inId };
        const current = loadState();
        applyPendingSubsToState(current);
        saveState(current);
        layer.remove();
        allowSubPass = true;
        button.click();
        allowSubPass = false;
        setTimeout(() => { pendingSub = null; injectFields(); }, 500);
      }
    });
  }

  function cleanMatchControls() {
    if (!box) return;
    $$('button', box).forEach(button => {
      if (/Momentos/i.test(button.textContent || '')) button.classList.add('sq-hidden');
      if (/Encerrar|Resultado/i.test(button.textContent || '')) button.classList.add('sq-hidden');
    });
  }
  function naturalizeEvents() {
    if (!box) return;
    $$('.item, .bx-event', box).forEach(item => {
      item.classList.add('sq-natural-events');
      item.textContent = item.textContent
        .replace(/Chance perigosa neutralizada\./g, 'A defesa fechou bem e afastou o perigo.')
        .replace(/Gol do adversário\./g, 'Falha de marcação, o adversário marcou.')
        .replace(/GOOOL do/g, 'Gol do')
        .replace(/A bola vai rolar\./g, 'Times posicionados, bola rolando.');
    });
  }
  function addQualityNotes() {
    const isElenco = /Elenco/i.test(document.querySelector('.pageHead h1')?.textContent || '');
    if (!isElenco || document.querySelector('.sq-quality-note')) return;
    const panel = document.querySelector('.panel');
    panel?.insertAdjacentHTML('afterbegin', '<div class="sq-quality-note"><b>Ordem do elenco:</b> goleiros, defensores, meio-campistas, pontas e atacantes. O overall agora considera divisão, reputação do clube, profundidade do elenco e função do jogador.</div>');
  }

  document.addEventListener('click', event => {
    const sub = event.target.closest('[data-coach="sub"]');
    if (!sub || allowSubPass) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showSubModal(sub);
  }, true);

  function enhance() {
    injectFields();
    cleanMatchControls();
    naturalizeEvents();
    addQualityNotes();
  }

  patchDatabaseNames();
  patchStorage();
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(patchExistingSave, 200);
    const observer = new MutationObserver(() => requestAnimationFrame(enhance));
    observer.observe(document.body, { childList:true, subtree:true, characterData:true });
    enhance();
  });
})();
