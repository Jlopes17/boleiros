'use strict';

(() => {
  const SAVE_KEY = 'boleiros_save_v8';
  const LEGACY_KEYS = ['boleiros_save_v7', 'boleiros_live_v6', 'boleiros_ux_v5', 'boleiros_ux_v4', 'boleiros_ux_v3', 'boleiros_v1'];

  const app = document.getElementById('app');
  const modal = document.getElementById('modal');
  const box = document.getElementById('box');
  const toast = document.getElementById('toast');

  let state = null;
  let view = 'painel';
  let activeMatch = null;
  let loopTimer = null;
  let frameHandle = null;
  let keys = Object.create(null);

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = arr => arr[rand(0, arr.length - 1)];
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
  const money = value => 'R$ ' + Math.round(value || 0).toLocaleString('pt-BR');
  const html = value => String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  const $ = (selector, context = document) => context.querySelector(selector);

  window.onerror = (message, url, line) => {
    app.innerHTML = `
      <main class="main single">
        <section class="panel">
          <h1>Erro no Boleiros</h1>
          <p>${html(message)}</p>
          <p class="mut">Linha ${line}</p>
          <button class="pri" onclick="localStorage.clear();location.reload()">Limpar save e reiniciar</button>
        </section>
      </main>`;
  };

  const DIVISIONS = {
    'br-a': { label: 'Brasileirão Série A', order: 1 },
    'br-b': { label: 'Brasileirão Série B', order: 2 },
    'br-c': { label: 'Brasileirão Série C', order: 3 },
    'br-d': { label: 'Brasileirão Série D', order: 4 },
    'arg-a': { label: 'Argentina Primeira', order: 5 },
    'uru-a': { label: 'Uruguai Primeira', order: 6 },
    'par-a': { label: 'Paraguai Primeira', order: 7 },
    'col-a': { label: 'Colômbia Primeira', order: 8 },
    'chi-a': { label: 'Chile Primeira', order: 9 },
    'ecu-a': { label: 'Equador Primeira', order: 10 },
    'per-a': { label: 'Peru Primeira', order: 11 },
    'bol-a': { label: 'Bolívia Primeira', order: 12 },
    'ven-a': { label: 'Venezuela Primeira', order: 13 }
  };

  const STATES = {
    RJ: 'Cariocão Boleiros',
    SP: 'Paulistão Boleiros',
    MG: 'Mineiro Boleiros',
    RS: 'Gauchão Boleiros',
    PR: 'Paranaense Boleiros',
    BA: 'Baianão Boleiros',
    CE: 'Cearense Boleiros',
    PE: 'Pernambucano Boleiros',
    SC: 'Catarinense Boleiros',
    GO: 'Goiano Boleiros',
    PA: 'Paraense Boleiros',
    RN: 'Potiguar Boleiros',
    PB: 'Paraibano Boleiros',
    AM: 'Amazonense Boleiros',
    PI: 'Piauiense Boleiros',
    AL: 'Alagoano Boleiros',
    SE: 'Sergipano Boleiros'
  };

  const TEAM_DATA = [
    ['fla','Flarengo RJ','Brasil','RJ','br-a',88], ['pal','Palmeyras SP','Brasil','SP','br-a',87],
    ['cor','Coríntia Paulista','Brasil','SP','br-a',84], ['spa','São Paolo FC','Brasil','SP','br-a',83],
    ['san','Santista Praiano','Brasil','SP','br-a',78], ['bot','Botafolgo RJ','Brasil','RJ','br-a',84],
    ['flu','Fluminese RJ','Brasil','RJ','br-a',83], ['vas','Vascão da Gama','Brasil','RJ','br-a',78],
    ['cam','Atlético Mineyro','Brasil','MG','br-a',84], ['cru','Cruseiro Azul','Brasil','MG','br-a',82],
    ['gre','Grêmio Portoalegrense','Brasil','RS','br-a',82], ['int','Internacional Sul','Brasil','RS','br-a',81],
    ['bah','Bahía Salvador','Brasil','BA','br-a',78], ['vit','Vitória da Barra','Brasil','BA','br-a',75],
    ['apr','Atlético Paranense','Brasil','PR','br-a',80], ['cox','Corytiba Verde','Brasil','PR','br-a',75],

    ['ame','Américo Mineyro','Brasil','MG','br-b',70], ['ago','Atlético Goianense','Brasil','GO','br-b',70],
    ['ava','Avaí da Ilha','Brasil','SC','br-b',68], ['bsp','Botafogo Ribeirão','Brasil','SP','br-b',67],
    ['cea','Cearense SC','Brasil','CE','br-b',71], ['crb','Regatas de Maceió','Brasil','AL','br-b',66],
    ['cri','Criciúma Carbono','Brasil','SC','br-b',68], ['cui','Cuiabano Dourado','Brasil','MT','br-b',69],
    ['for','Fortal City','Brasil','CE','br-b',74], ['goi','Goiás Esmeralda','Brasil','GO','br-b',69],
    ['juv','Juventude Serrana','Brasil','RS','br-b',68], ['nau','Náutico Recife','Brasil','PE','br-b',66],
    ['nov','Novo Horizonte FC','Brasil','SP','br-b',68], ['pon','Ponte Escura','Brasil','SP','br-b',66],
    ['spo','Sportivo Recife','Brasil','PE','br-b',70], ['vil','Vila Nova Goiânia','Brasil','GO','br-b',67],

    ['abc','ABC Natalense','Brasil','RN','br-c',62], ['botpb','Botafogo Paraibano','Brasil','PB','br-c',61],
    ['fer','Ferroviário Cearense','Brasil','CE','br-c',60], ['ope','Operário dos Trilhos','Brasil','PR','br-c',65],
    ['rem','Rei Azul Belém','Brasil','PA','br-c',66], ['sanrec','Santa Recife','Brasil','PE','br-c',63],
    ['ypp','Ypiranga Erechim','Brasil','RS','br-c',62], ['conf','Confiança Aracaju','Brasil','SE','br-c',60],

    ['bolfc','Boleiros FC','Brasil','SP','br-d',58], ['lus','Lusitana Capital','Brasil','SP','br-d',58],
    ['mad','Madureira Subúrbio','Brasil','RJ','br-d',56], ['aco','Aço do Paraíba','Brasil','RJ','br-d',57],
    ['cax','Caxias da Serra','Brasil','RS','br-d',56], ['man','Manaus Verde','Brasil','AM','br-d',55],
    ['alt','Altos do Piauí','Brasil','PI','br-d',54], ['pel','Brasil de Pelotas','Brasil','RS','br-d',56],

    ['boc','Bairro Juniors','Argentina','ARG','arg-a',86], ['riv','Rio da Prata','Argentina','ARG','arg-a',87],
    ['rac','Academia Azul','Argentina','ARG','arg-a',82], ['ind','Vermelho Avellaneda','Argentina','ARG','arg-a',81],
    ['sanlor','Santo Azulgrana','Argentina','ARG','arg-a',79], ['estlp','Estudantes da Prata','Argentina','ARG','arg-a',78],

    ['pen','Aurinegro Montevidéu','Uruguai','URU','uru-a',81], ['nac','Nacional Montevidéu','Uruguai','URU','uru-a',80],
    ['def','Defensor Violeta','Uruguai','URU','uru-a',70],

    ['cer','Cerro Azulgrana','Paraguai','PAR','par-a',77], ['oli','Olimpia Assunção','Paraguai','PAR','par-a',78],
    ['lib','Liberdade Capital','Paraguai','PAR','par-a',76],

    ['atn','Nacional Verde','Colômbia','COL','col-a',78], ['mil','Azuis de Bogotá','Colômbia','COL','col-a',76],
    ['cal','América de Cali','Colômbia','COL','col-a',75],

    ['col','Colo Macul','Chile','CHI','chi-a',77], ['uca','Católica dos Andes','Chile','CHI','chi-a',75],
    ['uaz','Universidade Azul','Chile','CHI','chi-a',76],

    ['ldu','Altitude Quito','Equador','ECU','ecu-a',75], ['idv','Independente do Vale','Equador','ECU','ecu-a',77],
    ['bar','Barcelona Guaya','Equador','ECU','ecu-a',76],

    ['ali','Aliança Lima','Peru','PER','per-a',74], ['uni','Universitário Crema','Peru','PER','per-a',75],
    ['cri2','Cristal do Rímac','Peru','PER','per-a',73],

    ['bol','Bolívar Altitude','Bolívia','BOL','bol-a',74], ['tig','Tigre das Alturas','Bolívia','BOL','bol-a',73],
    ['car','Caracas Capital','Venezuela','VEN','ven-a',70]
  ].map(([id, name, country, state, div, rep]) => ({ id, name, country, state, div, rep }));

  const COUNTRIES = ['Brazil','Argentina','Uruguay','Colombia','Chile','Ecuador','Peru','Paraguay','Bolivia','Venezuela','Mexico','United States','Canada','Germany','France','Spain','Portugal','England','Netherlands','Italy','Croatia','Morocco','Japan','South Korea','Ghana','Senegal','Australia','Saudi Arabia','Egypt','Nigeria','South Africa','Belgium'];

  const FIRST = 'Rafael Bruno Caio Diego Felipe Guto Hugo João Kauã Léo Marcos Neto Otávio Paulo Renan Sandro Tiago Vini Wesley Yuri Zeca Facundo Santiago Nicolás Lautaro Matías Pablo Diego Sebastián Franco Carlos Andrés Miguel'.split(' ');
  const LAST = 'Silva Souza Lima Costa Santos Rocha Moura Ribeiro Alves Gomes Castro Cardoso Nogueira Batista Duarte Teixeira Melo Araújo Fernández Rodríguez Gómez Pérez Martínez García López Morales Vargas Rojas'.split(' ');
  const POSITIONS = 'GOL ZAG ZAG LE LD VOL MC MEI PE PD ATA ATA ZAG MC MEI ATA VOL PD'.split(' ');

  const MENU = [
    ['painel','Painel','Resumo e próximos passos'],
    ['agenda','Agenda','Calendário'],
    ['elenco','Elenco','Atletas'],
    ['escala','Escalação','Onze inicial'],
    ['taticas','Táticas','Plano de jogo'],
    ['treino','Treino','Evolução'],
    ['partida','Partida','Modos de jogo'],
    ['mercado','Mercado','Contratar e vender'],
    ['financas','Finanças','Caixa'],
    ['competicoes','Competições','Torneios'],
    ['database','Database','Clubes'],
    ['carreira','Carreira','Boleiro'],
    ['config','Config','Save']
  ];

  function baseStats() {
    return { j:0, v:0, e:0, d:0, gp:0, gc:0, sg:0, pts:0 };
  }

  function divLabel(div) {
    return DIVISIONS[div]?.label || div;
  }

  function divOrder(div) {
    return DIVISIONS[div]?.order || 99;
  }

  function stateLabel(state) {
    return STATES[state] || 'Estadual Boleiros';
  }

  function createTeam(data) {
    return {
      id: data.id,
      name: data.name,
      country: data.country,
      state: data.state,
      div: data.div,
      rep: data.rep,
      fans: rand(6000, 42000) * (data.rep > 82 ? 2 : 1),
      stadium: rand(12000, 65000),
      training: rand(1, 4),
      academy: rand(1, 4),
      medical: rand(1, 3),
      morale: rand(48, 88)
    };
  }

  function createPlayer(index, teamId, level = 62, star = false) {
    const age = star ? 18 : rand(17, 36);
    const overall = star ? 72 : clamp(level + rand(-14, 14), 35, 91);
    const potential = clamp(overall + rand(age < 23 ? 6 : 0, age < 24 ? 20 : 8), overall, 99);
    const player = {
      id: 'p' + Math.random().toString(36).slice(2),
      name: star ? 'Léo Boleiro' : `${pick(FIRST)} ${pick(LAST)}`,
      pos: star ? 'ATA' : POSITIONS[index % POSITIONS.length],
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
      starter: index < 11,
      teamId,
      star,
      goals: 0,
      assists: 0
    };
    player.value = Math.round(overall * overall * (potential / 75) * (age < 23 ? 1.25 : age > 31 ? 0.72 : 1) * 850);
    return player;
  }

  function roundRobin(teamIds, competition, phase = 'liga') {
    const teams = [...teamIds];
    if (teams.length % 2) teams.push('bye');
    const fixtures = [];
    for (let round = 0; round < teams.length - 1; round++) {
      for (let i = 0; i < teams.length / 2; i++) {
        const home = teams[i];
        const away = teams[teams.length - 1 - i];
        if (home !== 'bye' && away !== 'bye') {
          fixtures.push({
            id: `j_${competition}_${round}_${i}_${home}_${away}`,
            round: round + 1,
            home,
            away,
            done: false,
            homeGoals: null,
            awayGoals: null,
            competition,
            phase
          });
        }
      }
      teams.splice(1, 0, teams.pop());
    }
    return fixtures;
  }

  function chooseTop(teams, amount) {
    return [...teams].sort((a, b) => b.rep - a.rep || a.name.localeCompare(b.name, 'pt-BR')).slice(0, amount);
  }

  function buildCompetitions(teams, userTeamId) {
    const userTeam = teams.find(team => team.id === userTeamId) || teams[0];
    const competitions = [];

    if (userTeam.country === 'Brasil') {
      let stateTeams = chooseTop(teams.filter(team => team.country === 'Brasil' && team.state === userTeam.state), 8);
      if (!stateTeams.some(team => team.id === userTeam.id)) stateTeams = [userTeam, ...stateTeams].slice(0, 8);

      competitions.push({
        id: 'state',
        name: stateLabel(userTeam.state),
        scope: 'estadual',
        participants: stateTeams.map(team => team.id),
        description: 'Torneio local de abertura da temporada.',
        fixtures: roundRobin(stateTeams.map(team => team.id), stateLabel(userTeam.state), 'estadual')
      });

      ['br-a','br-b','br-c','br-d'].forEach(div => {
        let divisionTeams = chooseTop(teams.filter(team => team.div === div), 12);
        if (userTeam.div === div && !divisionTeams.some(team => team.id === userTeam.id)) divisionTeams = [userTeam, ...divisionTeams].slice(0, 12);
        competitions.push({
          id: div,
          name: divLabel(div),
          scope: 'nacional',
          participants: divisionTeams.map(team => team.id),
          description: 'Campeonato nacional por pontos corridos.',
          fixtures: userTeam.div === div ? roundRobin(divisionTeams.map(team => team.id), divLabel(div), 'liga') : []
        });
      });
    } else {
      let localTeams = chooseTop(teams.filter(team => team.country === userTeam.country), 10);
      if (!localTeams.some(team => team.id === userTeam.id)) localTeams = [userTeam, ...localTeams].slice(0, 10);
      competitions.push({
        id: 'local',
        name: `Liga ${userTeam.country}`,
        scope: 'nacional',
        participants: localTeams.map(team => team.id),
        description: 'Liga nacional do país escolhido.',
        fixtures: roundRobin(localTeams.map(team => team.id), `Liga ${userTeam.country}`, 'liga')
      });
    }

    const libertadores = chooseTop(teams.filter(team => team.rep >= 76), 24);
    if (!libertadores.some(team => team.id === userTeam.id) && userTeam.rep >= 74) libertadores.unshift(userTeam);
    competitions.push({
      id: 'libertadores',
      name: 'Libertadores Boleiros',
      scope: 'continental',
      participants: libertadores.slice(0, 24).map(team => team.id),
      description: 'Competição continental principal.',
      fixtures: libertadores.some(team => team.id === userTeam.id) ? roundRobin(libertadores.slice(0, 8).map(team => team.id), 'Libertadores Boleiros', 'grupo').slice(0, 14) : []
    });

    const sudamericana = chooseTop(teams.filter(team => team.rep >= 64 && team.rep < 78), 24);
    if (!sudamericana.some(team => team.id === userTeam.id) && userTeam.rep < 76) sudamericana.unshift(userTeam);
    competitions.push({
      id: 'sula',
      name: 'Sul-Americana Boleiros',
      scope: 'continental',
      participants: sudamericana.slice(0, 24).map(team => team.id),
      description: 'Competição continental alternativa.',
      fixtures: sudamericana.some(team => team.id === userTeam.id) ? roundRobin(sudamericana.slice(0, 8).map(team => team.id), 'Sul-Americana Boleiros', 'grupo').slice(0, 14) : []
    });

    competitions.push({
      id: 'worldcup',
      name: 'World Cup',
      scope: 'seleções',
      participants: COUNTRIES,
      description: 'Copa de seleções com nomes reais de países.',
      fixtures: []
    });

    return competitions;
  }

  function newGame(options = {}) {
    const teams = TEAM_DATA.map(createTeam);
    const teamId = options.teamId || 'bolfc';
    const players = [];

    teams.forEach(team => {
      for (let i = 0; i < 20; i++) {
        players.push(createPlayer(i, team.id, team.rep, team.id === teamId && i === 10));
      }
    });

    const competitions = buildCompetitions(teams, teamId);
    const fixtures = competitions.flatMap(comp => comp.fixtures);

    return {
      version: 8,
      week: 1,
      season: 1,
      phase: 'pré-temporada',
      user: {
        coach: options.coach || 'João',
        teamId,
        difficulty: options.difficulty || 'Normal'
      },
      teams,
      players,
      fixtures,
      competitions: competitions.map(({ fixtures, ...competition }) => competition),
      market: Array.from({ length: 24 }, (_, i) => createPlayer(i, 'market', rand(54, 82))),
      tactics: {
        formation: '4-3-3',
        mentality: 'Equilibrada',
        pressing: 'Média',
        tempo: 55,
        risk: 45,
        line: 50
      },
      training: {
        focus: 'Equilibrado',
        intensity: 55,
        rest: 35,
        individual: 'Ataque'
      },
      finance: {
        balance: 1800000,
        ticket: 35,
        sponsor: 260000,
        merch: 45000
      },
      career: {
        name: 'Léo Boleiro',
        energy: 82,
        happiness: 72,
        fame: 10,
        cash: 1500,
        relationships: { Técnico: 70, Torcida: 60, Elenco: 65, Mídia: 35 },
        skills: { Finalização: 66, Passe: 58, Drible: 63, Velocidade: 67, Defesa: 35 },
        goals: 0,
        assists: 0,
        matches: 0
      },
      matchMode: 'tecnico',
      preparation: { training: false, lineup: false, tactics: false, market: false },
      news: ['Temporada criada. O universo sul-americano está pronto.'],
      achievements: [],
      filters: { position: 'Todos' },
      worldCup: {
        groups: Array.from({ length: 8 }, (_, i) => ({
          id: String.fromCharCode(65 + i),
          teams: COUNTRIES.slice(i * 4, i * 4 + 4).map(name => ({ name, stats: baseStats() }))
        }))
      }
    };
  }

  function migrate(raw) {
    if (!raw) return null;
    if (raw.version === 8 && raw.teams && raw.fixtures) {
      if (!['tecnico', 'completo'].includes(raw.matchMode)) raw.matchMode = 'tecnico';
      return raw;
    }

    const migrated = newGame({
      coach: raw.user?.coach || 'João',
      teamId: 'bolfc',
      difficulty: raw.user?.difficulty || 'Normal'
    });

    const oldFinance = raw.finance || raw.fin || {};
    migrated.finance.balance = oldFinance.balance || oldFinance.saldo || migrated.finance.balance;
    migrated.finance.ticket = oldFinance.ticket || oldFinance.ing || migrated.finance.ticket;
    migrated.finance.sponsor = oldFinance.sponsor || oldFinance.pat || migrated.finance.sponsor;
    migrated.finance.merch = oldFinance.merch || migrated.finance.merch;

    if (raw.career) {
      migrated.career.energy = raw.career.energy || raw.career.energia || migrated.career.energy;
      migrated.career.happiness = raw.career.happiness || raw.career.feliz || migrated.career.happiness;
      migrated.career.fame = raw.career.fame || raw.career.fama || migrated.career.fame;
      migrated.career.cash = raw.career.cash || raw.career.grana || migrated.career.cash;
    }

    migrated.news.unshift('Save antigo migrado para a nova versão. Caixa e carreira principal foram preservados.');
    return migrated;
  }

  function load() {
    try {
      let raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        for (const key of LEGACY_KEYS) {
          raw = localStorage.getItem(key);
          if (raw) break;
        }
      }
      return migrate(JSON.parse(raw || 'null'));
    } catch {
      return null;
    }
  }

  function save() {
    if (state) localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function team(id = state.user.teamId) {
    return state.teams.find(item => item.id === id) || state.teams[0];
  }

  function squad(teamId = state.user.teamId) {
    return state.players.filter(player => player.teamId === teamId);
  }

  function starters(teamId = state.user.teamId) {
    return squad(teamId).filter(player => player.starter && !player.injury && !player.suspended).slice(0, 11);
  }

  function average(list, getter) {
    return list.length ? Math.round(list.reduce((sum, item) => sum + getter(item), 0) / list.length) : 0;
  }

  function strength(teamId = state.user.teamId) {
    const selected = teamId === state.user.teamId ? starters(teamId) : squad(teamId).sort((a, b) => b.overall - a.overall).slice(0, 11);
    const base = selected.length ? average(selected, player => player.overall * player.fitness / 100 * player.morale / 100 * player.form / 75) : team(teamId).rep;
    const tacticalBoost = teamId === state.user.teamId
      ? (state.tactics.mentality === 'Ofensiva' ? 2 : state.tactics.mentality === 'Defensiva' ? 1 : 0) + (state.tactics.pressing === 'Alta' ? 1 : 0)
      : 0;
    return clamp(base + team(teamId).training * 1.4 + team(teamId).morale / 30 + tacticalBoost, 1, 99);
  }

  function wageBill() {
    return squad().reduce((sum, player) => sum + player.salary, 0);
  }

  function nextFixture() {
    return state.fixtures.find(fixture => !fixture.done && (fixture.home === state.user.teamId || fixture.away === state.user.teamId));
  }

  function currentRound() {
    const next = nextFixture();
    return next ? state.fixtures.filter(fixture => !fixture.done && fixture.round === next.round && fixture.competition === next.competition) : [];
  }

  function competitionByName(name) {
    return state.competitions.find(comp => comp.name === name);
  }

  function competitionStats(competitionName) {
    const competition = competitionByName(competitionName);
    const ids = competition
      ? competition.participants.filter(id => typeof id === 'string' && state.teams.some(team => team.id === id))
      : state.teams.map(team => team.id);

    const map = Object.fromEntries(ids.map(id => [id, baseStats()]));

    state.fixtures.filter(fixture => fixture.competition === competitionName && fixture.done).forEach(fixture => {
      const home = map[fixture.home];
      const away = map[fixture.away];
      if (!home || !away) return;

      home.j++; away.j++;
      home.gp += fixture.homeGoals; home.gc += fixture.awayGoals;
      away.gp += fixture.awayGoals; away.gc += fixture.homeGoals;
      home.sg = home.gp - home.gc;
      away.sg = away.gp - away.gc;

      if (fixture.homeGoals > fixture.awayGoals) {
        home.v++; away.d++; home.pts += 3;
      } else if (fixture.awayGoals > fixture.homeGoals) {
        away.v++; home.d++; away.pts += 3;
      } else {
        home.e++; away.e++; home.pts++; away.pts++;
      }
    });

    return Object.entries(map)
      .map(([id, stats]) => ({ team: team(id), stats }))
      .sort((a, b) => b.stats.pts - a.stats.pts || b.stats.sg - a.stats.sg || b.stats.gp - a.stats.gp || a.team.name.localeCompare(b.team.name, 'pt-BR'));
  }

  function mainCompetitionName() {
    const selectedTeam = team();
    return selectedTeam.country === 'Brasil' ? divLabel(selectedTeam.div) : `Liga ${selectedTeam.country}`;
  }

  function standingPosition() {
    const index = competitionStats(mainCompetitionName()).findIndex(row => row.team.id === state.user.teamId);
    return index < 0 ? '-' : index + 1;
  }

  function simulateScore(homeId, awayId) {
    const difference = strength(homeId) + 4 - strength(awayId);
    return [
      clamp(Math.max(0, Math.round((difference + rand(-18, 24)) / 23) + rand(0, 2)), 0, 7),
      clamp(Math.max(0, Math.round((-difference + rand(-18, 24)) / 23) + rand(0, 2)), 0, 7)
    ];
  }

  function applyResult(fixture, homeGoals, awayGoals) {
    if (fixture.done) return;
    fixture.done = true;
    fixture.homeGoals = homeGoals;
    fixture.awayGoals = awayGoals;

    const home = team(fixture.home);
    const away = team(fixture.away);

    if (homeGoals > awayGoals) {
      home.morale = clamp(home.morale + 3);
      away.morale = clamp(away.morale - 2);
    } else if (awayGoals > homeGoals) {
      away.morale = clamp(away.morale + 3);
      home.morale = clamp(home.morale - 2);
    } else {
      home.morale = clamp(home.morale + 1);
      away.morale = clamp(away.morale + 1);
    }
  }

  function render() {
    save();
    app.innerHTML = state ? renderAppShell() : renderStart();
  }

  function renderStart() {
    const hasSave = Boolean(load());
    return `
      <section class="hero">
        <div class="panel heroPanel">
          <div class="logo">B</div>
          <h1>Boleiros</h1>
          <p class="lead">Manager sul-americano com clubes fictícios, calendário realista, modo Técnico e carreira jogável no modo Completo.</p>
          <div class="actionbar heroActions">
            <button class="pri" data-start="new">Novo jogo</button>
            ${hasSave ? '<button data-start="continue">Continuar campanha</button>' : ''}
            <button data-start="how">Como jogar</button>
            <button data-start="demo">Demo rápida</button>
          </div>
          <div class="g4">
            <div class="card"><b>Sem cara de protótipo</b><p class="mut">Fluxo mais limpo, ações consistentes e menos botão solto.</p></div>
            <div class="card"><b>Escolha clara</b><p class="mut">Times por divisão e ordem alfabética.</p></div>
            <div class="card"><b>Dois jeitos de jogar</b><p class="mut">Comande como Técnico ou controle o Boleiro no modo Completo.</p></div>
            <div class="card"><b>Mobile first</b><p class="mut">Controles grandes, ações no rodapé e interface compacta.</p></div>
          </div>
        </div>
      </section>`;
  }

  function teamOption(item) {
    return `<option value="${item.id}">${html(item.name)} • ${item.state} • Rep ${item.rep}</option>`;
  }

  function renderSetup() {
    const grouped = {};
    TEAM_DATA
      .slice()
      .sort((a, b) => divOrder(a.div) - divOrder(b.div) || a.name.localeCompare(b.name, 'pt-BR'))
      .forEach(item => {
        const key = divLabel(item.div);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });

    app.innerHTML = `
      <section class="hero">
        <div class="panel setupPanel">
          <div class="pageHead">
            <div>
              <h1 class="setupTitle">Criar carreira</h1>
              <p class="lead">Escolha o clube por divisão. Dentro de cada divisão, tudo está em ordem alfabética.</p>
            </div>
            <button data-start="back">Voltar</button>
          </div>
          <div class="grid setupGrid">
            <div class="card">
              <label>Nome do técnico</label>
              <input id="coach" value="João">
              <div class="fieldBlock">
                <label>Buscar time</label>
                <input id="teamSearch" placeholder="Nome, estado, país ou divisão">
              </div>
              <div class="fieldBlock">
                <label>Clube por divisão</label>
                <select id="clubSelect" size="13">
                  ${Object.entries(grouped).map(([label, teams]) => `<optgroup label="${label}">${teams.map(teamOption).join('')}</optgroup>`).join('')}
                </select>
              </div>
            </div>
            <div class="stack">
              <div id="clubPreview" class="card"></div>
              <div class="card">
                <label>Dificuldade</label>
                <select id="difficulty">
                  <option>Normal</option>
                  <option>Fácil</option>
                  <option>Difícil</option>
                </select>
                <p class="mut">A dificuldade vai impactar finanças, crescimento e força dos rivais nas próximas versões.</p>
              </div>
              <div class="disc">Boleiros é fictício e independente. Clubes e atletas usam nomes alterados, sem escudos, uniformes, imagens ou dados oficiais.</div>
              <div class="actionbar stickyCta">
                <button class="pri wide" data-start="create">Começar temporada</button>
              </div>
            </div>
          </div>
        </div>
      </section>`;
    updateClubPreview();
  }

  function updateClubPreview() {
    const selected = $('#clubSelect')?.value || 'bolfc';
    const data = TEAM_DATA.find(item => item.id === selected) || TEAM_DATA.find(item => item.id === 'bolfc') || TEAM_DATA[0];
    const preview = $('#clubPreview');
    if (!preview) return;

    preview.innerHTML = `
      <div class="row">
        <div>
          <span class="tag ok">${divLabel(data.div)}</span>
          <h2>${html(data.name)}</h2>
          <p class="mut">${data.country} • ${data.state}</p>
        </div>
        <div class="badge">${data.rep}</div>
      </div>
      <div class="g3">
        <div><span class="mut">Reputação</span><div class="big">${data.rep}</div></div>
        <div><span class="mut">País</span><div class="big">${data.country}</div></div>
        <div><span class="mut">Estado</span><div class="big">${data.state}</div></div>
      </div>
      <p class="mut">Calendário inicial será gerado com estadual/local, liga nacional, torneio continental elegível e World Cup no menu de competições.</p>`;
  }

  function filterTeams() {
    const query = ($('#teamSearch')?.value || '').toLowerCase();
    const select = $('#clubSelect');
    if (!select) return;

    const grouped = {};
    TEAM_DATA
      .filter(item => `${item.name} ${item.country} ${item.state} ${divLabel(item.div)}`.toLowerCase().includes(query))
      .sort((a, b) => divOrder(a.div) - divOrder(b.div) || a.name.localeCompare(b.name, 'pt-BR'))
      .forEach(item => {
        const key = divLabel(item.div);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });

    select.innerHTML = Object.keys(grouped).length
      ? Object.entries(grouped).map(([label, teams]) => `<optgroup label="${label}">${teams.map(teamOption).join('')}</optgroup>`).join('')
      : '<option disabled>Nenhum time encontrado</option>';

    updateClubPreview();
  }

  function renderAppShell() {
    return `
      <div class="shell">
        <aside class="side">
          <div class="brand">
            <div class="logo">B</div>
            <div>
              <h2>Boleiros</h2>
              <p class="mut">${html(team().name)} • ${team().country}</p>
            </div>
          </div>
          <nav class="nav">
            ${MENU.map(([id, label, subtitle]) => `
              <button data-view="${id}" class="${view === id ? 'on' : ''}">
                <span>${label}</span>
                <small>${subtitle}</small>
              </button>`).join('')}
          </nav>
        </aside>
        <main class="main">
          <div class="pageHead">
            <div>
              <h1>${pageTitle()}</h1>
              <p class="mut">${pageSubtitle()}</p>
            </div>
            <div class="hud">
              <span class="pill">Semana ${state.week}</span>
              <span class="pill">${money(state.finance.balance)}</span>
              <span class="pill">Força ${strength()}</span>
              <span class="pill">${standingPosition()}º</span>
            </div>
          </div>
          ${pages[view]()}
          <nav class="bottom">
            ${[['painel','Painel'],['elenco','Elenco'],['partida','Jogo'],['competicoes','Torneios'],['database','DB']].map(([id, label]) => `
              <button data-view="${id}" class="${view === id ? 'on' : ''}">${label}</button>`).join('')}
          </nav>
        </main>
      </div>`;
  }

  function pageTitle() {
    return ({
      painel: 'Painel da semana',
      agenda: 'Agenda',
      elenco: 'Elenco',
      escala: 'Escalação',
      taticas: 'Táticas',
      treino: 'Treino',
      partida: 'Central da partida',
      mercado: 'Mercado',
      financas: 'Finanças',
      competicoes: 'Competições',
      database: 'Database sul-americano',
      carreira: 'Carreira do boleiro',
      config: 'Configurações'
    })[view] || 'Boleiros';
  }

  function pageSubtitle() {
    return ({
      painel: 'O que precisa ser decidido antes do próximo jogo.',
      agenda: 'Calendário multi-competição.',
      elenco: 'Atletas, contratos, lesões e moral.',
      escala: 'Onze inicial e desenho no campo.',
      taticas: 'Plano de jogo com impacto real na simulação.',
      treino: 'Evolução, fadiga e risco de queda física.',
      partida: 'Três modos de jogo com controles consistentes.',
      mercado: 'Compra, venda e reposição do elenco.',
      financas: 'Caixa, ingresso, folha e estrutura.',
      competicoes: 'Estaduais, Brasileirão, continentais e World Cup.',
      database: 'Clubes por divisão, país e reputação.',
      carreira: 'Vida e evolução do craque.',
      config: 'Save, exportação e reset.'
    })[view] || '';
  }

  function modeLabel(mode) {
    return mode === 'completo' ? 'Completo' : 'Técnico';
  }

  function nextMatchCard() {
    const fixture = nextFixture();
    if (!fixture) {
      return `<div class="emptyState"><b>Temporada encerrada</b><p>Próximo passo: novas temporadas, acesso e rebaixamento completo.</p></div>`;
    }

    const opponent = fixture.home === state.user.teamId ? fixture.away : fixture.home;
    return `
      <div class="card matchCard">
        <div class="row topAligned">
          <div>
            <span class="tag warn">Próxima partida</span>
            <h2>${team(fixture.home).name} x ${team(fixture.away).name}</h2>
            <p class="mut">${fixture.competition} • Rodada ${fixture.round} • ${fixture.home === state.user.teamId ? 'Casa' : 'Fora'}</p>
          </div>
          <button class="pri" data-action="match">Jogar</button>
        </div>
        <div class="statGrid">
          <div><span>Nossa força</span><b>${strength()}</b></div>
          <div><span>Rival</span><b>${strength(opponent)}</b></div>
          <div><span>Modo</span><b>${modeLabel(state.matchMode)}</b></div>
        </div>
      </div>`;
  }

  function tableRows(rows) {
    return `
      <div class="table">
        <table>
          <tr><th>#</th><th>Clube</th><th>Pts</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr>
          ${rows.map((row, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>
                <b>${row.team.name}</b>${row.team.id === state.user.teamId ? ' <span class="tag ok">Você</span>' : ''}
                <br><span class="mut mini">${row.team.country} • ${divLabel(row.team.div)}</span>
              </td>
              <td><b>${row.stats.pts}</b></td>
              <td>${row.stats.j}</td>
              <td>${row.stats.v}</td>
              <td>${row.stats.e}</td>
              <td>${row.stats.d}</td>
              <td>${row.stats.sg}</td>
            </tr>`).join('')}
        </table>
      </div>`;
  }

  function fixtureItem(fixture) {
    return `
      <div class="item">
        <div>
          <b>${team(fixture.home).name}</b> ${fixture.done ? fixture.homeGoals : '-'} x ${fixture.done ? fixture.awayGoals : '-'} <b>${team(fixture.away).name}</b>
          <br><span class="mut">${fixture.competition} • Rodada ${fixture.round}</span>
        </div>
        ${!fixture.done && (fixture.home === state.user.teamId || fixture.away === state.user.teamId) ? '<button class="pri" data-action="match">Jogar</button>' : ''}
      </div>`;
  }

  function playerRows(players, own = true) {
    return `
      <div class="table">
        <table>
          <tr><th></th><th>Jogador</th><th>Pos</th><th>OV</th><th>Pot</th><th>Fís</th><th>Moral</th><th>Valor</th><th>Ação</th></tr>
          ${players.map(player => `
            <tr>
              <td>${own ? `<input type="checkbox" data-starter="${player.id}" ${player.starter ? 'checked' : ''} ${player.injury || player.suspended ? 'disabled' : ''}>` : ''}</td>
              <td><b>${html(player.name)}</b>${player.star ? ' ⭐' : ''}<br><span class="mut">${player.age} anos${player.injury ? ' • lesão ' + player.injury + 's' : ''}</span></td>
              <td>${player.pos}</td>
              <td><b>${player.overall}</b></td>
              <td>${player.potential}</td>
              <td>${player.fitness}</td>
              <td>${player.morale}</td>
              <td>${money(player.value)}</td>
              <td>${own ? `<button data-player="${player.id}">Detalhes</button>` : `<button class="pri" data-buy="${player.id}">Comprar</button>`}</td>
            </tr>`).join('')}
        </table>
      </div>`;
  }

  const pitchPositions = [[8,50],[24,22],[24,43],[24,58],[24,78],[44,32],[44,52],[44,72],[70,25],[83,50],[70,75]];

  function pitchView() {
    return `
      <div class="field">
        ${starters().map((player, index) => `
          <div class="dot ${player.star ? 'star' : ''}" style="left:${pitchPositions[index]?.[0] || 50}%;top:${pitchPositions[index]?.[1] || 50}%">${player.pos}</div>`).join('')}
      </div>`;
  }

  function slider(key, label, value, scope) {
    return `
      <div class="fieldBlock">
        <label>${label}</label>
        <input type="range" min="0" max="100" value="${value}" data-slider="${key}" data-scope="${scope}">
        <div class="row smallRow"><span class="mut">baixo</span><b>${value}</b><span class="mut">alto</span></div>
      </div>`;
  }

  function assistantRecommendations() {
    const recommendations = [];
    if (starters().length < 11) recommendations.push('Você tem menos de 11 titulares.');
    if (average(starters(), p => p.fitness) < 72) recommendations.push('O time está cansado. Reduza intensidade ou aumente descanso.');
    if (state.finance.balance < 0) recommendations.push('Caixa negativo. Venda alguém ou reduza a folha.');
    if (!state.preparation.tactics) recommendations.push('Revise táticas antes do jogo.');
    if (!recommendations.length) recommendations.push('Tudo pronto. Pode jogar.');

    return recommendations.map(item => `<div class="item">${item}</div>`).join('');
  }

  const pages = {
    painel() {
      return `
        <div class="grid">
          <section class="panel">
            <div class="sectionHead">
              <div><h2>Resumo</h2><p class="mut">Foco no próximo jogo.</p></div>
              <button class="pri" data-action="match">Jogar próxima</button>
            </div>
            <div class="g4">
              <div class="card">Divisão<div class="big">${divLabel(team().div).replace('Brasileirão ', '')}</div></div>
              <div class="card">Força<div class="big">${strength()}</div></div>
              <div class="card">Folha<div class="big">${money(wageBill())}</div></div>
              <div class="card">Fase<div class="big">${state.phase}</div></div>
            </div>
            <br>${nextMatchCard()}
          </section>
          <section class="panel">
            <h2>Assistente</h2>
            <div class="stack">${assistantRecommendations()}</div>
            <h3>Universo</h3>
            <div class="item">Clubes no database <b>${state.teams.length}</b></div>
            <div class="item">Competições <b>${state.competitions.length}</b></div>
            <div class="item">Seu país <b>${team().country}</b></div>
          </section>
        </div>
        <br>
        <div class="grid">
          <section class="panel">
            <h2>Notícias</h2>
            <div class="stack">${state.news.slice(-7).reverse().map(item => `<div class="item">${html(item)}</div>`).join('')}</div>
          </section>
          <section class="panel">
            <h2>Classificação principal</h2>
            ${tableRows(competitionStats(mainCompetitionName()).slice(0, 8))}
          </section>
        </div>`;
    },

    agenda() {
      const games = state.fixtures.filter(fixture => !fixture.done && (fixture.home === state.user.teamId || fixture.away === state.user.teamId));
      return `
        <div class="grid">
          <section class="panel"><h2>Próximos jogos</h2><div class="stack">${games.slice(0, 12).map(fixtureItem).join('') || '<p class="mut">Sem jogos.</p>'}</div></section>
          <section class="panel"><h2>Rodada atual</h2><div class="stack">${currentRound().map(fixtureItem).join('') || '<p class="mut">Rodada concluída.</p>'}</div></section>
        </div>`;
    },

    elenco() {
      const players = squad()
        .filter(player => state.filters.position === 'Todos' || player.pos === state.filters.position)
        .sort((a, b) => Number(b.starter) - Number(a.starter) || b.overall - a.overall);

      return `
        <section class="panel">
          <div class="sectionHead">
            <div><h2>Elenco</h2><p class="mut">Escolha titulares e acompanhe condição.</p></div>
            <div class="actionbar compact">
              <select data-filter="position">
                <option>Todos</option>
                ${['GOL','ZAG','LE','LD','VOL','MC','MEI','PE','PD','ATA'].map(pos => `<option ${state.filters.position === pos ? 'selected' : ''}>${pos}</option>`).join('')}
              </select>
              <button data-action="autoLineup">Escalar melhores</button>
            </div>
          </div>
          ${playerRows(players, true)}
        </section>`;
    },

    escala() {
      return `
        <div class="grid">
          <section class="panel"><h2>Campo</h2>${pitchView()}</section>
          <section class="panel"><h2>Onze inicial</h2>${playerRows(starters(), true)}</section>
        </div>`;
    },

    taticas() {
      return `
        <section class="panel">
          <h2>Plano de jogo</h2>
          <div class="g3">
            <div class="fieldBlock"><label>Formação</label><select data-tactic="formation">${['4-3-3','4-4-2','4-2-3-1','3-5-2','5-3-2'].map(item => `<option ${state.tactics.formation === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div>
            <div class="fieldBlock"><label>Mentalidade</label><select data-tactic="mentality">${['Defensiva','Equilibrada','Ofensiva'].map(item => `<option ${state.tactics.mentality === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div>
            <div class="fieldBlock"><label>Pressão</label><select data-tactic="pressing">${['Baixa','Média','Alta'].map(item => `<option ${state.tactics.pressing === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div>
            ${slider('tempo', 'Ritmo', state.tactics.tempo, 'tactics')}
            ${slider('risk', 'Risco', state.tactics.risk, 'tactics')}
            ${slider('line', 'Linha defensiva', state.tactics.line, 'tactics')}
          </div>
          <div class="insightCard">Força atual: <b>${strength()}</b>. Mentalidade ofensiva aumenta chance de gol, mas também abre espaço para o rival.</div>
        </section>`;
    },

    treino() {
      return `
        <section class="panel">
          <div class="sectionHead">
            <div><h2>Treino da semana</h2><p class="mut">Controle evolução e fadiga.</p></div>
            <button class="pri" data-action="train">Aplicar treino</button>
          </div>
          <div class="g3">
            <div class="fieldBlock"><label>Foco coletivo</label><select data-training="focus">${['Equilibrado','Finalização','Defesa','Físico','Posse de bola'].map(item => `<option ${state.training.focus === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div>
            <div class="fieldBlock"><label>Foco do boleiro</label><select data-training="individual">${['Ataque','Passe','Drible','Velocidade','Defesa'].map(item => `<option ${state.training.individual === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div>
            ${slider('intensity', 'Intensidade', state.training.intensity, 'training')}
            ${slider('rest', 'Descanso', state.training.rest, 'training')}
          </div>
        </section>`;
    },

    partida() {
      const modes = [
        ['tecnico','Técnico','A partida corre sozinha. Ajuste a mentalidade, faça substituições e administre o resultado.'],
        ['completo','Completo','Controle somente o Boleiro em uma partida contínua. O restante dos jogadores é comandado pela IA.']
      ];

      return `
        <section class="panel">
          <div class="sectionHead">
            <div><h2>Central da partida</h2><p class="mut">Escolha o modo antes de começar.</p></div>
            <button class="pri" data-action="match">Começar partida</button>
          </div>
          ${nextMatchCard()}
          <br>
          <div class="g2">
            ${modes.map(([id, title, description]) => `
              <button class="modeCard ${state.matchMode === id ? 'selected' : ''}" data-mode="${id}">
                <b>${title}</b>
                <span>${description}</span>
              </button>`).join('')}
          </div>
          <div class="actionbar stickyCta">
            <button class="pri wide" data-action="match">Começar partida</button>
          </div>
        </section>`;
    },

    mercado() {
      return `
        <div class="grid">
          <section class="panel">
            <div class="sectionHead">
              <div><h2>Comprar</h2><p class="mut">Reforços disponíveis.</p></div>
              <button data-action="scout">Buscar jogadores</button>
            </div>
            ${playerRows(state.market.sort((a, b) => b.overall - a.overall), false)}
          </section>
          <section class="panel">
            <h2>Vender</h2>
            <div class="stack">
              ${squad().sort((a, b) => b.value - a.value).map(player => `
                <div class="item">
                  <div><b>${html(player.name)}</b>${player.star ? ' ⭐' : ''}<br><span class="mut">${player.pos} ${player.overall} • ${money(player.value)}</span></div>
                  <button class="bad" data-sell="${player.id}">Vender</button>
                </div>`).join('')}
            </div>
          </section>
        </div>`;
    },

    financas() {
      return `
        <section class="panel">
          <h2>Finanças</h2>
          <div class="g4">
            <div class="card">Saldo<div class="big">${money(state.finance.balance)}</div></div>
            <div class="card">Folha semanal<div class="big">${money(wageBill() / 2)}</div></div>
            <div class="card">Patrocínio<div class="big">${money(state.finance.sponsor)}</div></div>
            <div class="card"><label>Ingresso</label><input type="number" data-finance="ticket" value="${state.finance.ticket}"></div>
          </div>
        </section>`;
    },

    competicoes() {
      const next = competitionByName(nextFixture()?.competition) || state.competitions[0];
      return `
        <section class="panel">
          <h2>Competições</h2>
          <div class="g3">
            ${state.competitions.map(comp => `
              <div class="card competitionCard">
                <div class="row"><div class="compLogo">${comp.scope[0].toUpperCase()}</div><span class="tag ${comp.scope === 'continental' ? 'blue' : comp.scope === 'seleções' ? 'red' : 'ok'}">${comp.scope}</span></div>
                <h3>${comp.name}</h3>
                <p class="mut">${comp.description}</p>
                <p><b>${comp.participants.length}</b> participantes</p>
                <button data-competition="${html(comp.name)}">Ver tabela</button>
              </div>`).join('')}
          </div>
          <br>
          <h2>Classificação da próxima competição</h2>
          ${next && next.scope !== 'seleções' ? tableRows(competitionStats(next.name).slice(0, 12)) : worldCupView()}
        </section>`;
    },

    database() {
      const teams = state.teams.slice().sort((a, b) => divOrder(a.div) - divOrder(b.div) || a.name.localeCompare(b.name, 'pt-BR'));
      return `
        <section class="panel">
          <div class="sectionHead">
            <div><h2>Database</h2><p class="mut">Ordenado por divisão e alfabético dentro de cada divisão.</p></div>
            <span class="pill">${teams.length} clubes</span>
          </div>
          <div class="table">
            <table>
              <tr><th>Clube</th><th>País</th><th>Estado</th><th>Divisão</th><th>Rep</th></tr>
              ${teams.map(item => `
                <tr>
                  <td><b>${html(item.name)}</b><br><span class="mut mini">${item.id}</span></td>
                  <td>${item.country}</td>
                  <td>${item.state}</td>
                  <td>${divLabel(item.div)}</td>
                  <td>${item.rep}</td>
                </tr>`).join('')}
            </table>
          </div>
        </section>`;
    },

    carreira() {
      const career = state.career;
      return `
        <section class="panel">
          <h2>${career.name}</h2>
          <div class="g4">
            <div class="card">Energia<div class="big">${career.energy}</div></div>
            <div class="card">Felicidade<div class="big">${career.happiness}</div></div>
            <div class="card">Fama<div class="big">${career.fame}</div></div>
            <div class="card">Grana<div class="big">${money(career.cash)}</div></div>
          </div>
          <br>
          <div class="grid">
            <div class="card">
              <h3>Habilidades</h3>
              ${Object.entries(career.skills).map(([key, value]) => `<div class="item"><span>${key}</span><div style="width:160px"><div class="bar"><span style="width:${value}%"></span></div></div></div>`).join('')}
            </div>
            <div class="card">
              <h3>Vida fora de campo</h3>
              <div class="actionbar">
                <button data-life="rest">Descansar</button>
                <button data-life="boot">Comprar chuteira</button>
                <button data-life="media">Dar entrevista</button>
                <button data-life="night">Sair à noite</button>
              </div>
            </div>
          </div>
        </section>`;
    },

    config() {
      return `
        <section class="panel">
          <h2>Configurações</h2>
          <div class="actionbar">
            <button class="pri" data-action="save">Salvar</button>
            <button data-action="export">Exportar</button>
            <button data-action="import">Importar</button>
            <button class="bad" data-action="reset">Resetar</button>
          </div>
          <br>
          <textarea id="saveBox" rows="10" placeholder="Exportar ou colar save aqui"></textarea>
        </section>`;
    }
  };

  function worldCupView() {
    return `<div class="grid">${state.worldCup.groups.map(group => `<div class="card"><h3>Grupo ${group.id}</h3>${group.teams.map(country => `<div class="item"><span>${country.name}</span><b>${country.stats.pts}</b></div>`).join('')}</div>`).join('')}</div>`;
  }

  function openCompetition(name) {
    const competition = state.competitions.find(item => item.name === name);
    if (!competition) return;
    modal.classList.add('open');
    box.innerHTML = `
      <div class="modalHead">
        <div><h2>${competition.name}</h2><p class="mut">${competition.description}</p></div>
        <button data-close="1">Fechar</button>
      </div>
      ${competition.scope === 'seleções' ? worldCupView() : tableRows(competitionStats(competition.name))}
      <br>
      <h3>Participantes</h3>
      <div class="g3">
        ${competition.participants.map(id => typeof id === 'string' && state.teams.some(team => team.id === id)
          ? `<div class="item"><span>${team(id).name}</span><span class="mut">${team(id).country}</span></div>`
          : `<div class="item">${id}</div>`).join('')}
      </div>`;
  }

  function openPlayer(playerId) {
    const player = state.players.find(item => item.id === playerId);
    if (!player) return;

    modal.classList.add('open');
    box.innerHTML = `
      <div class="modalHead">
        <div>
          <h2>${html(player.name)}${player.star ? ' ⭐' : ''}</h2>
          <p class="mut">${player.pos} • ${player.age} anos • contrato ${player.contract} meses</p>
        </div>
        <button data-close="1">Fechar</button>
      </div>
      <div class="g4">
        <div class="card">OV<div class="big">${player.overall}</div></div>
        <div class="card">Potencial<div class="big">${player.potential}</div></div>
        <div class="card">Físico<div class="big">${player.fitness}</div></div>
        <div class="card">Moral<div class="big">${player.morale}</div></div>
      </div>
      <br>
      <div class="grid">
        <div class="card"><h3>Contrato</h3><p>Salário: <b>${money(player.salary)}</b></p><p>Valor: <b>${money(player.value)}</b></p></div>
        <div class="card"><h3>Status</h3><p>${player.injury ? 'Lesionado por ' + player.injury + ' semanas' : 'Disponível'}</p></div>
      </div>`;
  }

  function openMatch() {
    const fixture = nextFixture();
    if (!fixture) {
      showToast('Sem partida pendente');
      return;
    }

    stopMatchTimers();

    activeMatch = {
      fixtureId: fixture.id,
      minute: 0,
      homeGoals: 0,
      awayGoals: 0,
      mode: state.matchMode,
      paused: false,
      boost: 0,
      aimX: 84,
      aimY: 50,
      ballX: 50,
      ballY: 50,
      log: ['A bola vai rolar.'],
      stats: { shotsFor: 0, shotsAgainst: 0, possession: 50, tackles: 0, passes: 0 },
      moments: 0,
      full: null
    };

    modal.classList.add('open');
    renderMatchShell();

    if (activeMatch.mode === 'tecnico') startCoachMode();
    if (activeMatch.mode === 'completo') startFullMode();
  }

  function currentMatchFixture() {
    return state.fixtures.find(fixture => fixture.id === activeMatch.fixtureId);
  }

  function renderMatchShell() {
    const fixture = currentMatchFixture();
    box.classList.toggle('completeMatch', activeMatch.mode === 'completo');
    box.innerHTML = `
      <div class="modalHead">
        <div>
          <h2>${team(fixture.home).name} ${activeMatch.homeGoals} x ${activeMatch.awayGoals} ${team(fixture.away).name}</h2>
          <p class="mut">${fixture.competition} • ${Math.floor(activeMatch.minute)}' • ${modeLabel(activeMatch.mode)}</p>
        </div>
        <button data-close="1">Fechar</button>
      </div>
      <div class="timeline">${Array.from({ length: 10 }, (_, index) => `<span class="${activeMatch.minute >= index * 9 ? 'on' : ''}"></span>`).join('')}</div>
      <div class="matchLayout">
        <div>
          <canvas id="cv" width="980" height="430"></canvas>
          <div class="matchControlBar">${matchControls()}</div>
        </div>
        <aside class="matchSide">
          <h3>Narração</h3>
          <div class="stack">${activeMatch.log.slice(-8).reverse().map(item => `<div class="item">${html(item)}</div>`).join('')}</div>
          <h3>Estatísticas</h3>
          <div class="statGrid compactStats">
            <div><span>Chutes</span><b>${activeMatch.stats.shotsFor}</b></div>
            <div><span>Contra</span><b>${activeMatch.stats.shotsAgainst}</b></div>
            <div><span>Posse</span><b>${activeMatch.stats.possession}%</b></div>
          </div>
        </aside>
      </div>`;
    drawMatch();
  }

  function matchControls() {
    const top = '<div class="actionbar matchActions">' +
      '<button data-switch-mode="tecnico" class="' + (activeMatch.mode === 'tecnico' ? 'pri' : '') + '">Técnico</button>' +
      '<button data-switch-mode="completo" class="' + (activeMatch.mode === 'completo' ? 'pri' : '') + '">Completo</button>' +
      '<button data-match="pause">' + (activeMatch.paused ? 'Continuar' : 'Pausar') + '</button>' +
      '<button data-match="finish">Encerrar</button>' +
    '</div>';

    if (activeMatch.mode === 'tecnico') {
      return top +
        '<div class="card coachControls">' +
          '<b>Área técnica</b>' +
          '<p class="mut">A partida acontece automaticamente. Você interfere no plano de jogo.</p>' +
          '<div class="actionbar">' +
            '<button data-coach="Ofensiva">Ofensiva</button>' +
            '<button data-coach="Equilibrada">Equilibrada</button>' +
            '<button data-coach="Defensiva">Defensiva</button>' +
            '<button data-coach="sub">Substituir cansado</button>' +
          '</div>' +
        '</div>';
    }

    const full = activeMatch.full;
    if (!full || !full.ready) {
      const selected = starters();
      return top +
        '<div class="completeIntro">' +
          '<div><span class="tag ok">Sua posição</span><h3>' + html(state.career.name) + '</h3>' +
          '<p class="mut">Você controla apenas o jogador marcado com a estrela. Seus companheiros se movimentam e tomam decisões pela IA.</p></div>' +
          '<div class="formationPreview">' +
            selected.map((player, index) => '<span class="' + (player.star ? 'you' : '') + '" style="left:' + (pitchPositions[index]?.[0] || 50) + '%;top:' + (pitchPositions[index]?.[1] || 50) + '%">' + player.pos + (player.star ? ' ★' : '') + '</span>').join('') +
          '</div>' +
          '<button class="pri wide" data-match="kickoff">Entrar em campo</button>' +
        '</div>';
    }

    return top +
      '<div class="completeHud">' +
        '<div><span>Nota</span><b data-full-rating>' + full.rating.toFixed(1).replace('.', ',') + '</b></div>' +
        '<div><span>Energia</span><b data-full-stamina>' + Math.round(full.stamina) + '%</b></div>' +
        '<div class="fullFeedback" data-full-feedback>' + html(full.feedback) + '</div>' +
      '</div>' +
      '<div class="touch">' +
        '<div class="dpad">' +
          '<span></span><button aria-label="Cima" data-hold="up">▲</button><span></span>' +
          '<button aria-label="Esquerda" data-hold="left">◀</button><span class="stickCenter">★</span><button aria-label="Direita" data-hold="right">▶</button>' +
          '<span></span><button aria-label="Baixo" data-hold="down">▼</button><span></span>' +
        '</div>' +
        '<div class="actBtns">' +
          '<button class="pri" data-full="shoot">Chutar</button>' +
          '<button data-full="pass">Passe / pedir</button>' +
          '<button data-full="cross">Cruzamento</button>' +
          '<button data-full="tackle">Carrinho</button>' +
        '</div>' +
      '</div>' +
      '<p class="mut mini completeHelp">Toque no campo para correr até um ponto. No desktop use WASD ou setas. J chuta, K passa, L cruza e I dá carrinho.</p>';
  }

  function drawField(ctx, width, height) {
    ctx.fillStyle = '#176b34';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,.76)';
    ctx.lineWidth = 3;
    ctx.strokeRect(35, 35, width - 70, height - 70);
    ctx.beginPath();
    ctx.moveTo(width / 2, 35);
    ctx.lineTo(width / 2, height - 35);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(35, height / 2 - 70, 85, 140);
    ctx.strokeRect(width - 120, height / 2 - 70, 85, 140);
  }

  function drawMatch() {
    const canvas = $('#cv');
    if (!canvas || !activeMatch) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (activeMatch.mode === 'completo' && activeMatch.full) {
      drawFullMode(ctx, width, height);
      return;
    }

    drawField(ctx, width, height);

    const dots = [[13,50],[26,25],[26,50],[26,75],[48,30],[48,70],[67,26],[81,50],[67,74]];
    dots.forEach((point, index) => {
      ctx.fillStyle = index < 6 ? '#dfffe8' : '#ffd166';
      ctx.beginPath();
      ctx.arc(point[0] * width / 100, point[1] * height / 100, 13, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(activeMatch.ballX * width / 100, activeMatch.ballY * height / 100, 8, 0, Math.PI * 2);
    ctx.fill();

    if (activeMatch.mode === 'momentos') {
      ctx.strokeStyle = '#ffef9b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(activeMatch.ballX * width / 100, activeMatch.ballY * height / 100);
      ctx.lineTo(activeMatch.aimX * width / 100, activeMatch.aimY * height / 100);
      ctx.stroke();
      ctx.fillStyle = '#ffef9b';
      ctx.beginPath();
      ctx.arc(activeMatch.aimX * width / 100, activeMatch.aimY * height / 100, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function startCoachMode() {
    stopLoopOnly();
    loopTimer = setInterval(() => {
      if (!activeMatch || activeMatch.mode !== 'tecnico' || activeMatch.paused) return;

      activeMatch.minute += rand(3, 6);
      activeMatch.ballX = clamp(activeMatch.ballX + rand(-18, 18), 5, 95);
      activeMatch.ballY = clamp(activeMatch.ballY + rand(-22, 22), 8, 92);

      const fixture = currentMatchFixture();
      const isHome = fixture.home === state.user.teamId;
      const opponent = isHome ? fixture.away : fixture.home;
      let chance = 0.22 + (strength(state.user.teamId) + activeMatch.boost - strength(opponent)) / 260;

      if (state.tactics.mentality === 'Ofensiva') chance += 0.04;
      if (state.tactics.mentality === 'Defensiva') chance -= 0.02;

      activeMatch.stats.possession = clamp(activeMatch.stats.possession + (state.tactics.mentality === 'Ofensiva' ? 1 : state.tactics.mentality === 'Defensiva' ? -1 : 0), 35, 65);

      if (Math.random() < 0.38) {
        if (Math.random() < chance) {
          isHome ? activeMatch.homeGoals++ : activeMatch.awayGoals++;
          activeMatch.stats.shotsFor++;
          activeMatch.log.push(`${Math.floor(activeMatch.minute)}' GOOOL do ${team().name}!`);
        } else if (Math.random() < 0.36) {
          isHome ? activeMatch.awayGoals++ : activeMatch.homeGoals++;
          activeMatch.stats.shotsAgainst++;
          activeMatch.log.push(`${Math.floor(activeMatch.minute)}' Gol do adversário.`);
        } else {
          activeMatch.log.push(`${Math.floor(activeMatch.minute)}' Ajuste tático segurou uma chance perigosa.`);
        }
      }

      if (activeMatch.minute >= 90) finishMatch();
      else renderMatchShell();
    }, 750);
  }

  function handleMoment(action) {
    const career = state.career;
    const fixture = currentMatchFixture();
    const isHome = fixture.home === state.user.teamId;

    const aimPenalty = Math.abs(activeMatch.aimY - 50) / 180;
    let probability = 0.4 + career.skills.Finalização / 240 + career.energy / 650 - aimPenalty;

    if (action === 'pass') probability = 0.42 + career.skills.Passe / 230;
    if (action === 'dribble') probability = 0.35 + career.skills.Drible / 230;
    if (action === 'defend') probability = 0.42 + career.skills.Defesa / 220;

    const success = Math.random() < probability;
    activeMatch.minute = clamp(activeMatch.minute + rand(8, 17), 1, 90);

    if (success) {
      if (action === 'defend') {
        activeMatch.log.push(`${activeMatch.minute}' Defesa decisiva do Boleiro.`);
      } else {
        isHome ? activeMatch.homeGoals++ : activeMatch.awayGoals++;
        activeMatch.stats.shotsFor++;
        career.goals++;
        activeMatch.log.push(`${activeMatch.minute}' Lance perfeito. Gol do Boleiro!`);
      }
    } else {
      if (action === 'defend') {
        isHome ? activeMatch.awayGoals++ : activeMatch.homeGoals++;
        activeMatch.stats.shotsAgainst++;
        activeMatch.log.push(`${activeMatch.minute}' Não conseguiu cortar. Gol deles.`);
      } else {
        activeMatch.log.push(`${activeMatch.minute}' Tentou ${action}, mas errou.`);
      }
    }

    career.energy = clamp(career.energy - rand(3, 8));
    activeMatch.moments++;

    if (activeMatch.minute >= 90 || activeMatch.moments >= 7) finishMatch();
    else renderMatchShell();
  }

  function startFullMode() {
    stopLoopOnly();
    const fixture = currentMatchFixture();
    const userSide = fixture.home === state.user.teamId ? 'home' : 'away';
    const layout = [
      [6,38,'GOL'], [25,10,'LE'], [25,29,'ZAG'], [25,47,'ZAG'], [25,66,'LD'],
      [50,17,'MC'], [50,38,'VOL'], [50,59,'MC'], [79,15,'PE'], [84,38,'ATA'], [79,61,'PD']
    ];

    function buildSide(side, teamId) {
      const selected = squad(teamId).slice().sort((a, b) => Number(b.starter) - Number(a.starter) || b.overall - a.overall).slice(0, 11);
      return layout.map((spot, index) => {
        const player = selected[index] || { name: 'Jogador ' + (index + 1), pos: spot[2], overall: 60, star: false };
        const baseX = side === 'home' ? spot[0] : 120 - spot[0];
        return {
          x: baseX, y: spot[1], baseX: baseX, baseY: spot[1],
          vx: 0, vy: 0, side: side, index: index, role: spot[2],
          name: player.name, overall: player.overall || 60, star: Boolean(player.star),
          decision: Math.random() * 1.2
        };
      });
    }

    const home = buildSide('home', fixture.home);
    const away = buildSide('away', fixture.away);
    const userPlayers = userSide === 'home' ? home : away;
    let userIndex = userPlayers.findIndex(player => player.star);
    if (userIndex < 0) userIndex = 9;

    activeMatch.full = {
      ready: false,
      home: home,
      away: away,
      userSide: userSide,
      userIndex: userIndex,
      stamina: Math.max(45, state.career.energy),
      rating: 6,
      feedback: 'Mantenha sua posição e participe da jogada.',
      feedbackTimer: 0,
      positionTimer: 0,
      targetX: null,
      targetY: null,
      callForPass: false,
      lastTime: 0,
      halfHandled: false,
      deadFor: 0,
      banner: '',
      bannerFor: 0,
      possessionHome: 0,
      possessionAway: 0,
      ball: { x: 60, y: 38, vx: 0, vy: 0, owner: { side: 'home', index: 9 }, target: null, shot: false },
      lastTouch: { side: 'home', index: 9 },
      lastPasser: null,
      camera: { left: 17, top: 14, viewW: 86, viewH: 48 }
    };

    renderMatchShell();
  }

  function fullPlayer(side, index) {
    if (!activeMatch?.full) return null;
    return activeMatch.full[side]?.[index] || null;
  }

  function fullUser() {
    const full = activeMatch.full;
    return fullPlayer(full.userSide, full.userIndex);
  }

  function floatClamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distanceBetween(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function moveTowards(player, x, y, speed, dt) {
    const dx = x - player.x;
    const dy = y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.05) return;
    const amount = Math.min(distance, speed * dt);
    player.vx = dx / distance * speed;
    player.vy = dy / distance * speed;
    player.x += dx / distance * amount;
    player.y += dy / distance * amount;
    player.x = floatClamp(player.x, 1.5, 118.5);
    player.y = floatClamp(player.y, 2, 74);
  }

  function possessionPlayer() {
    const owner = activeMatch.full.ball.owner;
    return owner ? fullPlayer(owner.side, owner.index) : null;
  }

  function nearestPlayer(side, point, excludeGoalkeeper) {
    let best = null;
    let bestDistance = Infinity;
    activeMatch.full[side].forEach((player, index) => {
      if (excludeGoalkeeper && index === 0) return;
      const distance = distanceBetween(player, point);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = player;
      }
    });
    return best;
  }

  function givePossession(player) {
    const full = activeMatch.full;
    full.ball.owner = { side: player.side, index: player.index };
    full.ball.target = null;
    full.ball.shot = false;
    full.ball.vx = 0;
    full.ball.vy = 0;
    full.lastTouch = { side: player.side, index: player.index };
  }

  function releaseBall(player, targetX, targetY, speed, target, shot) {
    const full = activeMatch.full;
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const distance = Math.max(0.1, Math.hypot(dx, dy));
    full.ball.owner = null;
    full.ball.x = player.x;
    full.ball.y = player.y;
    full.ball.vx = dx / distance * speed;
    full.ball.vy = dy / distance * speed;
    full.ball.target = target || null;
    full.ball.shot = Boolean(shot);
    full.lastTouch = { side: player.side, index: player.index };
  }

  function choosePassTarget(player, cross) {
    const full = activeMatch.full;
    const direction = player.side === 'home' ? 1 : -1;
    const mates = full[player.side].filter(mate => mate.index !== player.index && mate.index !== 0);
    if (full.callForPass && player.side === full.userSide) {
      const user = fullUser();
      if (distanceBetween(player, user) < 36) {
        full.callForPass = false;
        return user;
      }
    }
    return mates.sort((a, b) => {
      const aForward = direction * (a.x - player.x);
      const bForward = direction * (b.x - player.x);
      const aScore = (cross ? Math.abs(a.y - 38) * -0.2 : 0) + aForward * 1.4 - Math.abs(a.y - player.y) * 0.35 - distanceBetween(player, a) * 0.12;
      const bScore = (cross ? Math.abs(b.y - 38) * -0.2 : 0) + bForward * 1.4 - Math.abs(b.y - player.y) * 0.35 - distanceBetween(player, b) * 0.12;
      return bScore - aScore;
    })[0];
  }

  function passBall(player, target, speed) {
    if (!target) return;
    activeMatch.full.lastPasser = { side: player.side, index: player.index };
    releaseBall(player, target.x, target.y, speed, { side: target.side, index: target.index }, false);
  }

  function shootBall(player, isUser) {
    const direction = player.side === 'home' ? 1 : -1;
    const skill = isUser ? state.career.skills.Finalização : player.overall;
    const spread = (100 - skill) / 11;
    const targetY = 38 + (Math.random() - 0.5) * spread;
    releaseBall(player, direction > 0 ? 124 : -4, targetY, 37 + skill / 12, null, true);
    activeMatch.stats.shotsFor += player.side === activeMatch.full.userSide ? 1 : 0;
    activeMatch.stats.shotsAgainst += player.side !== activeMatch.full.userSide ? 1 : 0;
    activeMatch.full.lastPasser = null;
    if (isUser) {
      activeMatch.full.feedback = 'Finalização!';
      activeMatch.full.rating = floatClamp(activeMatch.full.rating + 0.08, 4, 10);
    }
  }

  function resetAfterGoal(concedingSide) {
    const full = activeMatch.full;
    full.home.forEach(player => { player.x = player.baseX; player.y = player.baseY; });
    full.away.forEach(player => { player.x = player.baseX; player.y = player.baseY; });
    full.ball.x = 60;
    full.ball.y = 38;
    full.ball.vx = 0;
    full.ball.vy = 0;
    full.ball.owner = null;
    full.ball.target = null;
    full.deadFor = 1.4;
    full.kickoffSide = concedingSide;
  }

  function scoreFullGoal(scoringSide) {
    const full = activeMatch.full;
    const fixture = currentMatchFixture();
    const scoringIsHome = scoringSide === 'home';
    if (scoringIsHome) activeMatch.homeGoals++;
    else activeMatch.awayGoals++;

    const userTouched = full.lastTouch && full.lastTouch.side === full.userSide && full.lastTouch.index === full.userIndex;
    const userPassed = full.lastPasser && full.lastPasser.side === full.userSide && full.lastPasser.index === full.userIndex;
    const userTeamScored = scoringSide === full.userSide;

    if (userTeamScored && userTouched) {
      state.career.goals++;
      full.rating = floatClamp(full.rating + 1, 4, 10);
      full.banner = 'GOOOL DO BOLEIRO!';
      activeMatch.log.push(Math.floor(activeMatch.minute) + "' Gol de " + state.career.name + '!');
    } else if (userTeamScored && userPassed) {
      state.career.assists++;
      full.rating = floatClamp(full.rating + 0.65, 4, 10);
      full.banner = 'GOL! ASSISTÊNCIA SUA';
      activeMatch.log.push(Math.floor(activeMatch.minute) + "' Assistência de " + state.career.name + '.');
    } else {
      full.banner = userTeamScored ? 'GOOOL!' : 'GOL DO ADVERSÁRIO';
      activeMatch.log.push(Math.floor(activeMatch.minute) + "' " + (userTeamScored ? 'Gol do nosso time.' : 'Gol do adversário.'));
      full.rating = floatClamp(full.rating + (userTeamScored ? 0.12 : -0.08), 4, 10);
    }

    full.feedback = full.banner;
    full.bannerFor = 1.4;
    refreshFullHud();
    resetAfterGoal(scoringSide === 'home' ? 'away' : 'home');
  }

  function updateFreeBall(dt) {
    const full = activeMatch.full;
    const ball = full.ball;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.vx *= Math.pow(0.985, dt * 60);
    ball.vy *= Math.pow(0.985, dt * 60);

    if (ball.target) {
      const target = fullPlayer(ball.target.side, ball.target.index);
      if (target && distanceBetween(ball, target) < 2.4) {
        givePossession(target);
        return;
      }
    }

    const closestHome = nearestPlayer('home', ball, false);
    const closestAway = nearestPlayer('away', ball, false);
    const homeDistance = closestHome ? distanceBetween(closestHome, ball) : 99;
    const awayDistance = closestAway ? distanceBetween(closestAway, ball) : 99;
    if (Math.min(homeDistance, awayDistance) < 1.35 && !ball.shot) {
      givePossession(homeDistance < awayDistance ? closestHome : closestAway);
      return;
    }

    if ((ball.x > 120 || ball.x < 0) && ball.y > 31 && ball.y < 45) {
      scoreFullGoal(ball.x > 120 ? 'home' : 'away');
      return;
    }

    if (ball.x > 123 || ball.x < -3) {
      const defendingSide = ball.x > 120 ? 'away' : 'home';
      givePossession(full[defendingSide][0]);
      full.ball.x = defendingSide === 'away' ? 116 : 4;
      full.ball.y = 38;
      full.feedback = 'Tiro de meta.';
    }

    if (ball.y < 0 || ball.y > 76) {
      ball.y = floatClamp(ball.y, 1, 75);
      ball.vy *= -0.45;
      full.feedback = 'A bola saiu pela lateral.';
    }
  }

  function updateUser(dt) {
    const full = activeMatch.full;
    const user = fullUser();
    let dx = 0;
    let dy = 0;
    if (keys.left || keys.ArrowLeft || keys.a) dx--;
    if (keys.right || keys.ArrowRight || keys.d) dx++;
    if (keys.up || keys.ArrowUp || keys.w) dy--;
    if (keys.down || keys.ArrowDown || keys.s) dy++;

    const usingKeys = dx || dy;
    if (!usingKeys && full.targetX !== null && full.targetY !== null) {
      dx = full.targetX - user.x;
      dy = full.targetY - user.y;
      if (Math.hypot(dx, dy) < 1) {
        full.targetX = null;
        full.targetY = null;
        dx = 0;
        dy = 0;
      }
    }

    if (dx || dy) {
      const distance = Math.max(0.1, Math.hypot(dx, dy));
      const energyFactor = 0.62 + full.stamina / 260;
      const speed = (7.2 + state.career.skills.Velocidade / 18) * energyFactor;
      user.x += dx / distance * speed * dt;
      user.y += dy / distance * speed * dt;
      user.x = floatClamp(user.x, 1.5, 118.5);
      user.y = floatClamp(user.y, 2, 74);
      user.vx = dx / distance * speed;
      user.vy = dy / distance * speed;
      full.stamina = floatClamp(full.stamina - 1.25 * dt, 0, 100);
    } else {
      user.vx *= 0.8;
      user.vy *= 0.8;
      full.stamina = floatClamp(full.stamina + 0.28 * dt, 0, 100);
    }

    full.positionTimer += dt;
    if (full.positionTimer > 5.5) {
      full.positionTimer = 0;
      const ballShift = (full.ball.x - 60) * 0.18;
      const preferredX = floatClamp(user.baseX + ballShift, 10, 110);
      const preferredY = floatClamp(user.baseY + (full.ball.y - 38) * 0.12, 6, 70);
      const positionalDistance = Math.hypot(user.x - preferredX, user.y - preferredY);
      if (positionalDistance < 12) {
        full.feedback = 'Bom posicionamento!';
        full.rating = floatClamp(full.rating + 0.04, 4, 10);
      } else {
        full.feedback = 'Volte para sua posição.';
        full.rating = floatClamp(full.rating - 0.025, 4, 10);
      }
    }
  }

  function updateAI(dt) {
    const full = activeMatch.full;
    const owner = possessionPlayer();
    const ownerSide = owner?.side || null;
    const ballPoint = owner || full.ball;
    const defendingSide = ownerSide === 'home' ? 'away' : ownerSide === 'away' ? 'home' : null;
    const chaser = defendingSide ? nearestPlayer(defendingSide, ballPoint, true) : null;

    ['home', 'away'].forEach(side => {
      const direction = side === 'home' ? 1 : -1;
      full[side].forEach(player => {
        const controlled = side === full.userSide && player.index === full.userIndex;
        if (controlled) return;

        player.decision -= dt;
        if (owner === player) {
          const distanceToGoal = direction > 0 ? 120 - player.x : player.x;
          moveTowards(player, player.x + direction * 10, 38 + (player.baseY - 38) * 0.35, 7.5, dt);
          if (distanceToGoal < 27 && player.decision <= 0) {
            shootBall(player, false);
            player.decision = 1.4;
          } else if (player.decision <= 0) {
            const target = choosePassTarget(player, false);
            if (target && (Math.random() < 0.68 || full.callForPass)) passBall(player, target, 24);
            player.decision = 0.8 + Math.random() * 1.3;
          }
          return;
        }

        let targetX = player.baseX + (full.ball.x - 60) * (side === ownerSide ? 0.28 : 0.18);
        let targetY = player.baseY + (full.ball.y - 38) * 0.18;

        if (player === chaser) {
          targetX = ballPoint.x;
          targetY = ballPoint.y;
        } else if (side === ownerSide && player.index > 4) {
          targetX += direction * 7;
        }

        moveTowards(player, floatClamp(targetX, 3, 117), floatClamp(targetY, 3, 73), player.index === 0 ? 5.5 : 6.5 + player.overall / 35, dt);
      });
    });

    const currentOwner = possessionPlayer();
    if (currentOwner) {
      const opponentSide = currentOwner.side === 'home' ? 'away' : 'home';
      const tackler = nearestPlayer(opponentSide, currentOwner, true);
      if (tackler && distanceBetween(tackler, currentOwner) < 1.7 && Math.random() < dt * 0.34) {
        givePossession(tackler);
        if (tackler.side === full.userSide) activeMatch.stats.tackles++;
      }
    }
  }

  function updateFullCamera(width, height) {
    const full = activeMatch.full;
    const user = fullUser();
    const focusX = full.ball.x * 0.62 + user.x * 0.38;
    const focusY = full.ball.y * 0.62 + user.y * 0.38;
    const viewW = 84;
    const viewH = viewW * height / width;
    const wantedLeft = floatClamp(focusX - viewW / 2, -4, 124 - viewW);
    const wantedTop = floatClamp(focusY - viewH / 2, -3, 79 - viewH);
    full.camera.left += (wantedLeft - full.camera.left) * 0.08;
    full.camera.top += (wantedTop - full.camera.top) * 0.08;
    full.camera.viewW = viewW;
    full.camera.viewH = viewH;
  }

  function refreshFullHud() {
    if (!activeMatch?.full) return;
    const fixture = currentMatchFixture();
    const title = box.querySelector('.modalHead h2');
    const subtitle = box.querySelector('.modalHead .mut');
    const rating = box.querySelector('[data-full-rating]');
    const stamina = box.querySelector('[data-full-stamina]');
    const feedback = box.querySelector('[data-full-feedback]');
    if (title) title.textContent = team(fixture.home).name + ' ' + activeMatch.homeGoals + ' x ' + activeMatch.awayGoals + ' ' + team(fixture.away).name;
    if (subtitle) subtitle.textContent = fixture.competition + ' • ' + Math.floor(activeMatch.minute) + "' • Completo";
    if (rating) rating.textContent = activeMatch.full.rating.toFixed(1).replace('.', ',');
    if (stamina) stamina.textContent = Math.round(activeMatch.full.stamina) + '%';
    if (feedback) feedback.textContent = activeMatch.full.feedback;
  }

  function drawFullMode(ctx, width, height) {
    const full = activeMatch.full;
    updateFullCamera(width, height);
    const camera = full.camera;
    const sx = x => (x - camera.left) / camera.viewW * width;
    const sy = y => (y - camera.top) / camera.viewH * height;
    const scaleX = width / camera.viewW;
    const scaleY = height / camera.viewH;

    ctx.fillStyle = '#2c921f';
    ctx.fillRect(0, 0, width, height);
    for (let stripe = -2; stripe < 16; stripe++) {
      ctx.fillStyle = stripe % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.035)';
      ctx.fillRect(sx(stripe * 10), 0, 10 * scaleX, height);
    }

    ctx.strokeStyle = 'rgba(255,255,255,.86)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx(0), sy(0), 120 * scaleX, 76 * scaleY);
    ctx.beginPath();
    ctx.moveTo(sx(60), sy(0));
    ctx.lineTo(sx(60), sy(76));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx(60), sy(38), 9.15 * scaleX, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(sx(0), sy(18), 18 * scaleX, 40 * scaleY);
    ctx.strokeRect(sx(102), sy(18), 18 * scaleX, 40 * scaleY);
    ctx.strokeRect(sx(0), sy(30), 6 * scaleX, 16 * scaleY);
    ctx.strokeRect(sx(114), sy(30), 6 * scaleX, 16 * scaleY);

    function drawPlayer(player, color, shorts) {
      const x = sx(player.x);
      const y = sy(player.y);
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.beginPath();
      ctx.ellipse(x + 3, y + 6, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shorts;
      ctx.fillRect(x - 7, y + 4, 14, 6);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(String(player.index + 1), x, y + 3);
    }

    full.home.forEach(player => drawPlayer(player, '#176fdb', '#f2f6ff'));
    full.away.forEach(player => drawPlayer(player, '#e33b32', '#201c24'));

    const user = fullUser();
    const ux = sx(user.x);
    const uy = sy(user.y);
    ctx.strokeStyle = '#dbff6b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ux, uy, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#dbff6b';
    ctx.beginPath();
    ctx.moveTo(ux, uy - 24);
    ctx.lineTo(ux - 7, uy - 34);
    ctx.lineTo(ux + 7, uy - 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.65)';
    ctx.fillRect(ux - 18, uy - 46, 36, 5);
    ctx.fillStyle = full.stamina > 30 ? '#dbff6b' : '#ff6b6b';
    ctx.fillRect(ux - 18, uy - 46, 36 * full.stamina / 100, 5);

    const ballX = sx(full.ball.x);
    const ballY = sy(full.ball.y);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.arc(ballX + 3, ballY + 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ballX, ballY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(5,18,9,.82)';
    ctx.fillRect(14, 14, 230, 52);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px system-ui';
    ctx.fillText(activeMatch.homeGoals + '  ' + team(currentMatchFixture().home).name.slice(0, 11), 26, 35);
    ctx.fillText(activeMatch.awayGoals + '  ' + team(currentMatchFixture().away).name.slice(0, 11), 26, 56);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#dbff6b';
    ctx.fillText(Math.floor(activeMatch.minute) + "'", 231, 47);

    if (full.bannerFor > 0) {
      ctx.fillStyle = 'rgba(4,16,8,.78)';
      ctx.fillRect(0, height / 2 - 48, width, 96);
      ctx.fillStyle = '#dbff6b';
      ctx.font = '900 42px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(full.banner, width / 2, height / 2 + 14);
    }

    const mapW = 150;
    const mapH = 82;
    const mapX = width - mapW - 14;
    const mapY = 14;
    ctx.fillStyle = 'rgba(4,16,8,.72)';
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.strokeRect(mapX + 4, mapY + 4, mapW - 8, mapH - 8);
    full.home.forEach(player => { ctx.fillStyle = '#69a8ff'; ctx.fillRect(mapX + 4 + player.x / 120 * (mapW - 8) - 2, mapY + 4 + player.y / 76 * (mapH - 8) - 2, 4, 4); });
    full.away.forEach(player => { ctx.fillStyle = '#ff766f'; ctx.fillRect(mapX + 4 + player.x / 120 * (mapW - 8) - 2, mapY + 4 + player.y / 76 * (mapH - 8) - 2, 4, 4); });
    ctx.fillStyle = '#fff';
    ctx.fillRect(mapX + 4 + full.ball.x / 120 * (mapW - 8) - 2, mapY + 4 + full.ball.y / 76 * (mapH - 8) - 2, 5, 5);
  }

  function fullLoop(timestamp) {
    if (!activeMatch || activeMatch.mode !== 'completo' || !activeMatch.full?.ready) return;
    const full = activeMatch.full;
    if (!full.lastTime) full.lastTime = timestamp || performance.now();
    const now = timestamp || performance.now();
    const dt = Math.min(0.035, Math.max(0.001, (now - full.lastTime) / 1000));
    full.lastTime = now;

    if (!activeMatch.paused) {
      if (full.deadFor > 0) {
        full.deadFor -= dt;
        if (full.deadFor <= 0) givePossession(full[full.kickoffSide][9]);
      } else {
        updateUser(dt);
        updateAI(dt);
        if (full.ball.owner) {
          const owner = possessionPlayer();
          full.ball.x = owner.x;
          full.ball.y = owner.y;
          full.ball.owner.side === 'home' ? full.possessionHome += dt : full.possessionAway += dt;
        } else {
          updateFreeBall(dt);
        }
      }

      if (full.bannerFor > 0) full.bannerFor -= dt;
      activeMatch.minute += dt * 0.52;
      const totalPossession = full.possessionHome + full.possessionAway;
      if (totalPossession > 0) {
        const userPossession = full.userSide === 'home' ? full.possessionHome : full.possessionAway;
        activeMatch.stats.possession = clamp(userPossession / totalPossession * 100, 1, 99);
      }

      full.feedbackTimer += dt;
      if (full.feedbackTimer > 0.25) {
        full.feedbackTimer = 0;
        refreshFullHud();
      }

      if (activeMatch.minute >= 90) {
        finishMatch();
        return;
      }
    }

    drawMatch();
    frameHandle = requestAnimationFrame(fullLoop);
  }

  function fullAction(action) {
    if (!activeMatch || activeMatch.mode !== 'completo' || !activeMatch.full?.ready || activeMatch.paused) return;
    const full = activeMatch.full;
    const user = fullUser();
    const owner = possessionPlayer();
    const userHasBall = owner === user;

    if (action === 'tackle') {
      if (userHasBall) {
        full.feedback = 'Você já está com a bola.';
        return refreshFullHud();
      }
      if (owner && owner.side !== full.userSide && distanceBetween(user, owner) < 3.2) {
        const chance = 0.38 + state.career.skills.Defesa / 180;
        if (Math.random() < chance) {
          givePossession(user);
          activeMatch.stats.tackles++;
          full.rating = floatClamp(full.rating + 0.18, 4, 10);
          full.feedback = 'Desarme limpo!';
          activeMatch.log.push(Math.floor(activeMatch.minute) + "' Desarme de " + state.career.name + '.');
        } else {
          full.stamina = floatClamp(full.stamina - 4, 0, 100);
          full.rating = floatClamp(full.rating - 0.08, 4, 10);
          full.feedback = 'Carrinho atrasado. Falta.';
        }
      } else {
        full.feedback = 'Chegue mais perto para desarmar.';
      }
      return refreshFullHud();
    }

    if (!userHasBall) {
      if (action === 'pass') {
        full.callForPass = true;
        full.feedback = 'Você pediu a bola.';
      } else {
        full.feedback = 'Você está sem a bola.';
      }
      return refreshFullHud();
    }

    if (action === 'shoot') {
      shootBall(user, true);
      full.stamina = floatClamp(full.stamina - 3, 0, 100);
    }

    if (action === 'pass') {
      const target = choosePassTarget(user, false);
      passBall(user, target, 27 + state.career.skills.Passe / 14);
      full.feedback = target ? 'Passe para ' + target.name + '.' : 'Sem opção de passe.';
      if (target) full.rating = floatClamp(full.rating + 0.03, 4, 10);
    }

    if (action === 'cross') {
      const target = choosePassTarget(user, true);
      passBall(user, target, 30 + state.career.skills.Passe / 15);
      full.feedback = target ? 'Cruzamento para a área.' : 'Sem opção para cruzar.';
      full.stamina = floatClamp(full.stamina - 2, 0, 100);
    }

    refreshFullHud();
  }

  function finishMatch() {
    stopMatchTimers();

    const fixture = currentMatchFixture();
    const homeGoals = activeMatch.homeGoals;
    const awayGoals = activeMatch.awayGoals;

    applyResult(fixture, homeGoals, awayGoals);

    currentRound()
      .filter(item => !item.done && item.id !== fixture.id)
      .forEach(item => {
        const result = simulateScore(item.home, item.away);
        applyResult(item, result[0], result[1]);
      });

    const isHome = fixture.home === state.user.teamId;
    const goalsFor = isHome ? homeGoals : awayGoals;
    const goalsAgainst = isHome ? awayGoals : homeGoals;
    const win = goalsFor > goalsAgainst;
    const draw = goalsFor === goalsAgainst;
    const attendanceIncome = isHome ? Math.round(team().fans * state.finance.ticket * (win ? 0.48 : draw ? 0.38 : 0.28)) : 0;
    const weeklyBalance = Math.round(state.finance.sponsor / 6 + state.finance.merch / 8 - wageBill() / 2 + attendanceIncome);

    state.finance.balance += weeklyBalance;
    state.career.matches++;
    state.career.energy = clamp(state.career.energy - rand(5, 10));
    state.career.happiness = clamp(state.career.happiness + (win ? 5 : draw ? 1 : -4));
    state.week++;
    state.phase = 'pós-jogo';
    state.preparation = { training: false, lineup: false, tactics: false, market: false };
    state.news.push(`${team(fixture.home).name} ${homeGoals} x ${awayGoals} ${team(fixture.away).name}. ${fixture.competition}. Saldo da semana: ${money(weeklyBalance)}.`);

    const summary = `
      <div class="modalHead">
        <h2>Pós-jogo</h2>
        <button data-close="1">Fechar</button>
      </div>
      <div class="score">${team(fixture.home).name} ${homeGoals} x ${awayGoals} ${team(fixture.away).name}</div>
      <p class="mut center">${fixture.competition}</p>
      <div class="g3">
        <div class="card">Renda<div class="big">${money(attendanceIncome)}</div></div>
        <div class="card">Saldo semana<div class="big">${money(weeklyBalance)}</div></div>
        <div class="card">Posição<div class="big">${standingPosition()}º</div></div>
      </div>
      <div class="actionbar stickyCta">
        <button class="pri wide" data-close="1">Continuar</button>
      </div>`;

    activeMatch = null;
    box.innerHTML = summary;
    render();
  }

  function stopLoopOnly() {
    clearInterval(loopTimer);
    cancelAnimationFrame(frameHandle);
  }

  function stopMatchTimers() {
    clearInterval(loopTimer);
    cancelAnimationFrame(frameHandle);
  }

  function train(silent = false) {
    const intensity = state.training.intensity;
    const rest = state.training.rest;

    squad().forEach(player => {
      const development = (intensity - 45) / 18 + (team().training - 1) * 0.25 + rand(-1, 2);
      if (player.age < 24 && Math.random() < 0.28) player.overall = clamp(player.overall + Math.max(0, development), 1, player.potential);
      player.form = clamp(player.form + (intensity - 45) / 20 + rand(-2, 3));
      player.fitness = clamp(player.fitness - intensity / 26 + rest / 20);
      if (player.injury) player.injury--;
    });

    const skills = state.career.skills;
    const focus = state.training.individual;
    if (focus === 'Ataque') skills.Finalização = clamp(skills.Finalização + 1);
    if (focus === 'Passe') skills.Passe = clamp(skills.Passe + 1);
    if (focus === 'Drible') skills.Drible = clamp(skills.Drible + 1);
    if (focus === 'Velocidade') skills.Velocidade = clamp(skills.Velocidade + 1);
    if (focus === 'Defesa') skills.Defesa = clamp(skills.Defesa + 1);

    state.career.energy = clamp(state.career.energy + (rest - 35) / 4 - (intensity - 50) / 8);
    state.preparation.training = true;
    if (!silent) showToast('Treino aplicado');
  }

  function autoLineup() {
    squad().forEach(player => player.starter = false);
    squad()
      .filter(player => !player.injury && !player.suspended)
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 11)
      .forEach(player => player.starter = true);
    state.preparation.lineup = true;
    render();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button,.modeCard');
    if (!button) return;
    const data = button.dataset;

    if (data.start === 'new') return renderSetup();
    if (data.start === 'continue') { state = load(); return render(); }
    if (data.start === 'demo') { state = newGame(); return render(); }
    if (data.start === 'back') { state = null; return render(); }
    if (data.start === 'create') { state = newGame({ coach: $('#coach').value, teamId: $('#clubSelect').value, difficulty: $('#difficulty').value }); return render(); }
    if (data.start === 'how') {
      modal.classList.add('open');
      box.innerHTML = `
        <div class="modalHead"><h2>Como jogar</h2><button data-close="1">Fechar</button></div>
        <div class="grid">
          <div class="card"><h3>1. Escolha o clube</h3><p class="mut">Por divisão, ordem alfabética e busca.</p></div>
          <div class="card"><h3>2. Prepare</h3><p class="mut">Treino, escalação, tática e mercado.</p></div>
          <div class="card"><h3>3. Jogue</h3><p class="mut">Escolha Técnico para comandar ou Completo para controlar o Boleiro.</p></div>
          <div class="card"><h3>4. Evolua</h3><p class="mut">Finanças, carreira e competições.</p></div>
        </div>`;
      return;
    }

    if (!state) return;

    if (data.view) { view = data.view; return render(); }
    if (data.action === 'match') return openMatch();
    if (data.action === 'autoLineup') return autoLineup();
    if (data.action === 'train') { train(); return render(); }
    if (data.action === 'scout') {
      const cost = 120000;
      if (state.finance.balance < cost) return showToast('Saldo insuficiente');
      state.finance.balance -= cost;
      state.market.push(...Array.from({ length: 6 }, (_, i) => createPlayer(i, 'market', rand(56, 82))));
      state.preparation.market = true;
      return render();
    }
    if (data.action === 'save') { save(); return showToast('Salvo'); }
    if (data.action === 'export') { $('#saveBox').value = JSON.stringify(state, null, 2); return; }
    if (data.action === 'import') {
      try {
        state = migrate(JSON.parse($('#saveBox').value));
        save();
        return render();
      } catch {
        return showToast('Save inválido');
      }
    }
    if (data.action === 'reset' && confirm('Resetar jogo?')) {
      localStorage.removeItem(SAVE_KEY);
      state = null;
      return render();
    }

    if (data.mode) {
      state.matchMode = data.mode === 'completo' ? 'completo' : 'tecnico';
      if (!activeMatch) return render();
    }

    if (data.player) return openPlayer(data.player);
    if (data.competition) return openCompetition(data.competition);

    if (data.buy) {
      const player = state.market.find(item => item.id === data.buy);
      if (!player) return;
      if (state.finance.balance < player.value) return showToast('Saldo insuficiente');
      state.finance.balance -= player.value;
      player.teamId = state.user.teamId;
      state.players.push(player);
      state.market = state.market.filter(item => item.id !== player.id);
      state.preparation.market = true;
      return render();
    }

    if (data.sell) {
      const player = state.players.find(item => item.id === data.sell);
      if (!player) return;
      if (player.star) return showToast('Não dá para vender o Boleiro');
      state.finance.balance += player.value;
      state.players = state.players.filter(item => item.id !== player.id);
      return render();
    }

    if (data.life) {
      const career = state.career;
      if (data.life === 'rest') career.energy = clamp(career.energy + 18);
      if (data.life === 'boot' && career.cash >= 500) { career.cash -= 500; career.skills.Finalização = clamp(career.skills.Finalização + 2); }
      if (data.life === 'media') { career.fame = clamp(career.fame + 4); career.relationships.Mídia = clamp(career.relationships.Mídia + 8); }
      if (data.life === 'night') { career.happiness = clamp(career.happiness + 12); career.energy = clamp(career.energy - 16); }
      return render();
    }

    if (data.close) {
      stopMatchTimers();
      box.classList.remove('completeMatch');
      modal.classList.remove('open');
      return render();
    }

    if (data.switchMode && activeMatch) {
      stopLoopOnly();
      activeMatch.mode = data.switchMode;
      activeMatch.full = null;
      renderMatchShell();
      if (activeMatch.mode === 'tecnico') startCoachMode();
      if (activeMatch.mode === 'completo') startFullMode();
      return;
    }

    if (data.match === 'kickoff' && activeMatch?.mode === 'completo' && activeMatch.full) {
      activeMatch.full.ready = true;
      activeMatch.full.lastTime = performance.now();
      activeMatch.log.push('Apito inicial. Você controla apenas o Boleiro.');
      renderMatchShell();
      fullLoop();
      return;
    }

    if (data.match === 'pause' && activeMatch) {
      activeMatch.paused = !activeMatch.paused;
      renderMatchShell();
      return showToast(activeMatch.paused ? 'Pausado' : 'Rodando');
    }

    if (data.match === 'finish' && activeMatch) return finishMatch();

    if (data.coach && activeMatch) {
      if (data.coach === 'sub') {
        activeMatch.boost += 2;
        activeMatch.log.push(`${Math.floor(activeMatch.minute)}' Substituição feita. Time ganhou fôlego.`);
      } else {
        state.tactics.mentality = data.coach;
        activeMatch.log.push(`${Math.floor(activeMatch.minute)}' Técnico mudou para ${data.coach}.`);
      }
      return renderMatchShell();
    }

    if (data.full && activeMatch) return fullAction(data.full);
  });

  document.addEventListener('change', event => {
    const input = event.target;

    if (input.id === 'clubSelect') return updateClubPreview();
    if (!state) return;

    if (input.dataset.starter) {
      const player = state.players.find(item => item.id === input.dataset.starter);
      player.starter = input.checked;
      if (starters().length > 11) {
        player.starter = false;
        showToast('Máximo de 11 titulares');
      }
      state.preparation.lineup = true;
      return render();
    }

    if (input.dataset.tactic) {
      state.tactics[input.dataset.tactic] = input.value;
      state.preparation.tactics = true;
      return render();
    }

    if (input.dataset.training) {
      state.training[input.dataset.training] = input.value;
      state.preparation.training = true;
      return render();
    }

    if (input.dataset.filter === 'position') {
      state.filters.position = input.value;
      return render();
    }

    if (input.dataset.finance) {
      state.finance[input.dataset.finance] = Number(input.value) || state.finance[input.dataset.finance];
      return save();
    }
  });

  document.addEventListener('input', event => {
    const input = event.target;

    if (input.id === 'teamSearch') return filterTeams();
    if (!state || !input.dataset.slider) return;

    const scope = input.dataset.scope;
    const key = input.dataset.slider;

    if (scope === 'tactics') {
      state.tactics[key] = Number(input.value);
      state.preparation.tactics = true;
    } else {
      state.training[key] = Number(input.value);
      state.preparation.training = true;
    }

    render();
  });

  document.addEventListener('pointerdown', event => {
    const holdButton = event.target.closest('[data-hold]');
    if (holdButton) {
      keys[holdButton.dataset.hold] = true;
      return;
    }

    const canvas = event.target.closest('#cv');
    if (!canvas || !activeMatch) return;

    const rect = canvas.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width * 100);
    const y = clamp((event.clientY - rect.top) / rect.height * 100);

    if (activeMatch.mode === 'momentos') {
      activeMatch.aimX = x;
      activeMatch.aimY = y;
      drawMatch();
    }

    if (activeMatch.mode === 'completo' && activeMatch.full?.ready) {
      const camera = activeMatch.full.camera;
      activeMatch.full.targetX = camera.left + x / 100 * camera.viewW;
      activeMatch.full.targetY = camera.top + y / 100 * camera.viewH;
      drawMatch();
    }
  });

  document.addEventListener('pointerup', event => {
    const holdButton = event.target.closest('[data-hold]');
    if (holdButton) keys[holdButton.dataset.hold] = false;
  });

  document.addEventListener('pointercancel', () => {
    keys = Object.create(null);
  });

  document.addEventListener('keydown', event => {
    keys[event.key] = true;
    if (event.key === 'j') fullAction('shoot');
    if (event.key === 'k') fullAction('pass');
    if (event.key === 'l') fullAction('cross');
    if (event.key === 'i') fullAction('tackle');
  });

  document.addEventListener('keyup', event => {
    keys[event.key] = false;
  });

  state = load();
  render();
})();
