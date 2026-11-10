
import { empty, amount, flatten, entry, collected, demand, estimate } from './model.js';
import { catalogText, language, setLanguage, t } from './i18n.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#detail');
const key = 'frametracker:v1';
const locale = () => language === 'en' ? 'en-US' : 'ru-RU';
let number;
const n = value => number.format(value);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const link = (url, label) => '<a href="' + esc(url) + '" target="_blank" rel="noreferrer">' + esc(label) + ' ↗</a>';
const marketLink = (slug, label) => link('https://warframe.market/items/' + slug, label);
const image = (frame, extra = '') => '<img ' + extra + ' data-portrait alt="" src="https://cdn.warframestat.us/img/' + encodeURIComponent(frame.image) + '">';
const numberInput = (attr, value, label) => '<input class="stock" type="number" min="0" step="1" max="999999999" ' + attr + ' value="' + value + '" aria-label="' + esc(label) + '">';
const languageSelect = document.querySelector('#language');
let pageMessage = 'loading';
let saveMessage;
let noticeMessage;
const saveStatus = document.querySelector('#save-status');

function applyLanguage() {
  document.documentElement.lang = language;
  document.title = t('title');
  number = new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 });
  languageSelect.value = language;
  for (const element of document.querySelectorAll('[data-text]')) {
    element.textContent = t(element.dataset.text);
  }
  for (const element of document.querySelectorAll('[data-label]')) {
    element.setAttribute('aria-label', t(element.dataset.label));
  }
  if (pageMessage) app.textContent = t(pageMessage);
  if (saveMessage) saveStatus.textContent = t(saveMessage);
  if (noticeMessage) document.querySelector('#notice').textContent = t(noticeMessage);
}

languageSelect.addEventListener('change', () => {
  setLanguage(languageSelect.value);
  applyLanguage();
  if (!pageMessage) renderPage();
});
applyLanguage();

const { frames, materials, relicLocations, date, gameVersion } = await fetch('/catalog.json').then(response => {
  if (!response.ok) throw new Error('Catalog unavailable');
  return response.json();
}).catch(error => {
  pageMessage = 'catalogFailed';
  app.textContent = t(pageMessage);
  throw error;
});
document.querySelector('#game-version').textContent = 'Warframe ' + gameVersion;
const byId = new Map(frames.map(frame => [frame.id, frame]));
const tradable = frames.filter(frame => frame.market);
let state = empty();
let tab = 'catalog';
let group = 'all';
let status = 'all';
let search = '';
let frameId;
let quotes = {};
let batch = null;
let noticeTimer;
let lastOpener;
let portable = false;
let revision = null;
let writes = Promise.resolve();
let unsaved = false;
let conflict = false;

let legacy;
try {
  const raw = localStorage.getItem(key);
  if (raw) legacy = restore(JSON.parse(raw));
} catch {
  notify('legacyLoad');
}

try {
  const response = await fetch('/api/progress');
  if (response.status === 404) state = legacy ?? empty();
  else {
    if (!response.ok) throw new Error('Progress unavailable');
    portable = true;
    const saved = await response.json();
    revision = saved.revision;
    if (saved.state) state = restore(saved.state);
    else if (legacy) {
      state = legacy;
      if (await save()) notify('migrated');
    }
    if (!unsaved) showSaveStatus('stored');
  }
} catch {
  pageMessage = 'loadFailed';
  app.textContent = t(pageMessage);
  throw new Error('FrameTracker progress could not be loaded');
}

function restore(raw) {
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  if (!record(raw) || !record(raw.frames) || !record(raw.stock)) {
    throw new Error(t('invalidProgress'));
  }
  const clean = empty();
  for (const [id, item] of Object.entries(raw.frames)) {
    if (!id.startsWith('/Lotus/') || !record(item)) continue;
    const root = byId.get(id)?.recipe?.id;
    const saved = { done: item.done === true, parts: {} };
    if (record(item.parts)) {
      for (const [part, value] of Object.entries(item.parts)) {
        if (part.startsWith('/Lotus/') && [1, 2].includes(value)) saved.parts[part] = part === root ? 1 : value;
      }
    }
    if (Number.isSafeInteger(item.paid) && item.paid >= 0) saved.paid = item.paid;
    clean.frames[id] = saved;
  }
  for (const [id, value] of Object.entries(raw.stock)) {
    if (id === 'credits' || id.startsWith('/Lotus/')) {
      const quantity = amount(value);
      if (quantity) clean.stock[id] = quantity;
    }
  }
  return clean;
}
function showSaveStatus(message) {
  saveMessage = message;
  saveStatus.textContent = t(message);
}
async function save() {
  const snapshot = JSON.stringify(state);
  if (!portable) {
    try {
      localStorage.setItem(key, snapshot);
      return true;
    } catch {
      notify('browserSaveFailed');
      return false;
    }
  }
  unsaved = true;
  showSaveStatus('saving');
  const task = writes.then(async () => {
    if (conflict) throw new Error('conflict');
    const response = await fetch('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-FrameTracker': '1' },
      body: JSON.stringify({ revision, state: JSON.parse(snapshot) }),
    });
    if (response.status === 409) {
      conflict = true;
      throw new Error('conflict');
    }
    if (!response.ok) throw new Error('Save failed');
    ({ revision } = await response.json());
    if (task === writes) {
      unsaved = false;
      showSaveStatus('saved');
    }
    return true;
  }).catch(() => {
    const message = conflict
      ? 'saveConflict'
      : 'saveFailed';
    showSaveStatus(message);
    notify(message);
    return false;
  });
  writes = task;
  return task;
}
window.addEventListener('beforeunload', event => {
  if (unsaved) {
    event.preventDefault();
    event.returnValue = true;
  }
});
function notify(message) {
  noticeMessage = message;
  const notice = document.querySelector('#notice');
  notice.textContent = t(message);
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { noticeMessage = undefined; notice.textContent = ''; }, 4200);
}
function portrait(frame) {
  const type = frame.founder ? t('founders') : frame.prime ? 'Prime' : t('standard');
  return '<div class="portrait' + (frame.prime ? ' prime' : '') + '">' + image(frame, 'loading="lazy"') +
    '<span class="portrait-badge">' + type + '</span></div>';
}
function metric(label, value, detail = '', tone = '') {
  return '<div class="metric"><span class="label">' + label + '</span><strong class="' + tone + '">' + value +
    '</strong><small>' + detail + '</small></div>';
}
function intro(label, heading, body) {
  return '<div class="page-intro"><span class="eyebrow">' + label + '</span><h1>' + heading + '</h1><p>' + body + '</p></div>';
}
function catalogView() {
  const standard = frames.length - frames.filter(frame => frame.prime).length;
  const done = frames.filter(frame => entry(state, frame).done).length;
  const hero = frames.find(frame => frame.name === 'Excalibur Umbra');
  app.innerHTML = '<section class="hero"><div class="hero-copy"><span class="eyebrow">' + t('personalArchive') + '</span>' +
    '<h1>' + t('heroFirst') + ' <span>' + t('heroSecond') + '</span></h1><p>' + t('heroDescription') + '</p></div>' +
    '<div class="hero-sigil"></div>' + image(hero, 'class="hero-art" fetchpriority="high"') +
    '<span class="hero-tag">' + t('heroProfile') + '</span></section>' +
    '<section aria-label="' + t('collection') + '"><div class="section-head"><div><span class="eyebrow">' + t('collectionSection') + '</span><h2>' + t('warframes') + '</h2></div>' +
    '<p class="muted small">' + link('https://www.warframe.com/en/patch-notes', 'Warframe ' + gameVersion) +
    ' · ' + new Date(date + 'T12:00:00Z').toLocaleDateString(locale(), { timeZone: 'UTC' }) + '</p></div>' +
    '<div class="metrics">' + metric(t('inCatalog'), frames.length, t('standardAndPrime')) + metric(t('standardPlural'), standard, t('includingUmbra')) +
    metric('Prime', frames.length - standard, t('includingFounder'), 'gold') +
    metric(t('collected'), done + ' / ' + frames.length, Math.round(done / frames.length * 100) + t('collectionPercent'), 'accent') + '</div>' +
    '<div class="toolbar"><div class="segments" aria-label="' + t('frameType') + '">' +
    [['all',t('all')],['standard',t('standardPlural')],['prime','Prime']].map(([value, label]) => '<button data-group="' + value + '">' + label + '</button>').join('') +
    '</div><label class="search"><span aria-hidden="true">⌕</span><input type="search" id="search" placeholder="' + t('search') + '" aria-label="' + t('search') + '" value="' + esc(search) + '"></label>' +
    '<select id="status" aria-label="' + t('collectionStatus') + '"><option value="all">' + t('anyStatus') + '</option><option value="missing">' + t('notCollected') + '</option><option value="started">' + t('inProgress') + '</option><option value="done">' + t('collected') + '</option></select></div>' +
    '<div id="cards" class="grid"></div><p id="count" class="small muted" aria-live="polite"></p></section>';
  app.querySelector('#status').value = status;
  renderCards();
}
function renderCards() {
  const searchKey = search.trim().toLocaleLowerCase();
  for (const button of app.querySelectorAll('[data-group]')) {
    const active = button.dataset.group === group;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  }
  const shown = frames.filter(frame => {
    const { done, have } = collected(frame, state);
    return (group === 'all' || frame.prime === (group === 'prime')) &&
      (status === 'all' || status === 'done' && done || status === 'missing' && !done || status === 'started' && !done && have > 0) &&
      (frame.name.toLocaleLowerCase().includes(searchKey) || searchKey === 'прайм' && frame.prime);
  });
  app.querySelector('#count').textContent = t('count', { shown: n(shown.length), total: n(frames.length) });
  app.querySelector('#cards').innerHTML = shown.length ? shown.map(frame => {
    const { done, have, total } = collected(frame, state);
    const percent = done ? 100 : total ? Math.round(have / total * 100) : 0;
    const info = done ? t('cardCollected') : total ? have + ' / ' + total + ' ' + t('cardParts') : t('founderExclusive');
    return '<button class="card" data-frame="' + esc(frame.id) + '">' + portrait(frame) +
      '<span class="card-name"><span>' + esc(frame.name) + '</span><span aria-hidden="true">↗</span></span>' +
      '<span class="card-progress"><span>' + info + '</span><span class="line"><i style="width:' + percent + '%"></i></span></span></button>';
  }).join('') : '<p class="empty" style="grid-column:1/-1">' + t('noFrames') + '</p>';
}
function stockRow(id, target, withInputs, label = '') {
  const item = materials[id];
  const stock = state.stock[id] ?? 0;
  const gap = Math.max(0, target - stock);
  const labelName = catalogText(item, 'name');
  const name = item.wiki ? link(item.wiki, labelName) : esc(labelName);
  return '<tr data-resource="' + esc(id) + '" data-needed="' + target + '"><td><span title="' + esc(item.en) + '">' + name + '</span>' +
    (item.drops?.length ? '<details class="small muted"><summary>' + t('whereToFarm') + '</summary>' + item.drops.map(place => '<div>' + esc(place) + '</div>').join('') + '</details>' : '') +
    '</td><td>' + n(target) + '</td><td>' +
    (withInputs ? numberInput('data-stock="' + esc(id) + '"', stock, t('stockLabel') + ' ' + labelName) : n(stock)) +
    '</td><td data-gap class="' + (gap ? 'gold' : 'accent') + '">' + n(gap) + '</td>' +
    (withInputs ? '<td><input class="check" type="checkbox" data-fill="' + esc(id) + '" data-target="' + target +
      '" title="' + t('fillHint') + '" aria-label="' + esc(label + ' ' + t('enoughLabel') + ' ' + labelName) + '"' +
      (stock >= target && target > 0 ? ' checked' : '') + (target === 0 ? ' disabled' : '') + '></td>' : '') + '</tr>';
}
function resourceTable(rows, withInputs, label = '') {
  if (!rows.length) return '<p class="empty">' + t('materialsAccounted') + '</p>';
  return '<div class="table-shell"><table><thead><tr><th>' + t('material') + '</th><th>' + t('needed') + '</th><th>' + t('inStock') + '</th><th>' + t('shortfall') + '</th>' +
    (withInputs ? '<th>' + t('enough') + '</th>' : '') + '</tr></thead><tbody>' +
    rows.map(({ id, count }) => stockRow(id, count, withInputs, label)).join('') + '</tbody></table></div>';
}
function combined() {
  const totals = demand(frames, state);
  return Object.keys(materials).map(id => ({ id, count: totals.get(id) ?? 0 })).sort((a, b) =>
    Number(b.count > 0) - Number(a.count > 0) || catalogText(materials[a.id], 'name').localeCompare(catalogText(materials[b.id], 'name'), locale()));
}
function inventoryView() {
  app.innerHTML = intro(t('resourcesSection'), t('inventory'), t('inventoryDescription')) +
    resourceTable(combined(), true);
}
function priceLabel(slug) {
  const quote = quotes[slug];
  if (!quote) return '—';
  if (!Number.isFinite(quote.price)) return quote.error ? t('unavailable') : t('noOffers');
  const stale = quote.stale || Date.now() - Date.parse(quote.date) >= 86400000;
  return n(quote.price) + ' ' + t('platinum') + (stale ? ' · ' + t('stale') : '');
}
function summaryView() {
  const done = frames.filter(frame => entry(state, frame).done);
  const prime = done.filter(frame => frame.prime).length;
  const budget = estimate(frames, state, quotes);
  const missingMaterials = combined().filter(row => row.count > 0);
  const price = (value, known) => known ? n(value) + ' ' + t('platinum') : '—';
  app.innerHTML = intro(t('statsSection'), t('collectionSummary'), t('summaryDescription')) +
    '<div class="metrics">' + metric(t('collected'), done.length + ' / ' + frames.length, t('markedComplete'), 'accent') +
    metric(t('remaining'), frames.length - done.length, t('includingFounder')) +
    metric(t('standardPlural'), done.length - prime + ' / ' + (frames.length - frames.filter(frame => frame.prime).length)) +
    metric('Prime', prime + ' / ' + frames.filter(frame => frame.prime).length, t('finishedFrames'), 'gold') + '</div>' +
    '<div class="section-head"><div><span class="eyebrow">' + t('marketSource') + '</span><h2>' + t('primeBudget') + '</h2></div>' +
    '<div class="actions"><button class="buy" id="refresh-all">' + (batch && !batch.cancelled && batch.done < batch.total ? t('stop') : t('loadPrices')) + '</button></div></div>' +
    '<div class="metrics">' + metric(t('allSets'), price(budget.full, budget.fullKnown), t('setCoverage', { known: n(budget.fullKnown), total: n(tradable.length) }), 'gold') +
    metric(t('stillToBuy'), price(budget.remaining, budget.remainingKnown || !budget.missing), budget.missing ? t('missingEstimate', { count: n(budget.missing) }) : t('remainingBasis'), 'gold') +
    metric(t('estimatedSpending'), price(budget.assumed, budget.assumedKnown || !budget.assumedMissing), budget.assumedMissing ? t('missingSpentEstimate', { count: n(budget.assumedMissing) }) : t('purchaseAssumption'), 'gold') +
    metric(t('recordedSpending'), price(budget.spent, budget.recorded), t('purchaseCount', { count: n(budget.recorded) }), 'gold') + '</div>' +
    '<p class="notes">' + t('priceNotes') + '</p>' +
    '<p id="market-status" class="progress-text" role="status"></p><div class="table-shell"><table><thead><tr><th>Prime</th><th>' + t('status') + '</th><th>' + t('setPrice') + '</th><th>' + t('recordedPrice') + '</th></tr></thead><tbody>' +
    tradable.map(frame => '<tr><td><button class="link-button" data-frame="' + esc(frame.id) + '">' + esc(frame.name) +
      '</button></td><td>' + (entry(state, frame).done ? t('frameCollected') : t('frameInProgress')) + '</td><td>' +
      marketLink(frame.market, priceLabel(frame.market)) + '</td><td>' + (entry(state, frame).paid === undefined ? '—' : n(entry(state, frame).paid)) + '</td></tr>').join('') + '</tbody></table></div>' +
    '<div class="section-head"><div><span class="eyebrow">' + t('foundry') + '</span><h2>' + t('remainingMaterials') + '</h2></div></div>' +
    resourceTable(missingMaterials, true) +
    '<div class="section-head"><div><span class="eyebrow">' + t('collection') + '</span><h2>' + t('frameProgress') + '</h2></div></div>' +
    '<div class="table-shell"><table><thead><tr><th>' + t('warframe') + '</th><th>' + t('blueprintsAndParts') + '</th><th>' + t('status') + '</th></tr></thead><tbody>' +
    frames.map(frame => {
      const progress = collected(frame, state);
      return '<tr><td><button class="link-button" data-frame="' + esc(frame.id) + '">' + esc(frame.name) + '</button></td><td>' +
        (progress.total ? progress.have + ' / ' + progress.total : '—') + '</td><td>' + (progress.done ? t('frameCollected') : t('frameMissing')) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  showBatchProgress();
}
function renderPage() {
  for (const anchor of document.querySelectorAll('[data-tab]')) {
    const active = anchor.dataset.tab === tab;
    anchor.classList.toggle('active', active);
    if (active) anchor.setAttribute('aria-current', 'page');
    else anchor.removeAttribute('aria-current');
  }
  if (tab === 'inventory') inventoryView();
  else if (tab === 'summary') summaryView();
  else catalogView();
}

function timeLabel(seconds) {
  if (seconds >= 3600) return n(seconds / 3600) + ' ' + t('hours');
  if (seconds >= 60) return n(seconds / 60) + ' ' + t('minutes');
  return n(seconds) + ' ' + t('seconds');
}
function dropList(part, frame) {
  const drops = part.drops?.length ? '<ul>' + part.drops.map(drop =>
    '<li>' + esc(catalogText(drop, 'where')) + (Number.isFinite(drop.chance) ? ' · ' + n(drop.chance) + '%' : '') + '</li>').join('') + '</ul>' : '';
  const relics = part.relics?.length ? '<h4>' + t('relics') + '</h4><p class="small muted">' + t('relicOdds') + '</p>' + part.relics.map(relic => {
    const places = relicLocations[relic.name];
    return '<details class="relic"><summary>' + esc(relic.name) + ' <small>' + n(relic.chance) +
      '% · ' + (places ? t('relicInMissions') : t('relicNoMission')) + '</small></summary>' +
      (places ? '<ul>' + places.map(place => '<li>' + esc(place.where) + ' · ' + n(place.chance) + '%</li>').join('') + '</ul>' :
        '<p class="muted">' + t('relicAlternatives') + '</p>') +
      '</details>';
  }).join('') : '';
  return drops || relics ? drops + relics : '<p class="small muted">' + t('sourceMissing') + ' ' + link(frame.wiki, t('checkWiki')) + '</p>';
}
function partView(part, frame, opened, root, inherited) {
  const partName = catalogText(part, 'name');
  const saved = entry(state, frame);
  const value = inherited ? 2 : saved.parts[part.id] ?? 0;
  const marker = value === 2 ? t('partReady') : value === 1 ? t('partBlueprint') : t('partMissing');
  const options = root ? '<label><input class="check" type="checkbox" data-part="' + esc(part.id) + '"' +
    (value ? ' checked' : '') + (inherited ? ' disabled' : '') + '> ' + t('blueprintOwned') + '</label>' :
    '<select data-part="' + esc(part.id) + '" aria-label="' + esc(t('partStatus') + ' ' + partName) + '"' + (inherited ? ' disabled' : '') + '>' +
      [t('partMissing'),t('blueprintOwned'),t('crafted')].map((label, index) => '<option value="' + index + '"' +
        (index === value ? ' selected' : '') + '>' + label + '</option>').join('') + '</select>';
  return '<details class="part" data-section="' + esc(part.id) + '"' + (opened.has(part.id) ? ' open' : '') +
    '><summary><strong>' + esc(partName) + (part.count > 1 ? ' ×' + part.count : '') + '</strong>' +
    (part.market ? '<span class="gold small" data-price="' + esc(part.market) + '">' + priceLabel(part.market) + '</span>' : '') +
    '<span class="small ' + (value ? 'accent' : 'muted') + '">' + marker + '</span></summary><div class="part-content">' +
    '<div class="actions">' + options + (part.market ? marketLink(part.market, 'Warframe.market') : '') + '</div>' +
    '<h4>' + t('acquisition') + '</h4>' + dropList(part, frame) +
    '<h4>' + t('crafting') + (part.time ? ' · ' + timeLabel(part.time) : '') + '</h4>' +
    resourceTable(part.materials.map(row => ({ id: row.id, count: row.count * part.count })), true, partName) +
    (!root && part.parts.length ? '<h4>' + t('components') + '</h4>' + part.parts.map(node => partView(node, frame, opened, false, value === 2)).join('') : '') +
    '</div></details>';
}
function renderDetail(frame, keep = false) {
  const open = new Set(keep ? [...dialog.querySelectorAll('[data-section][open]')].map(node => node.dataset.section) : [frame.recipe?.id]);
  const y = keep ? dialog.scrollTop : 0;
  const saved = entry(state, frame);
  const progress = collected(frame, state);
  dialog.innerHTML = '<div class="detail-head">' + portrait(frame) + '<div><span class="eyebrow">' +
    (frame.founder ? t('founderExclusive') : frame.prime ? t('primeArchive') : t('tennoArchive')) +
    '</span><h2 id="frame-title">' + esc(frame.name) + '</h2>' + link(frame.wiki, 'Warframe Wiki') +
    '</div><button class="close" aria-label="' + t('close') + '" id="close">×</button></div><div class="detail-body">' +
    '<label class="owned"><input class="check" type="checkbox" id="owned"' + (saved.done ? ' checked' : '') +
    '> <strong>' + t('frameOwned') + '</strong>' + (progress.total ? '<span class="muted small"> · ' + progress.have + ' / ' + progress.total + '</span>' : '') + '</label>' +
    (frame.market ? '<div class="buy-line"><span class="gold">' + t('setLabel') + ' <strong data-price="' + esc(frame.market) + '">' + priceLabel(frame.market) + '</strong></span> ' +
      marketLink(frame.market, 'Warframe.market') + ' <button class="buy" id="refresh-frame">' + t('checkPrices') + '</button></div>' +
      '<label class="small">' + t('actualPurchase') + ' ' + numberInput('id="paid" placeholder="—"', saved.paid ?? '', t('actualPurchase')) +
      '</label><p class="muted small">' + t('purchaseHint') + '</p>' : '') +
    (frame.founder ? '<p class="notes">' + t('founderNotes') + '</p>' :
      '<h3>' + t('blueprintsAndComponents') + '</h3>' + (frame.name === 'Equinox' ? '<p class="notes">' + t('equinoxNotes') + '</p>' : '') +
      partView(frame.recipe, frame, open, true, saved.done) +
      frame.recipe.parts.map(part => partView(part, frame, open, false, saved.done)).join('') +
      '<p class="muted small">' + t('stockNotes') + '</p>') +
    '</div>';
  dialog.scrollTop = y;
}
function openFrame(id, opener) {
  const frame = byId.get(id);
  if (!frame) return;
  frameId = id;
  lastOpener = opener;
  renderDetail(frame);
  dialog.showModal();
  if (frame.market) void refreshFrame(frame);
}
function frameSlugs(frame) {
  return [frame.market, ...flatten(frame.recipe).map(part => part.market)].filter(Boolean);
}
const inflight = new Map();
function loadPrice(slug) {
  if (inflight.has(slug)) return inflight.get(slug);
  const promise = fetch('/api/price/' + slug).then(response => {
    if (!response.ok) throw new Error('Market unavailable');
    return response.json();
  }).catch(() => ({ ...quotes[slug], stale: true, error: true })).then(result => {
    quotes[slug] = result;
    for (const element of dialog.querySelectorAll('[data-price]')) {
      if (element.dataset.price === slug) element.textContent = priceLabel(slug);
    }
    return result;
  }).finally(() => inflight.delete(slug));
  inflight.set(slug, promise);
  return promise;
}
async function refreshFrame(frame) {
  const button = dialog.querySelector('#refresh-frame');
  if (button) { button.disabled = true; button.textContent = t('loadingPrices'); }
  const results = await Promise.all(frameSlugs(frame).map(loadPrice));
  if (button?.isConnected) {
    button.disabled = false;
    button.textContent = results.some(result => result.error) ? t('retryPrices') : t('checkPrices');
  }
}
function showBatchProgress() {
  const target = app.querySelector('#market-status');
  if (target && batch) target.textContent = (batch.cancelled ? t('stopped') : batch.done === batch.total ? t('batchDone') : t('batchLoading')) +
    ' · ' + batch.done + ' / ' + batch.total + (batch.errors ? ' · ' + t('errorCount', { count: n(batch.errors) }) : '');
}
async function refreshMarket() {
  if (batch && !batch.cancelled && batch.done < batch.total) {
    batch.cancelled = true;
    summaryView();
    return;
  }
  const slugs = [...new Set([...tradable.map(frame => frame.market), ...tradable.flatMap(frameSlugs)])];
  const task = { total: slugs.length, done: 0, errors: 0, cancelled: false };
  batch = task;
  summaryView();
  for (const slug of slugs) {
    if (task.cancelled) break;
    const result = await loadPrice(slug);
    task.done++;
    if (result.error) task.errors++;
    if (task.errors >= 5 && task.errors === task.done) {
      task.cancelled = true;
      notify('marketDown');
    }
    if (batch === task && tab === 'summary') {
      if (task.done % 8 === 0 || task.done === task.total || task.cancelled) summaryView();
      else showBatchProgress();
    }
  }
}
function route() {
  const value = location.hash.slice(1);
  tab = ['inventory', 'summary'].includes(value) ? value : 'catalog';
  renderPage();
}
function changed(event) {
  const input = event.target;
  if (input.id === 'status') { status = input.value; renderCards(); return; }
  if (!input.matches('[data-stock], [data-fill], [data-part], #owned, #paid')) return;
  const frame = byId.get(frameId);
  const id = input.dataset.stock ?? input.dataset.fill;
  if (id) {
    const target = Number(input.dataset.target);
    const value = input.hasAttribute('data-stock') ? amount(input.value) : input.checked ? target : target - 1;
    state.stock[id] = value;
    for (const row of document.querySelectorAll('[data-resource="' + CSS.escape(id) + '"]')) {
      const goal = Number(row.dataset.needed);
      row.querySelector('[data-stock]').value = value;
      row.querySelector('[data-fill]').checked = goal > 0 && value >= goal;
      const gap = row.querySelector('[data-gap]');
      gap.textContent = n(Math.max(0, goal - value));
      gap.className = value < goal ? 'gold' : 'accent';
    }
    save();
    return;
  }
  else if (frame) {
    const saved = state.frames[frame.id] ??= { parts: {} };
    if (input.id === 'owned') saved.done = input.checked;
    if (input.id === 'paid') {
      if (input.value === '') delete saved.paid;
      else saved.paid = amount(input.value);
      input.value = saved.paid ?? '';
      save();
      return;
    }
    if (input.hasAttribute('data-part')) saved.parts[input.dataset.part] = input.type === 'checkbox' ? Number(input.checked) : Number(input.value);
  }
  save();
  if (dialog.open && frame) {
    const focus = [...input.attributes].find(attr => ['id','data-stock','data-part','data-fill'].includes(attr.name));
    const section = input.closest('[data-section]')?.dataset.section;
    renderDetail(frame, true);
    const scope = section ? dialog.querySelector('[data-section="' + CSS.escape(section) + '"]') : dialog;
    if (focus) scope?.querySelector('[' + focus.name + '="' + CSS.escape(focus.value) + '"]')?.focus({ preventScroll: true });
  } else renderPage();
}
app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.frame) openFrame(button.dataset.frame, button);
  if (button.dataset.group) { group = button.dataset.group; renderCards(); }
  if (button.id === 'refresh-all') void refreshMarket();
});
app.addEventListener('input', event => {
  if (event.target.id === 'search') { search = event.target.value; renderCards(); }
});
app.addEventListener('change', changed);
dialog.addEventListener('change', changed);
dialog.addEventListener('click', event => {
  if (event.target.id === 'close') dialog.close();
  if (event.target.id === 'refresh-frame') void refreshFrame(byId.get(frameId));
});
dialog.addEventListener('close', () => {
  const openerId = lastOpener?.dataset.frame;
  frameId = undefined;
  renderPage();
  if (openerId) app.querySelector('[data-frame="' + CSS.escape(openerId) + '"]')?.focus({ preventScroll: true });
});
document.addEventListener('error', event => {
  const img = event.target;
  if (img.hasAttribute?.('data-portrait')) {
    img.removeAttribute('data-portrait');
    img.src = '/mark.svg';
  }
}, true);
document.querySelector('#export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'frametracker-progress.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.querySelector('#import').addEventListener('click', () => document.querySelector('#file').click());
document.querySelector('#file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = restore(JSON.parse(await file.text()));
    if (confirm(t('importConfirm'))) {
      state = imported;
      const saved = await save();
      renderPage();
      if (saved) notify('imported');
    }
  } catch {
    notify('importFailed');
  } finally {
    event.target.value = '';
  }
});
pageMessage = undefined;
window.addEventListener('hashchange', route);
route();
fetch('/api/prices').then(response => response.json()).then(saved => {
  quotes = { ...saved, ...quotes };
  if (tab === 'summary' && !batch) summaryView();
}).catch(() => {});
