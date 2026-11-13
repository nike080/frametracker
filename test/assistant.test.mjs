import test from 'node:test';
import assert from 'node:assert/strict';
import { empty, knownStock, normalizeStock, normalizeContext, nextAction, progressHistory, restoreProgress } from '../public/model.js';
import { checkCatalog } from '../scripts/check-catalog.mjs';

const node = (id, parts = [], count = 1) => ({ id, count, parts, materials: [{ id: 'credits', count: 10 }], drops: [] });
const child = node('/Lotus/child');
const frame = { id: '/Lotus/frame', recipe: node('/Lotus/root', [child]) };
const setup = () => { const state = empty(); state.frames[frame.id] = { parts: {} }; return state; };

test('stock preserves explicit zero through serialization and rejects malformed legacy quantities', () => {
  const state = setup();
  assert.equal(knownStock(state, 'credits'), false);
  state.stock = normalizeStock({ credits: 0, '/Lotus/x': 12, '/Lotus/y': '3', '/Lotus/z': -2, '/Lotus/n': null, invalid: 4 });
  assert.deepEqual(JSON.parse(JSON.stringify(state.stock)), { credits: 0, '/Lotus/x': 12 });
  assert.equal(knownStock(state, 'credits'), true);
  delete state.stock.credits;
  assert.equal(knownStock(state, 'credits'), false);
});

test('recipe advice advances through acquisition, child stock, crafting, parent and completion', () => {
  const state = setup(), saved = state.frames[frame.id];
  assert.equal(nextAction(frame, state).node.id, frame.recipe.id);
  saved.parts[frame.recipe.id] = 1;
  assert.equal(nextAction(frame, state).node.id, child.id);
  saved.parts[child.id] = 1;
  assert.equal(nextAction(frame, state).kind, 'check');
  state.stock.credits = 0;
  assert.equal(nextAction(frame, state).kind, 'farm');
  assert.equal(nextAction(frame, state).gap, 10);
  state.stock.credits = 10;
  assert.equal(nextAction(frame, state).kind, 'craft');
  assert.equal(nextAction(frame, state).root, false);
  saved.parts[child.id] = 2;
  assert.equal(nextAction(frame, state).root, true);
  saved.done = true;
  assert.deepEqual(nextAction(frame, state), { kind: 'complete' });
});

test('nested completed branches are skipped and missing recipes do not invent actions', () => {
  const nested = { ...frame, recipe: node('/Lotus/root', [node('/Lotus/middle', [child])]) };
  const state = setup();
  state.frames[frame.id].parts = { '/Lotus/root': 1, '/Lotus/middle': 2 };
  assert.equal(nextAction(nested, state).kind, 'check');
  assert.equal(nextAction(nested, state).node.id, '/Lotus/root');
  assert.deepEqual(nextAction({ id: 'other', recipe: null }, state), { kind: 'unavailable' });
});

test('context survives serialization and undo without inventing legacy history', () => {
  const state = setup();
  state.notes[frame.id] = '<my note>';
  state.lastChange = { kind: 'note', frameId: frame.id, at: '2026-11-13T10:00:00Z' };
  assert.deepEqual(normalizeContext(JSON.parse(JSON.stringify(state)), [frame]), { notes: state.notes, lastChange: state.lastChange });
  assert.deepEqual(normalizeContext({ notes: [], lastChange: { kind: 'note', frameId: frame.id, at: 'bad' } }, [frame]), { notes: {}, lastChange: null });
  const history = progressHistory(); history.capture(state);
  delete state.notes[frame.id]; state.stock.credits = 0;
  const restored = history.undo();
  assert.equal(restored.notes[frame.id], '<my note>');
  assert.equal(knownStock(restored, 'credits'), false);
});

test('catalog checker separates broken material references from unknown acquisition data', () => {
  const result = checkCatalog({ frames: [frame], materials: {}, relicLocations: {} });
  assert.equal(result.errors.length, 2);
  assert.equal(result.warnings.length, 2);
});

test('actual save restore supports legacy state and full progress export/import round trip', () => {
  const legacy = { frames: { [frame.id]: { done: false, parts: { [child.id]: 2 } } }, stock: { credits: 0 } };
  const restored = restoreProgress(legacy, [frame]);
  assert.equal(restored.stock.credits, 0);
  assert.equal(restored.frames[frame.id].parts[child.id], 2);
  assert.deepEqual(restored.notes, {});
  restored.goals = [frame.id];
  restored.notes[frame.id] = 'Continue later';
  restored.lastChange = { kind: 'note', frameId: frame.id, at: '2026-11-13T10:00:00Z' };
  assert.deepEqual(restoreProgress(JSON.parse(JSON.stringify(restored)), [frame]), restored);
  delete legacy.stock.credits;
  assert.equal(knownStock(restoreProgress(legacy, [frame]), 'credits'), false);
  for (const bad of [null, [], { frames: {}, stock: null }]) assert.throws(() => restoreProgress(bad, [frame]));
});
