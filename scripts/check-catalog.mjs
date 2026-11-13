import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { flatten } from '../public/model.js';

export function checkCatalog(catalog) {
  const errors = [], warnings = [];
  const ids = new Set();
  for (const frame of [...catalog.frames, ...(catalog.equipment ?? [])]) {
    if (ids.has(frame.id)) errors.push('Duplicate frame: ' + frame.id);
    ids.add(frame.id);
    for (const node of flatten(frame.recipe)) {
      for (const row of node.materials) {
        if (!catalog.materials[row.id]) errors.push(frame.name + ': missing material ' + row.id);
      }
      if (!node.drops?.length && !node.relics?.length) warnings.push(frame.name + ': unknown source for ' + node.id);
      for (const relic of node.relics ?? []) {
        if (!catalog.relicLocations[relic.name]) warnings.push(frame.name + ': no current mission recorded for ' + relic.name);
      }
    }
  }
  return { errors, warnings };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = checkCatalog(JSON.parse(await readFile(new URL('../public/catalog.json', import.meta.url))));
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
}
