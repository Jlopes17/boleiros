'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const listeners = {};
const storage = new Map();
const element = () => ({
  innerHTML: '', textContent: '', value: '',
  classList: { add() {}, remove() {}, toggle() {} },
  querySelector() { return null; }
});
const app = element();
const modal = element();
const box = element();
const toast = element();
const inputs = {
  '#coach': { value: 'Teste' },
  '#clubSelect': { value: 'manaus' },
  '#difficulty': { value: 'Normal' }
};

const document = {
  getElementById(id) { return ({ app, modal, box, toast })[id] || element(); },
  querySelector(selector) { return inputs[selector] || null; },
  addEventListener(type, handler) { listeners[type] = handler; }
};
const localStorage = {
  getItem(key) { return storage.get(key) || null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
  clear() { storage.clear(); }
};
const context = {
  window: null, document, localStorage, console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  performance: { now: () => 0 }, confirm: () => true
};
context.window = context;
vm.createContext(context);

['data/brazil-2026.js', 'data/south-america-2026.js', 'data/serie-a-rosters-2026.js', 'data/serie-b-rosters-2026.js', 'game.js'].forEach(file => {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
});

assert.ok(context.BOLEIROS_DB.clubs.length >= 300);
assert.equal(new Set(context.BOLEIROS_DB.clubs.map(club => club.id)).size, context.BOLEIROS_DB.clubs.length);
assert.equal(Object.keys(context.BOLEIROS_DB.rosters).length, 40);
assert.ok(Object.values(context.BOLEIROS_DB.rosters).flat().length >= 1390);
assert.ok(Object.keys(context.BOLEIROS_DB.rosters).every(id => context.BOLEIROS_DB.clubs.some(club => club.id === id)));

listeners.click({ target: { closest: () => ({ dataset: { start: 'create' } }) } });
const save = JSON.parse(storage.get('boleiros_save_v9'));
assert.equal(save.version, 9);
assert.equal(save.databaseVersion, 'sa-2026.2');
assert.ok(save.teams.length >= 300);
assert.equal(save.user.teamId, 'manaus');
const serieD = save.competitions.find(comp => comp.division === 'br-d' && comp.participants.includes('manaus'));
assert.equal(serieD.participants.length, 6);
assert.equal(Math.max(...save.fixtures.filter(f => f.competition === serieD.name).map(f => f.round)), 10);
assert.equal(save.players.filter(player => player.teamId === 'manaus' && player.star).length, 1);

listeners.click({ target: { closest: () => ({ dataset: { action: 'newSeason' } }) } });
const seasonTwo = JSON.parse(storage.get('boleiros_save_v9'));
assert.equal(seasonTwo.season, 2);
assert.equal(seasonTwo.teams.filter(team => team.div === 'br-a').length, 20);
assert.equal(seasonTwo.teams.filter(team => team.div === 'br-b').length, 20);
assert.equal(seasonTwo.teams.filter(team => team.div === 'br-c').length, 24);
assert.equal(seasonTwo.teams.filter(team => team.div === 'br-d').length, 92);
assert.equal(seasonTwo.history.length, 1);

for (let season = 3; season <= 5; season++) {
  listeners.click({ target: { closest: () => ({ dataset: { action: 'newSeason' } }) } });
  const multiSeason = JSON.parse(storage.get('boleiros_save_v9'));
  assert.equal(multiSeason.season, season);
  assert.equal(multiSeason.teams.filter(team => team.div === 'br-a').length, 20);
  assert.equal(multiSeason.teams.filter(team => team.div === 'br-b').length, 20);
  assert.equal(multiSeason.teams.filter(team => team.div === 'br-c').length, 24);
  assert.equal(multiSeason.teams.filter(team => team.div === 'br-d').length, 92);
}
const seasonFive = JSON.parse(storage.get('boleiros_save_v9'));
assert.ok(seasonFive.teams.every(team => seasonFive.players.filter(player => player.teamId === team.id).length >= 22));
assert.ok(seasonFive.teams.every(team => seasonFive.players.filter(player => player.teamId === team.id && player.starter).length <= 11));

console.log('Smoke test passed:', {
  clubs: seasonFive.teams.length,
  players: seasonFive.players.length,
  serieDGroup: serieD.name,
  rounds: 10,
  season: seasonFive.season
});
