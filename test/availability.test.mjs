import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRelics, parseTraders, buildAvailability, availabilityService, relicSource } from '../public/availability.js';

const now = Date.parse('2026-11-13T12:00:00Z');
const frame = { id: 'frame', prime: true, recipe: { id: 'bp', parts: [{ id: 'part', parts: [] }] } };
const relic = (id, reward, vaulted) => ({ uniqueName: '/Lotus/Types/Game/Projections/' + id, name: 'Lith ' + id + ' Intact', vaulted,
  rewards: [{ item: { uniqueName: reward } }], locations: [{ location: 'Earth · A' }] });
const raw = [relic('A1', 'bp', false), relic('B1', 'part', true)];
const date = value => ({ $date: { $numberLong: String(value) } });
const world = { PrimeVaultTraders: [{ Activation: date(now - 1000), Expiry: date(now + 600000), Manifest: [
  { ItemType: '/Lotus/StoreItems/Types/Game/Projections/B1', RegularPrice: 1 },
  { ItemType: '/Lotus/StoreItems/Powersuits/FakePrime', PrimePrice: 3 },
], EvergreenManifest: [] }] };
const snapshot = () => ({ relics: { data: parseRelics(raw), date: new Date(now).toISOString() }, traders: { data: parseTraders(world), date: new Date(now).toISOString() } });

test('ordinary relics and current Aya offerings combine into a complete set', () => {
  const result = buildAvailability([frame, { ...frame, id: 'founder', founder: true }], snapshot(), now);
  assert.equal(result.stale, false);
  assert.deepEqual(Object.keys(result.frames), ['frame']);
  assert.equal(result.frames.frame.status, 'available');
  assert.equal(result.frames.frame.available, 2);
  assert.equal(result.frames.frame.resurgence, true);
  assert.equal(result.frames.frame.parts[1].relics[0].channel, 'resurgence');
  assert.equal(result.frames.frame.parts[0].relics[0].channel, 'regular');
});

test('partially available and fully vaulted sets are distinct from unknown rewards', () => {
  const s = snapshot(); s.traders.data[0].relics = [];
  assert.equal(buildAvailability([frame], s, now).frames.frame.status, 'partial');
  s.relics.data[0].vaulted = true;
  assert.equal(buildAvailability([frame], s, now).frames.frame.status, 'vaulted');
  s.relics.data.shift();
  assert.equal(buildAvailability([frame], s, now).frames.frame.status, 'unknown');
});

test('expired rotation, failed source, old and future timestamps never assert current availability', () => {
  for (const mutate of [s => s.traders.data[0].end = now, s => s.traders.error = true,
    s => s.relics.error = true, s => s.relics.date = new Date(now - 900001).toISOString(),
    s => s.relics.date = new Date(now + 1000).toISOString()]) {
    const s = snapshot(); mutate(s);
    const result = buildAvailability([frame], s, now);
    assert.equal(result.frames.frame.status, 'unknown');
    assert.equal(result.stale, true);
  }
});

test('unmapped Aya offer makes negative conclusions unknown, premium bundles do not count', () => {
  const s = snapshot(); s.traders.data[0].relics.push('unknown');
  assert.equal(buildAvailability([frame], s, now).frames.frame.status, 'unknown');
  assert.equal(parseTraders(world)[0].relics.length, 1);
});

test('invalid feeds are rejected and missing vault flag remains unknown', () => {
  for (const value of [null, [], [{}], [{ name: 'Lith A1 Intact', rewards: [] }]]) assert.throws(() => parseRelics(value));
  assert.throws(() => parseTraders({}));
  const s = snapshot(); s.traders.data[0].relics = []; s.relics.data[1].vaulted = null;
  assert.equal(buildAvailability([frame], s, now).frames.frame.status, 'unknown');
});

test('service coalesces requests, caches, retries and preserves cached clues on failure', async () => {
  let clock = now, calls = 0, fail = false, stored;
  const load = availabilityService({ frames: [frame], clock: () => clock,
    fetcher: async url => { calls++; if (fail) throw new Error('offline'); return { ok: true, json: async () => url === relicSource ? raw : world }; },
    persist: async value => { stored = structuredClone(value); } });
  const results = await Promise.all([load(), load(true)]);
  assert.equal(calls, 2); assert.equal(results[0].frames.frame.status, 'available');
  await load(); await load(true); assert.equal(calls, 2);
  clock += 301000; fail = true;
  const stale = await load();
  assert.equal(calls, 4); assert.equal(stale.frames.frame.status, 'unknown');
  assert.equal(stale.frames.frame.parts[0].relics.length, 1);
  assert.equal(stored.relics.error, true);
});

test('corrupt disk cache and cache write failures do not prevent successful online updates', async () => {
  const load = availabilityService({ frames: [frame], initial: { relics: { data: [null] } }, clock: () => now,
    fetcher: async url => ({ ok: true, json: async () => url === relicSource ? raw : world }), persist: async () => { throw new Error('disk'); } });
  assert.equal((await load()).frames.frame.status, 'available');
});
