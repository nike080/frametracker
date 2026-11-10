
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { collected, demand, empty, estimate, flatten } from '../public/model.js';

const catalog = JSON.parse(await readFile(new URL('../public/catalog.json', import.meta.url)));
const frame = name => catalog.frames.find(item => item.name === name);

test('Equinox tracks nine distinct blueprints and keeps the other aspect in demand', () => {
  const equinox = frame('Equinox');
  const [day, night] = equinox.recipe.parts;
  assert.equal(day.parts.length, 3);
  assert.equal(night.parts.length, 3);
  assert.equal(new Set(flatten(equinox.recipe).map(part => part.id)).size, 9);
  const state = empty();
  state.frames[equinox.id] = { parts: { [day.id]: 2 } };
  assert.deepEqual(collected(equinox, state), { done: false, total: 9, have: 4 });
  assert.equal(demand([equinox], state).get('credits'),
    equinox.recipe.materials.find(row => row.id === 'credits').count +
    flatten(night).reduce((sum, part) => sum + part.materials.find(row => row.id === 'credits').count, 0));
  state.frames[equinox.id].done = true;
  assert.equal(demand([equinox], state).size, 0);
});

test('standard frames have trackable slots, except for the known quest and nested recipes', () => {
  const normal = catalog.frames.filter(item => !item.prime && !['Equinox', 'Excalibur Umbra'].includes(item.name));
  for (const item of normal) {
    assert.equal(item.recipe.parts.length, 3, item.name);
    assert.ok(flatten(item.recipe).every(part => part.drops.length), item.name);
  }
  assert.equal(frame('Excalibur Umbra').recipe.parts.length, 0);
  const chroma = frame('Chroma');
  assert.ok(chroma.recipe.materials.some(row => catalog.materials[row.id].name === 'Volt Neuroptics'));
});

test('catalog IDs and Prime listings are complete, excluding the Founders exclusive', () => {
  assert.match(catalog.gameVersion, /^\d+\.\d+/);
  assert.equal(new Set(catalog.frames.map(item => item.id)).size, catalog.frames.length);
  const founder = frame('Excalibur Prime');
  assert.equal(founder.founder, true);
  assert.equal(founder.market, undefined);
  assert.equal(founder.recipe, null);
  for (const prime of catalog.frames.filter(item => item.prime && !item.founder)) {
    assert.equal(flatten(prime.recipe).length, 4);
    assert.ok(prime.market);
    assert.ok(flatten(prime.recipe).every(part => part.market && part.relics.length));
  }
});

test('catalog includes English recipe labels and editorial acquisition notes', () => {
  const cyrillic = /\p{Script=Cyrillic}/u;
  for (const { name, recipe } of catalog.frames) {
    for (const part of flatten(recipe)) {
      assert.ok(part.en, name + ' / ' + part.name);
      assert.doesNotMatch(part.en, cyrillic);
      for (const drop of part.drops) {
        if (!cyrillic.test(drop.where)) continue;
        assert.ok(drop.en, drop.where);
        assert.doesNotMatch(drop.en, cyrillic);
      }
    }
  }
  for (const material of Object.values(catalog.materials)) {
    assert.ok(material.en, material.name);
  }
});

test('price estimate keeps unknown prices separate and uses missing parts when cheaper', () => {
  const prime = frame('Equinox Prime');
  const [root, chassis, neuroptics, systems] = flatten(prime.recipe);
  const state = empty();
  state.frames[prime.id] = { parts: { [root.id]: 1, [chassis.id]: 2 } };
  assert.equal(estimate([prime], state, {}).missing, 1);
  const quotes = { [prime.market]: { price: 42 }, [neuroptics.market]: { price: 12 }, [systems.market]: { price: 8 } };
  assert.equal(estimate([prime], state, quotes).remaining, 20);
  state.frames[prime.id].done = true;
  assert.equal(estimate([prime], state, quotes).assumed, 42);
  state.frames[prime.id].paid = 31;
  assert.equal(estimate([prime], state, quotes).assumed, 31);
  assert.equal(estimate([prime], state, quotes).spent, 31);
});
