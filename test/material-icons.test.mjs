import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('every catalog material has a bundled official PNG and traceable manifest mapping', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/catalog.json', import.meta.url)));
  const snapshot = JSON.parse(await readFile(new URL('../public/material-icons.json', import.meta.url)));
  assert.ok(Number.isFinite(Date.parse(snapshot.retrievedAt)));
  assert.match(snapshot.manifestUrl, /^https:\/\/content\.warframe\.com\/PublicExport\/Manifest\/ExportManifest\.json!/);
  assert.deepEqual(Object.keys(snapshot.icons).sort(), Object.keys(catalog.materials).sort());
  for (const [id, material] of Object.entries(catalog.materials)) {
    const icon = snapshot.icons[id];
    assert.equal(icon.name, material.en);
    assert.equal(icon.manifestId, id === 'credits' ? '/Lotus/Types/Challenges/Seasons/Daily/SeasonDailyCollectCredits' : id);
    assert.match(icon.source, /^https:\/\/content\.warframe\.com\/PublicExport\/Lotus\/.+\.png![\w+\-]+$/);
    assert.match(icon.image, /^data:image\/png;base64,/);
    const bytes = Buffer.from(icon.image.split(',')[1], 'base64');
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', material.en);
    assert.equal(bytes.subarray(12, 16).toString(), 'IHDR', material.en);
    assert.ok(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0, material.en);
    assert.equal(bytes.subarray(-8, -4).toString(), 'IEND', material.en);
  }
});
