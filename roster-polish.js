(() => {
  'use strict';

  const VERSION = 'roster-polish-1';
  const SAVE_KEYS = ['boleiros_save_v9', 'boleiros_save_v8', 'boleiros_save_v7'];
  const POS_ORDER = { GOL: 1, GK: 1, G: 1, ZAG: 2, Z: 2, LE: 3, LD: 4, L: 4, VOL: 5, MC: 6, MEI: 7, M: 7, PE: 8, PD: 9, ATA: 10, A: 10 };
  const POS_SEQUENCE = ['GOL','GOL','LD','ZAG','ZAG','LE','VOL','MC','MEI','PE','PD','ATA','ATA','ZAG','VOL','MC','MEI','PE','PD','LD','LE','ATA','GOL','ZAG','MC','ATA'];
  const FIRST_NAMES = 'Rafael Bruno Caio Diego Felipe Gustavo Hugo João Kauã Leonardo Marcos Neto Otávio Paulo Renan Sandro Thiago Vinícius Wesley Yuri Facundo Santiago Nicolas Lautaro Matias Pablo Sebastian Franco Carlos Andrés Miguel Adrian Emiliano Lucas Gabriel Kevin Samuel'.split(' ');
  const LAST_NAMES = 'Silveira Sousa Lima Costa Santoro Rocha Mourão Riveiro Alvares Gomes Castilho Cardozo Nogueira Baptista Duarte Teixera Mello Araujo Ferraz Rodrigues Pereyra Martins Garcia Lopes Moralles Vargas Rojas Benitez Moreira Nunes Dias Campos'.split(' ');

  const vowelShift = { a:'e', e:'i', i:'e', o:'u', u:'o', A:'E', E:'I', I:'E', O:'U', U:'O', á:'a', é:'e', í:'i', ó:'o', ú:'u', ã:'an', õ:'on', ç:'ss' };

  function hash(value) {
    let h = 2166136261;
    const str = String(value || 'boleiros');
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  function pick(list, seed) {
    return list[seed % list.length];
  }

  function alterWord(word, seed) {
    if (!word || word.length < 3) return word;
    let chars = [...word];
    const start = word.length > 5 ? 1 : 0;
    const idx = start + (seed % Math.max(1, chars.length - start - 1));
    const current = chars[idx];
    chars[idx] = vowelShift[current] || current;
    let output = chars.join('');
    if (output === word) {
      if (/s$/i.test(output)) output = output.replace(/s$/i, 'z');
      else if (/z$/i.test(output)) output = output.replace(/z$/i, 's');
      else if (/r$/i.test(output)) output += 'o';
      else output += seed % 2 ? 'n' : 's';
    }
    return output;
  }

  function licenseName(name, seed) {
    const clean = String(name || '').replace(/\s+/g, ' ').trim();
    if (!clean) return `${pick(FIRST_NAMES, seed)} ${pick(LAST_NAMES, seed >> 3)}`;
    const parts = clean.split(' ').filter(Boolean).filter(part => !/^(de|da|do|dos|das)$/i.test(part));
    if (parts.length === 0) return `${pick(FIRST_NAMES, seed)} ${pick(LAST_NAMES, seed >> 3)}`;
    const first = alterWord(parts[0], seed);
    const lastBase = parts.length > 1 ? parts[parts.length - 1] : pick(LAST_NAMES, seed >> 4);
    const last = alterWord(lastBase, seed >> 5);
    return `${first} ${last}`;
  }

  function generatedName(teamId, index) {
    const seed = hash(`${teamId}-${index}`);
    return `${pick(FIRST_NAMES, seed)} ${pick(LAST_NAMES, seed >> 5)}`;
  }

  function ensureRosterArray(team) {
    const db = window.BOLEIROS_DB;
    if (!db) return [];
    db.rosters = db.rosters || {};
    const current = Array.isArray(db.rosters[team.id]) ? db.rosters[team.id] : [];
    const target = Math.max(24, Math.min(32, current.length || 26));
    const out = [];
    for (let i = 0; i < target; i++) {
      const base = current[i] || generatedName(team.id, i);
      out.push(licenseName(base, hash(`${team.id}-${i}-${base}`)));
    }
    db.rosters[team.id] = out;
    return out;
  }

  function polishDatabase() {
    const db = window.BOLEIROS_DB;
    if (!db || !Array.isArray(db.clubs)) return;
    db.clubs.forEach(ensureRosterArray);
    db.version = `${db.version || 'db'}-${VERSION}`;
    db.licenseSafeNames = true;
    db.ratingModel = 'deterministic-depth-based-v1';
  }

  function teamMap(state) {
    return new Map((state.teams || []).map(team => [team.id, team]));
  }

  function posRank(pos) {
    return POS_ORDER[pos] || 99;
  }

  function divisionFloor(team) {
    if (!team) return 42;
    if (team.div === 'br-a') return 54;
    if (team.div === 'br-b') return 48;
    if (team.div === 'br-c') return 42;
    if (team.div === 'br-d') return 36;
    return 45;
  }

  function divisionCeiling(team) {
    if (!team) return 78;
    if (team.div === 'br-a') return 86;
    if (team.div === 'br-b') return 77;
    if (team.div === 'br-c') return 70;
    if (team.div === 'br-d') return 64;
    return 78;
  }

  function roleBonus(pos) {
    if (pos === 'ATA') return 1;
    if (pos === 'MEI' || pos === 'MC') return 0;
    if (pos === 'GOL' || pos === 'ZAG') return -1;
    return -2;
  }

  function rebalancePlayer(player, team, depthIndex) {
    if (!player || player.star) return player;
    const seed = hash(`${team?.id || player.teamId}-${player.id || player.name}-${depthIndex}`);
    const rep = team?.rep || 58;
    const depthPenalty = depthIndex < 11 ? depthIndex * 0.42 : 5 + (depthIndex - 11) * 0.78;
    const noise = (seed % 7) - 3;
    const pos = player.pos || POS_SEQUENCE[depthIndex % POS_SEQUENCE.length];
    const ceiling = divisionCeiling(team);
    const floor = divisionFloor(team);
    const overall = clamp(rep + 2 + roleBonus(pos) - depthPenalty + noise, floor, ceiling);
    const age = player.age || (17 + (seed % 19));
    const potentialBoost = age <= 21 ? 9 : age <= 24 ? 6 : age >= 31 ? 1 : 3;
    player.overall = overall;
    player.potential = clamp(Math.max(player.potential || overall, overall + potentialBoost + (seed % 4)), overall, 95);
    player.value = Math.round(overall * overall * (player.potential / 78) * (age < 23 ? 1.28 : age > 31 ? 0.72 : 1) * 820);
    player.salary = Math.round(overall * overall * (team?.div === 'br-a' ? 24 : team?.div === 'br-b' ? 17 : team?.div === 'br-c' ? 10 : 7));
    return player;
  }

  function polishState(state) {
    if (!state || !Array.isArray(state.players) || !Array.isArray(state.teams)) return state;
    if (state.rosterPolishVersion === VERSION) return state;

    const teams = teamMap(state);
    const byTeam = new Map();
    state.players.forEach(player => {
      if (!player.teamId || player.teamId === 'market') return;
      if (!byTeam.has(player.teamId)) byTeam.set(player.teamId, []);
      byTeam.get(player.teamId).push(player);
    });

    byTeam.forEach((players, teamId) => {
      const team = teams.get(teamId);
      players.sort((a, b) => posRank(a.pos) - posRank(b.pos) || Number(b.starter) - Number(a.starter) || (b.overall || 0) - (a.overall || 0));
      players.forEach((player, index) => {
        if (!player.star) {
          player.name = licenseName(player.name || generatedName(teamId, index), hash(`${teamId}-${index}-${player.name || ''}`));
          player.pos = player.pos || POS_SEQUENCE[index % POS_SEQUENCE.length];
          player.sortOrder = posRank(player.pos) * 100 + index;
          rebalancePlayer(player, team, index);
        }
      });
    });

    state.market?.forEach((player, index) => {
      player.name = licenseName(player.name || generatedName('market', index), hash(`market-${index}-${player.name || ''}`));
      player.pos = player.pos || POS_SEQUENCE[index % POS_SEQUENCE.length];
      rebalancePlayer(player, { rep: 62, div: 'br-b', id: 'market' }, index % 24);
    });

    state.players.sort((a, b) => {
      if (a.teamId !== b.teamId) return String(a.teamId).localeCompare(String(b.teamId));
      return (a.sortOrder || posRank(a.pos) * 100) - (b.sortOrder || posRank(b.pos) * 100) || (b.overall || 0) - (a.overall || 0);
    });

    state.rosterPolishVersion = VERSION;
    state.news = Array.isArray(state.news) ? state.news : [];
    state.news.unshift('Elencos atualizados com nomes licenciáveis, ordem por posição e novo balanceamento de overall.');
    return state;
  }

  function patchSave() {
    const original = Storage.prototype.setItem;
    if (Storage.prototype.__boleirosRosterPolish) return;
    Storage.prototype.setItem = function setItemPatched(key, value) {
      if (String(key).startsWith('boleiros_save')) {
        try {
          const state = JSON.parse(value);
          value = JSON.stringify(polishState(state));
        } catch {}
      }
      return original.call(this, key, value);
    };
    Storage.prototype.__boleirosRosterPolish = true;
  }

  function patchExistingSave() {
    for (const key of SAVE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const state = JSON.parse(raw);
        if (state?.rosterPolishVersion === VERSION) continue;
        localStorage.setItem(key, JSON.stringify(polishState(state)));
        sessionStorage.setItem('boleiros_roster_polished_reload', '1');
        location.reload();
        break;
      } catch {}
    }
  }

  function orderVisibleTables() {
    document.querySelectorAll('table').forEach(table => {
      const headers = [...table.querySelectorAll('th')].map(th => th.textContent.trim().toLowerCase());
      const posIndex = headers.findIndex(text => text === 'pos');
      if (posIndex < 0) return;
      const rows = [...table.querySelectorAll('tr')].slice(1);
      rows.sort((a, b) => {
        const pa = a.children[posIndex]?.textContent?.trim() || '';
        const pb = b.children[posIndex]?.textContent?.trim() || '';
        return posRank(pa) - posRank(pb);
      });
      rows.forEach(row => table.tBodies[0]?.appendChild(row));
    });
  }

  polishDatabase();
  patchSave();
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(patchExistingSave, 250);
    const observer = new MutationObserver(() => requestAnimationFrame(orderVisibleTables));
    observer.observe(document.body, { childList: true, subtree: true });
    orderVisibleTables();
  });
})();
