
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32' || process.arch !== 'x64' || process.versions.node.split('.')[0] !== '24') {
  throw new Error('Build FrameTracker with Node.js 24 x64 on Windows.');
}
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(root, 'dist');
await mkdir(dist, { recursive: true });
const working = await mkdtemp(join(dist, 'build-'));
try {
  const config = join(working, 'sea.json');
  const blob = join(working, 'sea.blob');
  const exe = join(working, 'FrameTracker.exe');
  const assets = Object.fromEntries(
    ['index.html', 'style.css', 'orokin.css', 'themes.js', 'app.js', 'i18n.js', 'model.js', 'availability.js', 'catalog.json', 'mark.svg'].map(name => [name, resolve(root, 'public', name)])
  );
  await writeFile(config, JSON.stringify({
    main: resolve(root, 'server.cjs'), output: blob, assets, disableExperimentalSEAWarning: true,
  }));
  execFileSync(process.execPath, ['--experimental-sea-config', config], { stdio: 'inherit' });
  await copyFile(process.execPath, exe);
  execFileSync(process.execPath, [
    resolve(root, 'node_modules', 'postject', 'dist', 'cli.js'), exe, 'NODE_SEA_BLOB', blob,
    '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  ], { stdio: 'inherit' });
  const release = join(dist, 'FrameTracker.exe');
  await rename(exe, release);
  console.log(release);
} finally {
  // These are the only files this build creates inside its private work directory.
  for (const name of ['sea.json', 'sea.blob', 'FrameTracker.exe']) await rm(join(working, name), { force: true });
  await rmdir(working);
}
