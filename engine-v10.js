window.BoleirosEngine = (() => {
  const D = window.BoleirosData;
  const SAVE = 'boleiros_save_v10';
  const OLD = ['boleiros_save_v9','boleiros_save_v8','boleiros_save_v7','boleiros_live_v6','boleiros_ux_v5','boleiros_ux_v4'];

  const rand = (a,b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = a => a[rand(0, a.length - 1)];
  const clamp = (n,a=0,b=100) => Math.max(a, Math.min(b, Math.round(n)));
  const money = n => 'R$ ' + Math.round(n || 0).toLocaleString('pt-BR');
  const divLabel = div => D.divisions[div]?.[0] || div;
  const divOrder = div => D.divisions[div]?.[1] || 99;
  const stateLabel = uf => D.states[uf] || 'Estadual Boleiros';
  const blank = () => ({ j:0, v:0, e:0, d:0, gp:0, gc:0, sg:0, pts:0 });

  let state = null;

  function makeTeam(data) {
    return {
      ...data,
      fans: rand(6000, 42000) * (data.rep > 82 ? 2 : 1),
      stadium: rand(12000, 65000),
      training: rand(1, 4),
      academy: rand(1, 4),
      medical: rand(1, 3),
      morale: rand(48, 88),
      cashPower: rand(40, 90)
    };
  }

  function makePlayer(i, teamId, level = 62, star = false) {
    const age = star ? 18 : rand(17, 36);
    const overall = star ? 72 : clamp(level + rand(-14, 14), 35, 91);
    const potential = clamp(overall + rand(age < 23 ? 6 : 0, age < 24 ? 20 : 8), overall, 99);
    const p = {
      id: 'p' + Math.random().toString(36).slice(2),
      name: star ? 'Léo Boleiro' : `${pick(D.firstNames)} ${pick(D.lastNames)}`,
      pos: star ? 'ATA' : D.positions[i % D.positions.length],
      age,
      overall,
      potential,
      fitness: rand(64, 100),
      morale: rand(48, 92),
      form: rand(48, 88),
      salary: Math.round(overall * overall * rand(15, 25)),
      contract: rand(8, 36),
      injury: 0,
      suspended: 0,
      starter: i < 11,
      teamId,
      star,
      goals: 0,
      assists: 0,
      yellow: 0,
      red: 0
    };
    p.value = Math.round(overall * overall * (potential / 75) * (age < 23 ? 1.25 : age > 31 ? 0.72 : 1) * 850);
    return p;
  }

  function chooseTop(arr, n) {
    return [...arr].sort((a,b) => b.rep - a.rep || a.name.localeCompare(b.name, 'pt-BR')).slice(0,n);
  }

  function roundRobin(ids, comp, phase = 'liga') {
    const list = [...ids];
    if (list.length % 2) list.push('bye');
    const out = [];
    for (let r = 0; r < list.length - 1; r++) {
      for (let i = 0; i < list.length / 2; i++) {
        const home = list[i];
        const away = list[list.length - 1 - i];
        if (home !== 'bye' && away !== 'bye') {
          out.push({ id:`j_${comp}_${r}_${i}_${home}_${away}`, round:r+1, home, away, done:false, homeGoals:null, awayGoals:null, competition:comp, phase });
        }
      }
      list.splice(1, 0, list.pop());
    }
    return out;
  }

  function buildCompetitions(teams, userTeamId) {
    const user = teams.find(t => t.id === userTeamId) || teams[0];
    const comps = [];
    const add = comp => comps.push(comp);

    if (user.country === 'Brasil') {
      let local = chooseTop(teams.filter(t => t.country === 'Brasil' && t.state === user.state), 8);
      if (!local.some(t => t.id === user.id)) local = [user, ...local].slice(0, 8);
      add({ id:'state', name:stateLabel(user.state), scope:'estadual', participants:local.map(t=>t.id), description:'Torneio local de abertura da temporada.', fixtures:roundRobin(local.map(t=>t.id), stateLabel(user.state), 'estadual') });

      ['br-a','br-b','br-c','br-d'].forEach(div => {
        let list = chooseTop(teams.filter(t => t.div === div), 12);
        if (user.div === div && !list.some(t => t.id === user.id)) list = [user, ...list].slice(0, 12);
        add({ id:div, name:divLabel(div), scope:'nacional', participants:list.map(t=>t.id), description:'Campeonato nacional por pontos corridos.', fixtures:user.div === div ? roundRobin(list.map(t=>t.id), divLabel(div), 'liga') : [] });
      });
    } else {
      let local = chooseTop(teams.filter(t => t.country === user.country), 10);
      if (!local.some(t => t.id === user.id)) local = [user, ...local].slice(0, 10);
      add({ id:'local', name:`Liga ${user.country}`, scope:'nacional', participants:local.map(t=>t.id), description:'Liga nacional do país escolhido.', fixtures:roundRobin(local.map(t=>t.id), `Liga ${user.country}`, 'liga') });
    }

    let lib = chooseTop(teams.filter(t => t.rep >= 76), 24);
    if (!lib.some(t => t.id === user.id) && user.rep >= 74) lib = [user, ...lib].slice(0, 24);
    add({ id:'lib', name:'Libertadores Boleiros', scope:'continental', participants:lib.map(t=>t.id), description:'Competição continental principal.', fixtures:lib.some(t=>t.id===user.id) ? roundRobin(lib.slice(0,8).map(t=>t.id), 'Libertadores Boleiros', 'grupo').slice(0, 14) : [] });

    let sula = chooseTop(teams.filter(t => t.rep >= 64 && t.rep < 78), 24);
    if (!sula.some(t => t.id === user.id) && user.rep < 76) sula = [user, ...sula].slice(0, 24);
    add({ id:'sula', name:'Sul-Americana Boleiros', scope:'continental', participants:sula.map(t=>t.id), description:'Competição continental alternativa.', fixtures:sula.some(t=>t.id===user.id) ? roundRobin(sula.slice(0,8).map(t=>t.id), 'Sul-Americana Boleiros', 'grupo').slice(0, 14) : [] });

    add({ id:'wc', name:'World Cup', scope:'seleções', participants:D.countries, description:'Copa de seleções com nomes reais de países.', fixtures:[] });
    return comps;
  }

  function newGame(options = {}) {
    const teams = D.teams.map(makeTeam);
    const teamId = options.teamId || 'bolfc';
    const players = [];
    teams.forEach(t => {
      for (let i = 0; i < 21; i++) players.push(makePlayer(i, t.id, t.rep, t.id === teamId && i === 10));
    });
    const comps = buildCompetitions(teams, teamId);
    state = {
      version:10,
      week:1,
      season:1,
      phase:'pré-temporada',
      user:{ coach:options.coach || 'João', teamId, difficulty:options.difficulty || 'Normal' },
      teams,
      players,
      fixtures:comps.flatMap(c => c.fixtures),
      competitions:comps.map(({fixtures,...c}) => c),
      market:Array.from({ length:26 }, (_, i) => makePlayer(i, 'market', rand(54, 83))),
      tactics:{ formation:'4-3-3', mentality:'Equilibrada', pressing:'Média', tempo:55, risk:45, line:50, focus:'Misto' },
      training:{ focus:'Equilibrado', intensity:55, rest:35, individual:'Ataque' },
      finance:{ balance:1800000, ticket:35, sponsor:260000, merch:45000 },
      career:{ name:'Léo Boleiro', energy:82, happiness:72, fame:10, cash:1500, relationships:{ Técnico:70, Torcida:60, Elenco:65, Mídia:35 }, skills:{ Finalização:66, Passe:58, Drible:63, Velocidade:67, Defesa:35 }, goals:0, assists:0, matches:0 },
      matchMode:'tecnico',
      preparation:{ training:false, lineup:false, tactics:false, market:false },
      news:['Temporada criada. O matchday agora tem intervalo obrigatório e foco manager.'],
      filters:{ position:'Todos' },
      worldCup:{ groups:Array.from({ length:8 }, (_, i) => ({ id:String.fromCharCode(65+i), teams:D.countries.slice(i*4, i*4+4).map(name => ({ name, stats:blank() })) })) }
    };
    save();
    return state;
  }

  function migrate(raw) {
    if (!raw) return null;
    if (raw.version === 10 && raw.fixtures && raw.teams) return raw;
    const migrated = newGame({ coach:raw.user?.coach || 'João', teamId:'bolfc', difficulty:raw.user?.difficulty || 'Normal' });
    const f = raw.finance || raw.fin || {};
    migrated.finance.balance = f.balance || f.saldo || migrated.finance.balance;
    migrated.finance.ticket = f.ticket || migrated.finance.ticket;
    migrated.finance.sponsor = f.sponsor || migrated.finance.sponsor;
    if (raw.career) {
      migrated.career.energy = raw.career.energy || raw.career.energia || migrated.career.energy;
      migrated.career.happiness = raw.career.happiness || raw.career.feliz || migrated.career.happiness;
      migrated.career.fame = raw.career.fame || raw.career.fama || migrated.career.fame;
      migrated.career.cash = raw.career.cash || raw.career.grana || migrated.career.cash;
    }
    migrated.news.unshift('Save antigo migrado para a versão premium. Finanças e carreira foram preservadas.');
    return migrated;
  }

  function load() {
    try {
      let raw = localStorage.getItem(SAVE);
      if (!raw) for (const key of OLD) { raw = localStorage.getItem(key); if (raw) break; }
      state = migrate(JSON.parse(raw || 'null'));
      return state;
    } catch {
      state = null;
      return null;
    }
  }
  function save() { if (state) localStorage.setItem(SAVE, JSON.stringify(state)); }
  function getState() { return state; }
  function setState(next) { state = next; save(); }

  function team(id = state.user.teamId) { return state.teams.find(t => t.id === id) || state.teams[0]; }
  function squad(id = state.user.teamId) { return state.players.filter(p => p.teamId === id); }
  function starters(id = state.user.teamId) { return squad(id).filter(p => p.starter && !p.injury && !p.suspended).slice(0, 11); }
  function avg(list, fn) { return list.length ? Math.round(list.reduce((s,x)=>s+fn(x),0)/list.length) : 0; }
  function strength(id = state.user.teamId) {
    const selected = id === state.user.teamId ? starters(id) : squad(id).sort((a,b)=>b.overall-a.overall).slice(0,11);
    const base = selected.length ? avg(selected, p => p.overall * p.fitness / 100 * p.morale / 100 * p.form / 75) : team(id).rep;
    const t = state.tactics;
    const boost = id === state.user.teamId ? (t.mentality === 'Ofensiva' ? 2 : t.mentality === 'Defensiva' ? 1 : 0) + (t.pressing === 'Alta' ? 1 : 0) : 0;
    return clamp(base + team(id).training * 1.4 + team(id).morale / 30 + boost, 1, 99);
  }
  function wageBill() { return squad().reduce((s,p)=>s+p.salary,0); }
  function nextFixture() { return state.fixtures.find(f => !f.done && (f.home === state.user.teamId || f.away === state.user.teamId)); }
  function currentRound() { const n = nextFixture(); return n ? state.fixtures.filter(f => !f.done && f.round === n.round && f.competition === n.competition) : []; }
  function competitionByName(name) { return state.competitions.find(c => c.name === name); }
  function mainCompetitionName() { const t = team(); return t.country === 'Brasil' ? divLabel(t.div) : `Liga ${t.country}`; }

  function competitionStats(name) {
    const comp = competitionByName(name);
    const ids = comp ? comp.participants.filter(id => typeof id === 'string' && state.teams.some(t => t.id === id)) : state.teams.map(t => t.id);
    const map = Object.fromEntries(ids.map(id => [id, blank()]));
    state.fixtures.filter(f => f.competition === name && f.done).forEach(f => {
      const h = map[f.home], a = map[f.away];
      if (!h || !a) return;
      h.j++; a.j++; h.gp += f.homeGoals; h.gc += f.awayGoals; a.gp += f.awayGoals; a.gc += f.homeGoals;
      h.sg = h.gp - h.gc; a.sg = a.gp - a.gc;
      if (f.homeGoals > f.awayGoals) { h.v++; a.d++; h.pts += 3; }
      else if (f.awayGoals > f.homeGoals) { a.v++; h.d++; a.pts += 3; }
      else { h.e++; a.e++; h.pts++; a.pts++; }
    });
    return Object.entries(map).map(([id,stats]) => ({ team:team(id), stats })).sort((a,b)=>b.stats.pts-a.stats.pts || b.stats.sg-a.stats.sg || b.stats.gp-a.stats.gp || a.team.name.localeCompare(b.team.name,'pt-BR'));
  }
  function position() { const i = competitionStats(mainCompetitionName()).findIndex(r => r.team.id === state.user.teamId); return i < 0 ? '-' : i + 1; }
  function simulateScore(home, away) { const d = strength(home) + 4 - strength(away); return [clamp(Math.max(0, Math.round((d + rand(-18,24)) / 23) + rand(0,2)),0,7), clamp(Math.max(0, Math.round((-d + rand(-18,24)) / 23) + rand(0,2)),0,7)]; }

  function applyResult(f, hg, ag) {
    if (f.done) return;
    f.done = true; f.homeGoals = hg; f.awayGoals = ag;
    const h = team(f.home), a = team(f.away);
    if (hg > ag) { h.morale = clamp(h.morale + 3); a.morale = clamp(a.morale - 2); }
    else if (ag > hg) { a.morale = clamp(a.morale + 3); h.morale = clamp(h.morale - 2); }
    else { h.morale = clamp(h.morale + 1); a.morale = clamp(a.morale + 1); }
  }

  function finishFixture(f, hg, ag, matchStats = {}) {
    applyResult(f, hg, ag);
    currentRound().filter(x => !x.done && x.id !== f.id).forEach(x => { const s = simulateScore(x.home, x.away); applyResult(x, s[0], s[1]); });
    const isHome = f.home === state.user.teamId;
    const gf = isHome ? hg : ag;
    const ga = isHome ? ag : hg;
    const win = gf > ga;
    const draw = gf === ga;
    const income = isHome ? Math.round(team().fans * state.finance.ticket * (win ? 0.48 : draw ? 0.38 : 0.28)) : 0;
    const weekly = Math.round(state.finance.sponsor / 6 + state.finance.merch / 8 - wageBill() / 2 + income);
    state.finance.balance += weekly;
    state.career.matches++;
    state.career.energy = clamp(state.career.energy - rand(5, 10));
    state.career.happiness = clamp(state.career.happiness + (win ? 5 : draw ? 1 : -4));
    state.week++;
    state.phase = 'pós-jogo';
    state.preparation = { training:false, lineup:false, tactics:false, market:false };
    state.news.push(`${team(f.home).name} ${hg} x ${ag} ${team(f.away).name}. ${f.competition}. Saldo da semana: ${money(weekly)}.`);
    save();
    return { income, weekly, gf, ga, win, draw, stats:matchStats };
  }

  function applyTraining(silent = false) {
    const it = state.training.intensity, rest = state.training.rest;
    squad().forEach(p => {
      const dev = (it - 45) / 18 + (team().training - 1) * 0.25 + rand(-1,2);
      if (p.age < 24 && Math.random() < 0.28) p.overall = clamp(p.overall + Math.max(0, dev), 1, p.potential);
      p.form = clamp(p.form + (it - 45) / 20 + rand(-2,3));
      p.fitness = clamp(p.fitness - it / 26 + rest / 20);
      if (p.injury) p.injury--;
    });
    const sk = state.career.skills;
    if (state.training.individual === 'Ataque') sk.Finalização = clamp(sk.Finalização + 1);
    if (state.training.individual === 'Passe') sk.Passe = clamp(sk.Passe + 1);
    if (state.training.individual === 'Drible') sk.Drible = clamp(sk.Drible + 1);
    if (state.training.individual === 'Velocidade') sk.Velocidade = clamp(sk.Velocidade + 1);
    if (state.training.individual === 'Defesa') sk.Defesa = clamp(sk.Defesa + 1);
    state.preparation.training = true;
    save();
    return silent ? null : 'Treino aplicado';
  }

  function autoLineup() { squad().forEach(p => p.starter = false); squad().filter(p=>!p.injury&&!p.suspended).sort((a,b)=>b.overall-a.overall).slice(0,11).forEach(p=>p.starter=true); state.preparation.lineup = true; save(); }

  return { rand, clamp, money, divLabel, divOrder, stateLabel, newGame, load, save, getState, setState, team, squad, starters, strength, wageBill, nextFixture, currentRound, competitionByName, competitionStats, mainCompetitionName, position, simulateScore, finishFixture, applyResult, applyTraining, autoLineup, makePlayer:createPlayer };
})();
