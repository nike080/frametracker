import test from 'node:test';
import assert from 'node:assert/strict';
import { empty, normalizeGoals, scopedFrames, demand, progressHistory } from '../public/model.js';

const recipe = (id, count) => ({ id, parts: [], materials: [{ id: 'credits', count }] });
const frames = [
  { id: '/Lotus/a', recipe: recipe('a', 10) },
  { id: '/Lotus/b', recipe: recipe('b', 20) },
  { id: '/Lotus/c', recipe: recipe('c', 100) },
  { id: '/Lotus/exclusive', recipe: null },
];

test('goal normalization retains order and rejects invalid, duplicate and recipe-less entries', () => {
  assert.deepEqual(normalizeGoals(['/Lotus/b', null, '/Lotus/a', '/Lotus/b', '/Lotus/exclusive', 'unknown'], frames), ['/Lotus/b', '/Lotus/a']);
  for (const value of [undefined, null, {}, 'a']) assert.deepEqual(normalizeGoals(value, frames), []);
});

test('selected demand excludes unrelated frames and subtracts shared stock only once', () => {
  const state = empty();
  state.goals = ['/Lotus/b', '/Lotus/a'];
  state.stock.credits = 25;
  const selected = scopedFrames(frames, state, 'goals');
  assert.deepEqual(selected.map(frame => frame.id), state.goals);
  assert.equal(demand(selected, state).get('credits') - state.stock.credits, 5);
  assert.equal(demand(scopedFrames(frames, state, 'all'), state).get('credits'), 130);
  state.frames['/Lotus/b'] = { done: true, parts: {} };
  assert.equal(demand(selected, state).get('credits'), 10);
  assert.equal(scopedFrames(frames, state, 'goals').length, 2);
});

test('empty and legacy goals never silently become collection demand', () => {
  const legacy = { frames: {}, stock: { credits: 10 } };
  assert.deepEqual(scopedFrames(frames, legacy, 'goals'), []);
  assert.equal(demand(scopedFrames(frames, empty(), 'goals'), empty()).size, 0);
});

test('goals survive JSON export/import normalization', () => {
  const state = empty();
  state.goals = ['/Lotus/b', '/Lotus/a'];
  const restored = JSON.parse(JSON.stringify(state));
  assert.deepEqual(normalizeGoals(restored.goals, frames), state.goals);
});

test('one-step history restores isolated stock, component and goal state and is consumed', () => {
  const history = progressHistory();
  const state = empty();
  state.frames['/Lotus/a'] = { parts: { a: 1 } };
  state.goals = ['/Lotus/a'];
  assert.equal(history.available, false);
  history.capture(state);
  state.frames['/Lotus/a'].parts.a = 2;
  state.stock.credits = 99;
  state.goals.push('/Lotus/b');
  const before = history.undo();
  assert.equal(before.frames['/Lotus/a'].parts.a, 1);
  assert.deepEqual(before.stock, {});
  assert.deepEqual(before.goals, ['/Lotus/a']);
  assert.equal(history.available, false);
  assert.equal(history.undo(), undefined);
  history.capture(state);
  state.stock.credits = 100;
  assert.equal(history.undo().stock.credits, 99);
});
