import { readFile, writeFile } from 'node:fs/promises';
const input = process.argv[2] ?? new URL('../.cache/relic-items.json', import.meta.url);
const rows = JSON.parse(await readFile(input, 'utf8'));
const contents = {};
for (const row of rows) {
  const match = row.name.match(/^(.*) (Intact|Exceptional|Flawless|Radiant)$/);
  if (!match || !row.rewards?.length) continue;
  const rewards = row.rewards.map(r => ({ name: r.item.name, id: r.item.uniqueName, chance: r.chance }));
  if (rewards.some(r => !r.name || !Number.isFinite(r.chance) || r.chance < 0 || r.chance > 100)) throw new Error('Invalid rewards: ' + row.name);
  (contents[match[1]] ??= {})[match[2].toLowerCase()] = rewards;
}
const names = Object.keys(contents).sort();
if (names.length < 700) throw new Error('Incomplete relic snapshot');
await writeFile(new URL('../public/relic-library.js', import.meta.url), '// Generated from WFCD/warframe-items Relics.json snapshot. Not live availability.\nexport const allRelics = ' + JSON.stringify(names) + ';\nexport const relicContents = ' + JSON.stringify(contents) + ';\n');
console.log('Relic library:', names.length);
