(() => {
  'use strict';
  const E = window.BoleirosEngine;
  const UI = window.BoleirosUI;
  const M = window.BoleirosMatch;
  const $ = (s, c = document) => c.querySelector(s);

  function boot() {
    E.load();
    UI.render();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button,.modeCard');
    if (!button) return;
    const d = button.dataset;

    if (d.start === 'new') return UI.setupScreen();
    if (d.start === 'continue') { E.load(); return UI.render(); }
    if (d.start === 'demo') { E.newGame(); return UI.render(); }
    if (d.start === 'back') { E.setState(null); return UI.render(); }
    if (d.start === 'create') {
      E.newGame({ coach: $('#coach').value, teamId: $('#clubSelect').value, difficulty: $('#difficulty').value });
      return UI.render();
    }
    if (d.start === 'how') {
      return UI.openModal(`<div class="modalHead"><h2>Como jogar</h2><button data-close="1">Fechar</button></div><div class="grid"><div class="card"><h3>1. Escolha o clube</h3><p class="mut">Times por divisão e ordem alfabética.</p></div><div class="card"><h3>2. Prepare</h3><p class="mut">Escalação, tática, treino e mercado.</p></div><div class="card"><h3>3. Matchday</h3><p class="mut">Pause quando quiser. Aos 45, intervalo obrigatório.</p></div><div class="card"><h3>4. Evolua</h3><p class="mut">Finanças, carreira, competições e elenco.</p></div></div>`);
    }

    if (!E.getState()) return;
    if (d.view) return UI.setView(d.view);
    if (d.action === 'match') return M.open();
    if (d.action === 'autoLineup') { E.autoLineup(); UI.showToast('Escalação ajustada'); return UI.render(); }
    if (d.action === 'train') { UI.showToast(E.applyTraining()); return UI.render(); }
    if (d.action === 'scout') {
      const s = E.getState();
      const cost = 120000;
      if (s.finance.balance < cost) return UI.showToast('Saldo insuficiente');
      s.finance.balance -= cost;
      s.market.push(...Array.from({ length:6 }, (_, i) => E.makePlayer(i, 'market', E.rand(56, 82))));
      s.preparation.market = true;
      E.save();
      return UI.render();
    }
    if (d.action === 'save') { E.save(); return UI.showToast('Salvo'); }
    if (d.action === 'export') { $('#saveBox').value = JSON.stringify(E.getState(), null, 2); return; }
    if (d.action === 'import') {
      try { E.setState(JSON.parse($('#saveBox').value)); UI.render(); }
      catch { UI.showToast('Save inválido'); }
      return;
    }
    if (d.action === 'reset' && confirm('Resetar jogo?')) { localStorage.removeItem('boleiros_save_v10'); E.setState(null); return UI.render(); }

    if (d.mode) { E.getState().matchMode = d.mode; E.save(); return UI.render(); }
    if (d.player) return openPlayer(d.player);
    if (d.competition) return openCompetition(d.competition);

    if (d.buy) {
      const s = E.getState();
      const p = s.market.find(x => x.id === d.buy);
      if (!p) return;
      if (s.finance.balance < p.value) return UI.showToast('Saldo insuficiente');
      s.finance.balance -= p.value;
      p.teamId = s.user.teamId;
      s.players.push(p);
      s.market = s.market.filter(x => x.id !== p.id);
      s.preparation.market = true;
      E.save();
      return UI.render();
    }
    if (d.sell) {
      const s = E.getState();
      const p = s.players.find(x => x.id === d.sell);
      if (!p) return;
      if (p.star) return UI.showToast('Não dá para vender o Boleiro');
      s.finance.balance += p.value;
      s.players = s.players.filter(x => x.id !== p.id);
      E.save();
      return UI.render();
    }
    if (d.life) {
      const c = E.getState().career;
      if (d.life === 'rest') c.energy = E.clamp(c.energy + 18);
      if (d.life === 'boot' && c.cash >= 500) { c.cash -= 500; c.skills.Finalização = E.clamp(c.skills.Finalização + 2); }
      if (d.life === 'media') { c.fame = E.clamp(c.fame + 4); c.relationships.Mídia = E.clamp(c.relationships.Mídia + 8); }
      if (d.life === 'night') { c.happiness = E.clamp(c.happiness + 12); c.energy = E.clamp(c.energy - 16); }
      E.save();
      return UI.render();
    }

    if (d.close) return M.isOpen() ? M.close() : UI.closeModal();
    if (d.switchMode) return M.switchMode(d.switchMode);
    if (d.match === 'pause') return M.pause();
    if (d.match === 'secondHalf') return M.secondHalf();
    if (d.match === 'finish') return M.finish();
    if (d.moment) return M.moment(d.moment);
    if (d.coach) return M.coach(d.coach);
    if (d.full) return M.fullAction(d.full);
  });

  document.addEventListener('change', event => {
    const input = event.target;
    if (input.id === 'clubSelect') return UI.updateClubPreview();
    const s = E.getState();
    if (!s) return;
    if (input.dataset.starter) {
      const p = s.players.find(x => x.id === input.dataset.starter);
      p.starter = input.checked;
      if (E.starters().length > 11) { p.starter = false; UI.showToast('Máximo de 11 titulares'); }
      s.preparation.lineup = true;
      E.save();
      return UI.render();
    }
    if (input.dataset.tactic) { s.tactics[input.dataset.tactic] = input.value; s.preparation.tactics = true; E.save(); return UI.render(); }
    if (input.dataset.training) { s.training[input.dataset.training] = input.value; s.preparation.training = true; E.save(); return UI.render(); }
    if (input.dataset.filter === 'position') { s.filters.position = input.value; E.save(); return UI.render(); }
    if (input.dataset.finance) { s.finance[input.dataset.finance] = Number(input.value) || s.finance[input.dataset.finance]; E.save(); }
  });

  document.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'teamSearch') return UI.filterTeams();
    const s = E.getState();
    if (!s || !input.dataset.slider) return;
    if (input.dataset.scope === 'tactics') { s.tactics[input.dataset.slider] = Number(input.value); s.preparation.tactics = true; }
    else { s.training[input.dataset.slider] = Number(input.value); s.preparation.training = true; }
    E.save();
    UI.render();
  });

  document.addEventListener('pointerdown', event => {
    const hold = event.target.closest('[data-hold]');
    if (hold) { M.setKey(hold.dataset.hold, true); return; }
    const canvas = event.target.closest('#cv');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    M.setAim(E.clamp((event.clientX - rect.left) / rect.width * 100), E.clamp((event.clientY - rect.top) / rect.height * 100));
  });
  document.addEventListener('pointerup', event => {
    const hold = event.target.closest('[data-hold]');
    if (hold) M.setKey(hold.dataset.hold, false);
  });
  document.addEventListener('pointercancel', () => ['up','down','left','right'].forEach(k => M.setKey(k, false)));
  document.addEventListener('keydown', event => { M.setKey(event.key, true); if (event.key === 'j') M.fullAction('shoot'); if (event.key === 'k') M.fullAction('pass'); if (event.key === 'l') M.fullAction('cross'); if (event.key === 'i') M.fullAction('tackle'); });
  document.addEventListener('keyup', event => M.setKey(event.key, false));

  function openPlayer(id) {
    const p = E.getState().players.find(x => x.id === id);
    if (!p) return;
    UI.openModal(`<div class="modalHead"><div><h2>${p.name}${p.star?' ⭐':''}</h2><p class="mut">${p.pos} • ${p.age} anos • contrato ${p.contract} meses</p></div><button data-close="1">Fechar</button></div><div class="g4"><div class="card">OV<div class="big">${p.overall}</div></div><div class="card">Potencial<div class="big">${p.potential}</div></div><div class="card">Físico<div class="big">${p.fitness}</div></div><div class="card">Moral<div class="big">${p.morale}</div></div></div><br><div class="grid"><div class="card"><h3>Contrato</h3><p>Salário: <b>${E.money(p.salary)}</b></p><p>Valor: <b>${E.money(p.value)}</b></p></div><div class="card"><h3>Status</h3><p>${p.injury?'Lesionado por '+p.injury+' semanas':'Disponível'}</p></div></div>`);
  }

  function openCompetition(name) {
    const c = E.getState().competitions.find(x => x.name === name);
    if (!c) return;
    const content = `<div class="modalHead"><div><h2>${c.name}</h2><p class="mut">${c.description}</p></div><button data-close="1">Fechar</button></div>${c.scope==='seleções'?UI.worldCupView():UI.tableRows(E.competitionStats(c.name))}<br><h3>Participantes</h3><div class="g3">${c.participants.map(id => typeof id === 'string' && E.getState().teams.some(t => t.id === id) ? `<div class="item"><span>${E.team(id).name}</span><span class="mut">${E.team(id).country}</span></div>` : `<div class="item">${id}</div>`).join('')}</div>`;
    UI.openModal(content);
  }

  boot();
})();
