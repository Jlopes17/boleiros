window.BoleirosMatch = (() => {
  const E = window.BoleirosEngine;
  const UI = window.BoleirosUI;
  const box = document.getElementById('box');
  const modal = document.getElementById('modal');
  const clamp = E.clamp;
  const rand = E.rand;

  let m = null;
  let timer = null;
  let raf = null;
  let keys = Object.create(null);

  function stop() { clearInterval(timer); cancelAnimationFrame(raf); }
  function fixture() { return E.getState().fixtures.find(f => f.id === m.fixtureId); }
  function modeName(mode) { return mode === 'momentos' ? 'Momentos' : mode === 'tecnico' ? 'Técnico' : 'Completo'; }

  function open() {
    const f = E.nextFixture();
    if (!f) return UI.showToast('Sem partida pendente');
    stop();
    m = {
      fixtureId:f.id,
      mode:E.getState().matchMode,
      minute:0,
      homeGoals:0,
      awayGoals:0,
      paused:false,
      halfTime:false,
      halfDone:false,
      boost:0,
      ballX:50,
      ballY:50,
      aimX:84,
      aimY:50,
      log:['Apita o árbitro. Bola rolando.'],
      stats:{ possession:50, shotsFor:0, shotsAgainst:0, passes:0, tackles:0 },
      moments:0,
      full:null
    };
    modal.classList.add('open');
    render();
    if (m.mode === 'tecnico') startCoach();
    if (m.mode === 'completo') startFull();
  }

  function render() {
    if (!m) return;
    const f = fixture();
    box.innerHTML = `<div class="matchHeader"><div><span class="tag ${m.halfTime?'warn':'ok'}">${m.halfTime?'Intervalo obrigatório':modeName(m.mode)}</span><h2>${E.team(f.home).name} ${m.homeGoals} x ${m.awayGoals} ${E.team(f.away).name}</h2><p class="mut">${f.competition} • ${Math.floor(m.minute)}'</p></div><button data-close="1">Fechar</button></div><div class="matchProgress"><span style="width:${Math.min(100,m.minute/90*100)}%"></span></div><div class="matchLayout"><div class="matchStage"><canvas id="cv" width="1080" height="640"></canvas>${m.halfTime?halfOverlay():''}<div class="matchControlBar">${controls()}</div></div><aside class="matchSide"><h3>Narração</h3><div class="stack">${m.log.slice(-8).reverse().map(x=>`<div class="item">${x}</div>`).join('')}</div><h3>Estatísticas</h3><div class="statGrid compactStats"><div><span>Chutes</span><b>${m.stats.shotsFor}</b></div><div><span>Contra</span><b>${m.stats.shotsAgainst}</b></div><div><span>Posse</span><b>${m.stats.possession}%</b></div></div></aside></div>`;
    draw();
  }

  function halfOverlay() {
    return `<div class="halfOverlay"><div class="card"><span class="tag warn">Intervalo obrigatório</span><h2>45 minutos</h2><p class="mut">Analise o placar, ajuste a mentalidade e comece o segundo tempo.</p><div class="choiceGrid"><button data-coach="Ofensiva"><b>Ofensiva</b><span>Buscar o jogo</span></button><button data-coach="Equilibrada"><b>Equilibrada</b><span>Controlar risco</span></button><button data-coach="Defensiva"><b>Defensiva</b><span>Proteger placar</span></button><button data-coach="sub"><b>Substituir</b><span>Mais fôlego</span></button></div><br><button class="pri wide" data-match="secondHalf">Começar 2º tempo</button></div></div>`;
  }

  function controls() {
    if (m.halfTime) return `<div class="actionbar"><button class="pri wide" data-match="secondHalf">Começar 2º tempo</button></div>`;
    const top = `<div class="actionbar matchActions"><button data-switch-mode="momentos" class="${m.mode==='momentos'?'pri':''}">Momentos</button><button data-switch-mode="tecnico" class="${m.mode==='tecnico'?'pri':''}">Técnico</button><button data-switch-mode="completo" class="${m.mode==='completo'?'pri':''}">Completo</button><button data-match="pause">${m.paused?'Continuar':'Pausar'}</button><button class="pri" data-match="finish">Encerrar</button></div>`;
    if (m.mode === 'momentos') return top + `<div class="choiceGrid"><button class="pri" data-moment="shoot"><b>Chutar</b><span>Finalizar no gol</span></button><button data-moment="pass"><b>Passe</b><span>Achar companheiro</span></button><button data-moment="dribble"><b>Drible</b><span>Ganhar terreno</span></button><button data-moment="defend"><b>Defender</b><span>Cortar lance rival</span></button></div>`;
    if (m.mode === 'tecnico') return top + `<div class="choiceGrid"><button data-coach="Ofensiva"><b>Ofensiva</b><span>Pressionar mais</span></button><button data-coach="Equilibrada"><b>Equilibrada</b><span>Controle de risco</span></button><button data-coach="Defensiva"><b>Defensiva</b><span>Fechar espaços</span></button><button data-coach="sub"><b>Substituir</b><span>Fôlego imediato</span></button></div>`;
    return top + `<div class="touch"><div class="dpad"><span></span><button data-hold="up">▲</button><span></span><button data-hold="left">◀</button><button data-hold="down">▼</button><button data-hold="right">▶</button><span></span><button data-hold="down">▼</button><span></span></div><div class="actBtns"><button class="pri" data-full="shoot">Chutar</button><button data-full="pass">Passe</button><button data-full="cross">Cruzamento</button><button data-full="tackle">Carrinho</button></div></div><p class="mut mini">Toque no campo para mover. Desktop: WASD/setas, J chute, K passe, L cruza, I carrinho.</p>`;
  }

  function checkHalfTime() {
    if (!m || m.halfDone || m.minute < 45) return false;
    m.minute = 45;
    m.halfTime = true;
    m.paused = true;
    stop();
    m.log.push("45' Intervalo. Pausa obrigatória para ajustes.");
    render();
    return true;
  }

  function secondHalf() {
    if (!m) return;
    m.halfDone = true;
    m.halfTime = false;
    m.paused = false;
    m.minute = 46;
    m.log.push("46' Começa o segundo tempo.");
    render();
    if (m.mode === 'tecnico') startCoach();
    if (m.mode === 'completo') startFull();
  }

  function drawPitch(ctx,w,h) {
    for (let i=0;i<10;i++) { ctx.fillStyle = i%2 ? '#1b7a3b' : '#156a32'; ctx.fillRect(i*w/10,0,w/10+1,h); }
    const g = ctx.createRadialGradient(w/2,h/2,20,w/2,h/2,Math.max(w,h)*.65);
    g.addColorStop(0,'rgba(255,255,255,.08)'); g.addColorStop(1,'rgba(0,0,0,.20)'); ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(255,255,255,.82)'; ctx.lineWidth=4; ctx.strokeRect(38,38,w-76,h-76);
    ctx.beginPath(); ctx.moveTo(w/2,38); ctx.lineTo(w/2,h-38); ctx.stroke();
    ctx.beginPath(); ctx.arc(w/2,h/2,70,0,Math.PI*2); ctx.stroke();
    ctx.strokeRect(38,h/2-98,130,196); ctx.strokeRect(w-168,h/2-98,130,196);
    ctx.strokeRect(38,h/2-52,58,104); ctx.strokeRect(w-96,h/2-52,58,104);
    ctx.fillStyle='rgba(255,255,255,.9)'; ctx.fillRect(18,h/2-52,20,104); ctx.fillRect(w-38,h/2-52,20,104);
  }

  function token(ctx,x,y,label,color,border='#05210f') {
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.28)'; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
    ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,17,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.strokeStyle=border; ctx.lineWidth=3; ctx.stroke(); ctx.fillStyle='#06110b'; ctx.font='800 11px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(label,x,y); ctx.restore();
  }

  function draw() {
    const canvas = document.getElementById('cv');
    if (!canvas || !m) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h); drawPitch(ctx,w,h);
    if (m.mode === 'completo' && m.full) return drawFull(ctx,w,h);
    const dots = [[12,50,'G'],[25,22,'Z'],[25,50,'Z'],[25,78,'L'],[44,32,'V'],[44,68,'M'],[65,26,'P'],[79,50,'9'],[65,74,'P'],[56,50,'M']];
    dots.forEach((p,i)=>token(ctx,p[0]*w/100,p[1]*h/100,p[2],i<6?'#e9fff0':'#dbff6b'));
    token(ctx,m.ballX*w/100,m.ballY*h/100,'','#fff','#333');
    if (m.mode === 'momentos') { ctx.strokeStyle='#ffef9b'; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(m.ballX*w/100,m.ballY*h/100); ctx.lineTo(m.aimX*w/100,m.aimY*h/100); ctx.stroke(); ctx.fillStyle='#ffef9b'; ctx.beginPath(); ctx.arc(m.aimX*w/100,m.aimY*h/100,10,0,Math.PI*2); ctx.fill(); }
  }

  function startCoach() {
    stop();
    timer = setInterval(() => {
      if (!m || m.mode !== 'tecnico' || m.paused) return;
      const f = fixture();
      const home = f.home === E.getState().user.teamId;
      const opp = home ? f.away : f.home;
      m.minute += rand(2,5);
      m.ballX = clamp(m.ballX + rand(-16,16), 6, 94); m.ballY = clamp(m.ballY + rand(-20,20), 10, 90);
      let chance = .22 + (E.strength(E.getState().user.teamId) + m.boost - E.strength(opp)) / 260;
      const t = E.getState().tactics;
      if (t.mentality === 'Ofensiva') chance += .05;
      if (t.mentality === 'Defensiva') chance -= .025;
      m.stats.possession = clamp(m.stats.possession + (t.mentality==='Ofensiva'?1:t.mentality==='Defensiva'?-1:0), 35, 65);
      if (Math.random() < .42) {
        if (Math.random() < chance) { home ? m.homeGoals++ : m.awayGoals++; m.stats.shotsFor++; m.log.push(`${Math.floor(m.minute)}' GOOOL do ${E.team().name}!`); }
        else if (Math.random() < .34) { home ? m.awayGoals++ : m.homeGoals++; m.stats.shotsAgainst++; m.log.push(`${Math.floor(m.minute)}' Gol do adversário.`); }
        else m.log.push(`${Math.floor(m.minute)}' Chance perigosa neutralizada.`);
      }
      if (checkHalfTime()) return;
      if (m.minute >= 90) finish(); else render();
    }, 780);
  }

  function moment(action) {
    const s = E.getState(); const c = s.career; const f = fixture(); const home = f.home === s.user.teamId;
    let p = .4 + c.skills.Finalização/240 + c.energy/650 - Math.abs(m.aimY-50)/180;
    if (action === 'pass') p = .43 + c.skills.Passe/230;
    if (action === 'dribble') p = .36 + c.skills.Drible/230;
    if (action === 'defend') p = .43 + c.skills.Defesa/220;
    const ok = Math.random() < p;
    m.minute = clamp(m.minute + rand(7,16), 1, 90);
    if (ok) {
      if (action === 'defend') { m.stats.tackles++; m.log.push(`${m.minute}' Corte perfeito. Defesa respira.`); }
      else { home ? m.homeGoals++ : m.awayGoals++; m.stats.shotsFor++; c.goals++; m.log.push(`${m.minute}' Lance perfeito. Gol do Boleiro!`); }
    } else {
      if (action === 'defend') { home ? m.awayGoals++ : m.homeGoals++; m.stats.shotsAgainst++; m.log.push(`${m.minute}' Falhou no corte. Gol deles.`); }
      else m.log.push(`${m.minute}' A escolha foi boa, mas a execução falhou.`);
    }
    c.energy = clamp(c.energy - rand(3,8)); m.moments++;
    if (checkHalfTime()) return;
    if (m.minute >= 90 || m.moments >= 8) finish(); else render();
  }

  function startFull() {
    if (!m.full) m.full = { px:22, py:50, bx:24, by:50, targetX:22, targetY:50, possession:'user', ai:0, teammates:[[18,22,'A'],[18,78,'A'],[42,35,'M'],[42,65,'M'],[70,28,'P'],[70,72,'P']], opponents:[[78,22,'D'],[78,50,'D'],[78,78,'D'],[58,45,'M'],[58,65,'M']] };
    loopFull();
  }

  function drawFull(ctx,w,h) {
    const f = m.full;
    f.teammates.forEach(p=>token(ctx,p[0]*w/100,p[1]*h/100,p[2],'#e9fff0'));
    f.opponents.forEach(p=>token(ctx,p[0]*w/100,p[1]*h/100,p[2],'#ffd166'));
    token(ctx,f.px*w/100,f.py*h/100,'EU','#55e58f'); token(ctx,f.bx*w/100,f.by*h/100,'','#fff','#333');
  }

  function loopFull() {
    if (!m || m.mode !== 'completo') return;
    if (!m.paused) {
      const f = m.full; const sp = .48 + E.getState().career.skills.Velocidade/340;
      if (keys.left || keys.ArrowLeft || keys.a) f.px -= sp; if (keys.right || keys.ArrowRight || keys.d) f.px += sp; if (keys.up || keys.ArrowUp || keys.w) f.py -= sp; if (keys.down || keys.ArrowDown || keys.s) f.py += sp;
      const dx = f.targetX - f.px, dy = f.targetY - f.py, dist = Math.hypot(dx,dy);
      if (dist > 1) { f.px += dx/dist*sp; f.py += dy/dist*sp; }
      f.px = clamp(f.px,5,95); f.py = clamp(f.py,8,92);
      if (f.possession === 'user') { f.bx = f.px + 1.8; f.by = f.py; }
      else { f.ai++; f.bx = clamp(f.bx + (Math.random()-.45)*1.8,5,95); f.by = clamp(f.by + (Math.random()-.5)*2.2,8,92); if (f.ai%90===0) { const fx=fixture(), home=fx.home===E.getState().user.teamId; if (Math.random()<.31) { home?m.awayGoals++:m.homeGoals++; m.stats.shotsAgainst++; m.log.push(`${Math.floor(m.minute)}' O adversário encontrou espaço e marcou.`); } else { m.stats.tackles++; m.log.push(`${Math.floor(m.minute)}' Recuperação na cobertura.`); } f.possession='user'; f.bx=f.px; f.by=f.py; } }
      m.minute += .032;
      if (checkHalfTime()) return;
      if (m.minute >= 90) return finish();
    }
    draw(); raf = requestAnimationFrame(loopFull);
  }

  function fullAction(action) {
    if (!m || m.mode !== 'completo') return;
    const f = m.full; const fx = fixture(); const home = fx.home === E.getState().user.teamId;
    if (action === 'tackle') { if (f.possession !== 'user' || Math.hypot(f.px-f.bx,f.py-f.by) < 18) { f.possession='user'; f.bx=f.px; f.by=f.py; m.stats.tackles++; m.log.push(`${Math.floor(m.minute)}' Carrinho limpo. Bola nossa.`); } else m.log.push(`${Math.floor(m.minute)}' Carrinho atrasado. Falta.`); return render(); }
    if (f.possession !== 'user') { m.log.push('Sem a bola. Tente roubar primeiro.'); return render(); }
    if (action === 'shoot') { const p=.22+E.getState().career.skills.Finalização/175+(f.px>70?.2:0)-Math.abs(f.py-50)/180; m.stats.shotsFor++; if(Math.random()<p){home?m.homeGoals++:m.awayGoals++; E.getState().career.goals++; m.log.push(`${Math.floor(m.minute)}' Chute forte. GOOOL!`);} else m.log.push(`${Math.floor(m.minute)}' Chute para fora.`); f.possession='opponent'; }
    if (action === 'pass') { m.stats.passes++; if(Math.random()<.48+E.getState().career.skills.Passe/230){f.targetX=clamp(f.px+12,5,92); m.log.push(`${Math.floor(m.minute)}' Passe bom. Time avançou.`);} else {f.possession='opponent'; m.log.push(`${Math.floor(m.minute)}' Passe interceptado.`);} }
    if (action === 'cross') { m.stats.passes++; const p=.32+E.getState().career.skills.Passe/260+(f.py<26||f.py>74?.24:-.05); if(Math.random()<p){home?m.homeGoals++:m.awayGoals++; m.log.push(`${Math.floor(m.minute)}' Cruzamento na medida. Gol!`);} else m.log.push(`${Math.floor(m.minute)}' Cruzamento cortado.`); f.possession='opponent'; }
    E.getState().career.energy = clamp(E.getState().career.energy - 2); render();
  }

  function finish() {
    stop();
    const f = fixture(); const sim = E.simulateScore(f.home, f.away);
    const hg = Math.max(m.homeGoals, sim[0]); const ag = Math.max(m.awayGoals, sim[1]);
    const result = E.finishFixture(f, hg, ag, m.stats);
    const summary = `<div class="modalHead"><h2>Pós-jogo</h2><button data-close="1">Fechar</button></div><div class="score">${E.team(f.home).name} ${hg} x ${ag} ${E.team(f.away).name}</div><p class="mut center">${f.competition}</p><div class="g3"><div class="card">Renda<div class="big">${E.money(result.income)}</div></div><div class="card">Saldo semana<div class="big">${E.money(result.weekly)}</div></div><div class="card">Posição<div class="big">${E.position()}º</div></div></div><div class="actionbar stickyCta"><button class="pri wide" data-close="1">Continuar</button></div>`;
    m = null; box.innerHTML = summary; UI.render();
  }

  function pause() { if (!m || m.halfTime) return; m.paused = !m.paused; render(); UI.showToast(m.paused ? 'Pausado' : 'Rodando'); }
  function switchMode(mode) { if (!m || m.halfTime) return; stop(); m.mode = mode; m.full = null; render(); if (mode === 'tecnico') startCoach(); if (mode === 'completo') startFull(); }
  function coach(action) { if (!m) return; if (action === 'sub') { m.boost += 2; m.log.push(`${Math.floor(m.minute)}' Substituição feita. Time ganhou fôlego.`); } else { E.getState().tactics.mentality = action; m.log.push(`${Math.floor(m.minute)}' Técnico mudou para ${action}.`); } render(); }
  function close() { stop(); m = null; modal.classList.remove('open'); UI.render(); }
  function setAim(x,y) { if (!m) return; if (m.mode === 'momentos') { m.aimX=x; m.aimY=y; draw(); } if (m.mode === 'completo' && m.full) { m.full.targetX=x; m.full.targetY=y; draw(); } }
  function setKey(key, value) { keys[key] = value; }
  function isOpen() { return Boolean(m); }

  return { open, close, pause, secondHalf, finish, moment, fullAction, coach, switchMode, setAim, setKey, isOpen };
})();
