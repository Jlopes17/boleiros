(() => {
  'use strict';

  const STORAGE_KEY = 'boleiros_seen_ux_help_v1';
  const app = document.getElementById('app');
  const modal = document.getElementById('modal');
  const box = document.getElementById('box');

  const pageTips = {
    'Painel da semana': {
      what: 'Seu escritório principal. Veja a próxima partida, caixa, força do time e alertas importantes.',
      do: 'Comece por aqui: revise o assistente, depois vá para Táticas, Elenco e Partida.'
    },
    'Agenda': {
      what: 'Mostra os próximos jogos e a rodada atual da competição.',
      do: 'Use para entender a sequência da temporada antes de cansar o elenco.'
    },
    'Elenco': {
      what: 'Lista todos os jogadores, titulares, posição, força, físico, moral, valor e status.',
      do: 'Marque titulares manualmente ou use Escalar melhores para montar um XI rápido.'
    },
    'Escalação': {
      what: 'Visualiza o time titular dentro do campo.',
      do: 'Confira se você tem 11 jogadores e se o Boleiro está entre os titulares.'
    },
    'Táticas': {
      what: 'Define como o time joga, formação, mentalidade, pressão, ritmo, risco e linha defensiva.',
      do: 'Contra rivais fortes, use Equilibrada ou Defensiva. Contra rivais fracos, tente Ofensiva.'
    },
    'Treino': {
      what: 'Evolui jogadores e o Boleiro, mas pode cansar o elenco.',
      do: 'Aumente descanso quando o físico estiver baixo.'
    },
    'Central da partida': {
      what: 'Escolha como jogar a partida.',
      do: 'Use Técnico para comandar o time ou Completo para controlar apenas o Boleiro em campo.'
    },
    'Mercado': {
      what: 'Contrate reforços ou venda jogadores para equilibrar o caixa.',
      do: 'Não gaste tudo em um jogador. Olhe também salário e idade.'
    },
    'Finanças': {
      what: 'Acompanha saldo, folha semanal, patrocínio e preço do ingresso.',
      do: 'Se o caixa cair, venda jogadores caros ou ajuste ingresso.'
    },
    'Competições': {
      what: 'Mostra estaduais, Brasileirão, continentais e World Cup.',
      do: 'Abra as tabelas para entender onde você está brigando.'
    },
    'Database sul-americano': {
      what: 'Lista os clubes do universo do jogo por divisão, país e reputação.',
      do: 'Use para conhecer rivais e escolher próximos desafios.'
    },
    'Carreira do boleiro': {
      what: 'Mostra energia, felicidade, fama, grana e habilidades do seu jogador.',
      do: 'Cuide da energia. Um craque cansado decide menos jogos.'
    },
    'Configurações': {
      what: 'Área de save, exportação, importação e reset.',
      do: 'Exporte o save antes de grandes mudanças.'
    }
  };

  const glossary = [
    ['OV', 'Overall. Força geral do jogador. Quanto maior, melhor.'],
    ['Pot', 'Potencial. O teto de evolução do jogador.'],
    ['Fís', 'Condição física. Baixo físico reduz desempenho e aumenta risco.'],
    ['Moral', 'Confiança do jogador e do clube. Afeta desempenho.'],
    ['Força', 'Resumo da qualidade do time titular, forma, moral e tática.'],
    ['Folha', 'Total de salários. Pode quebrar o caixa se ficar alta demais.'],
    ['Mentalidade', 'Define risco. Ofensiva cria mais, defensiva protege mais.'],
    ['Pressão', 'Alta recupera mais bola, mas cansa mais.'],
    ['Técnico', 'Modo de treinador. A partida é simulada com ajustes táticos.'],
    ['Completo', 'Partida contínua em visão superior. Você controla somente o Boleiro.']
  ];

  function injectStyles() {
    if (document.getElementById('ux-helper-styles')) return;
    const style = document.createElement('style');
    style.id = 'ux-helper-styles';
    style.textContent = `
      .ux-guide{border:1px solid rgba(85,229,143,.42);background:linear-gradient(135deg,rgba(85,229,143,.13),rgba(219,255,107,.06));border-radius:18px;padding:13px;margin:0 0 14px;display:grid;gap:8px}
      .ux-guide strong{color:#dbff6b}.ux-guide p{margin:0;color:#c7ddcf;line-height:1.45}.ux-guide .ux-actions{display:flex;gap:8px;flex-wrap:wrap}.ux-mini{font-size:12px;color:#9db7a9}.ux-help-chip{display:inline-flex;gap:6px;align-items:center;padding:6px 9px;border-radius:999px;background:#10251a;border:1px solid #356b4f;color:#dbff6b;font-size:12px;font-weight:800}
      .ux-fab{position:fixed;right:14px;bottom:86px;z-index:80;width:48px;height:48px;border-radius:999px;background:#dbff6b;color:#041008;border:0;font-weight:1000;box-shadow:0 14px 35px rgba(0,0,0,.38)}
      .ux-drawer{position:fixed;inset:auto 12px 12px auto;width:min(430px,calc(100vw - 24px));max-height:82vh;overflow:auto;z-index:90;background:#06110b;border:1px solid #55e58f;border-radius:22px;padding:15px;box-shadow:0 25px 80px rgba(0,0,0,.58)}
      .ux-drawer h2{margin:0 0 6px}.ux-drawer .ux-close{float:right}.ux-steps{display:grid;gap:10px;margin-top:12px}.ux-step{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:flex-start;background:#08170f;border:1px solid #244a37;border-radius:16px;padding:10px}.ux-step b:first-child{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:#55e58f;color:#041008}.ux-label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#dbff6b;margin-bottom:3px}.ux-callout{border-left:3px solid #55e58f;padding-left:10px;color:#c7ddcf}.ux-labelled{position:relative}.ux-labelled:before{content:attr(data-ux-label);display:inline-flex;margin:0 0 6px;padding:4px 8px;border-radius:999px;background:#10251a;border:1px solid #356b4f;color:#dbff6b;font-size:11px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}.ux-table-note{margin:8px 0 0;color:#9db7a9;font-size:12px}.ux-pill-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      .ux-onboarding{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.82);display:grid;place-items:center;padding:14px}.ux-onboarding-card{width:min(720px,100%);background:#06110b;border:1px solid #55e58f;border-radius:26px;padding:18px;box-shadow:0 25px 90px rgba(0,0,0,.65)}.ux-onboarding-card h1{margin:0 0 8px;font-size:clamp(34px,9vw,64px);letter-spacing:-.06em}.ux-onboarding-card p{color:#c7ddcf;line-height:1.45}.ux-onboarding-card .ux-steps{grid-template-columns:1fr 1fr}.ux-skip{background:transparent}
      @media(max-width:700px){.ux-onboarding-card .ux-steps{grid-template-columns:1fr}.ux-drawer{left:10px;right:10px;bottom:10px;width:auto}.ux-fab{bottom:78px;right:10px}.ux-guide{font-size:14px}.ux-guide .ux-actions button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function makeGuide(title) {
    const tip = pageTips[title];
    if (!tip) return '';
    return `
      <div class="ux-guide" data-ux-guide="${title}">
        <div><span class="ux-help-chip">Guia desta tela</span></div>
        <p><strong>O que é:</strong> ${tip.what}</p>
        <p><strong>O que fazer agora:</strong> ${tip.do}</p>
      </div>`;
  }

  function addPageGuide() {
    const main = document.querySelector('.main');
    if (!main) return;
    const h1 = main.querySelector('.pageHead h1');
    if (!h1) return;
    const title = h1.textContent.trim();
    if (!pageTips[title]) return;
    if (main.querySelector(`.ux-guide[data-ux-guide="${CSS.escape(title)}"]`)) return;
    const guide = document.createElement('div');
    guide.innerHTML = makeGuide(title);
    const pageHead = main.querySelector('.pageHead');
    pageHead?.insertAdjacentElement('afterend', guide.firstElementChild);
  }

  function labelNavigation() {
    const labels = {
      painel:'Resumo', agenda:'Calendário', elenco:'Jogadores', escala:'Onze', taticas:'Tática', treino:'Treino', partida:'Jogar', mercado:'Transferências', financas:'Caixa', competicoes:'Torneios', database:'Clubes', carreira:'Boleiro', config:'Save'
    };
    document.querySelectorAll('[data-view]').forEach(button => {
      const id = button.getAttribute('data-view');
      if (labels[id]) button.setAttribute('aria-label', labels[id]);
    });
  }

  function labelTables() {
    document.querySelectorAll('.table').forEach(table => {
      if (table.nextElementSibling?.classList?.contains('ux-table-note')) return;
      const headers = [...table.querySelectorAll('th')].map(th => th.textContent.trim());
      if (!headers.length) return;
      const note = document.createElement('div');
      note.className = 'ux-table-note';
      if (headers.includes('OV')) note.textContent = 'Dica: OV é a força atual, Pot é potencial, Fís é condição física e Moral afeta desempenho.';
      else if (headers.includes('Pts')) note.textContent = 'Dica: Pts são pontos, SG é saldo de gols. A tabela ordena por pontos, saldo e gols marcados.';
      else note.textContent = 'Dica: role a tabela para o lado no celular para ver todos os dados.';
      table.insertAdjacentElement('afterend', note);
    });
  }

  function improveMatchModal() {
    if (!box || !box.textContent.trim()) return;
    const canvas = box.querySelector('canvas');
    if (!canvas) return;
    if (!box.querySelector('.ux-match-guide')) {
      const guide = document.createElement('div');
      guide.className = 'ux-guide ux-match-guide';
      guide.innerHTML = `
        <div><span class="ux-help-chip">Matchday</span></div>
        <p><strong>Como ler:</strong> placar no topo, minuto logo abaixo, campo no centro, ações embaixo e narração/estatísticas ao lado.</p>
        <p><strong>Dica:</strong> no Técnico você ajusta a equipe. No Completo, movimente o Boleiro, peça a bola e participe das jogadas.</p>`;
      const header = box.querySelector('.matchHeader,.modalHead,.row');
      header?.insertAdjacentElement('afterend', guide);
    }
    const actionCards = box.querySelectorAll('.matchControlBar .card, .choiceGrid');
    actionCards.forEach(card => {
      if (!card.classList.contains('ux-labelled')) {
        card.classList.add('ux-labelled');
        card.setAttribute('data-ux-label', 'Ações disponíveis');
      }
    });
  }

  function addStartLabels() {
    const hero = document.querySelector('.heroPanel');
    if (!hero || hero.querySelector('.ux-start-guide')) return;
    const guide = document.createElement('div');
    guide.className = 'ux-guide ux-start-guide';
    guide.innerHTML = `
      <p><strong>Novo no jogo?</strong> Comece em Novo jogo, escolha um clube, depois siga este ciclo: Elenco, Táticas, Treino, Partida.</p>
      <div class="ux-pill-row"><span class="ux-help-chip">1 Elenco</span><span class="ux-help-chip">2 Tática</span><span class="ux-help-chip">3 Treino</span><span class="ux-help-chip">4 Jogo</span></div>`;
    const actions = hero.querySelector('.heroActions');
    actions?.insertAdjacentElement('afterend', guide);
  }

  function createHelpButton() {
    if (document.querySelector('.ux-fab')) return;
    const fab = document.createElement('button');
    fab.className = 'ux-fab';
    fab.type = 'button';
    fab.textContent = '?';
    fab.setAttribute('aria-label', 'Abrir ajuda do Boleiros');
    fab.addEventListener('click', openDrawer);
    document.body.appendChild(fab);
  }

  function openDrawer() {
    document.querySelector('.ux-drawer')?.remove();
    const drawer = document.createElement('div');
    drawer.className = 'ux-drawer';
    drawer.innerHTML = `
      <button class="ux-close" type="button">Fechar</button>
      <h2>Guia rápido</h2>
      <p class="mut">O objetivo é montar um time competitivo, cuidar do caixa e vencer competições.</p>
      <div class="ux-steps">
        <div class="ux-step"><b>1</b><div><b>Prepare o time</b><div class="ux-mini">Elenco, escalação, táticas e treino.</div></div></div>
        <div class="ux-step"><b>2</b><div><b>Jogue a partida</b><div class="ux-mini">Técnico é o modo de treinador. Completo é a carreira jogável do Boleiro.</div></div></div>
        <div class="ux-step"><b>3</b><div><b>Controle o dinheiro</b><div class="ux-mini">Folha alta e compras ruins quebram o clube.</div></div></div>
        <div class="ux-step"><b>4</b><div><b>Evolua o Boleiro</b><div class="ux-mini">Energia, habilidades e decisões fora de campo importam.</div></div></div>
      </div>
      <h3>Glossário</h3>
      <div class="stack">${glossary.map(([term,desc]) => `<div class="item"><b>${term}</b><span class="mut">${desc}</span></div>`).join('')}</div>`;
    drawer.querySelector('.ux-close').addEventListener('click', () => drawer.remove());
    document.body.appendChild(drawer);
  }

  function onboarding() {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const layer = document.createElement('div');
    layer.className = 'ux-onboarding';
    layer.innerHTML = `
      <div class="ux-onboarding-card">
        <h1>Bem-vindo ao Boleiros</h1>
        <p>O jogo tem muita coisa, então agora ele vai te explicar melhor onde você está e o que cada tela faz.</p>
        <div class="ux-steps">
          <div class="ux-step"><b>1</b><div><b>Painel</b><div class="ux-mini">Veja a próxima partida e alertas.</div></div></div>
          <div class="ux-step"><b>2</b><div><b>Elenco</b><div class="ux-mini">Escolha titulares e veja OV, físico e moral.</div></div></div>
          <div class="ux-step"><b>3</b><div><b>Táticas</b><div class="ux-mini">Defina mentalidade, pressão e ritmo.</div></div></div>
          <div class="ux-step"><b>4</b><div><b>Partida</b><div class="ux-mini">Escolha Técnico para comandar ou Completo para controlar o Boleiro.</div></div></div>
        </div>
        <br>
        <div class="actionbar"><button class="ux-skip" type="button">Depois</button><button class="pri" type="button">Entendi</button></div>
      </div>`;
    layer.querySelector('.pri').addEventListener('click', () => { localStorage.setItem(STORAGE_KEY, '1'); layer.remove(); });
    layer.querySelector('.ux-skip').addEventListener('click', () => layer.remove());
    document.body.appendChild(layer);
  }

  function enhance() {
    injectStyles();
    createHelpButton();
    addStartLabels();
    addPageGuide();
    labelNavigation();
    labelTables();
    improveMatchModal();
  }

  const observer = new MutationObserver(() => requestAnimationFrame(enhance));
  window.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    createHelpButton();
    onboarding();
    observer.observe(document.body, { childList:true, subtree:true });
    enhance();
  });
})();
