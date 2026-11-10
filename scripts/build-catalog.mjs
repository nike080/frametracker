
import { readFile, rename, writeFile } from 'node:fs/promises';
import { flatten } from '../public/model.js';

const version = process.argv[2];
if (!/^\d+\.\d+(?:\.\d+){0,2}$/.test(version ?? '')) throw new Error('Pass the verified PC game version.');
const input = process.argv[3] ?? new URL('../.sources/', import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(name + '.json', input)));
const [frames, components, resources, misc, recipes, relicData, missions, market] = await Promise.all(
  ['warframes-source','Components-source','Resources-source','Misc-source','recipes-source','relics-source','missions-source','market-items'].map(read)
);
const index = (rows, key) => new Map(rows.map(row => [row[key], row]));
const items = index([...misc, ...resources, ...components, ...frames], 'uniqueName');
const byResult = index(recipes.ExportRecipes, 'resultType');
const byMarket = index(market.data, 'gameRef');
const marketNames = new Map(market.data.map(item => [item.i18n.en.name.toLowerCase(), item]));
const sourceNote = (where, en, chance) => ({ where, en, chance });
const clan = sourceNote('Лаборатория Тэнно в додзё клана. Купите копию исследованного чертежа.',
  'Tenno Lab in the Clan Dojo. Replicate the researched blueprint.');
const farm = {
  'Banshee': clan, 'Nezha': clan, 'Volt': clan, 'Wukong': clan, 'Zephyr': clan,
  'Dagath': sourceNote('Лощина Дагас (Dagath’s Hollow) в додзё. Для крафта соберите Vainthorn в миссии Бездны (Abyssal Zone) на Церере.',
    'Dagath’s Hollow in the Clan Dojo. Collect Vainthorn from the Abyssal Zone mission on Ceres for crafting.'),
  'Grendel': sourceNote('Купите локаторы частей у Арбитров Гексиса за Vitus Essence. Каждый открывает отдельную миссию на Европе.',
    'Buy part locators from the Arbiters of Hexis with Vitus Essence. Each unlocks a separate mission on Europa.'),
  'Kullervo': sourceNote('Победите Kullervo в Kullervo’s Hold в Дувири во время спиралей Гнева, Страха или Печали. Обменяйте Kullervo’s Bane у Acrithis.',
    'Defeat Kullervo at Kullervo’s Hold in Duviri during the Anger, Fear, or Sorrow Spirals. Trade Kullervo’s Bane with Acrithis.'),
  'Vauban': sourceNote('Магазин Nightwave. Обменяйте кредиты текущего сезона на чертёж.',
    'Nightwave Cred Offerings. Trade the current season’s Cred for the blueprint.'),
  'Yareli': sourceNote('Комната Bash Lab в додзё клана. Скопируйте исследованный чертёж.',
    'Bash Lab in the Clan Dojo. Replicate the researched blueprint.'),
};
const quest = {
  'Chroma': 'The New Strange', 'Cyte-09': 'The Hex', 'Excalibur Umbra': 'The Sacrifice',
  'Gara': 'Saya’s Vigil', 'Jade': 'Jade Shadows', 'Limbo': 'The Limbo Theorem',
  'Mirage': 'Hidden Messages', 'Qorvex': 'Whispers in the Walls', 'Yareli': 'Waverider',
};
const blueprintOverrides = {
  'Grendel': sourceNote('Внутриигровой магазин.', 'In-game Market.'),
  'Limbo': sourceNote('Внутриигровой магазин. Чертежи деталей выдаются за The Limbo Theorem.',
    'In-game Market. The Limbo Theorem awards the component blueprints.'),
  'Mirage': sourceNote('Внутриигровой магазин. Чертежи деталей выдаются за Hidden Messages.',
    'In-game Market. Hidden Messages awards the component blueprints.'),
  'Yareli': sourceNote('Награда за квест Waverider.', 'Reward from the Waverider quest.'),
};
const partsRu = {
  Blueprint: 'Основной чертёж', Chassis: 'Каркас', Neuroptics: 'Нейрооптика', Systems: 'Система',
  'Day Aspect': 'Дневной аспект', 'Night Aspect': 'Ночной аспект',
};
const credits = 'credits';
const materialNames = {
  'Alloy Plate':'Сплавы', 'Orokin Cell':'Элемент Орокин', 'Polymer Bundle':'Полимеры',
  'Rubedo':'Рубедо', 'Ferrite':'Феррит', 'Salvage':'Вторсырьё', 'Plastids':'Пластиды',
  'Neural Sensors':'Нейронные датчики', 'Neurodes':'Нейроды', 'Morphics':'Морфиды',
  'Nano Spores':'Наноспоры', 'Circuits':'Схемы', 'Control Module':'Модуль контроля',
  'Argon Crystal':'Кристалл аргона', 'Oxium':'Оксиум', 'Cryotic':'Криотик',
  'Forma':'Форма', 'Kuva':'Кува', 'Tellurium':'Теллур', 'Gallium':'Галлий',
};
const relicLocations = new Map();
for (const [planet, nodes] of Object.entries(missions.missionRewards)) {
  for (const [node, mission] of Object.entries(nodes)) {
    const entries = Array.isArray(mission.rewards) ? [['', mission.rewards]] : Object.entries(mission.rewards ?? {});
    for (const [rotation, rewards] of entries) {
      if (!Array.isArray(rewards)) continue;
      for (const reward of rewards) {
        const match = /^((?:Lith|Meso|Neo|Axi) \w+) Relic$/.exec(reward.itemName);
        if (!match) continue;
        const rows = relicLocations.get(match[1]) ?? [];
        rows.push({ where: planet + ' / ' + node + (rotation ? ' · ' + rotation : ''), chance: reward.chance });
        relicLocations.set(match[1], rows);
      }
    }
  }
}
const relicRewards = new Map();
for (const relic of relicData.relics.filter(x => x.state === 'Intact')) {
  for (const reward of relic.rewards) {
    const key = reward.itemName.toLowerCase();
    const rows = relicRewards.get(key) ?? [];
    rows.push({ name: relic.tier + ' ' + relic.relicName, chance: reward.chance });
    relicRewards.set(key, rows);
  }
}
const materials = { [credits]: { name: 'Кредиты', en: 'Credits' } };
function material(id, count) {
  const item = items.get(id);
  const parent = item?.parentUniqueNames?.at(-1);
  const owner = id.includes('/WarframeRecipes/') ? items.get(parent) : undefined;
  const en = [owner?.name, item?.name ?? id.split('/').at(-1)].filter(Boolean).join(' ');
  materials[id] = { name: materialNames[en] ?? en, en, wiki: 'https://wiki.warframe.com/w/' + encodeURIComponent(en.replaceAll(' ', '_')),
    drops: [...new Set((item?.drops ?? []).map(drop => drop.location))].slice(0, 8) };
  return { id, count };
}
const questReward = name => sourceNote('Награда за квест ' + name, 'Reward from the ' + name + ' quest');
function acquisition(frame, item, root) {
  if (frame.name === 'Equinox' && !root) return [sourceNote(
    'Titania, Уран · Тил Регор. За победу выдаётся по одному чертежу для Дня и Ночи.',
    'Titania, Uranus · Tyl Regor. Defeating him awards a Day Aspect or Night Aspect blueprint.',
    item?.drops?.[0]?.chance)];
  if (root && blueprintOverrides[frame.name]) return [blueprintOverrides[frame.name]];
  if (farm[frame.name]) return [farm[frame.name]];
  if (frame.name === 'Chroma' && root) return [sourceNote(
    'Награда за квест The New Strange. Повторный чертёж у Цефалона Симэриса.',
    'Reward from The New Strange. Additional blueprints are available from Cephalon Simaris.')];
  if (frame.name === 'Chroma' && item?.name === 'Neuroptics') return [sourceNote(
    'Награда за открытие узла Урана. Повторный чертёж у Цефалона Симэриса.',
    'Reward from unlocking the Uranus Junction. Additional blueprints are available from Cephalon Simaris.')];
  const drops = (item?.drops ?? []).filter(drop => drop.location && !/ Relic(?:$| \()/.test(drop.location))
    .map(drop => ({ where: drop.location, chance: drop.chance }));
  if (root && quest[frame.name] && !drops.some(drop => !drop.where.startsWith('Cephalon Simaris'))) {
    drops.unshift(questReward(quest[frame.name]));
  }
  if (root && frame.bpCost && !frame.isPrime) drops.unshift(sourceNote(
    'Внутриигровой магазин · ' + frame.bpCost.toLocaleString('ru') + ' кредитов',
    'In-game Market · ' + frame.bpCost.toLocaleString('en-US') + ' Credits'));
  if (!drops.length && frame.name === 'Uriel' && root) drops.push(sourceNote(
    'Награда за квест The Old Peace.', 'Reward from The Old Peace.'));
  return [...new Map(drops.map(drop => [drop.where, drop])).values()];
}
function tree(frame, recipe, count = 1, root = true) {
  const item = items.get(root ? recipe.uniqueName : recipe.resultType);
  const id = recipe.resultType.split('/').at(-1);
  const suffix = Object.entries({ Helmet: 'Neuroptics', Chassis: 'Chassis', Systems: 'Systems' })
    .find(([suffix]) => id.endsWith(suffix + 'Component'))?.[1];
  const part = root ? 'Blueprint' : item?.name ?? suffix ?? id;
  const [aspectRu, aspectEn] = /\/Anima(?:Helmet|Chassis|Systems)/.test(recipe.resultType) ? ['Ночь', 'Night'] :
    /\/Animus(?:Helmet|Chassis|Systems)/.test(recipe.resultType) ? ['День', 'Day'] : [];
  const partLabel = [partsRu[part] ?? part, aspectRu].filter(Boolean).join(' · ');
  const en = [root ? 'Main blueprint' : part, aspectEn].filter(Boolean).join(' · ');
  const result = {
    id: recipe.uniqueName, name: partLabel, en, count, time: recipe.buildTime,
    drops: acquisition(frame, item, root), parts: [], materials: [],
  };
  if (frame.isPrime) {
    const tradeName = frame.name + (root ? ' Blueprint' : ' ' + part + ' Blueprint');
    result.market = byMarket.get(recipe.uniqueName)?.slug ?? marketNames.get(tradeName.toLowerCase())?.slug;
    result.relics = [...new Map((relicRewards.get(tradeName.toLowerCase()) ?? []).map(relic => [relic.name, relic])).values()]
      .sort((a, b) => Number(relicLocations.has(b.name)) - Number(relicLocations.has(a.name)) || a.name.localeCompare(b.name, 'en', {numeric:true}));
  }
  if (recipe.buildPrice) result.materials.push({ id: credits, count: recipe.buildPrice });
  for (const ingredient of [...recipe.ingredients, ...(recipe.secretIngredients ?? [])]) {
    const id = ingredient.ItemType;
    const sub = byResult.get(id);
    const stem = byResult.get(frame.uniqueName).uniqueName.replace(/Blueprint$/, '');
    const own = id.includes('/WarframeRecipes/') && (id.startsWith(stem) ||
      items.get(id)?.parentUniqueNames?.includes(frame.uniqueName) && id !== '/Lotus/Types/Recipes/WarframeRecipes/VOLTHelmetComponent');
    if (sub && (own || frame.name === 'Equinox' && /\/Anim(?:a|us)/.test(id))) {
      result.parts.push(tree(frame, sub, ingredient.ItemCount, false));
    } else {
      result.materials.push(material(id, ingredient.ItemCount));
    }
  }
  result.parts.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return result;
}
const catalog = frames.filter(frame => frame.masterable && !['Voidrig', 'Bonewidow'].includes(frame.name) &&
  (byResult.has(frame.uniqueName) || frame.name === 'Excalibur Prime'))
  .map(frame => ({
    id: frame.uniqueName, name: frame.name, prime: Boolean(frame.isPrime),
    founder: frame.name === 'Excalibur Prime', image: frame.imageName, wiki: frame.wikiaUrl,
    market: byMarket.get(frame.uniqueName)?.slug, release: frame.releaseDate,
    recipe: byResult.has(frame.uniqueName) ? tree(frame, byResult.get(frame.uniqueName)) : null,
  }));
const locations = {};
for (const list of relicLocations.values()) list.sort((a, b) => b.chance - a.chance);
for (const list of relicRewards.values()) for (const relic of list) {
  if (relicLocations.has(relic.name)) locations[relic.name] = relicLocations.get(relic.name).slice(0, 8);
}
const catalogFile = new URL('../public/catalog.json', import.meta.url);
const previous = await readFile(catalogFile, 'utf8').then(JSON.parse).catch(error => {
  if (error.code !== 'ENOENT') throw error;
});
if (catalog.length < (previous?.frames.length ?? 100)) throw new Error('Frame count fell. Review upstream data before replacing the catalog.');
const eq = catalog.find(frame => frame.name === 'Equinox');
if (flatten(eq?.recipe).length !== 9) throw new Error('Invalid Equinox recipe.');
for (const frame of catalog.filter(frame => frame.prime && !frame.founder)) {
  if (flatten(frame.recipe).length !== 4 || !frame.market || flatten(frame.recipe).some(part => !part.market || !part.relics.length)) {
    console.warn('Review incomplete Prime data:', frame.name);
  }
}
const source = await read('provenance');
const date = source.retrievedAt.slice(0, 10);
const rows = values => Object.entries(values).sort(([a], [b]) => a.localeCompare(b))
  .map(([key, value]) => '    ' + JSON.stringify(key) + ': ' + JSON.stringify(value)).join(',\n');
const content = '{\n  "gameVersion": ' + JSON.stringify(version) + ',\n  "date": ' + JSON.stringify(date) +
  ',\n  "source": ' + JSON.stringify(source) + ',\n  "frames": [\n' +
  catalog.map(frame => '    ' + JSON.stringify(frame)).join(',\n') +
  '\n  ],\n  "materials": {\n' + rows(materials) + '\n  },\n  "relicLocations": {\n' + rows(locations) + '\n  }\n}\n';
const temp = new URL('catalog.next.json', catalogFile);
await writeFile(temp, content);
await rename(temp, catalogFile);
console.log(catalog.length + ' frames, ' + catalog.filter(frame => frame.prime).length + ' Prime');
if (previous?.gameVersion) {
  console.log('Warframe ' + previous.gameVersion + ' → ' + version);
  const before = index(previous.frames, 'id');
  for (const frame of catalog) {
    const old = before.get(frame.id);
    before.delete(frame.id);
    if (!old) console.log('+ ' + frame.name);
    else {
      const snapshot = (entry, keys) => flatten(entry.recipe).map(part => [part.id, ...keys.map(key => part[key])]);
      const changed = [
        ['recipe', ['count', 'time', 'materials']], ['sources', ['drops']], ['relics', ['relics']], ['market', ['market']],
      ].filter(([, keys]) => JSON.stringify(snapshot(old, keys)) !== JSON.stringify(snapshot(frame, keys))).map(([label]) => label);
      if (old.name !== frame.name || old.image !== frame.image || old.market !== frame.market) changed.push('card');
      if (changed.length) console.log('~ ' + frame.name + ' · ' + changed.join(', '));
    }
  }
  for (const frame of before.values()) console.log('- ' + frame.name);
  for (const relic of new Set([...Object.keys(previous.relicLocations), ...Object.keys(locations)])) {
    if (JSON.stringify(previous.relicLocations[relic]) !== JSON.stringify(locations[relic])) console.log('~ Relic missions: ' + relic);
  }
}
for (const frame of catalog.filter(frame => !frame.prime)) {
  for (const part of flatten(frame.recipe).filter(part => !part.drops.length)) {
    console.log('Review acquisition:', frame.name, part.name);
  }
}
