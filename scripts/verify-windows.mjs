
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, copyFile, readFile, rm, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';
import { createServer } from 'node:net';

const root = fileURLToPath(new URL('../', import.meta.url));
const cache = join(root, '.cache');
await mkdir(cache, { recursive: true });
const profile = await mkdtemp(join(cache, 'portable-test-'));
const original = join(root, 'dist', 'FrameTracker.exe');
const replacement = join(profile, 'FrameTracker-replacement.exe');
await copyFile(original, replacement);
const probe = createServer();
const listening = once(probe, 'listening');
probe.listen(0, '127.0.0.1');
await listening;
const port = probe.address().port;
await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
const children = new Set();
function launch(file, source = false) {
  const child = spawn(file, source ? [join(root, 'server.cjs'), '--no-browser'] : ['--no-browser'], {
    cwd: profile, windowsHide: true, env: { ...process.env, LOCALAPPDATA: profile, PORT: String(port) },
  });
  children.add(child);
  child.once('exit', () => children.delete(child));
  child.stderr.on('data', chunk => process.stderr.write(chunk));
  return child;
}
async function ready(child, port) {
  const url = 'http://127.0.0.1:' + port;
  for (let attempt = 0; attempt < 50; attempt++) {
    assert.equal(child.exitCode, null, 'App stopped before becoming ready');
    const response = await fetch(url + '/api/runtime', { signal: AbortSignal.timeout(250) }).catch(() => null);
    if (response?.ok && (await response.json()).portable === (child.spawnfile !== process.execPath)) return url;
    await setTimeout(100);
  }
  throw new Error('No response on ' + url);
}
async function stop(child) {
  if (!children.has(child)) return;
  const exited = once(child, 'exit');
  child.kill();
  await exited;
}
const get = async url => (await fetch(url + '/api/progress')).json();
const put = (url, revision, state, origin = url) => fetch(url + '/api/progress', {
  method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: origin, 'X-FrameTracker': '1' },
  body: JSON.stringify({ revision, state }),
});

try {
  const first = launch(original);
  const url = await ready(first, port);
  const catalog = await (await fetch(url + '/catalog.json')).json();
  const frame = catalog.frames.find(frame => frame.name === 'Equinox Prime');
  assert.equal(await (await fetch(url)).status, 200);
  assert.match(await (await fetch(url + '/i18n.js')).text(), /export function setLanguage/);
  assert.match(await (await fetch(url)).text(), /id="settings-controls"/);
  const themeSource = await (await fetch(url + '/themes.js')).text();
  assert.match(themeSource, /export function resolveTheme/);
  assert.match(themeSource, /"id": "nightwave"/);
  assert.match(await (await fetch(url + '/orokin.css')).text(), /prefers-reduced-motion/);
  for (const name of ['material-icons.json', 'frame-names.js', 'frame-localization.js', 'outside-dismiss.js']) {
    const response = await fetch(url + '/' + name);
    assert.equal(response.status, 200, name + ' is embedded');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(join(root, 'public', name)), name + ' matches release source');
  }
  const appSource = await (await fetch(url + '/app.js')).text();
  assert.match(appSource, /from '\.\/frame-localization\.js'/);
  assert.match(appSource, /installOutsideDismiss\(dialog\)/);
  assert.equal((await get(url)).state, null);
  const state = { frames: { [frame.id]: { done: true, paid: 72, parts: { [frame.recipe.id]: 1 } } }, stock: { credits: 14100 } };
  assert.equal((await put(url, null, state, 'https://example.com')).status, 403);
  const saved = await put(url, null, state);
  assert.equal(saved.status, 200);
  const { revision } = await saved.json();
  assert.equal((await put(url, null, { frames: {}, stock: {} })).status, 409);
  assert.deepEqual(JSON.parse(await readFile(join(profile, 'FrameTracker', 'progress.json'), 'utf8')), { revision, state });
  assert.deepEqual(await get(url), { revision, state });
  const duplicate = launch(original);
  assert.equal((await once(duplicate, 'exit'))[0], 0);
  await stop(first);
  const dev = launch(process.execPath, true);
  await ready(dev, port);
  const updated = launch(replacement);
  const newUrl = await ready(updated, port + 1);
  assert.deepEqual(await get(newUrl), { revision, state });
  const newState = { ...state, stock: { credits: 25 } };
  assert.equal((await put(newUrl, revision, newState)).status, 200);
  assert.deepEqual((await get(newUrl)).state, newState);
  await stop(dev);
  const fallbackDuplicate = launch(original);
  assert.equal((await once(fallbackDuplicate, 'exit'))[0], 0);
  console.log('Portable Windows smoke test passed: FT-17/18/19 embedded assets, catalog and faction UI, save, conflict, repeat launch, fallback port, and moved EXE.');
} finally {
  await Promise.all([...children].map(stop));
  const storage = join(profile, 'FrameTracker');
  for (const name of ['progress.json', 'progress.json.tmp']) await rm(join(storage, name), { force: true });
  await rmdir(storage).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await rm(replacement, { force: true });
  await rmdir(profile);
}
