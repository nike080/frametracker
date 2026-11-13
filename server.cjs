
const { createServer } = require('node:http');
const { mkdir, readFile, rename, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { isSea, getAsset } = require('node:sea');
const { homedir } = require('node:os');

const portable = isSea();
const dataDir = portable
  ? join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'FrameTracker')
  : join(__dirname, '.cache');
const asset = async name => portable ? Buffer.from(getAsset(name)) : readFile(join(__dirname, 'public', name));
const progressFile = join(dataDir, 'progress.json');
const cacheFile = join(dataDir, 'market.json');
const port = Number(process.env.PORT ?? 4187);
const ports = portable ? [port, port + 1] : [port];
const noBrowser = process.argv.includes('--no-browser');

async function main() {
  const catalog = JSON.parse(await asset('catalog.json'));
  const { availabilityService } = await import('data:text/javascript;base64,' + (await asset('availability.js')).toString('base64'));
  const availabilityFile = join(dataDir, 'availability.json');
  const initialAvailability = await readFile(availabilityFile, 'utf8').then(JSON.parse).catch(() => ({}));
  const availability = availabilityService({ frames: catalog.frames, initial: initialAvailability,
    persist: async snapshot => { await mkdir(dataDir, { recursive: true }); await writeFile(availabilityFile, JSON.stringify(snapshot)); } });
  const slugs = new Set(catalog.frames.flatMap(frame =>
    [frame.market, frame.recipe?.market, ...(frame.recipe?.parts ?? []).map(part => part.market)].filter(Boolean)));
  const cache = await readFile(cacheFile, 'utf8').then(JSON.parse).catch(() => ({}));
  const pending = new Map();
  let queue = Promise.resolve();
  let nextRequest = 0;
  let pausedUntil = 0;
  const day = 24 * 60 * 60 * 1000;

  function quote(slug) {
    if (Date.now() - Date.parse(cache[slug]?.date) < day) return Promise.resolve(cache[slug]);
    if (pending.has(slug)) return pending.get(slug);
    const task = queue.then(async () => {
      if (Date.now() < pausedUntil) return { ...cache[slug], stale: true, error: true };
      await new Promise(resolve => setTimeout(resolve, Math.max(0, nextRequest - Date.now())));
      nextRequest = Date.now() + 550;
      try {
        const response = await fetch('https://api.warframe.market/v2/orders/item/' + slug + '/top', {
          headers: { 'User-Agent': 'FrameTracker/1.6.0 personal Warframe collection tracker', Platform: 'pc', Crossplay: 'true' },
          signal: AbortSignal.timeout(8500),
        });
        if (response.status === 429 || response.status === 403) {
          const seconds = Number(response.headers.get('retry-after')) || 60;
          pausedUntil = Date.now() + seconds * 1000;
        }
        if (!response.ok) throw new Error('Market HTTP ' + response.status);
        const { data } = await response.json();
        const prices = data.sell.filter(order => order.perTrade === 1 && Number.isFinite(order.platinum)).map(order => order.platinum);
        const result = { price: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) * 10 / prices.length) / 10 : null,
          count: prices.length, date: new Date().toISOString() };
        cache[slug] = result;
        await mkdir(dataDir, { recursive: true });
        await writeFile(cacheFile, JSON.stringify(cache));
        return result;
      } catch (error) {
        console.warn(slug, error.message);
        if (!cache[slug]) pausedUntil = Math.max(pausedUntil, Date.now() + 5000);
        return { ...cache[slug], stale: true, error: true };
      }
    });
    pending.set(slug, task);
    queue = task.catch(() => {});
    void task.then(() => pending.delete(slug), () => pending.delete(slug));
    return task;
  }

  const files = {
    '/': ['index.html', 'text/html'], '/style.css': ['style.css', 'text/css'],
    '/app.js': ['app.js', 'text/javascript'], '/model.js': ['model.js', 'text/javascript'],
    '/i18n.js': ['i18n.js', 'text/javascript'],
    '/themes.js': ['themes.js', 'text/javascript'], '/orokin.css': ['orokin.css', 'text/css'],
    '/availability.js': ['availability.js', 'text/javascript'],
    '/catalog.json': ['catalog.json', 'application/json'], '/mark.svg': ['mark.svg', 'image/svg+xml'],
    '/material-icons.json': ['material-icons.json', 'application/json'],
    '/relic-icons.json': ['relic-icons.json', 'application/json'],
    '/frame-names.js': ['frame-names.js', 'text/javascript'],
    '/frame-localization.js': ['frame-localization.js', 'text/javascript'],
    '/outside-dismiss.js': ['outside-dismiss.js', 'text/javascript'],
  };
  function json(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  }

  async function readProgress() {
    try {
      const saved = JSON.parse(await readFile(progressFile, 'utf8'));
      if (typeof saved.revision !== 'string' || !validState(saved.state)) throw new Error('Invalid progress file');
      return saved;
    } catch (error) {
      if (error.code === 'ENOENT') return { revision: null, state: null };
      throw error;
    }
  }
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function validState(value) {
    return record(value) && record(value.frames) && record(value.stock);
  }
  let progressQueue = Promise.resolve();
  async function writeProgress(req, res) {
    if (req.headers['x-frametracker'] !== '1' || req.headers.origin !== 'http://' + req.headers.host ||
        !/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) {
      return json(res, { error: 'Forbidden' }, 403);
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size <= 1024 * 1024) chunks.push(chunk);
    }
    if (size > 1024 * 1024) return json(res, { error: 'Progress is too large' }, 413);
    let input;
    try { input = JSON.parse(Buffer.concat(chunks)); }
    catch { return json(res, { error: 'Invalid JSON' }, 400); }
    if (!input || !validState(input.state) || (input.revision !== null && typeof input.revision !== 'string')) {
      return json(res, { error: 'Invalid progress' }, 400);
    }
    const task = progressQueue.then(async () => {
      const current = await readProgress();
      if (input.revision !== current.revision) return json(res, { error: 'Progress has changed' }, 409);
      const revision = randomUUID();
      const temporary = progressFile + '.tmp';
      await mkdir(dataDir, { recursive: true });
      await writeFile(temporary, JSON.stringify({ revision, state: input.state }) + '\n', { flush: true });
      await rename(temporary, progressFile);
      json(res, { revision });
    });
    progressQueue = task.catch(() => {});
    return task;
  }
  const server = createServer(async (req, res) => {
    const localPort = server.address().port;
    if (req.headers.host !== '127.0.0.1:' + localPort && (portable || req.headers.host !== 'localhost:' + localPort)) {
      return json(res, { error: 'Invalid host' }, 403);
    }
    const path = new URL(req.url, 'http://localhost').pathname;
    if (portable && path === '/api/progress') {
      try {
        if (req.method === 'GET') return json(res, await readProgress());
        if (req.method === 'PUT') return await writeProgress(req, res);
        return json(res, { error: 'Method not allowed' }, 405);
      } catch (error) {
        console.error('Progress file:', error.message);
        return json(res, { error: 'Progress unavailable' }, 500);
      }
    }
    if (req.method !== 'GET') return json(res, { error: 'Method not allowed' }, 405);
    if (path === '/api/runtime') return json(res, { app: 'frametracker', portable });
    if (path === '/api/availability') {
      try { return json(res, await availability(new URL(req.url, 'http://localhost').searchParams.get('refresh') === '1')); }
      catch { return json(res, { frames: {}, sources: {}, stale: true, error: true }, 503); }
    }
    if (path === '/api/prices') return json(res, cache);
    if (path.startsWith('/api/price/')) {
      const slug = path.slice('/api/price/'.length);
      return slugs.has(slug) ? json(res, await quote(slug)) : json(res, { error: 'Unknown item' }, 404);
    }
    if (!Object.hasOwn(files, path)) return json(res, { error: 'Not found' }, 404);
    const [file, mime] = files[path];
    try {
      const body = await asset(file);
      res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch {
      json(res, { error: 'Unavailable' }, 500);
    }
  });
  function listen(port) {
    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    });
  }
  function openBrowser(url) {
    if (!portable || noBrowser) return;
    const browser = spawn(join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'rundll32.exe'),
      ['url.dll,FileProtocolHandler', url], { detached: true, stdio: 'ignore', windowsHide: true });
    browser.on('error', () => console.error('Open this URL in your browser: ' + url));
    browser.unref();
  }
  async function existingPortable(url) {
    const existing = await fetch(url + '/api/runtime', { signal: AbortSignal.timeout(1500) })
      .then(response => response.json()).catch(() => null);
    return existing?.app === 'frametracker' && existing.portable;
  }
  if (portable) {
    const urls = ports.map(port => 'http://127.0.0.1:' + port);
    const running = await Promise.all(urls.map(existingPortable));
    const existing = urls[running.indexOf(true)];
    if (existing) {
      openBrowser(existing);
      return;
    }
  }
  for (const port of ports) {
    const url = 'http://127.0.0.1:' + port;
    try {
      await listen(port);
    } catch (error) {
      if (!portable || error.code !== 'EADDRINUSE') throw error;
      if (await existingPortable(url)) {
        openBrowser(url);
        return;
      }
      continue;
    }
    const activeUrl = 'http://127.0.0.1:' + server.address().port;
    console.log('FrameTracker · ' + activeUrl);
    if (portable) console.log('Keep this window open while using FrameTracker. Close it to exit.');
    openBrowser(activeUrl);
    return;
  }
  throw new Error('FrameTracker could not use local ports ' + ports.join(' or ') + '.');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
  if (portable && !noBrowser && process.stdin.isTTY) {
    console.error('Press Enter to close.');
    process.stdin.once('data', () => process.stdin.pause());
    process.stdin.resume();
  }
});
