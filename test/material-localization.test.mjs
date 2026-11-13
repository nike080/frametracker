import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { catalogText, setLanguage, t } from '../public/i18n.js';
const { materials } = JSON.parse(await readFile(new URL('../public/catalog.json', import.meta.url)));
const snapshot = JSON.parse(await readFile(new URL('../scripts/material-names.json', import.meta.url)));
test('every resource has its official Russian name while English remains searchable', () => {
  assert.match(snapshot.provenance.source, /ExportResources_ru\.json!/);
  assert.deepEqual(Object.keys(snapshot.names).sort(), Object.keys(materials).sort());
  try {
    for (const [id, item] of Object.entries(materials)) {
      setLanguage('ru');
      assert.equal(catalogText(item, 'name'), snapshot.names[id]);
      assert.match(catalogText(item, 'name'), /[А-Яа-яЁё]/u, item.en);
      setLanguage('en');
      assert.equal(catalogText(item, 'name'), item.en);
    }
    setLanguage('ru');
    assert.match(t('inventoryDescription'), /Нажми на текущий запас/);
  } finally { setLanguage('ru'); }
});
