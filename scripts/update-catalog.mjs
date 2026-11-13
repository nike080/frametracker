
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import lzma from 'lzma';

const version = process.argv[2];
if (!/^\d+\.\d+(?:\.\d+){0,2}$/.test(version ?? '')) {
  throw new Error('Usage: npm run update-catalog -- <verified PC game version>');
}

const exec = promisify(execFile);
const base = new URL('../.sources/', import.meta.url);
await mkdir(base, { recursive: true });
const working = pathToFileURL(await mkdtemp(fileURLToPath(new URL('update-', base))) + '/');
const curl = process.platform === 'win32' ? 'curl.exe' : 'curl';
const catalogBase = 'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/';
const dropsBase = 'https://raw.githubusercontent.com/WFCD/warframe-drop-data/gh-pages/data/';
const indexUrl = 'https://origin.warframe.com/PublicExport/index_en.txt.lzma';
const userAgent = 'FrameTracker/1.2.0 personal Warframe collection tracker';
async function download(url, filename) {
  await exec(curl, ['--fail', '--silent', '--show-error', '--location', '--retry', '2',
    '--max-time', '50', '--user-agent', userAgent, '--output', fileURLToPath(new URL(filename, working)), url]);
}

const inputs = {
  'warframes-source': catalogBase + 'Warframes.json',
  'Components-source': catalogBase + 'Components.json',
  'Resources-source': catalogBase + 'Resources.json',
  'Misc-source': catalogBase + 'Misc.json',
  'relics-source': dropsBase + 'relics.json',
  'missions-source': dropsBase + 'missionRewards.json',
  'market-items': 'https://api.warframe.market/v2/items',
};
await download(indexUrl, 'index.lzma');
const compressed = await readFile(new URL('index.lzma', working));
const manifest = await new Promise((resolve, reject) => {
  lzma.decompress(compressed, (result, error) => error ? reject(error) : resolve(result));
});
const recipe = String(manifest).split(/\r?\n/).find(line => /^ExportRecipes_en\.json![A-Za-z0-9_+\-]+$/.test(line));
if (!recipe) throw new Error('Warframe recipe manifest was not found.');
inputs['recipes-source'] = 'https://content.warframe.com/PublicExport/Manifest/' + recipe;
await Promise.all(Object.entries(inputs).map(([name, url]) => download(url, name + '.json')));
await writeFile(new URL('provenance.json', working), JSON.stringify({
  retrievedAt: new Date().toISOString(), recipeManifest: recipe,
  patchNotes: 'https://www.warframe.com/en/patch-notes', platform: 'pc',
}));
const build = fileURLToPath(new URL('./build-catalog.mjs', import.meta.url));
const { stdout, stderr } = await exec(process.execPath, [build, version, working.href]);
process.stdout.write(stdout);
process.stderr.write(stderr);
