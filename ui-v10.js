window.BoleirosUI = (() => {
  const E = window.BoleirosEngine;
  const D = window.BoleirosData;
  const app = document.getElementById('app');
  const modal = document.getElementById('modal');
  const box = document.getElementById('box');
  const toast = document.getElementById('toast');
  let view = 'painel';

  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  const $ = (s, c = document) => c.querySelector(s);
  const menu = [['painel','Painel','Resumo'],['agenda','Agenda','Calendário'],['elenco','Elenco','Atletas'],['escala','Escalação','Onze'],['taticas','Táticas','Plano'],['treino','Treino','Evoluir'],['partida','Partida','Jogar'],['mercado','Mercado','Contratar'],['financas','Finanças','Caixa'],['competicoes','Competições','Torneios'],['database','Database','Clubes'],['carreira','Carreira','Boleiro'],['config','Config','Save']];

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function render() {
    const state = E.getState();
    E.save();
    app.innerHTML = state ? shell() : start();
  }

  function start() {
    const hasSave = Boolean(E.load());
    if (!hasSave) E.setState(null);
    return `<section class="hero"><div class="panel heroPanel"><div class="logo">B</div><h1>Boleiros</h1><p class="lead">Manager sul-americano com alma de Brasfoot, visual mobile-first e matchday com intervalo obrigatório, pausa, ajustes táticos e modo jogável.</p><div class="actionbar heroActions"><button class="pri" data-start="new">Novo jogo</button>${hasSave?'<button data-start="continue">Continuar campanha</button>':''}<button data-start="how">Como jogar</button><button data-start="demo">Demo rápida</button></div><div class="g4"><div class="card"><b>Brasfoot como base</b><p class="mut">Elenco, escalação, mercado, finanças, calendário e táticas.</p></div><div class="card"><b>Matchday premium</b><p class="mut">Campo maior, placar limpo, estatísticas e intervalo real.</p></div><div class="card"><b>Mobile sério</b><p class="mut">Botões grandes e ações previsíveis no lugar certo.</p></div><div class="card"><b>Campanha salva</b><p class="mut">Continua no mesmo navegador.</p></div></div></div></section>`;
  }

  function setupScreen() {
    const groups = {};
    D.teams.slice().sort((a,b)=>E.divOrder(a.div)-E.divOrder(b.div)||a.name.localeCompare(b.name,'pt-BR')).forEach(t => {
      const label = E.divLabel(t.div);
      (groups[label] ||= []).push(t);
    });
    app.innerHTML = `<section class="hero"><div class="panel setupPanel"><div class="pageHead"><div><h1 class="setupTitle">Criar carreira</h1><p class="lead">Escolha um clube por divisão. Tudo em ordem alfabética para não virar bagunça.</p></div><button data-start="back">Voltar</button></div><div class="grid setupGrid"><div class="card"><label>Nome do técnico</label><input id="coach" value="João"><div class="fieldBlock"><label>Buscar time</label><input id="teamSearch" placeholder="Nome, estado, país ou divisão"></div><div class="fieldBlock"><label>Clube por divisão</label><select id="clubSelect" size="13">${Object.entries(groups).map(([label,teams])=>`<optgroup label="${label}">${teams.map(teamOption).join('')}</optgroup>`).join('')}</select></div></div><div class="stack"><div id="clubPreview" class="card"></div><div class="card"><label>Dificuldade</label><select id="difficulty"><option>Normal</option><option>Fácil</option><option>Difícil</option></select><p class="mut">Comece com Série D para projeto longo ou Série A para brigar no topo.</p></div><div class="disc">Tudo aqui é fictício e independente. Sem escudos oficiais, uniformes oficiais ou nomes licenciados.</div><div class="actionbar stickyCta"><button class="pri wide" data-start="create">Começar temporada</button></div></div></div></div></section>`;
    updateClubPreview();
  }

  function teamOption(t) { return `<option value="${t.id}">${esc(t.name)} • ${t.state} • Rep ${t.rep}</option>`; }

  function updateClubPreview() {
    const id = $('#clubSelect')?.value || 'bolfc';
    const t = D.teams.find(x => x.id === id) || D.teams.find(x => x.id === 'bolfc') || D.teams[0];
    const el = $('#clubPreview');
    if (!el) return;
    el.innerHTML = `<div class="row"><div><span class="tag ok">${E.divLabel(t.div)}</span><h2>${esc(t.name)}</h2><p class="mut">${t.country} • ${t.state}</p></div><div class="badge">${t.rep}</div></div><div class="statGrid"><div><span>Reputação</span><b>${t.rep}</b></div><div><span>País</span><b>${t.country}</b></div><div><span>Estado</span><b>${t.state}</b></div></div><p class="mut">Calendário inicial com torneio local, liga nacional e torneio continental quando elegível.</p>`;
  }

  function filterTeams() {
    const query = ($('#teamSearch')?.value || '').toLowerCase();
    const select = $('#clubSelect');
    if (!select) return;
    const groups = {};
    D.teams.filter(t => `${t.name} ${t.country} ${t.state} ${E.divLabel(t.div)}`.toLowerCase().includes(query)).sort((a,b)=>E.divOrder(a.div)-E.divOrder(b.div)||a.name.localeCompare(b.name,'pt-BR')).forEach(t => {
      const label = E.divLabel(t.div);
      (groups[label] ||= []).push(t);
    });
    select.innerHTML = Object.keys(groups).length ? Object.entries(groups).map(([label,teams])=>`<optgroup label="${label}">${teams.map(teamOption).join('')}</optgroup>`).join('') : '<option disabled>Nenhum time encontrado</option>';
    updateClubPreview();
  }

  function shell() {
    const s = E.getState();
    return `<div class="shell"><aside class="side"><div class="brand"><div class="logo">B</div><div><h2>Boleiros</h2><p class="mut">${esc(E.team().name)} • ${E.team().country}</p></div></div><nav class="nav">${menu.map(([id,label,sub])=>`<button data-view="${id}" class="${view===id?'on':''}"><span>${label}</span><small>${sub}</small></button>`).join('')}</nav></aside><main class="main"><div class="pageHead"><div><h1>${pageTitle()}</h1><p class="mut">${pageSub()}</p></div><div class="hud"><span class="pill">Semana ${s.week}</span><span class="pill">${E.money(s.finance.balance)}</span><span class="pill">Força ${E.strength()}</span><span class="pill">${E.position()}º</span></div></div>${pages[view]()}<nav class="bottom">${[['painel','Painel'],['elenco','Elenco'],['partida','Jogo'],['competicoes','Torneios'],['database','DB']].map(([id,label])=>`<button data-view="${id}" class="${view===id?'on':''}">${label}</button>`).join('')}</nav></main></div>`;
  }

  function pageTitle() { return ({ painel:'Painel da semana', agenda:'Agenda', elenco:'Elenco', escala:'Escalação', taticas:'Táticas', treino:'Treino', partida:'Central da partida', mercado:'Mercado', financas:'Finanças', competicoes:'Competições', database:'Database sul-americano', carreira:'Carreira do boleiro', config:'Configurações' })[view] || 'Boleiros'; }
  function pageSub() { return ({ painel:'Preparação antes do próximo jogo.', agenda:'Calendário multi-competição.', elenco:'Atletas, contratos, lesões e moral.', escala:'Onze inicial e campo.', taticas:'Plano de jogo no estilo manager.', treino:'Evolução, forma e fadiga.', partida:'Três modos de jogo com intervalo obrigatório.', mercado:'Contratar e vender.', financas:'Caixa, ingresso e folha.', competicoes:'Estaduais, Brasileirão, continentais e World Cup.', database:'Clubes por divisão e reputação.', carreira:'Vida e evolução do craque.', config:'Save, exportação e reset.' })[view] || ''; }
  function modeName(m) { return m === 'momentos' ? 'Momentos' : m === 'tecnico' ? 'Técnico' : 'Completo'; }

  function nextCard() {
    const f = E.nextFixture();
    if (!f) return `<div class="emptyState"><b>Temporada encerrada</b><p>Próximo passo: virada de temporada com acesso e rebaixamento.</p></div>`;
    const opp = f.home === E.getState().user.teamId ? f.away : f.home;
    return `<div class="card matchCard"><div class="row topAligned"><div><span class="tag warn">Próxima partida</span><h2>${E.team(f.home).name} x ${E.team(f.away).name}</h2><p class="mut">${f.competition} • Rodada ${f.round} • ${f.home===E.getState().user.teamId?'Casa':'Fora'}</p></div><button class="pri" data-action="match">Jogar</button></div><div class="statGrid"><div><span>Nossa força</span><b>${E.strength()}</b></div><div><span>Rival</span><b>${E.strength(opp)}</b></div><div><span>Modo</span><b>${modeName(E.getState().matchMode)}</b></div></div></div>`;
  }

  function tableRows(rows) { return `<div class="table"><table><tr><th>#</th><th>Clube</th><th>Pts</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr>${rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${r.team.name}</b>${r.team.id===E.getState().user.teamId?' <span class="tag ok">Você</span>':''}<br><span class="mut mini">${r.team.country} • ${E.divLabel(r.team.div)}</span></td><td><b>${r.stats.pts}</b></td><td>${r.stats.j}</td><td>${r.stats.v}</td><td>${r.stats.e}</td><td>${r.stats.d}</td><td>${r.stats.sg}</td></tr>`).join('')}</table></div>`; }
  function fixtureItem(f) { return `<div class="item"><div><b>${E.team(f.home).name}</b> ${f.done?f.homeGoals:'-'} x ${f.done?f.awayGoals:'-'} <b>${E.team(f.away).name}</b><br><span class="mut">${f.competition} • Rodada ${f.round}</span></div>${!f.done&&(f.home===E.getState().user.teamId||f.away===E.getState().user.teamId)?'<button class="pri" data-action="match">Jogar</button>':''}</div>`; }
  function playerRows(players, own=true) { return `<div class="table"><table><tr><th></th><th>Jogador</th><th>Pos</th><th>OV</th><th>Pot</th><th>Fís</th><th>Moral</th><th>Valor</th><th>Ação</th></tr>${players.map(p=>`<tr><td>${own?`<input type="checkbox" data-starter="${p.id}" ${p.starter?'checked':''} ${p.injury||p.suspended?'disabled':''}>`:''}</td><td><b>${esc(p.name)}</b>${p.star?' ⭐':''}<br><span class="mut">${p.age} anos${p.injury?' • lesão '+p.injury+'s':''}</span></td><td>${p.pos}</td><td><b>${p.overall}</b></td><td>${p.potential}</td><td>${p.fitness}</td><td>${p.morale}</td><td>${E.money(p.value)}</td><td>${own?`<button data-player="${p.id}">Detalhes</button>`:`<button class="pri" data-buy="${p.id}">Comprar</button>`}</td></tr>`).join('')}</table></div>`; }
  const xy = [[8,50],[24,22],[24,43],[24,58],[24,78],[44,32],[44,52],[44,72],[70,25],[83,50],[70,75]];
  function lineupField() { return `<div class="field">${E.starters().map((p,i)=>`<div class="dot ${p.star?'star':''}" style="left:${xy[i]?.[0]||50}%;top:${xy[i]?.[1]||50}%">${p.pos}</div>`).join('')}</div>`; }
  function slider(key,label,value,scope) { return `<div class="fieldBlock"><label>${label}</label><input type="range" min="0" max="100" value="${value}" data-slider="${key}" data-scope="${scope}"><div class="row smallRow"><span class="mut">baixo</span><b>${value}</b><span class="mut">alto</span></div></div>`; }
  function recommendations() { const out=[]; if(E.starters().length<11) out.push('Você tem menos de 11 titulares.'); if(E.starters().length && E.starters().reduce((s,p)=>s+p.fitness,0)/E.starters().length<72) out.push('Elenco cansado. Aumente descanso.'); if(E.getState().finance.balance<0) out.push('Caixa negativo. Venda ou reduza folha.'); if(!E.getState().preparation.tactics) out.push('Revise a tática antes da partida.'); if(!out.length) out.push('Tudo pronto. Pode jogar.'); return out.map(x=>`<div class="item">${x}</div>`).join(''); }

  const pages = {
    painel(){ const s=E.getState(); return `<div class="grid"><section class="panel"><div class="sectionHead"><div><h2>Resumo</h2><p class="mut">Preparação estilo manager.</p></div><button class="pri" data-action="match">Jogar próxima</button></div><div class="g4"><div class="card">Divisão<div class="big">${E.divLabel(E.team().div).replace('Brasileirão ','')}</div></div><div class="card">Força<div class="big">${E.strength()}</div></div><div class="card">Folha<div class="big">${E.money(E.wageBill())}</div></div><div class="card">Fase<div class="big">${s.phase}</div></div></div><br>${nextCard()}</section><section class="panel"><h2>Assistente</h2><div class="stack">${recommendations()}</div><h3>Universo</h3><div class="item">Clubes <b>${s.teams.length}</b></div><div class="item">Competições <b>${s.competitions.length}</b></div><div class="item">Intervalo <b>obrigatório</b></div></section></div><br><div class="grid"><section class="panel"><h2>Notícias</h2><div class="stack">${s.news.slice(-7).reverse().map(n=>`<div class="item">${esc(n)}</div>`).join('')}</div></section><section class="panel"><h2>Classificação principal</h2>${tableRows(E.competitionStats(E.mainCompetitionName()).slice(0,8))}</section></div>`; },
    agenda(){ const games=E.getState().fixtures.filter(f=>!f.done&&(f.home===E.getState().user.teamId||f.away===E.getState().user.teamId)); return `<div class="grid"><section class="panel"><h2>Próximos jogos</h2><div class="stack">${games.slice(0,12).map(fixtureItem).join('')||'<p class="mut">Sem jogos.</p>'}</div></section><section class="panel"><h2>Rodada atual</h2><div class="stack">${E.currentRound().map(fixtureItem).join('')||'<p class="mut">Rodada concluída.</p>'}</div></section></div>`; },
    elenco(){ const s=E.getState(); const ps=E.squad().filter(p=>s.filters.position==='Todos'||p.pos===s.filters.position).sort((a,b)=>Number(b.starter)-Number(a.starter)||b.overall-a.overall); return `<section class="panel"><div class="sectionHead"><div><h2>Elenco</h2><p class="mut">Escolha titulares e acompanhe condição.</p></div><div class="actionbar compact"><select data-filter="position"><option>Todos</option>${['GOL','ZAG','LE','LD','VOL','MC','MEI','PE','PD','ATA'].map(x=>`<option ${s.filters.position===x?'selected':''}>${x}</option>`).join('')}</select><button data-action="autoLineup">Escalar melhores</button></div></div>${playerRows(ps,true)}</section>`; },
    escala(){ return `<div class="grid"><section class="panel"><h2>Campo</h2>${lineupField()}</section><section class="panel"><h2>Onze inicial</h2>${playerRows(E.starters(),true)}</section></div>`; },
    taticas(){ const t=E.getState().tactics; return `<section class="panel"><h2>Plano de jogo</h2><div class="g3"><div class="fieldBlock"><label>Formação</label><select data-tactic="formation">${['4-3-3','4-4-2','4-2-3-1','3-5-2','5-3-2'].map(x=>`<option ${t.formation===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="fieldBlock"><label>Mentalidade</label><select data-tactic="mentality">${['Defensiva','Equilibrada','Ofensiva'].map(x=>`<option ${t.mentality===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="fieldBlock"><label>Pressão</label><select data-tactic="pressing">${['Baixa','Média','Alta'].map(x=>`<option ${t.pressing===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="fieldBlock"><label>Foco</label><select data-tactic="focus">${['Misto','Laterais','Centro','Contra-ataque'].map(x=>`<option ${t.focus===x?'selected':''}>${x}</option>`).join('')}</select></div>${slider('tempo','Ritmo',t.tempo,'tactics')}${slider('risk','Risco',t.risk,'tactics')}${slider('line','Linha defensiva',t.line,'tactics')}</div><br><div class="insightCard">Força atual: <b>${E.strength()}</b>. Ofensiva cria mais, defensiva segura melhor. Pressão alta cansa mais.</div></section>`; },
    treino(){ const tr=E.getState().training; return `<section class="panel"><div class="sectionHead"><div><h2>Treino da semana</h2><p class="mut">Evolução e fadiga.</p></div><button class="pri" data-action="train">Aplicar treino</button></div><div class="g3"><div class="fieldBlock"><label>Foco coletivo</label><select data-training="focus">${['Equilibrado','Finalização','Defesa','Físico','Posse de bola'].map(x=>`<option ${tr.focus===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="fieldBlock"><label>Foco do boleiro</label><select data-training="individual">${['Ataque','Passe','Drible','Velocidade','Defesa'].map(x=>`<option ${tr.individual===x?'selected':''}>${x}</option>`).join('')}</select></div>${slider('intensity','Intensidade',tr.intensity,'training')}${slider('rest','Descanso',tr.rest,'training')}</div></section>`; },
    partida(){ const s=E.getState(); const modes=[['momentos','Momentos decisivos','Jogo rápido com decisões em lances-chave.'],['tecnico','Simulação do técnico','Mais próximo de Brasfoot: jogo corre, você pausa, muda tática e mexe no time.'],['completo','Jogar completo','Top view com controle do boleiro, passe, chute, cruzamento e carrinho.']]; return `<section class="panel"><div class="sectionHead"><div><h2>Central da partida</h2><p class="mut">Modo técnico é o principal para sentir Brasfoot.</p></div><button class="pri" data-action="match">Começar partida</button></div>${nextCard()}<br><div class="g3">${modes.map(([id,title,desc])=>`<button class="modeCard ${s.matchMode===id?'selected':''}" data-mode="${id}"><b>${title}</b><span>${desc}</span></button>`).join('')}</div><div class="actionbar stickyCta"><button class="pri wide" data-action="match">Começar partida</button></div></section>`; },
    mercado(){ const s=E.getState(); return `<div class="grid"><section class="panel"><div class="sectionHead"><div><h2>Comprar</h2><p class="mut">Mercado de reforços.</p></div><button data-action="scout">Buscar jogadores</button></div>${playerRows(s.market.sort((a,b)=>b.overall-a.overall),false)}</section><section class="panel"><h2>Vender</h2><div class="stack">${E.squad().sort((a,b)=>b.value-a.value).map(p=>`<div class="item"><div><b>${esc(p.name)}</b>${p.star?' ⭐':''}<br><span class="mut">${p.pos} ${p.overall} • ${E.money(p.value)}</span></div><button class="bad" data-sell="${p.id}">Vender</button></div>`).join('')}</div></section></div>`; },
    financas(){ const s=E.getState(); return `<section class="panel"><h2>Finanças</h2><div class="g4"><div class="card">Saldo<div class="big">${E.money(s.finance.balance)}</div></div><div class="card">Folha semanal<div class="big">${E.money(E.wageBill()/2)}</div></div><div class="card">Patrocínio<div class="big">${E.money(s.finance.sponsor)}</div></div><div class="card"><label>Ingresso</label><input type="number" data-finance="ticket" value="${s.finance.ticket}"></div></div></section>`; },
    competicoes(){ const s=E.getState(); const n=E.competitionByName(E.nextFixture()?.competition)||s.competitions[0]; return `<section class="panel"><h2>Competições</h2><div class="g3">${s.competitions.map(c=>`<div class="card competitionCard"><div class="row"><div class="compLogo">${c.scope[0].toUpperCase()}</div><span class="tag ${c.scope==='continental'?'blue':c.scope==='seleções'?'red':'ok'}">${c.scope}</span></div><h3>${c.name}</h3><p class="mut">${c.description}</p><p><b>${c.participants.length}</b> participantes</p><button data-competition="${esc(c.name)}">Ver tabela</button></div>`).join('')}</div><br><h2>Classificação da próxima competição</h2>${n&&n.scope!=='seleções'?tableRows(E.competitionStats(n.name).slice(0,12)):worldCupView()}</section>`; },
    database(){ const teams=E.getState().teams.slice().sort((a,b)=>E.divOrder(a.div)-E.divOrder(b.div)||a.name.localeCompare(b.name,'pt-BR')); return `<section class="panel"><div class="sectionHead"><div><h2>Database</h2><p class="mut">Ordenado por divisão e alfabético.</p></div><span class="pill">${teams.length} clubes</span></div><div class="table"><table><tr><th>Clube</th><th>País</th><th>Estado</th><th>Divisão</th><th>Rep</th></tr>${teams.map(t=>`<tr><td><b>${esc(t.name)}</b><br><span class="mut mini">${t.id}</span></td><td>${t.country}</td><td>${t.state}</td><td>${E.divLabel(t.div)}</td><td>${t.rep}</td></tr>`).join('')}</table></div></section>`; },
    carreira(){ const c=E.getState().career; return `<section class="panel"><h2>${c.name}</h2><div class="g4"><div class="card">Energia<div class="big">${c.energy}</div></div><div class="card">Felicidade<div class="big">${c.happiness}</div></div><div class="card">Fama<div class="big">${c.fame}</div></div><div class="card">Grana<div class="big">${E.money(c.cash)}</div></div></div><br><div class="grid"><div class="card"><h3>Habilidades</h3>${Object.entries(c.skills).map(([k,v])=>`<div class="item"><span>${k}</span><div style="width:160px"><div class="bar"><span style="width:${v}%"></span></div></div></div>`).join('')}</div><div class="card"><h3>Vida fora de campo</h3><div class="actionbar"><button data-life="rest">Descansar</button><button data-life="boot">Comprar chuteira</button><button data-life="media">Dar entrevista</button><button data-life="night">Sair à noite</button></div></div></div></section>`; },
    config(){ return `<section class="panel"><h2>Configurações</h2><div class="actionbar"><button class="pri" data-action="save">Salvar</button><button data-action="export">Exportar</button><button data-action="import">Importar</button><button class="bad" data-action="reset">Resetar</button></div><br><textarea id="saveBox" rows="10" placeholder="Exportar ou colar save aqui"></textarea></section>`; }
  };

  function worldCupView() { return `<div class="grid">${E.getState().worldCup.groups.map(g=>`<div class="card"><h3>Grupo ${g.id}</h3>${g.teams.map(c=>`<div class="item"><span>${c.name}</span><b>${c.stats.pts}</b></div>`).join('')}</div>`).join('')}</div>`; }
  function setView(next) { view = next; render(); }
  function openModal(content) { modal.classList.add('open'); box.innerHTML = content; }
  function closeModal() { modal.classList.remove('open'); box.innerHTML = ''; render(); }

  return { render, setupScreen, updateClubPreview, filterTeams, showToast, setView, openModal, closeModal, playerRows, tableRows, worldCupView };
})();
