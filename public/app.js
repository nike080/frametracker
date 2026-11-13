
import { empty, amount, flatten, entry, collected, demand, estimate, normalizeGoals, scopedFrames, progressHistory, knownStock, nextAction, restoreProgress } from './model.js';
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
  updateSaveAlert();
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
let availabilityFilter = 'all';
let availabilitySort = 'catalog';
let liveAvailability = { frames: {}, sources: {}, stale: true };
let availabilityLoading = false;
let search = '';
let materialSearch = '';
let onlyDeficit = false;
let resourceScope = 'goals';
const history = progressHistory();
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

function restore(raw) { return restoreProgress(raw, frames); }
function updateSaveAlert() {
  const alert = document.querySelector('#save-alert');
  alert.hidden = !['browserSaveFailed', 'saveFailed', 'saveConflict'].includes(saveMessage);
  alert.textContent = alert.hidden ? '' : t(saveMessage);
}
function showSaveStatus(message) {
  saveMessage = message;
  saveStatus.textContent = t(message);
  updateSaveAlert();
}
async function save() {
  const snapshot = JSON.stringify(state);
  if (!portable) {
    try {
      localStorage.setItem(key, snapshot);
      showSaveStatus('browserSaved');
      return true;
    } catch {
      showSaveStatus('browserSaveFailed');
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
function undoButton(id) {
  return '<button id="' + id + '"' + (history.available ? '' : ' disabled') + '>' + t('undoProgress') + '</button>';
}
function updateUndo() {
  for (const button of document.querySelectorAll('#undo-progress, #undo-detail')) button.disabled = !history.available;
}
function captureProgress() { history.capture(state); updateUndo(); }
function undoProgress() {
  if (!history.available) return;
  state = history.undo();
  void save();
  renderPage();
  if (dialog.open && frameId) renderDetail(byId.get(frameId), true);
  updateUndo();
}
document.querySelector('#undo-progress').addEventListener('click', undoProgress);

function goalsView() {
  const goals = scopedFrames(frames, state, 'goals');
  return '<section class="goals-panel" aria-labelledby="goals-title"><h2 id="goals-title">' + t('myGoals') + '</h2><p class="small muted">' + t('goalsHint') + '</p>' +
    (goals.length ? '<ol class="goal-list">' + goals.map((frame, index) => '<li><button data-frame="' + esc(frame.id) + '">' + esc(frame.name) + '</button><span class="small">' + stage(frame) + '</span><div class="goal-actions">' +
      [['up', 'goalUp', index === 0], ['down', 'goalDown', index === goals.length - 1], ['remove', 'goalRemove', false]].map(([action, label, disabled]) => '<button data-goal-action="' + action + '" data-goal-id="' + esc(frame.id) + '" aria-label="' + esc(t(label) + ': ' + frame.name) + '"' + (disabled ? ' disabled' : '') + '>' + t(label) + '</button>').join('') + '</div></li>').join('') + '</ol>' : '<p>' + t('noGoals') + '</p>') +
    '<a href="#inventory">' + t('goalResources') + '</a></section>';
}
function recordChange(kind, frame) {
  if (frame) state.lastChange = { kind, frameId: frame.id, at: new Date().toISOString() };
}
function availabilityBadge(frame) {
  if (!frame.prime || frame.founder) return '';
  const row = liveAvailability.frames[frame.id];
  const status = row?.status ?? 'unknown';
  return '<span class="availability-badge availability-' + status + '">' + t('availability_' + status) +
    (row && status !== 'unknown' ? ' · ' + row.available + '/' + row.total : '') +
    (row?.resurgence ? ' · ' + t('resurgence') : '') + '</span>';
}
function availabilityToolbar() {
  const dates = Object.values(liveAvailability.sources).filter(Boolean).map(value => new Date(value).toLocaleString(locale()));
  return '<section class="availability-panel availability-tools" aria-label="' + t('primeAvailability') + '"><h2>' + t('primeAvailability') + '</h2>' +
    '<div class="toolbar"><label>' + t('availabilityFilter') + ' <select id="availability-filter">' +
    ['all', 'available', 'partial', 'resurgence', 'vaulted', 'unknown'].map(value => '<option value="' + value + '">' + t(value === 'all' ? 'all' : value === 'resurgence' ? 'resurgence' : 'availability_' + value) + '</option>').join('') + '</select></label>' +
    '<label>' + t('availabilitySort') + ' <select id="availability-sort"><option value="catalog">' + t('catalogOrder') + '</option><option value="availability">' + t('availabilityOrder') + '</option></select></label>' +
    '<button id="refresh-availability"' + (availabilityLoading ? ' disabled' : '') + '>' + t(availabilityLoading ? 'availabilityLoading' : 'availabilityRefresh') + '</button></div>' +
    '<p class="small muted" role="status">' + t(availabilityLoading ? 'availabilityLoading' : liveAvailability.stale ? 'availabilityStale' : 'availabilityFresh') +
    (dates.length ? ' · ' + t('availabilityFetched') + ': ' + esc(dates.join(' / ')) : '') +
    (liveAvailability.expiry ? ' · ' + t('rotationEnds') + ': ' + esc(new Date(liveAvailability.expiry).toLocaleString(locale())) : '') + '</p>' +
    '<p class="small muted">' + t('vaultExplanation') + ' ' + link('https://github.com/WFCD/warframe-items', 'WFCD') + ' · ' + link('https://www.warframe.com/en/prime-resurgence', 'Prime Resurgence') + '</p></section>';
}
function availabilityDetails(frame) {
  if (!frame.prime || frame.founder) return '';
  const row = liveAvailability.frames[frame.id];
  return '<section class="availability-panel"><h3>' + t('primeAvailability') + '</h3>' + availabilityBadge(frame) +
    '<p class="small muted">' + t(liveAvailability.stale ? 'availabilityStale' : 'availabilityFresh') + ' ' + t('vaultExplanation') + '</p>' +
    (row ? row.parts.map(part => {
      const node = flatten(frame.recipe).find(node => node.id === part.id);
      return '<details><summary>' + esc(catalogText(node, 'name')) + ' · ' + t('partAvailability_' + part.status) + '</summary>' +
        (part.relics.length ? '<ul>' + part.relics.map(relic => '<li><strong>' + esc(relic.name) + '</strong> · ' + t(relic.channel === 'resurgence' ? 'resurgenceAya' : 'regularRelic') +
          (relic.locations.length ? '<ul>' + relic.locations.map(where => '<li>' + esc(where) + '</li>').join('') + '</ul>' : '') + '</li>').join('') + '</ul>' : '<p>' + t(part.status === 'vaulted' ? 'noNewRelics' : 'availabilityStale') + '</p>') + '</details>';
    }).join('') : '<p>' + t('availabilityStale') + '</p>') + '</section>';
}
async function refreshAvailability(force = false) {
  if (availabilityLoading) return;
  availabilityLoading = true;
  const update = () => {
    if (tab !== 'catalog') return;
    const panel = app.querySelector('.availability-tools');
    if (!panel) return;
    panel.outerHTML = availabilityToolbar();
    app.querySelector('#availability-filter').value = availabilityFilter;
    app.querySelector('#availability-sort').value = availabilitySort;
    renderCards();
  };
  update();
  try {
    const response = await fetch('/api/availability' + (force ? '?refresh=1' : ''));
    if (!response.ok) throw new Error('Availability unavailable');
    liveAvailability = await response.json();
  } catch { liveAvailability = { ...liveAvailability, stale: true, frames: Object.fromEntries(Object.entries(liveAvailability.frames).map(([id, row]) => [id, { ...row, status: 'unknown', parts: row.parts.map(part => ({ ...part, status: 'unknown' })) }])) }; }
  finally {
    availabilityLoading = false;
    update();
    if (dialog.open && frameId && !dialog.contains(document.activeElement)) renderDetail(byId.get(frameId), true);
  }
}
function sourceView(frame, action) {
  const node = action.node;
  const item = action.id ? materials[action.id] : node;
  const drops = action.id ? item?.drops ?? [] : node?.drops ?? [];
  const relics = action.id ? [] : node?.relics ?? [];
  const rows = drops.map(drop => '<li>' + esc(typeof drop === 'string' ? drop : catalogText(drop, 'where')) + '</li>');
  for (const relic of relics) rows.push('<li>' + esc(relic.name) + ': ' +
    (relicLocations[relic.name]?.map(place => esc(place.where)).join('; ') || t('sourceUnknown')) + '</li>');
  return '<details class="source-help"><summary>' + t('sourceHelp') + '</summary><p>' + t('sourceCaution') + '</p>' +
    (rows.length ? '<ul>' + rows.join('') + '</ul>' : '<p>' + t('sourceUnknown') + '</p>') +
    '<p>' + t('sourceSnapshot', { date: esc(date) }) + ' · ' + link(item?.wiki || frame.wiki, 'Warframe Wiki') + ' · ' +
    link('https://github.com/WFCD/warframe-items', 'WFCD') + '</p></details>';
}
function assistantView() {
  const goals = scopedFrames(frames, state, 'goals');
  if (!goals.length) return '<section class="goals-panel assistant"><h2>' + t('continueBuild') + '</h2><p>' + t('startOneGoal') + '</p></section>';
  const last = state.lastChange;
  return '<section class="goals-panel assistant" aria-labelledby="assistant-title"><h2 id="assistant-title">' + t('continueBuild') + '</h2>' +
    (last ? '<p class="small muted">' + t('lastChange') + ': ' + esc(byId.get(last.frameId)?.name) + ' · ' + t('change_' + last.kind) + ' · ' + esc(new Date(last.at).toLocaleString(locale())) + '</p>' : '') +
    goals.map(frame => {
      const action = nextAction(frame, state);
      const partName = action.node ? catalogText(action.node, 'name') : '';
      const label = action.id ? catalogText(materials[action.id], 'name') : partName;
      const quick = (kind, title) => '<button data-quick="' + kind + '" data-action-frame="' + esc(frame.id) + '">' + t(title) + '</button>';
      let controls = '';
      if (action.kind === 'acquire') controls = quick('acquire', 'receivedBlueprint');
      if (action.kind === 'craft') controls = quick('craft', action.root ? 'frameOwned' : 'recordCrafted');
      if (['check', 'farm'].includes(action.kind)) controls = resourceTable([{ id: action.id, count: action.target }], true) +
        (knownStock(state, action.id) ? '<label>' + t('addLoot') + ' ' + numberInput('data-loot="' + esc(frame.id) + '"', '', t('addLoot')) + '</label>' : '<p class="small muted">' + t('unknownLootHint') + '</p>');
      const totals = [...demand([frame], state)].map(([id, count]) => ({ id, count }));
      return '<article class="goal-plan" data-context="' + esc(frame.id) + '"><h3><button data-frame="' + esc(frame.id) + '">' + esc(frame.name) + '</button></h3>' +
        '<p class="action-title">' + t('action_' + action.kind) + (label ? ': <strong>' + esc(label) + '</strong>' : '') + '</p>' +
        '<p class="small muted">' + t('reason_' + action.kind) + '</p>' + controls +
        (['acquire', 'farm'].includes(action.kind) ? sourceView(frame, action) : '') +
        (totals.length ? '<details><summary>' + t('goalDeficit') + '</summary>' + resourceTable(totals, true) + '</details>' : '') +
        '<label class="goal-note">' + t('goalNote') + '<textarea maxlength="2000" data-note="' + esc(frame.id) + '">' + esc(state.notes[frame.id] ?? '') + '</textarea></label></article>';
    }).join('') + '</section>';
}
function quickUpdate(button) {
  const frame = byId.get(button.dataset.actionFrame);
  if (!frame || !state.goals.includes(frame.id)) return;
  const action = nextAction(frame, state);
  if (!['acquire', 'craft'].includes(action.kind) || action.kind !== button.dataset.quick) return;
  captureProgress();
  const saved = state.frames[frame.id] ??= { parts: {} };
  if (action.kind === 'craft' && action.root) saved.done = true;
  else saved.parts[action.node.id] = action.kind === 'acquire' ? 1 : 2;
  recordChange(saved.done ? 'owned' : 'part', frame);
  void save(); renderPage();
}
function catalogView() {
  const done = frames.filter(frame => entry(state, frame).done).length;
  const started = frames.filter(frame => { const p = collected(frame, state); return !p.done && p.have > 0; }).length;
  app.innerHTML = '<section aria-label="' + t('collection') + '"><div class="catalog-heading"><div><span class="eyebrow">' + t('personalArchive') + '</span><h1>' + t('collection') + '</h1></div>' +
    '<p class="collection-total"><strong>' + done + ' / ' + frames.length + '</strong> ' + t('collected') + '<small>' + started + ' · ' + t('inProgress') + '</small></p></div>' +
    '<div class="toolbar catalog-toolbar"><label class="search"><span aria-hidden="true">⌕</span><input type="search" id="search" placeholder="' + t('search') + '" aria-label="' + t('search') + '" aria-describedby="search-hint" value="' + esc(search) + '"></label>' +
    '<div class="segments" aria-label="' + t('frameType') + '">' + [['all',t('all')],['standard',t('standardPlural')],['prime','Prime']].map(([value,label]) => '<button data-group="' + value + '">' + label + '</button>').join('') + '</div>' +
    '<select id="status" aria-label="' + t('collectionStatus') + '"><option value="all">' + t('anyStatus') + '</option><option value="missing">' + t('notCollected') + '</option><option value="none">' + t('notStarted') + '</option><option value="started">' + t('inProgress') + '</option><option value="done">' + t('collected') + '</option></select><button id="reset-filters">' + t('resetFilters') + '</button></div>' +
    availabilityToolbar() + assistantView() + '<p id="search-hint" class="small muted">' + t('englishNames') + '</p>' + goalsView() + '<p id="count" class="small muted" aria-live="polite"></p><div id="cards" class="grid"></div>' +
    '<p class="catalog-version small muted">' + link('https://www.warframe.com/en/patch-notes', 'Warframe ' + gameVersion) + ' · ' + new Date(date + 'T12:00:00Z').toLocaleDateString(locale(), { timeZone: 'UTC' }) + '</p></section>';
  app.querySelector('#status').value = status;
  app.querySelector('#availability-filter').value = availabilityFilter;
  app.querySelector('#availability-sort').value = availabilitySort;
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
    const availability = liveAvailability.frames[frame.id];
    return (availabilityFilter === 'all' || frame.prime && !frame.founder && (availabilityFilter === 'resurgence' ? availability?.resurgence : (availability?.status ?? 'unknown') === availabilityFilter)) &&
      (group === 'all' || frame.prime === (group === 'prime')) &&
      (status === 'all' || status === 'done' && done || status === 'missing' && !done || status === 'none' && !done && have === 0 || status === 'started' && !done && have > 0) &&
      (frame.name.toLocaleLowerCase().includes(searchKey) || searchKey === 'прайм' && frame.prime);
  });
  if (availabilitySort === 'availability') {
    const rank = frame => frame.prime && !frame.founder ? ({ available: 0, partial: 1, vaulted: 2, unknown: 3 }[liveAvailability.frames[frame.id]?.status ?? 'unknown']) : 4;
    shown.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }
  app.querySelector('#count').textContent = t('count', { shown: n(shown.length), total: n(frames.length) });
  app.querySelector('#cards').innerHTML = shown.length ? shown.map(frame => {
    const { done, have, total } = collected(frame, state);
    const percent = done ? 100 : total ? Math.round(have / total * 100) : 0;
    const info = total ? stage(frame) + ' · ' + have + ' / ' + total : t('founderExclusive');
    return '<button class="card" data-frame="' + esc(frame.id) + '">' + portrait(frame) +
      '<span class="card-name"><span>' + esc(frame.name) + '</span><span aria-hidden="true">↗</span></span>' +
      availabilityBadge(frame) + '<span class="card-progress"><span>' + info + '</span><span class="line"><i style="width:' + percent + '%"></i></span></span></button>';
  }).join('') : '<p class="empty" style="grid-column:1/-1">' + t('noFramesFiltered') + '</p>';
}
function stage(frame) {
  const p = collected(frame, state);
  return t(p.done ? 'frameCollected' : p.have ? 'inProgress' : 'notStarted');
}
function stockRow(id, target, withInputs, label = '') {
  const item = materials[id];
  const known = knownStock(state, id);
  const stock = known ? state.stock[id] : '';
  const gap = known ? Math.max(0, target - stock) : null;
  const labelName = catalogText(item, 'name');
  const name = item.wiki ? link(item.wiki, labelName) : esc(labelName);
  return '<tr data-resource="' + esc(id) + '" data-needed="' + target + '"><td><span title="' + esc(item.en) + '">' + name + '</span>' +
    (item.drops?.length ? '<details class="small muted"><summary>' + t('whereToFarm') + '</summary>' + item.drops.map(place => '<div>' + esc(place) + '</div>').join('') + '</details>' : '') +
    '</td><td data-column="' + t('needed') + '">' + n(target) + '</td><td data-column="' + t('inStock') + '">' +
    (withInputs ? numberInput('data-stock="' + esc(id) + '" placeholder="' + t('unknownStock') + '"', stock, t('stockLabel') + ' ' + labelName) : known ? n(stock) : t('unknownStock')) +
    '</td><td data-column="' + t('shortfall') + '" data-gap class="' + (gap ? 'gold' : 'accent') + '">' + (gap === null ? t('checkStock') : n(gap)) + '</td>' +
    (withInputs ? '<td data-column="' + t('enough') + '"><input class="check" type="checkbox" data-fill="' + esc(id) + '" data-target="' + target +
      '" title="' + t('fillHint') + '" aria-label="' + esc(label + ' ' + t('enoughLabel') + ' ' + labelName) + '"' +
      (known && stock >= target && target > 0 ? ' checked' : '') + (target === 0 ? ' disabled' : '') + '></td>' : '') + '</tr>';
}
function resourceTable(rows, withInputs, label = '') {
  if (!rows.length) return '<p class="empty">' + t('materialsAccounted') + '</p>';
  return '<div class="table-shell resource-table"><table><thead><tr><th>' + t('material') + '</th><th>' + t('needed') + '</th><th>' + t('inStock') + '</th><th>' + t('shortfall') + '</th>' +
    (withInputs ? '<th>' + t('enough') + '</th>' : '') + '</tr></thead><tbody>' +
    rows.map(({ id, count }) => stockRow(id, count, withInputs, label)).join('') + '</tbody></table></div>';
}
function combined(scope = 'all') {
  const totals = demand(scopedFrames(frames, state, scope), state);
  return Object.keys(materials).map(id => ({ id, count: totals.get(id) ?? 0 })).sort((a, b) =>
    Number(b.count > 0) - Number(a.count > 0) || catalogText(materials[a.id], 'name').localeCompare(catalogText(materials[b.id], 'name'), locale()));
}
function inventoryView() {
  app.innerHTML = intro(t('resourcesSection'), t('inventory'), t('inventoryDescription')) +
    '<div class="toolbar"><label>' + t('resourceScope') + ' <select id="resource-scope"><option value="goals">' + t('myGoals') + '</option><option value="all">' + t('entireCollection') + '</option></select></label><label class="search"><input type="search" id="material-search" placeholder="' + t('materialSearch') + '" aria-label="' + t('materialSearch') + '" value="' + esc(materialSearch) + '"></label><button id="deficit-filter" aria-pressed="' + onlyDeficit + '">' + t('onlyDeficit') + '</button><button id="reset-materials">' + t('resetFilters') + '</button></div>' +
    (resourceScope === 'goals' && !state.goals.length ? '<p class="notes">' + t('noGoals') + ' <a href="#catalog">' + t('catalog') + '</a></p>' : '') +
    '<p id="material-count" class="small muted" aria-live="polite"></p>' + (resourceScope === 'goals' && !state.goals.length ? '' : resourceTable(combined(resourceScope).filter(row => resourceScope === 'all' || row.count > 0), true));
  app.querySelector('#resource-scope').value = resourceScope;
  filterMaterials();
}
function filterMaterials() {
  if (!app.querySelector('[data-resource]')) {
    app.querySelector('#material-count').textContent = '';
    return;
  }
  let visible = 0;
  for (const row of app.querySelectorAll('[data-resource]')) {
    const item = materials[row.dataset.resource];
    const matches = [catalogText(item, 'name'), item.en].join(' ').toLocaleLowerCase().includes(materialSearch.trim().toLocaleLowerCase());
    row.hidden = !matches || onlyDeficit && (Number(row.dataset.needed) === 0 || knownStock(state, row.dataset.resource) && Number(row.dataset.needed) <= state.stock[row.dataset.resource]);
    if (!row.hidden) visible++;
  }
  app.querySelector('#material-count').textContent = visible ? t('materialCount', { count: n(visible) }) : t('noMaterials');
}
function quoteStale(q) { return q.stale || !Number.isFinite(Date.parse(q.date)) || Date.now() - Date.parse(q.date) >= 86400000; }
function priceLabel(slug) {
  const quote = quotes[slug];
  if (!quote) return '—';
  if (!Number.isFinite(quote.price)) return quote.error ? t('unavailable') : t('noOffers');
  const stale = quoteStale(quote);
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
    (Object.values(quotes).some(q => Number.isFinite(q.price) && quoteStale(q)) ? '<p class="notes price-warning" role="status">' + t('staleTotals') + '</p>' : '') +
    '<div class="metrics">' + metric(t('allSets'), price(budget.full, budget.fullKnown), t('setCoverage', { known: n(budget.fullKnown), total: n(tradable.length) }), 'gold') +
    metric(t('stillToBuy'), price(budget.remaining, budget.remainingKnown || !budget.missing), budget.missing ? t('missingEstimate', { count: n(budget.missing) }) : t('remainingBasis'), 'gold') +
    metric(t('estimatedSpending'), price(budget.assumed, budget.assumedKnown || !budget.assumedMissing), budget.assumedMissing ? t('missingSpentEstimate', { count: n(budget.assumedMissing) }) : t('purchaseAssumption'), 'gold') +
    metric(t('recordedSpending'), price(budget.spent, budget.recorded), t('purchaseCount', { count: n(budget.recorded) }), 'gold') + '</div>' +
    '<p class="notes">' + t('priceNotes') + '</p>' +
    '<p id="market-status" class="progress-text" role="status"></p><div class="table-shell"><table><thead><tr><th>Prime</th><th>' + t('status') + '</th><th>' + t('setPrice') + '</th><th>' + t('recordedPrice') + '</th></tr></thead><tbody>' +
    tradable.map(frame => '<tr><td><button class="link-button" data-frame="' + esc(frame.id) + '">' + esc(frame.name) +
      '</button></td><td>' + stage(frame) + '</td><td>' +
      marketLink(frame.market, priceLabel(frame.market)) + '</td><td>' + (entry(state, frame).paid === undefined ? '—' : n(entry(state, frame).paid)) + '</td></tr>').join('') + '</tbody></table></div>' +
    '<div class="section-head"><div><span class="eyebrow">' + t('foundry') + '</span><h2>' + t('remainingMaterials') + '</h2></div></div>' +
    resourceTable(missingMaterials, true) +
    '<div class="section-head"><div><span class="eyebrow">' + t('collection') + '</span><h2>' + t('frameProgress') + '</h2></div></div>' +
    '<div class="table-shell"><table><thead><tr><th>' + t('warframe') + '</th><th>' + t('blueprintsAndParts') + '</th><th>' + t('status') + '</th></tr></thead><tbody>' +
    frames.map(frame => {
      const progress = collected(frame, state);
      return '<tr><td><button class="link-button" data-frame="' + esc(frame.id) + '">' + esc(frame.name) + '</button></td><td>' +
        (progress.total ? progress.have + ' / ' + progress.total : '—') + '</td><td>' + stage(frame) + '</td></tr>';
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
    availabilityDetails(frame) + '<div class="toolbar">' + (frame.recipe ? '<button id="toggle-goal" aria-pressed="' + state.goals.includes(frame.id) + '">' + t(state.goals.includes(frame.id) ? 'goalRemove' : 'goalAdd') + '</button>' : '') + undoButton('undo-detail') + '</div>' +
    (frame.market ? '<div class="buy-line"><span class="gold">' + t('setLabel') + ' <strong data-price="' + esc(frame.market) + '">' + priceLabel(frame.market) + '</strong></span> ' +
      marketLink(frame.market, 'Warframe.market') + ' <button class="buy" id="refresh-frame">' + t('checkPrices') + '</button></div>' +
      '<label class="small">' + t('actualPurchase') + ' ' + numberInput('id="paid" placeholder="—"', saved.paid ?? '', t('actualPurchase')) +
      '</label><p class="muted small">' + t('purchaseHint') + '</p>' : '') +
    (frame.founder ? '<p class="notes">' + t('founderNotes') + '</p>' :
      '<h3>' + t('blueprintsAndComponents') + '</h3><div class="component-overview">' + [frame.recipe, ...frame.recipe.parts].map(part => '<button data-jump="' + esc(part.id) + '">' + esc(catalogText(part, 'name')) + '<small>' + t(saved.done || saved.parts[part.id] === 2 ? 'partReady' : saved.parts[part.id] ? 'partBlueprint' : 'partMissing') + '</small></button>').join('') + '</div>' + (frame.name === 'Equinox' ? '<p class="notes">' + t('equinoxNotes') + '</p>' : '') +
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
  if (input.matches('[data-loot]')) {
    const frame = byId.get(input.dataset.loot);
    const action = nextAction(frame, state);
    if (input.value === '' || !action.id || !knownStock(state, action.id)) return;
    const value = Number(input.value);
    if (!Number.isSafeInteger(value) || value < 0 || !Number.isSafeInteger(state.stock[action.id] + value)) return;
    captureProgress(); state.stock[action.id] += value;
    recordChange('stock', frame); void save(); renderPage(); return;
  }
  if (input.matches('[data-note]')) {
    captureProgress(); const frame = byId.get(input.dataset.note);
    if (input.value.trim()) state.notes[frame.id] = input.value.trim().slice(0, 2000);
    else delete state.notes[frame.id];
    recordChange('note', frame); void save(); renderPage(); return;
  }
  if (input.id === 'availability-filter') { availabilityFilter = input.value; renderCards(); return; }
  if (input.id === 'availability-sort') { availabilitySort = input.value; renderCards(); return; }
  if (input.id === 'resource-scope') { resourceScope = input.value; inventoryView(); return; }
  if (input.id === 'status') { status = input.value; renderCards(); return; }
  if (!input.matches('[data-stock], [data-fill], [data-part], #owned, #paid')) return;
  captureProgress();
  const frame = byId.get(frameId);
  const id = input.dataset.stock ?? input.dataset.fill;
  if (id) {
    const target = Number(input.dataset.target);
    if (input.hasAttribute('data-stock') && input.value === '') delete state.stock[id];
    else state.stock[id] = input.hasAttribute('data-stock') ? amount(input.value) : input.checked ? target : Math.max(0, target - 1);
    recordChange('stock', byId.get(input.closest('[data-context]')?.dataset.context) ?? byId.get(frameId) ?? scopedFrames(frames, state, 'goals')[0]);
    void save(); renderPage();
    if (dialog.open && frame) renderDetail(frame, true);
    const container = dialog.open ? dialog : app;
    container.querySelector('[data-stock="' + CSS.escape(id) + '"]')?.focus({ preventScroll: true });
    return;
  }
  else if (frame) {
    const saved = state.frames[frame.id] ??= { parts: {} };
    if (input.id === 'owned') { saved.done = input.checked; recordChange('owned', frame); }
    if (input.id === 'paid') {
      if (input.value === '') delete saved.paid;
      else saved.paid = amount(input.value);
      input.value = saved.paid ?? '';
      save();
      return;
    }
    if (input.hasAttribute('data-part')) { saved.parts[input.dataset.part] = input.type === 'checkbox' ? Number(input.checked) : Number(input.value); recordChange('part', frame); }
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
  if (button.dataset.goalAction) {
    captureProgress();
    const index = state.goals.indexOf(button.dataset.goalId);
    if (button.dataset.goalAction === 'remove') state.goals.splice(index, 1);
    else {
      const next = index + (button.dataset.goalAction === 'up' ? -1 : 1);
      if (index >= 0 && next >= 0 && next < state.goals.length) [state.goals[index], state.goals[next]] = [state.goals[next], state.goals[index]];
    }
    void save(); catalogView();
    app.querySelector('[data-goal-id="' + CSS.escape(button.dataset.goalId) + '"]')?.focus();
  }
  if (button.dataset.quick) { quickUpdate(button); return; }
  if (button.dataset.frame) openFrame(button.dataset.frame, button);
  if (button.id === 'refresh-availability') { void refreshAvailability(true); return; }
  if (button.id === 'reset-filters') { group = 'all'; status = 'all'; search = ''; availabilityFilter = 'all'; availabilitySort = 'catalog'; catalogView(); app.querySelector('#search').focus(); }
  if (button.id === 'deficit-filter') { onlyDeficit = !onlyDeficit; button.setAttribute('aria-pressed', onlyDeficit); filterMaterials(); }
  if (button.id === 'reset-materials') { materialSearch = ''; onlyDeficit = false; inventoryView(); app.querySelector('#material-search').focus(); }
  if (button.dataset.group) { group = button.dataset.group; renderCards(); }
  if (button.id === 'refresh-all') void refreshMarket();
});
app.addEventListener('input', event => {
  if (event.target.id === 'material-search') { materialSearch = event.target.value; filterMaterials(); }
  if (event.target.id === 'search') { search = event.target.value; renderCards(); }
});
app.addEventListener('change', changed);
dialog.addEventListener('change', changed);
dialog.addEventListener('click', event => {
  if (event.target.id === 'undo-detail') undoProgress();
  if (event.target.id === 'toggle-goal') {
    captureProgress();
    state.goals = state.goals.includes(frameId) ? state.goals.filter(id => id !== frameId) : [...state.goals, frameId];
    void save(); renderDetail(byId.get(frameId), true);
    dialog.querySelector('#toggle-goal').focus();
  }
  const jump = event.target.closest('[data-jump]');
  if (jump) {
    const section = dialog.querySelector('[data-section="' + CSS.escape(jump.dataset.jump) + '"]');
    section.open = true;
    section.scrollIntoView({ block: 'start' });
    section.querySelector('summary').focus();
  }
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
      captureProgress();
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
void refreshAvailability();
setInterval(() => { if (!document.hidden) void refreshAvailability(); }, 300000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) void refreshAvailability(); });
fetch('/api/prices').then(response => response.json()).then(saved => {
  quotes = { ...saved, ...quotes };
  if (tab === 'summary' && !batch) summaryView();
}).catch(() => {});
