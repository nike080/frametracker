import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { frameNames, provenance } from '../public/frame-names.js';
import { frameName, matchesFrame, compareFrames, normalizeSearch } from '../public/frame-localization.js';
import { empty, normalizeGoals } from '../public/model.js';

const { frames } = JSON.parse(await readFile(new URL('../public/catalog.json', import.meta.url)));
const ash = frames.find(frame => frame.name === 'Ash');
const prime = frames.find(frame => frame.name === 'Ash Prime');

test('official Russian snapshot covers every frame ID including Prime and Umbra', () => {
  assert.match(provenance.source, /^https:\/\/content\.warframe\.com\/PublicExport\/Manifest\/ExportWarframes_ru\.json!/);
  assert.ok(Number.isFinite(Date.parse(provenance.retrievedAt)));
  assert.deepEqual(Object.keys(frameNames).sort(), frames.map(frame => frame.id).sort());
  for (const frame of frames) {
    assert.match(frameName(frame, 'ru'), /[А-Яа-яЁё]/u, frame.name);
    assert.equal(frameName(frame, 'en'), frame.name);
    if (frame.prime) assert.match(frameName(frame), /Прайм/);
  }
  assert.equal(frameName(ash), 'Эш');
  assert.equal(frameName(frames.find(frame => frame.name === 'Excalibur Umbra')), 'Экскалибур Умбра');
  assert.equal(frameName({ id: 'future', name: 'Future Frame' }), 'Future Frame');
  assert.equal(frameName(undefined), '');
});

test('search matches both languages, partial names, case, whitespace, and е/ё', () => {
  for (const query of ['ЭШ ПРАЙМ', 'ash prime', 'эш пра', '  ASH  ', 'прайм']) assert.ok(matchesFrame(prime, query), query);
  assert.ok(!matchesFrame(ash, 'прайм'));
  assert.ok(!matchesFrame(prime, 'несуществующий'));
  assert.ok(matchesFrame(ash, ''));
  assert.equal(normalizeSearch('  ЁЖ  '), normalizeSearch('еж'));
  assert.ok(matchesFrame({ id: 'test', name: 'Ёж' }, 'ЕЖ'));
});

test('alphabetical order follows displayed locale and preserves the source array', () => {
  const before = frames.map(frame => frame.id);
  const ru = [...frames].sort((a, b) => compareFrames(a, b, 'ru'));
  const en = [...frames].sort((a, b) => compareFrames(a, b, 'en'));
  assert.equal(frameName(ru[0]), 'Атлас');
  assert.equal(en[0].name, 'Ash');
  assert.ok(ru.indexOf(ash) > ru.indexOf(frames.find(frame => frame.name === 'Atlas')));
  const samples = ['Жук', 'Ёж', 'Еж'].map(name => ({ id: name, name }));
  assert.deepEqual(samples.sort((a, b) => compareFrames(a, b)).map(frame => frame.name), ['Еж', 'Ёж', 'Жук']);
  assert.deepEqual(frames.map(frame => frame.id), before);
});

test('language changes do not mutate progress or manually prioritized goals', () => {
  const state = empty();
  state.goals = [prime.id, ash.id];
  state.frames[ash.id] = { done: true, parts: {} };
  const before = JSON.stringify(state);
  for (const language of ['ru', 'en', 'ru']) {
    for (const frame of frames) { frameName(frame, language); matchesFrame(frame, 'эш'); }
    [...frames].sort((a, b) => compareFrames(a, b, language));
    assert.deepEqual(normalizeGoals(state.goals, frames), [prime.id, ash.id]);
    assert.equal(JSON.stringify(state), before);
  }
});
