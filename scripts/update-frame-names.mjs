import { execFile } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import lzma from 'lzma';

const exec = promisify(execFile);
const working = await mkdtemp(join(tmpdir(), 'frametracker-names-'));
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
  const manifest = index.split(/\r?\n/).find(line => /^ExportWarframes_ru\.json![\w+\-]+$/.test(line));
  if (!manifest) throw new Error('Official Russian frame manifest not found');
  const source = 'https://content.warframe.com/PublicExport/Manifest/' + manifest;
  const { ExportWarframes } = JSON.parse(await download(source, 'frames.json'));
  const names = new Map(ExportWarframes.map(frame => [frame.uniqueName, frame.name]));
  const { frames } = JSON.parse(await readFile(new URL('../public/catalog.json', import.meta.url)));
  const entries = frames.map(frame => {
    const name = names.get(frame.id);
    if (typeof name !== 'string' || !name.trim()) throw new Error('Missing official name: ' + frame.name);
    return [frame.id, name];
  });
  await writeFile(new URL('../public/frame-names.js', import.meta.url),
    'export const provenance = ' + JSON.stringify({ retrievedAt: new Date().toISOString(), indexUrl, source }, null, 2) + ';\n\n' +
    'export const frameNames = ' + JSON.stringify(Object.fromEntries(entries), null, 2) + ';\n');
  console.log('Saved ' + entries.length + ' official Russian names');
} finally {
  if (!resolve(working).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe temporary directory');
  await rm(working, { recursive: true, force: true });
}
