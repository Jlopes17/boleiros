import fs from 'node:fs/promises';
import vm from 'node:vm';

const YEAR = 2026;
const divisions = ['serie-a', 'serie-b', 'serie-c', 'serie-d'];
const base = 'https://www.cbf.com.br/futebol-brasileiro';

const decode = value => value
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&aacute;/gi, 'á').replace(/&atilde;/gi, 'ã').replace(/&acirc;/gi, 'â')
  .replace(/&eacute;/gi, 'é').replace(/&ecirc;/gi, 'ê').replace(/&iacute;/gi, 'í')
  .replace(/&oacute;/gi, 'ó').replace(/&ocirc;/gi, 'ô').replace(/&otilde;/gi, 'õ')
  .replace(/&uacute;/gi, 'ú').replace(/&ccedil;/gi, 'ç');
const text = html => decode(html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\b(saf|fc|futebol clube|clube)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

async function request(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'BoleirosDataUpdater/1.0 (+https://github.com/Jlopes17/boleiros)' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

async function loadClubs() {
  const context = { window: {} };
  context.window = context;
  vm.createContext(context);
  for (const file of ['data/brazil-2026.js', 'data/south-america-2026.js']) {
    vm.runInContext(await fs.readFile(file, 'utf8'), context, { filename: file });
  }
  return context.BOLEIROS_DB.clubs;
}

function teamLinks(html, division) {
  const pattern = new RegExp(`/times/campeonato-brasileiro/${division}/${YEAR}/\\d+`, 'g');
  return [...new Set([...html.matchAll(pattern)].map(match => new URL(match[0], base).href))];
}

function parseTeamPage(html) {
  const heading = text((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [,''])[1]).replace(/\s+-\s+[A-Z]{2}\s*$/, '');
  const players = [];
  for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(match => text(match[1]));
    if (cells.length < 3 || !cells[0] || /^nome$/i.test(cells[0])) continue;
    players.push({ fullName: cells[0], name: cells[1] || cells[0], currentClub: cells[2] });
  }
  return { heading, players };
}

const clubs = await loadClubs();
const byName = new Map(clubs.map(club => [normalize(club.name), club]));
const rosters = {};
const failures = [];

for (const division of divisions) {
  try {
    const table = await request(`${base}/tabelas/campeonato-brasileiro/${division}/${YEAR}`);
    const links = teamLinks(table, division);
    for (const link of links) {
      try {
        const parsed = parseTeamPage(await request(link));
        const club = byName.get(normalize(parsed.heading));
        if (!club || !parsed.players.length) continue;
        const registered = parsed.players.filter(player => normalize(player.currentClub).includes(normalize(parsed.heading).split(' ')[0]));
        rosters[club.id] = (registered.length ? registered : parsed.players).map(player => ({
          name: player.name,
          fullName: player.fullName,
          source: 'CBF'
        }));
      } catch (error) {
        failures.push(String(error));
      }
    }
  } catch (error) {
    failures.push(String(error));
  }
}

if (Object.keys(rosters).length < 40) {
  throw new Error(`Roster update aborted: only ${Object.keys(rosters).length} clubs parsed. ${failures.slice(0, 5).join(' | ')}`);
}

const output = `(() => {\n  'use strict';\n  if (!window.BOLEIROS_DB) return;\n  const data = ${JSON.stringify(rosters, null, 2)};\n  Object.entries(data).forEach(([clubId, players]) => {\n    window.BOLEIROS_DB.rosters[clubId] = players.map(player => player.name);\n    window.BOLEIROS_DB.rosterDetails = window.BOLEIROS_DB.rosterDetails || {};\n    window.BOLEIROS_DB.rosterDetails[clubId] = players;\n  });\n  window.BOLEIROS_DB.cbfRosterUpdatedAt = '${new Date().toISOString().slice(0, 10)}';\n})();\n`;
await fs.writeFile('data/cbf-rosters-2026.js', output);
console.log(`Updated ${Object.keys(rosters).length} clubs. Failures: ${failures.length}`);
