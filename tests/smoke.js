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

['data/brazil-2026.js', 'data/serie-a-rosters-2026.js', 'game.js'].forEach(file => {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
});

assert.equal(context.BOLEIROS_DB.clubs.length, 156);
assert.equal(Object.keys(context.BOLEIROS_DB.rosters).length, 20);
assert.ok(Object.values(context.BOLEIROS_DB.rosters).flat().length >= 700);

listeners.click({ target: { closest: () => ({ dataset: { start: 'create' } }) } });
const save = JSON.parse(storage.get('boleiros_save_v9'));
assert.equal(save.version, 9);
assert.equal(save.databaseVersion, 'br-2026.1');
assert.equal(save.teams.length, 156);
assert.equal(save.user.teamId, 'manaus');
const serieD = save.competitions.find(comp => comp.id === 'br-d');
assert.equal(serieD.participants.length, 6);
assert.equal(Math.max(...save.fixtures.filter(f => f.competition === serieD.name).map(f => f.round)), 10);
assert.equal(save.players.filter(player => player.teamId === 'manaus' && player.star).length, 1);

console.log('Smoke test passed:', {
  clubs: save.teams.length,
  players: save.players.length,
  serieDGroup: serieD.name,
  rounds: 10
});
