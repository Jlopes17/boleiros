(() => {
  'use strict';

  const SAVE_KEYS = ['boleiros_save_v9','boleiros_save_v8','boleiros_save_v7'];
  const POS_ORDER = { GOL:1, GK:1, G:1, ZAG:2, Z:2, LE:3, LD:4, VOL:5, MC:6, MEI:7, PE:8, PD:9, ATA:10 };
  const app = document.getElementById('app');
  let coach = null;
  let full = null;
  let timer = null;
  let raf = null;
  let keys = Object.create(null);
  let joyVec = { x:0, y:0 };

  const clamp = (n,a=0,b=100) => Math.max(a, Math.min(b, Number.isFinite(n) ? n : 0));
  const rint = (a,b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const html = v => String(v ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
  const money = n => 'R$ ' + Math.round(n || 0).toLocaleString('pt-BR');

  function getKey() {
    for (const key of SAVE_KEYS) {
      try { if (localStorage.getItem(key)) return key; } catch {}
    }
    return 'boleiros_save_v9';
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(getKey()) || 'null'); } catch { return null; }
  }
  function save(state) {
    try { localStorage.setItem(getKey(), JSON.stringify(state)); } catch {}
  }
  function team(state, id) { return state?.teams?.find(t => t.id === id) || { id, name:id || 'Time', rep:55, morale:60, training:2 }; }
  function squad(state, teamId) { return (state?.players || []).filter(p => p.teamId === teamId); }
  function posRank(pos) { return POS_ORDER[pos] || 99; }
  function starters(state, teamId) {
    return squad(state, teamId).filter(p => p.starter && !p.injury && !p.suspended).sort((a,b) => posRank(a.pos) - posRank(b.pos) || (b.overall || 0) - (a.overall || 0)).slice(0,11);
  }
  function bench(state, teamId) {
    const ids = new Set(starters(state, teamId).map(p => p.id));
    return squad(state, teamId).filter(p => !ids.has(p.id) && !p.injury && !p.suspended).sort((a,b) => posRank(a.pos) - posRank(b.pos) || (b.overall || 0) - (a.overall || 0)).slice(0,12);
  }
  function nextFixture(state) {
    const uid = state?.user?.teamId;
    return state?.fixtures?.find(f => !f.done && (f.home === uid || f.away === uid));
  }
  function currentRound(state, fx) {
    return (state?.fixtures || []).filter(f => !f.done && f.competition === fx.competition && f.round === fx.round);
  }
  function avg(list, getter, fallback = 55) {
    return list.length ? list.reduce((s,x) => s + getter(x), 0) / list.length : fallback;
  }
  function unitLineup(state, teamId) {
    const list = starters(state, teamId);
    const gk = avg(list.filter(p => p.pos === 'GOL'), p => p.overall, avg(list, p => p.overall));
    const def = avg(list.filter(p => ['GOL','ZAG','LE','LD','VOL'].includes(p.pos)), p => p.overall, avg(list, p => p.overall));
    const mid = avg(list.filter(p => ['VOL','MC','MEI','PE','PD'].includes(p.pos)), p => p.overall, avg(list, p => p.overall));
    const atk = avg(list.filter(p => ['MEI','PE','PD','ATA'].includes(p.pos)), p => p.overall, avg(list, p => p.overall));
    const fitness = avg(list, p => p.fitness || 75, 75) / 100;
    const morale = avg(list, p => p.morale || 65, 65) / 100;
    const form = avg(list, p => p.form || 65, 65) / 100;
    const club = team(state, teamId);
    return { gk, def, mid, atk, fitness, morale, form, rep:club.rep || 55, clubMorale:(club.morale || 60) / 100, training:club.training || 2, size:list.length };
  }
  function tacticEffect(state, isUser, phase) {
    if (!isUser) return 0;
    const t = state.tactics || {};
    let v = 0;
    if (phase === 'attack') {
      if (t.mentality === 'Ofensiva') v += 5;
      if (t.mentality === 'Defensiva') v -= 3;
      v += ((t.tempo || 50) - 50) / 9;
      v += ((t.risk || 45) - 45) / 13;
    } else if (phase === 'defense') {
      if (t.mentality === 'Defensiva') v += 4;
      if (t.mentality === 'Ofensiva') v -= 3;
      if (t.pressing === 'Alta') v += 1.5;
      if (t.pressing === 'Baixa') v -= 1;
      v -= ((t.line || 50) - 50) / 18;
    } else {
      if (t.pressing === 'Alta') v += 3;
      v += ((t.tempo || 50) - 50) / 15;
    }
    return v;
  }
  function teamRating(state, teamId, side, phase) {
    const u = unitLineup(state, teamId);
    const user = teamId === state.user.teamId;
    const base = phase === 'attack' ? u.atk * .45 + u.mid * .38 + u.rep * .17 : phase === 'defense' ? u.def * .48 + u.gk * .24 + u.mid * .18 + u.rep * .10 : u.mid * .46 + u.def * .22 + u.atk * .22 + u.rep * .10;
    const condition = (u.fitness * .52 + u.morale * .22 + u.form * .18 + u.clubMorale * .08);
    const home = side === 'home' ? 2.4 : 0;
    return clamp(base * condition + u.training * 1.1 + tacticEffect(state, user, phase) + home, 20, 96);
  }
  function expectedGoals(state, homeId, awayId) {
    const homeAttack = teamRating(state, homeId, 'home', 'attack');
    const awayDef = teamRating(state, awayId, 'away', 'defense');
    const awayAttack = teamRating(state, awayId, 'away', 'attack');
    const homeDef = teamRating(state, homeId, 'home', 'defense');
    const homeControl = teamRating(state, homeId, 'home', 'control');
    const awayControl = teamRating(state, awayId, 'away', 'control');
    const hDiff = homeAttack - awayDef;
    const aDiff = awayAttack - homeDef;
    const hControl = (homeControl - awayControl) / 45;
    const aControl = -hControl;
    const homeXg = clamp(1.22 + hDiff / 18 + hControl + 0.18, 0.18, 3.15);
    const awayXg = clamp(1.02 + aDiff / 18 + aControl, 0.14, 2.85);
    return { homeXg, awayXg };
  }
  function poisson(lambda) {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L && k < 8);
    return Math.max(0, k - 1);
  }
  function finalScore(state, homeId, awayId) {
    const xg = expectedGoals(state, homeId, awayId);
    let hg = poisson(xg.homeXg), ag = poisson(xg.awayXg);
    const homeR = teamRating(state, homeId, 'home', 'attack') - teamRating(state, awayId, 'away', 'defense');
    const awayR = teamRating(state, awayId, 'away', 'attack') - teamRating(state, homeId, 'home', 'defense');
    if (hg >= 5 && homeR < 8 && Math.random() < .65) hg = 4;
    if (ag >= 5 && awayR < 8 && Math.random() < .70) ag = 4;
    if (Math.abs(homeR - awayR) > 22 && Math.random() < .18) { if (homeR > awayR) hg++; else ag++; }
    return { hg:Math.min(7,hg), ag:Math.min(7,ag), ...xg };
  }
  function applyResult(state, fx, hg, ag) {
    fx.done = true; fx.homeGoals = hg; fx.awayGoals = ag;
    const h = team(state, fx.home), a = team(state, fx.away);
    if (hg > ag) { h.morale = clamp((h.morale || 60) + 3, 1, 100); a.morale = clamp((a.morale || 60) - 2, 1, 100); }
    else if (ag > hg) { a.morale = clamp((a.morale || 60) + 3, 1, 100); h.morale = clamp((h.morale || 60) - 2, 1, 100); }
    else { h.morale = clamp((h.morale || 60) + 1, 1, 100); a.morale = clamp((a.morale || 60) + 1, 1, 100); }
  }
  function finishWeek(state, fx, hg, ag, extra = {}) {
    applyResult(state, fx, hg, ag);
    currentRound(state, fx).filter(f => !f.done && f.id !== fx.id).forEach(f => { const s = finalScore(state, f.home, f.away); applyResult(state, f, s.hg, s.ag); });
    const isHome = fx.home === state.user.teamId;
    const gf = isHome ? hg : ag, ga = isHome ? ag : hg;
    const win = gf > ga, draw = gf === ga;
    const fans = team(state, state.user.teamId).fans || 16000;
    const income = isHome ? Math.round(fans * (state.finance?.ticket || 35) * (win ? .46 : draw ? .37 : .27)) : 0;
    const wage = (state.players || []).filter(p => p.teamId === state.user.teamId).reduce((s,p) => s + (p.salary || 0), 0) / 2;
    const weekly = Math.round((state.finance?.sponsor || 0) / 6 + (state.finance?.merch || 0) / 8 - wage + income);
    state.finance = state.finance || {}; state.finance.balance = (state.finance.balance || 0) + weekly;
    state.week = (state.week || 1) + 1; state.phase = 'pós-jogo'; state.preparation = { training:false, lineup:false, tactics:false, market:false };
    state.career = state.career || {}; state.career.matches = (state.career.matches || 0) + 1; state.career.energy = clamp((state.career.energy || 80) - rint(4,9), 0, 100);
    if (extra.goal) state.career.goals = (state.career.goals || 0) + extra.goal;
    if (extra.assist) state.career.assists = (state.career.assists || 0) + extra.assist;
    state.news = state.news || [];
    state.news.push(`${team(state, fx.home).name} ${hg} x ${ag} ${team(state, fx.away).name}. Resultado calculado por rating, tática, mando e forma.`);
    save(state);
    return { income, weekly, win, draw, gf, ga };
  }
  function playerLine(state, teamId) { return starters(state, teamId); }
  function cat(pos) { if (pos === 'GOL') return 'gk'; if (['ZAG','LE','LD','VOL'].includes(pos)) return 'def'; if (['MC','MEI'].includes(pos)) return 'mid'; return 'att'; }
  function xy(list, p, index) {
    const pos = p.pos;
    if (pos === 'GOL') return [50, 90];
    const defs = [[18,73],[38,76],[62,76],[82,73],[50,65]];
    const mids = [[24,51],[50,50],[76,51],[35,40],[65,40]];
    const atts = [[25,25],[50,20],[75,25],[40,30],[60,30]];
    const rank = list.filter(x => x.pos === pos || (cat(x.pos) === cat(pos))).findIndex(x => x.id === p.id);
    if (cat(pos) === 'def') return defs[rank % defs.length];
    if (cat(pos) === 'mid') return mids[rank % mids.length];
    return atts[rank % atts.length];
  }
  function pitchHtml(state, teamId) {
    const line = playerLine(state, teamId);
    return `<div class="mr-pitch"><div class="mr-circle"></div>${line.map((p,i) => { const point = xy(line,p,i); return `<div class="mr-shirt ${cat(p.pos)}" style="left:${point[0]}%;top:${point[1]}%"><div class="mr-kit"></div><div class="mr-name">${html(p.name)}</div><div class="mr-ov">${html(p.pos)} ${p.overall}</div></div>`; }).join('')}</div>`;
  }
  function lineRows(list) { return list.map((p,i) => `<div class="mr-row"><span class="mr-pos">${html(p.pos)}</span><span>${html(p.name)}</span><span class="mr-rate">${((p.overall || 55) / 10).toFixed(1).replace('.', ',')}</span></div>`).join(''); }
  function statsBar(label, left, right, max = 100) { const pct = clamp((left / Math.max(1, left + right)) * 100, 3, 97); return `<div class="mr-stat"><div class="mr-stat-top"><span>${left}</span><b>${label}</b><span>${right}</span></div><div class="mr-bar"><span style="width:${pct}%"></span></div></div>`; }

  function openCoach(state, fx) {
    const xg = expectedGoals(state, fx.home, fx.away);
    coach = { state, fx, min:0, hg:0, ag:0, paused:false, ht:false, halfDone:false, xh:0, xa:0, poss:50, shotsH:0, shotsA:0, onH:0, onA:0, events:['Times em campo. A partida começou com estudo no meio.'], ment:state.tactics?.mentality || 'Equilibrada' };
    document.body.classList.add('mr-lock');
    document.body.insertAdjacentHTML('beforeend', coachHtml());
    timer = setInterval(coachTick, 850);
  }
  function coachHtml() {
    const c = coach, s = c.state, fx = c.fx, ht = team(s, fx.home), at = team(s, fx.away);
    const isHome = fx.home === s.user.teamId;
    return `<div class="mr-modal" data-mr-coach="1"><div class="mr-shell"><div class="mr-top"><div class="mr-team home"><span class="mr-crest">${html(ht.name[0])}</span><span>${html(ht.name)}</span></div><div><div class="mr-score"><span>${c.hg}</span><i>x</i><span>${c.ag}</span></div><div class="mr-meta">${html(fx.competition)} • ${fx.round}ª rodada • ${Math.floor(c.min)}'</div></div><div class="mr-team away"><span>${html(at.name)}</span><span class="mr-crest">${html(at.name[0])}</span></div></div><div class="mr-body"><section class="mr-card home"><h3>${html(ht.name)}</h3>${lineRows(starters(s, fx.home))}</section><section class="mr-card center"><h3>Campo tático</h3>${pitchHtml(s, isHome ? fx.home : fx.away)}<h3>Lances</h3><div class="mr-log">${c.events.slice(-8).reverse().map(e => `<div class="mr-event">${html(e)}</div>`).join('')}</div></section><section class="mr-card away"><h3>${html(at.name)}</h3>${lineRows(starters(s, fx.away))}</section><section class="mr-card round"><h3>Estatísticas</h3>${statsBar('Posse', Math.round(c.poss), 100 - Math.round(c.poss))}${statsBar('Finalizações', c.shotsH, c.shotsA)}${statsBar('No gol', c.onH, c.onA)}${statsBar('xG', c.xh.toFixed(2), c.xa.toFixed(2), 5)}<div class="mr-event">Força casa: ${Math.round(teamRating(s, fx.home, 'home', 'attack'))} ataque, ${Math.round(teamRating(s, fx.home, 'home', 'defense'))} defesa</div><div class="mr-event">Força fora: ${Math.round(teamRating(s, fx.away, 'away', 'attack'))} ataque, ${Math.round(teamRating(s, fx.away, 'away', 'defense'))} defesa</div></section></div><div class="mr-controls"><button data-mr="pause">${c.paused ? 'Continuar' : 'Pausar'}</button><button data-mr-ment="Defensiva" class="${c.ment === 'Defensiva' ? 'on' : ''}">Defensiva</button><button data-mr-ment="Equilibrada" class="${c.ment === 'Equilibrada' ? 'on' : ''}">Equilibrada</button><button data-mr-ment="Ofensiva" class="${c.ment === 'Ofensiva' ? 'on' : ''}">Ofensiva</button><button data-mr="sub">Substituir</button><button data-mr="close" class="danger">Sair</button></div></div>${c.ht ? halfHtml() : ''}</div>`;
  }
  function halfHtml() { return `<div class="mr-half"><div class="mr-half-card"><h2>Intervalo</h2><p>Reveja o campo, estatísticas e faça substituições antes do segundo tempo.</p><button data-mr="second" class="pri">Começar 2º tempo</button></div></div>`; }
  function rerenderCoach() { const root = document.querySelector('[data-mr-coach]'); if (root) root.outerHTML = coachHtml(); }
  function coachChance(forHome) {
    const c = coach, s = c.state, fx = c.fx;
    const atk = teamRating(s, forHome ? fx.home : fx.away, forHome ? 'home':'away', 'attack');
    const def = teamRating(s, forHome ? fx.away : fx.home, forHome ? 'away':'home', 'defense');
    const x = clamp(.035 + (atk - def) / 700 + (forHome ? .008 : 0), .012, .085);
    return x;
  }
  function coachTick() {
    const c = coach; if (!c || c.paused || c.ht) return;
    c.min += rint(2,4);
    const s = c.state, fx = c.fx;
    const userHome = fx.home === s.user.teamId;
    const userMent = c.ment;
    if (userMent === 'Ofensiva') c.poss += userHome ? .9 : -.9;
    if (userMent === 'Defensiva') c.poss += userHome ? -.5 : .5;
    c.poss = clamp(c.poss + (teamRating(s, fx.home, 'home','control') - teamRating(s, fx.away,'away','control')) / 90, 35, 65);
    ['home','away'].forEach(side => {
      const home = side === 'home';
      if (Math.random() < coachChance(home)) {
        const quality = home ? teamRating(s, fx.home,'home','attack') : teamRating(s, fx.away,'away','attack');
        const x = clamp((quality - 42) / 70 + Math.random() * .32, .05, .62);
        if (home) { c.shotsH++; c.xh += x; } else { c.shotsA++; c.xa += x; }
        const on = Math.random() < clamp(.26 + quality / 250, .22, .58);
        if (on) home ? c.onH++ : c.onA++;
        if (Math.random() < x * (on ? .62 : .28)) {
          home ? c.hg++ : c.ag++;
          c.events.push(`${Math.floor(c.min)}' Gol do ${team(s, home ? fx.home : fx.away).name}. Jogada construída pela qualidade ofensiva.`);
        } else {
          c.events.push(`${Math.floor(c.min)}' ${team(s, home ? fx.home : fx.away).name} finalizou ${on ? 'no gol' : 'para fora'}.`);
        }
      }
    });
    if (!c.halfDone && c.min >= 45) { c.min = 45; c.ht = true; c.paused = true; c.events.push("45' Intervalo obrigatório."); clearInterval(timer); }
    if (c.min >= 90) finishCoach(); else rerenderCoach();
  }
  function finishCoach() {
    if (!coach) return;
    clearInterval(timer);
    const c = coach;
    const model = finalScore(c.state, c.fx.home, c.fx.away);
    const hg = Math.max(c.hg, Math.min(7, Math.round((c.hg + model.hg) / 2 + (c.xh > c.xa + .7 ? .35 : 0))));
    const ag = Math.max(c.ag, Math.min(7, Math.round((c.ag + model.ag) / 2 + (c.xa > c.xh + .7 ? .35 : 0))));
    const res = finishWeek(c.state, c.fx, hg, ag);
    const root = document.querySelector('[data-mr-coach]');
    if (root) root.innerHTML = `<div class="mr-match-end"><div class="mr-end-card"><h2>Fim de jogo</h2><div class="mr-score" style="margin:auto"><span>${hg}</span><i>x</i><span>${ag}</span></div><p>${html(team(c.state,c.fx.home).name)} x ${html(team(c.state,c.fx.away).name)}</p><p>Saldo da semana: <b>${money(res.weekly)}</b></p><button class="pri" data-mr="done">Continuar</button></div></div>`;
    coach = null;
  }

  function openSub() {
    const c = coach; if (!c) return;
    const outList = starters(c.state, c.state.user.teamId), inList = bench(c.state, c.state.user.teamId);
    let outId = outList[0]?.id, inId = inList[0]?.id;
    const layer = document.createElement('div');
    layer.className = 'mr-sub-backdrop';
    layer.innerHTML = `<div class="mr-sub-modal"><h2>Substituição</h2><div class="mr-sub-grid"><div><h3>Sai</h3><div class="mr-list">${outList.map(p => `<button class="mr-choice" data-out="${p.id}"><span>${p.pos}</span><b>${html(p.name)}</b><span>${p.overall}</span></button>`).join('')}</div></div><div><h3>Entra</h3><div class="mr-list">${inList.map(p => `<button class="mr-choice" data-in="${p.id}"><span>${p.pos}</span><b>${html(p.name)}</b><span>${p.overall}</span></button>`).join('')}</div></div></div><div class="mr-sub-actions"><button data-sub-close="1">Cancelar</button><button class="pri" data-sub-ok="1">Confirmar</button></div></div>`;
    document.body.appendChild(layer);
    const mark = () => { layer.querySelectorAll('[data-out]').forEach(b => b.classList.toggle('on', b.dataset.out === outId)); layer.querySelectorAll('[data-in]').forEach(b => b.classList.toggle('on', b.dataset.in === inId)); };
    mark();
    layer.addEventListener('click', e => {
      const out = e.target.closest('[data-out]'), inn = e.target.closest('[data-in]');
      if (out) { outId = out.dataset.out; mark(); }
      if (inn) { inId = inn.dataset.in; mark(); }
      if (e.target.closest('[data-sub-close]')) layer.remove();
      if (e.target.closest('[data-sub-ok]')) {
        const outP = c.state.players.find(p => p.id === outId), inP = c.state.players.find(p => p.id === inId);
        if (outP && inP) { outP.starter = false; inP.starter = true; c.events.push(`${Math.floor(c.min)}' Substituição: ${inP.name} entrou no lugar de ${outP.name}.`); save(c.state); }
        layer.remove(); rerenderCoach();
      }
    });
  }
  function closeCoach() { clearInterval(timer); document.querySelector('[data-mr-coach]')?.remove(); document.body.classList.remove('mr-lock'); location.reload(); }

  function openFull(state, fx) {
    const line = starters(state, state.user.teamId); const star = line.find(p => p.star) || line.find(p => p.pos === 'ATA') || line[0];
    full = { state, fx, min:0, hg:0, ag:0, xh:0, xa:0, over:false, half:false, halfDone:false, w:1280, h:720, cam:{x:0,y:0}, ball:{x:260,y:360,vx:0,vy:0,owner:'user'}, player:{x:245,y:360,tx:245,ty:360,stamina:100,rating:6.0,goals:0,assists:0,lastTouch:false}, mates:[], opps:[], log:'Boa posição', attackDir:1 };
    full.attackDir = fx.home === state.user.teamId ? 1 : -1;
    seedActors(); document.body.classList.add('mr-lock'); document.body.insertAdjacentHTML('beforeend', fullHtml()); bindJoy(); loopFull();
  }
  function seedActors() {
    const f = full; const start = starters(f.state, f.state.user.teamId); const opp = starters(f.state, f.fx.home === f.state.user.teamId ? f.fx.away : f.fx.home);
    const coords = [[120,360],[240,180],[240,540],[420,260],[420,460],[620,210],[620,510],[790,360],[920,250],[920,470]];
    f.mates = start.filter(p => !p.star).slice(0,10).map((p,i) => ({ id:p.id, name:p.name, pos:p.pos, x:coords[i]?.[0]||400, y:coords[i]?.[1]||360, tx:coords[i]?.[0]||400, ty:coords[i]?.[1]||360 }));
    f.opps = opp.slice(0,11).map((p,i) => ({ id:p.id, name:p.name, pos:p.pos, x:1040 - (coords[i]?.[0]||400) / 1.4, y:coords[i]?.[1]||360, tx:1040 - (coords[i]?.[0]||400) / 1.4, ty:coords[i]?.[1]||360 }));
  }
  function fullHtml() { const f = full; return `<div class="mr-full" data-mr-full="1"><canvas id="mrCanvas" width="1280" height="720"></canvas><div class="mr-hud"><div class="mr-hud-card home">${html(team(f.state,f.fx.home).name)}</div><div class="mr-hud-score"><span data-hscore>${f.hg}</span> x <span data-ascore>${f.ag}</span><div style="font-size:12px">${Math.floor(f.min)}'</div></div><div class="mr-hud-card away">${html(team(f.state,f.fx.away).name)}</div></div><div class="mr-full-top"><button data-fullscreen="1">Tela cheia</button><button data-mr-full-close="1">Sair</button></div><div class="mr-player-card"><b>Boleiro</b><div>Nota <span data-rating>${f.player.rating.toFixed(1)}</span> • <span data-log>${f.log}</span></div><div class="mr-stamina"><span data-stamina style="width:${f.player.stamina}%"></span></div></div><div class="mr-joy"><div class="mr-knob"></div></div><div class="mr-actions"><button class="pri" data-full-act="shoot">Chutar</button><button data-full-act="pass">Passe</button><button data-full-act="call">Pedir bola</button><button data-full-act="tackle">Carrinho</button></div></div>`; }
  function worldToScreen(x,y) { const c = full.cam; return { x:x - c.x, y:y - c.y }; }
  function drawPitch(ctx) {
    const f = full, w = f.w, h = f.h; ctx.fillStyle = '#236d12'; ctx.fillRect(0,0,w,h);
    for (let i=0;i<12;i++){ctx.fillStyle=i%2?'#2d7d18':'#236d12';ctx.fillRect(i*w/12,0,w/12,h);} ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=4; ctx.strokeRect(40,40,w-80,h-80); ctx.beginPath(); ctx.moveTo(w/2,40); ctx.lineTo(w/2,h-40); ctx.stroke(); ctx.beginPath(); ctx.arc(w/2,h/2,70,0,Math.PI*2); ctx.stroke(); ctx.strokeRect(40,h/2-110,150,220); ctx.strokeRect(w-190,h/2-110,150,220);
  }
  function token(ctx,a,color,label) { const s = worldToScreen(a.x,a.y); ctx.fillStyle=color; ctx.beginPath(); ctx.arc(s.x,s.y,14,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke(); if(label){ctx.fillStyle='#fff';ctx.font='700 10px Arial';ctx.textAlign='center';ctx.fillText(label,s.x,s.y-20);} }
  function drawFull() { const canvas = document.getElementById('mrCanvas'); if (!canvas || !full) return; const ctx = canvas.getContext('2d'); const viewW = canvas.width, viewH = canvas.height; full.cam.x = clamp(full.player.x - viewW*.45, 0, full.w - viewW); full.cam.y = clamp(full.player.y - viewH*.5, 0, full.h - viewH); drawPitch(ctx); full.mates.forEach(a => token(ctx,a,'#55e58f')); full.opps.forEach(a => token(ctx,a,'#ffd166')); token(ctx,full.player,'#d7ff4f','EU'); const b = worldToScreen(full.ball.x, full.ball.y); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(b.x,b.y,7,0,Math.PI*2); ctx.fill(); }
  function loopFull() {
    if (!full || full.over) return; const f = full, p = f.player; const speed = 2.2 * (p.stamina / 120 + .45);
    let dx = (keys.ArrowRight||keys.d?1:0) - (keys.ArrowLeft||keys.a?1:0) + joyVec.x; let dy = (keys.ArrowDown||keys.s?1:0) - (keys.ArrowUp||keys.w?1:0) + joyVec.y; const mag = Math.hypot(dx,dy) || 1; dx/=mag; dy/=mag; p.x = clamp(p.x + dx*speed, 60, f.w-60); p.y = clamp(p.y + dy*speed, 60, f.h-60); if (Math.abs(dx)+Math.abs(dy)>0) p.stamina=clamp(p.stamina-.025,0,100); else p.stamina=clamp(p.stamina+.018,0,100);
    f.mates.forEach((a,i)=>{ a.x += ((i<5?420:760)-a.x)*.006 + (Math.random()-.5)*.9; a.y += ((120+(i%5)*115)-a.y)*.006 + (Math.random()-.5)*.9; });
    f.opps.forEach((a,i)=>{ const tx = f.ball.owner === 'user' ? f.ball.x - 80 + (i%3)*60 : 760; a.x += (tx-a.x)*.01 + (Math.random()-.5)*1.1; a.y += (f.ball.y + ((i%5)-2)*48 - a.y)*.01; });
    if (f.ball.owner === 'user') { f.ball.x = p.x + 18; f.ball.y = p.y; }
    else if (f.ball.owner === 'mate') { const m = f.mates[0]; f.ball.x = m.x+14; f.ball.y = m.y; if (Math.random()<.012){ f.ball.owner='user'; f.log='Passe recebido'; p.rating+=.05; } }
    else { f.ball.x += (Math.random()-.45)*2.6; f.ball.y += (Math.random()-.5)*2.2; if(Math.random()<.01){ f.ball.owner='user'; f.log='Você recuperou a bola'; p.rating+=.07; } if(Math.random()<.006){ const home = f.fx.home===f.state.user.teamId; home?f.ag++:f.hg++; f.xa+=.35; f.log='Gol adversário'; } }
    f.min += .018; if (!f.halfDone && f.min >=45){ f.min=45; f.halfDone=true; f.log='Intervalo'; p.stamina=clamp(p.stamina+18,0,100); }
    if (f.min >=90) return finishFull(); updateFullHud(); drawFull(); raf = requestAnimationFrame(loopFull);
  }
  function updateFullHud(){ const f=full; document.querySelector('[data-hscore]')&&(document.querySelector('[data-hscore]').textContent=f.hg); document.querySelector('[data-ascore]')&&(document.querySelector('[data-ascore]').textContent=f.ag); document.querySelector('[data-stamina]')&&(document.querySelector('[data-stamina]').style.width=f.player.stamina+'%'); document.querySelector('[data-rating]')&&(document.querySelector('[data-rating]').textContent=f.player.rating.toFixed(1)); document.querySelector('[data-log]')&&(document.querySelector('[data-log]').textContent=f.log); const hud=document.querySelector('.mr-hud-score div'); if(hud) hud.textContent=Math.floor(f.min)+"'"; }
  function fullAction(action) { const f=full; if(!f) return; const p=f.player; if(action==='call'){ if(Math.random()<.56){f.ball.owner='user';f.log='Passe recebido';p.rating+=.04}else{f.log='Companheiro ignorou o pedido';p.rating-=.02} }
    if(action==='pass' && f.ball.owner==='user'){ f.ball.owner='mate'; f.log='Passe simples'; p.rating+=.04; }
    if(action==='tackle'){ if(f.ball.owner==='opp' || Math.hypot(p.x-f.ball.x,p.y-f.ball.y)<70){f.ball.owner='user';f.log='Desarme limpo';p.rating+=.08}else{f.log='Carrinho fora do tempo';p.rating-=.06} }
    if(action==='shoot' && f.ball.owner==='user'){ const attackingRight = f.attackDir===1; const dist = attackingRight ? (f.w-p.x) : p.x; const angle = Math.abs(p.y-f.h/2); const chance = clamp(.12 + (180-dist)/420 - angle/600 + (p.stamina-50)/500, .05, .58); if(Math.random()<chance){ attackingRight ? f.hg++ : f.ag++; f.player.goals++; f.log='GOOOL do Boleiro'; p.rating+=.45; } else { f.log='Finalização defendida'; p.rating+=.02; } f.ball.owner='opp'; f.xh+=chance; }
    p.rating=clamp(p.rating,3,10); updateFullHud(); drawFull(); }
  function finishFull(){ const f=full; if(!f)return; f.over=true; cancelAnimationFrame(raf); const model=finalScore(f.state,f.fx.home,f.fx.away); const hg=Math.max(f.hg,Math.round((f.hg+model.hg)/2)); const ag=Math.max(f.ag,Math.round((f.ag+model.ag)/2)); const res=finishWeek(f.state,f.fx,hg,ag,{goal:f.player.goals}); const root=document.querySelector('[data-mr-full]'); if(root) root.insertAdjacentHTML('beforeend',`<div class="mr-match-end"><div class="mr-end-card"><h2>Fim de jogo</h2><div class="mr-score" style="margin:auto"><span>${hg}</span><i>x</i><span>${ag}</span></div><p>Nota do Boleiro: <b>${f.player.rating.toFixed(1)}</b></p><p>Saldo da semana: <b>${money(res.weekly)}</b></p><button class="pri" data-mr-full-done="1">Continuar</button></div></div>`); }
  function closeFull(){ cancelAnimationFrame(raf); document.querySelector('[data-mr-full]')?.remove(); document.body.classList.remove('mr-lock'); location.reload(); }
  function bindJoy(){ const joy=document.querySelector('.mr-joy'), knob=document.querySelector('.mr-knob'); if(!joy||!knob)return; let active=false; const move=e=>{ if(!active)return; const r=joy.getBoundingClientRect(); const x=clamp(e.clientX-r.left-r.width/2,-45,45), y=clamp(e.clientY-r.top-r.height/2,-45,45); knob.style.transform=`translate(${x}px,${y}px)`; joyVec={x:x/45,y:y/45}; }; joy.addEventListener('pointerdown',e=>{active=true;joy.setPointerCapture(e.pointerId);move(e)}); joy.addEventListener('pointermove',move); joy.addEventListener('pointerup',()=>{active=false;joyVec={x:0,y:0};knob.style.transform='';}); }

  document.addEventListener('click', e => {
    const matchBtn = e.target.closest('[data-action="match"]');
    if (matchBtn) {
      const state = load(); const fx = nextFixture(state); if(!state||!fx) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (starters(state,state.user.teamId).length !== 11) { alert('Você precisa ter exatamente 11 titulares para jogar.'); return; }
      if (state.matchMode === 'completo') openFull(state, fx); else openCoach(state, fx);
      return;
    }
    const mr=e.target.closest('[data-mr]')?.dataset.mr;
    if(mr==='pause'&&coach){coach.paused=!coach.paused;rerenderCoach();return}
    if(mr==='second'&&coach){coach.ht=false;coach.paused=false;coach.min=46;rerenderCoach();timer=setInterval(coachTick,850);return}
    if(mr==='sub') return openSub();
    if(mr==='close') return closeCoach();
    if(mr==='done') return closeCoach();
    const ment=e.target.closest('[data-mr-ment]')?.dataset.mrMent;
    if(ment&&coach){coach.ment=ment;coach.state.tactics=coach.state.tactics||{};coach.state.tactics.mentality=ment;coach.events.push(`${Math.floor(coach.min)}' Técnico mudou para ${ment}.`);save(coach.state);rerenderCoach();return}
    const act=e.target.closest('[data-full-act]')?.dataset.fullAct; if(act) return fullAction(act);
    if(e.target.closest('[data-mr-full-close]')) return closeFull();
    if(e.target.closest('[data-mr-full-done]')) return closeFull();
    if(e.target.closest('[data-fullscreen]')) { const root=document.querySelector('[data-mr-full]'); if(root?.requestFullscreen) root.requestFullscreen(); }
  }, true);
  document.addEventListener('keydown', e=>{keys[e.key]=true;if(e.key==='j')fullAction('shoot');if(e.key==='k')fullAction('pass');if(e.key==='l')fullAction('call');if(e.key==='i')fullAction('tackle');});
  document.addEventListener('keyup', e=>{keys[e.key]=false;});
})();
