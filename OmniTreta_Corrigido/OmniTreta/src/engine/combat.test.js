import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, resolveAction, autoAction, getTurnOrder } from './combat.js';
const c = (id, initiative, abilities) => ({ id, name: id, stats: { hp: 100, attack: 20, initiative, armor: 0, dodge: 0, critical: 0 }, abilities });
const hit = { id: 'hit', name: 'Hit', cooldown: 0, effects: [{ id: 'damage', target: 'enemy', power: 1 }] };
const delay = { id: 'delay', name: 'Delay', cooldown: 0, effects: [{ id: 'delay', target: 'pending_enemies', power: 20 }] };
const universe = { characters: [c('a', 30, [delay, hit]), c('b', 20, [hit]), c('c', 25, [hit]), c('d', 10, [hit])] };
test('atraso reordena apenas personagens pendentes', () => { let s = createBattle(universe, [['a', 'b'], ['c', 'd']]); assert.equal(s.turn, '0:0'); s = resolveAction(s, 'delay', null, () => .99); assert.equal(s.turn, '0:1'); assert.equal(s.delays['1:0'], 20); assert.equal(s.delays['1:1'], 20); });
test('ataque automático básico escolhe alvo válido', () => { let s = createBattle(universe, [['a'], ['c']]); s = autoAction(s, () => .99); assert.equal(s.turn, '1:0'); });
test('interação de fogo remove congelamento', () => { const fire = { id: 'fire', name: 'Fire', cooldown: 0, effects: [{ id: 'burn', target: 'enemy', power: 5, duration: 2 }] }; const ice = { id: 'ice', name: 'Ice', cooldown: 0, effects: [{ id: 'freeze', target: 'enemy', power: 6, duration: 2 }] }; const u = { characters: [c('a', 30, [ice, fire]), c('b', 10, [hit])] }; let s = createBattle(u, [['a'], ['b']]); s = resolveAction(s, 'ice', '1:0'); assert.ok(s.units[1].status.some(x => x.id === 'freeze')); s = resolveAction(s, 'hit', '0:0', () => .99); s = resolveAction(s, 'fire', '1:0'); assert.ok(!s.units[1].status.some(x => x.id === 'freeze')); });

