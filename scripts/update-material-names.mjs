import { execFile } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import lzma from 'lzma';

const exec = promisify(execFile);
const working = await mkdtemp(join(tmpdir(), 'frametracker-material-names-'));
const indexUrl = 'https://origin.warframe.com/PublicExport/index_ru.txt.lzma';
async function download(url, name) {
  const path = join(working, name);
  await exec(process.platform === 'win32' ? 'curl.exe' : 'curl',
    ['--fail', '--silent', '--show-error', '--location', '--retry', '2', '--max-time', '45', '-o', path, url]);
  return readFile(path);
}
try {
  const bytes = await download(indexUrl, 'index.lzma');
  const index = await new Promise((resolve, reject) => lzma.decompress(bytes,
    (value, error) => error ? reject(error) : resolve(String(value))));
  const manifest = index.split(/\r?\n/).find(line => /^ExportResources_ru\.json![\w+\-]+$/.test(line));
  if (!manifest) throw new Error('Official Russian resource manifest not found');
  const source = 'https://content.warframe.com/PublicExport/Manifest/' + manifest;
  const { ExportResources } = JSON.parse(await download(source, 'frames.json'));
  const names = new Map(ExportResources.map(frame => [frame.uniqueName, frame.name]));
  const catalogFile = new URL('../public/catalog.json', import.meta.url);
  const catalogText = await readFile(catalogFile, 'utf8');
  const catalog = JSON.parse(catalogText);
  const entries = Object.entries(catalog.materials).map(([id, item]) => {
    const name = id === 'credits' ? 'Кредиты' : names.get(id);
    if (typeof name !== 'string' || !name.trim()) throw new Error('Missing official resource name: ' + item.en);
    return [id, name];
  });
  await writeFile(new URL('./material-names.json', import.meta.url), JSON.stringify({ provenance: { retrievedAt: new Date().toISOString(), indexUrl, source }, names: Object.fromEntries(entries) }, null, 2) + '\n');
  const snapshotNames = Object.fromEntries(entries);
  const localized = catalogText.replace(/^(\s*)("[^"\n]+"):\s*(\{[^\n]+\})(,?)$/gm, (line, space, key, value, comma) => {
    const id = JSON.parse(key);
    if (!snapshotNames[id]) return line;
    const row = JSON.parse(value); row.name = snapshotNames[id];
    return space + key + ': ' + JSON.stringify(row) + comma;
  });
  await writeFile(catalogFile, localized);
  console.log('Saved ' + entries.length + ' official Russian resource names');
} finally {
  if (!resolve(working).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe temporary directory');
  await rm(working, { recursive: true, force: true });
}
