(() => {
  'use strict';

  const SAVE_KEYS = ['boleiros_save_v9','boleiros_save_v8','boleiros_save_v7'];
  const box = document.getElementById('box');
  const app = document.getElementById('app');
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[char]));

  let lastFeedback = 0;
  let joy = null;
  let actions = null;

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
    return state?.teams?.find(team => team.id === id)?.name || id || 'Time';
  }

  function userTeamId(state) {
    return state?.user?.teamId;
  }

  function currentFixture(state) {
    const uid = userTeamId(state);
    return state?.fixtures?.find(f => !f.done && (f.home === uid || f.away === uid)) || null;
  }

  function modeFromModal() {
    const text = box?.textContent || '';
    if (/Completo/i.test(text)) return 'completo';
    return 'tecnico';
  }

  function parseMinute() {
    const found = (box?.textContent || '').match(/(\d{1,2})'/);
    return found ? Number(found[1]) : 0;
  }

  function parseScore() {
    const title = box?.querySelector('h2')?.textContent || '';
    const found = title.match(/(.+?)\s+(\d+)\s*x\s*(\d+)\s+(.+)/i);
    if (!found) return null;
    return { home: found[1].trim(), hg: Number(found[2]), ag: Number(found[3]), away: found[4].trim() };
  }

  function posRank(pos) {
    return { GOL:1, GK:1, G:1, ZAG:2, Z:2, LE:3, LD:4, L:4, VOL:5, MC:6, MEI:7, M:7, PE:8, PD:9, ATA:10, A:10 }[pos] || 99;
  }

  function rating(player, index) {
    const ov = player?.overall || 50;
    const form = player?.form || 60;
    const morale = player?.morale || 60;
    return (Math.max(4.5, Math.min(9.8, (ov * .075 + form * .01 + morale * .008 - index * .015))).toFixed(1)).replace('.', ',');
  }

  function lineup(state, teamId) {
    return (state?.players || [])
      .filter(player => player.teamId === teamId)
      .sort((a,b) => Number(b.starter) - Number(a.starter) || posRank(a.pos) - posRank(b.pos) || (b.overall || 0) - (a.overall || 0))
      .slice(0, 11);
  }

  function lineRows(players) {
    return players.map((player, index) => `<div class="bx-line"><span class="bx-pos">${esc(player.pos || 'M')}</span><span>${esc(player.name || 'Jogador')}</span><span class="bx-rate">${rating(player, index)}</span></div>`).join('');
  }

  function fixtureRows(state, current, score) {
    const competition = current?.competition;
    const round = current?.round;
    const rows = (state?.fixtures || []).filter(f => f.competition === competition && f.round === round).slice(0, 10);
    return rows.map(f => {
      const mine = current && f.id === current.id;
      return `<div class="bx-fixture"><span>${esc(teamName(state, f.home))}</span><b>${mine ? score.hg : f.done ? f.homeGoals : 0}</b><b>${mine ? score.ag : f.done ? f.awayGoals : 0}</b><span>${esc(teamName(state, f.away))}</span></div>`;
    }).join('');
  }

  function statFromText(label, fallback) {
    const text = box?.textContent || '';
    const found = text.match(new RegExp(label + '\\s*(\\d+%?)', 'i'));
    return found ? found[1] : fallback;
  }

  function events() {
    const items = $$('.matchSide .item, .stack .item', box).map(el => el.textContent.trim()).filter(Boolean).slice(0, 5);
    return (items.length ? items : ['A bola vai rolar.']).map(item => `<div class="bx-event">${esc(item)}</div>`).join('');
  }

  function buildCoachPanel() {
    const state = loadState();
    const current = currentFixture(state);
    if (!state || !current) return '';
    const parsed = parseScore() || { home: teamName(state, current.home), away: teamName(state, current.away), hg: 0, ag: 0 };
    const minute = parseMinute();
    const homePlayers = lineup(state, current.home);
    const awayPlayers = lineup(state, current.away);
    const progress = Math.max(2, Math.min(100, minute / 90 * 100));
    const shots = statFromText('Chutes', '0');
    const against = statFromText('Contra', '0');
    const possession = statFromText('Posse', '50%');

    return `<div class="bx-match-panel" data-bx-match="1">
      <div class="bx-match-top"><div>${esc(current.competition)} - ${current.round}ª rodada</div><div class="bx-clock"><div class="bx-clockbar"><span style="width:${progress}%"></span></div><span>${minute}' ${minute < 46 ? '1º tempo' : '2º tempo'}</span></div></div>
      <div class="bx-scoreline"><div class="bx-team home"><span class="bx-crest">${esc(parsed.home[0])}</span>${esc(parsed.home)}</div><div class="bx-goal">${parsed.hg}</div><div class="bx-x">x</div><div class="bx-goal">${parsed.ag}</div><div class="bx-team away"><span class="bx-crest">${esc(parsed.away[0])}</span>${esc(parsed.away)}</div></div>
      <div class="bx-match-grid"><div class="bx-panel round"><h3>Rodada</h3>${fixtureRows(state, current, parsed)}</div><div class="bx-panel home"><h3>${esc(parsed.home)}</h3>${lineRows(homePlayers)}</div><div class="bx-panel center"><h3>Lances e estatísticas</h3>${events()}<div class="bx-stat"><span>Finalizações</span><b>${esc(shots)}</b></div><div class="bx-stat"><span>Finalizações sofridas</span><b>${esc(against)}</b></div><div class="bx-stat"><span>Posse de bola</span><b>${esc(possession)}</b></div></div><div class="bx-panel away"><h3>${esc(parsed.away)}</h3>${lineRows(awayPlayers)}</div></div>
    </div>`;
  }

  function improveCoachMode() {
    if (!box || !box.querySelector('canvas')) return;
    const mode = modeFromModal();
    box.classList.toggle('bx-complete-active', mode === 'completo');
    if (mode === 'tecnico') {
      const canvas = box.querySelector('canvas');
      if (canvas) canvas.style.display = 'none';
      const old = box.querySelector('[data-bx-match]');
      const panel = buildCoachPanel();
      if (panel) {
        if (old) old.outerHTML = panel;
        else box.insertAdjacentHTML('afterbegin', panel);
      }
    } else {
      const canvas = box.querySelector('canvas');
      if (canvas) canvas.style.display = '';
      box.querySelector('[data-bx-match]')?.remove();
      addCompleteHud();
    }

    $$('.matchActions button', box).forEach(button => {
      if (/Momentos/i.test(button.textContent)) button.remove();
      if (/Encerrar/i.test(button.textContent)) button.textContent = 'Resultado';
    });
  }

  function addCompleteHud() {
    const stage = box?.querySelector('.matchStage') || box?.querySelector('canvas')?.parentElement;
    if (!stage || stage.querySelector('.bx-complete-hud')) return;
    stage.style.position = 'relative';
    stage.insertAdjacentHTML('beforeend', `<div class="bx-complete-hud"><b>Boleiro em campo</b><span>Toque para correr, use as ações para decidir.</span><div class="bx-stamina"><span style="width:82%"></span></div></div>`);
  }

  function feedback(text) {
    const now = Date.now();
    if (now - lastFeedback < 900) return;
    lastFeedback = now;
    document.querySelector('.bx-feedback')?.remove();
    const stage = box?.querySelector('.matchStage') || box?.querySelector('canvas')?.parentElement;
    if (!stage) return;
    const el = document.createElement('div');
    el.className = 'bx-feedback';
    el.textContent = text;
    stage.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  function addMobileControls() {
    if (!joy) {
      joy = document.createElement('div');
      joy.className = 'bx-joy';
      document.body.appendChild(joy);
    }
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'bx-context-actions';
      actions.innerHTML = `<button class="pri" data-bx-action="shoot">Chutar</button><button data-bx-action="pass">Passe</button><button data-bx-action="cross">Cruzamento</button><button data-bx-action="tackle">Carrinho</button>`;
      document.body.appendChild(actions);
    }
  }

  function topGuide() {
    const main = $('.main');
    if (!main || main.querySelector('.bx-top-guide')) return;
    const title = $('.pageHead h1', main)?.textContent || '';
    if (!/Painel/.test(title)) return;
    const guide = document.createElement('div');
    guide.className = 'bx-top-guide';
    guide.innerHTML = `<h2>Seu ciclo de treinador</h2><p>O jogo deve ser jogado como temporada real: preparar, escalar, treinar, jogar e reagir ao resultado.</p><div class="bx-route"><span><b>1. Elenco</b>Escolha 11 titulares.</span><span><b>2. Táticas</b>Ajuste ao rival.</span><span><b>3. Treino</b>Use uma vez por semana.</span><span><b>4. Partida</b>Jogue a próxima data.</span></div>`;
    $('.pageHead', main)?.insertAdjacentElement('afterend', guide);
  }

  function addQuickActions() {
    const main = $('.main');
    if (!main || main.querySelector('.bx-actionbar')) return;
    const bar = document.createElement('div');
    bar.className = 'bx-actionbar';
    bar.innerHTML = `<button data-view="elenco">Elenco</button><button data-view="taticas">Tática</button><button data-view="treino">Treino</button><button class="pri" data-action="match">Jogar próxima</button>`;
    $('.pageHead', main)?.insertAdjacentElement('afterend', bar);
  }

  function improveModeCards() {
    const panel = [...document.querySelectorAll('.panel')].find(el => /Central da partida/i.test(el.textContent || ''));
    if (!panel || panel.querySelector('.bx-mode-select')) return;
    const current = /Completo/.test(panel.textContent) ? 'completo' : 'tecnico';
    const old = panel.querySelector('.g3');
    if (old) old.style.display = 'none';
    const select = document.createElement('div');
    select.className = 'bx-mode-select';
    select.innerHTML = `<button class="bx-mode-option ${current !== 'completo' ? 'on' : ''}" data-mode="tecnico"><b>Técnico</b><span>Experiência Brasfoot: simulação, estatísticas, substituição e ajustes no intervalo.</span><small>Manager</small></button><button class="bx-mode-option ${current === 'completo' ? 'on' : ''}" data-mode="completo"><b>Completo</b><span>Experiência NSS 5: você controla o Boleiro em campo, pede bola, passa, chuta e marca.</span><small>Player</small></button>`;
    old?.insertAdjacentElement('afterend', select);
  }

  function tablePolish() {
    document.querySelectorAll('.table').forEach(el => el.classList.add('bx-table-wrap'));
  }

  function enhance() {
    addMobileControls();
    topGuide();
    addQuickActions();
    improveModeCards();
    improveCoachMode();
    tablePolish();
  }

  document.addEventListener('click', event => {
    const action = event.target.closest('[data-bx-action]')?.dataset.bxAction;
    if (!action) return;
    const target = box?.querySelector(`[data-full="${action}"]`);
    if (target) target.click();
    feedback({ shoot:'Finalização!', pass:'Passe solicitado', cross:'Cruzamento!', tackle:'Pressão na bola!' }[action] || 'Ação');
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-full], [data-moment], [data-coach]');
    if (!button) return;
    const label = button.textContent.trim().split('\n')[0];
    if (label) feedback(label);
  });

  const observer = new MutationObserver(() => requestAnimationFrame(enhance));
  window.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList:true, subtree:true, characterData:true });
    enhance();
  });
})();
