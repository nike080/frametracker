import { execFile } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import lzma from 'lzma';

const exec = promisify(execFile);
const working = await mkdtemp(join(tmpdir(), 'frametracker-icons-'));
const root = new URL('../', import.meta.url);
const indexUrl = 'https://origin.warframe.com/PublicExport/index_en.txt.lzma';
const base = 'https://content.warframe.com/PublicExport/';
async function download(url, name) {
  const path = join(working, name);
  await exec(process.platform === 'win32' ? 'curl.exe' : 'curl',
    ['--fail', '--silent', '--show-error', '--location', '--retry', '2', '--max-time', '45', '-o', path, url]);
  return readFile(path);
}
try {
  const compressed = await download(indexUrl, 'index.lzma');
  const index = await new Promise((resolve, reject) => lzma.decompress(compressed,
    (value, error) => error ? reject(error) : resolve(String(value))));
  const manifestName = index.split(/\r?\n/).find(line => /^ExportManifest\.json![\w+\-]+$/.test(line));
  if (!manifestName) throw new Error('Official image manifest not found');
  const manifestUrl = base + 'Manifest/' + manifestName;
  const { Manifest } = JSON.parse(await download(manifestUrl, 'manifest.json'));
  const byId = new Map(Manifest.map(item => [item.uniqueName, item.textureLocation]));
  const entries = ['Lith', 'Meso', 'Neo', 'Axi'].map((tier, i) => {
    const item = Manifest.find(item => item.uniqueName.includes('/Projections/T' + (i + 1) + 'VoidProjection') && /Bronze$/.test(item.uniqueName));
    if (!item) throw new Error('Missing relic tier: ' + tier);
    return [tier, {en: tier, manifestId: item.uniqueName}];
  });
  const icons = {};
  let cursor = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (cursor < entries.length) {
      const number = cursor++;
      const [id, material] = entries[number];
      // Credits are a synthetic catalog ID; use the official daily credits emblem.
      const manifestId = material.manifestId;
      const texture = byId.get(manifestId);
      if (!texture?.startsWith('/Lotus/') || !texture.includes('.png!')) throw new Error('Missing PNG: ' + material.en);
      const source = base + texture.slice(1);
      const bytes = await download(source, number + '.png');
      if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid PNG: ' + source);
      icons[id] = { name: material.en, manifestId, source, image: 'data:image/png;base64,' + bytes.toString('base64') };
    }
  }));
  const result = { retrievedAt: new Date().toISOString(), indexUrl, manifestUrl,
    icons: Object.fromEntries(entries.map(([id]) => [id, icons[id]])) };
  // Write only after every image has been downloaded and validated.
  await writeFile(new URL('public/relic-icons.json', root), JSON.stringify(result));
  console.log('Saved ' + entries.length + ' official relic icons');
} finally {
  if (!resolve(working).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe temporary directory');
  await rm(working, { recursive: true, force: true });
}


