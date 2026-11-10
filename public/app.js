
import { empty, amount, flatten, entry, collected, demand, estimate } from './model.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#detail');
const key = 'frametracker:v1';
const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const n = value => number.format(value);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const link = (url, label) => '<a href="' + esc(url) + '" target="_blank" rel="noreferrer">' + esc(label) + ' ↗</a>';
const marketLink = (slug, label) => link('https://warframe.market/items/' + slug, label);
const image = (frame, extra = '') => '<img ' + extra + ' data-portrait alt="" src="https://cdn.warframestat.us/img/' + encodeURIComponent(frame.image) + '">';
const numberInput = (attr, value, label) => '<input class="stock" type="number" min="0" step="1" max="999999999" ' + attr + ' value="' + value + '" aria-label="' + esc(label) + '">';
const { frames, materials, relicLocations, date, gameVersion } = await fetch('/catalog.json').then(response => response.json());
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
const saveStatus = document.querySelector('#save-status');

let legacy;
try {
  const raw = localStorage.getItem(key);
  if (raw) legacy = restore(JSON.parse(raw));
} catch {
  notify('Не удалось загрузить сохранённый прогресс.');
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
      if (await save()) notify('Прогресс перенесён в профиль Windows.');
    }
    if (!unsaved) saveStatus.textContent = 'Прогресс хранится в профиле Windows.';
  }
} catch {
  app.textContent = 'Не удалось открыть сохранение. Перезагрузи страницу или перезапусти FrameTracker.';
  throw new Error('FrameTracker progress could not be loaded');
}

function restore(raw) {
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  if (!record(raw) || !record(raw.frames) || !record(raw.stock)) {
    throw new Error('Некорректный файл прогресса');
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
async function save() {
  const snapshot = JSON.stringify(state);
  if (!portable) {
    try {
      localStorage.setItem(key, snapshot);
      return true;
    } catch {
      notify('Браузер не сохранил изменения. Сделай экспорт прогресса.');
      return false;
    }
  }
  unsaved = true;
  saveStatus.textContent = 'Сохраняем прогресс…';
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
      saveStatus.textContent = 'Прогресс сохранён в профиле Windows.';
    }
    return true;
  }).catch(() => {
    const message = conflict
      ? 'Прогресс изменился в другой вкладке. Экспортируй свои изменения перед перезагрузкой.'
      : 'Не удалось сохранить прогресс. Сделай экспорт перед закрытием.';
    saveStatus.textContent = message;
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
  const notice = document.querySelector('#notice');
  notice.textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.textContent = ''; }, 4200);
}
function portrait(frame) {
  const type = frame.founder ? 'Основатели' : frame.prime ? 'Prime' : 'Обычный';
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
  app.innerHTML = '<section class="hero"><div class="hero-copy"><span class="eyebrow">Личный архив · Warframe</span>' +
    '<h1>Арсенал <span>Тэнно</span></h1><p>От первого чертежа до готового варфрейма. Собирай детали, планируй фарм и веди учёт платины.</p></div>' +
    '<div class="hero-sigil"></div>' + image(hero, 'class="hero-art" fetchpriority="high"') +
    '<span class="hero-tag">Профиль 01 / Excalibur Umbra</span></section>' +
    '<section aria-label="Коллекция"><div class="section-head"><div><span class="eyebrow">01 / Коллекция</span><h2>Варфреймы</h2></div>' +
    '<p class="muted small">' + link('https://www.warframe.com/en/patch-notes', 'Warframe ' + gameVersion) +
    ' · ' + new Date(date + 'T12:00:00Z').toLocaleDateString('ru-RU', { timeZone: 'UTC' }) + '</p></div>' +
    '<div class="metrics">' + metric('В каталоге', frames.length, 'Обычные и Prime') + metric('Обычные', standard, 'Включая Umbra') +
    metric('Prime', frames.length - standard, 'Включая эксклюзив основателей', 'gold') +
    metric('Собрано', done + ' / ' + frames.length, Math.round(done / frames.length * 100) + '% коллекции', 'accent') + '</div>' +
    '<div class="toolbar"><div class="segments" aria-label="Тип варфрейма">' +
    [['all','Все'],['standard','Обычные'],['prime','Prime']].map(([value, label]) => '<button data-group="' + value + '">' + label + '</button>').join('') +
    '</div><label class="search"><span aria-hidden="true">⌕</span><input type="search" id="search" placeholder="Найти варфрейма" aria-label="Найти варфрейма" value="' + esc(search) + '"></label>' +
    '<select id="status" aria-label="Статус коллекции"><option value="all">Любой статус</option><option value="missing">Не собрано</option><option value="started">В процессе</option><option value="done">Собрано</option></select></div>' +
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
  app.querySelector('#count').textContent = 'Показано ' + shown.length + ' из ' + frames.length;
  app.querySelector('#cards').innerHTML = shown.length ? shown.map(frame => {
    const { done, have, total } = collected(frame, state);
    const percent = done ? 100 : total ? Math.round(have / total * 100) : 0;
    const info = done ? '✓ Собрано' : total ? have + ' / ' + total + ' чертежей и деталей' : 'Эксклюзив основателей';
    return '<button class="card" data-frame="' + esc(frame.id) + '">' + portrait(frame) +
      '<span class="card-name"><span>' + esc(frame.name) + '</span><span aria-hidden="true">↗</span></span>' +
      '<span class="card-progress"><span>' + info + '</span><span class="line"><i style="width:' + percent + '%"></i></span></span></button>';
  }).join('') : '<p class="empty" style="grid-column:1/-1">Варфреймы по этому запросу не найдены.</p>';
}
function stockRow(id, target, withInputs, label = '') {
  const item = materials[id];
  const stock = state.stock[id] ?? 0;
  const gap = Math.max(0, target - stock);
  const name = item.wiki ? link(item.wiki, item.name) : esc(item.name);
  return '<tr data-resource="' + esc(id) + '" data-needed="' + target + '"><td><span title="' + esc(item.en) + '">' + name + '</span>' +
    (item.drops?.length ? '<details class="small muted"><summary>Где добыть</summary>' + item.drops.map(place => '<div>' + esc(place) + '</div>').join('') + '</details>' : '') +
    '</td><td>' + n(target) + '</td><td>' +
    (withInputs ? numberInput('data-stock="' + esc(id) + '"', stock, 'Есть: ' + item.name) : n(stock)) +
    '</td><td data-gap class="' + (gap ? 'gold' : 'accent') + '">' + n(gap) + '</td>' +
    (withInputs ? '<td><input class="check" type="checkbox" data-fill="' + esc(id) + '" data-target="' + target +
      '" title="Заполнить до нужного количества. Снятие отметки уменьшает запас на одну единицу ниже цели." aria-label="' + esc(label + ' Хватает: ' + item.name) + '"' +
      (stock >= target && target > 0 ? ' checked' : '') + (target === 0 ? ' disabled' : '') + '></td>' : '') + '</tr>';
}
function resourceTable(rows, withInputs, label = '') {
  if (!rows.length) return '<p class="empty">Все материалы для оставшихся рецептов учтены.</p>';
  return '<div class="table-shell"><table><thead><tr><th>Материал</th><th>Нужно</th><th>Есть</th><th>Не хватает</th>' +
    (withInputs ? '<th>Хватает</th>' : '') + '</tr></thead><tbody>' +
    rows.map(({ id, count }) => stockRow(id, count, withInputs, label)).join('') + '</tbody></table></div>';
}
function combined() {
  const totals = demand(frames, state);
  return Object.keys(materials).map(id => ({ id, count: totals.get(id) ?? 0 })).sort((a, b) =>
    Number(b.count > 0) - Number(a.count > 0) || materials[a.id].name.localeCompare(materials[b.id].name, 'ru'));
}
function inventoryView() {
  app.innerHTML = intro('02 / Ресурсы', 'Инвентарь', 'Указывай фактический запас. Эти количества используются во всех карточках и в общей сводке.') +
    resourceTable(combined(), true);
}
function priceLabel(slug) {
  const quote = quotes[slug];
  if (!quote) return '—';
  if (!Number.isFinite(quote.price)) return quote.error ? 'Недоступно' : 'Нет предложений';
  const stale = quote.stale || Date.now() - Date.parse(quote.date) >= 86400000;
  return n(quote.price) + ' пл.' + (stale ? ' · уст.' : '');
}
function summaryView() {
  const done = frames.filter(frame => entry(state, frame).done);
  const prime = done.filter(frame => frame.prime).length;
  const budget = estimate(frames, state, quotes);
  const missingMaterials = combined().filter(row => row.count > 0);
  const price = (value, known) => known ? n(value) + ' пл.' : '—';
  app.innerHTML = intro('03 / Статистика', 'Сводка коллекции', 'Прогресс, общий список покупок и материалы для незавершённых рецептов.') +
    '<div class="metrics">' + metric('Собрано', done.length + ' / ' + frames.length, 'Отмечены готовыми', 'accent') +
    metric('Осталось', frames.length - done.length, 'Включая эксклюзив основателей') +
    metric('Обычные', done.length - prime + ' / ' + (frames.length - frames.filter(frame => frame.prime).length)) +
    metric('Prime', prime + ' / ' + frames.filter(frame => frame.prime).length, 'Готовые варфреймы', 'gold') + '</div>' +
    '<div class="section-head"><div><span class="eyebrow">Warframe.market · PC / кроссплей</span><h2>Бюджет Prime</h2></div>' +
    '<div class="actions"><button class="buy" id="refresh-all">' + (batch && !batch.cancelled && batch.done < batch.total ? 'Остановить' : 'Загрузить цены') + '</button></div></div>' +
    '<div class="metrics">' + metric('Все наборы', price(budget.full, budget.fullKnown), budget.fullKnown + ' из ' + tradable.length + ' наборов с ценой', 'gold') +
    metric('Осталось купить', price(budget.remaining, budget.remainingKnown || !budget.missing), budget.missing ? 'Без оценки: ' + budget.missing + ' варфреймов' : 'По наборам или недостающим чертежам', 'gold') +
    metric('Потрачено по оценке', price(budget.assumed, budget.assumedKnown || !budget.assumedMissing), budget.assumedMissing ? 'Без оценки: ' + budget.assumedMissing + ' собранных' : 'Собранные Prime считаются купленными', 'gold') +
    metric('Записано вручную', price(budget.spent, budget.recorded), 'Покупок с указанной ценой: ' + budget.recorded, 'gold') + '</div>' +
    '<p class="notes">Цены — среднее до пяти самых дешёвых активных предложений о продаже. Оценка трат берёт введённую сумму, а для остальных собранных Prime — текущую цену набора. Бюджет исключает Excalibur Prime. Суммы с неполным покрытием показаны по доступным ценам.</p>' +
    '<p id="market-status" class="progress-text" role="status"></p><div class="table-shell"><table><thead><tr><th>Prime</th><th>Статус</th><th>Цена набора</th><th>Введено, пл.</th></tr></thead><tbody>' +
    tradable.map(frame => '<tr><td><button class="link-button" data-frame="' + esc(frame.id) + '">' + esc(frame.name) +
      '</button></td><td>' + (entry(state, frame).done ? 'Собран' : 'В работе') + '</td><td>' +
      marketLink(frame.market, priceLabel(frame.market)) + '</td><td>' + (entry(state, frame).paid ?? '—') + '</td></tr>').join('') + '</tbody></table></div>' +
    '<div class="section-head"><div><span class="eyebrow">Кузница</span><h2>Материалы для оставшихся</h2></div></div>' +
    resourceTable(missingMaterials, true) +
    '<div class="section-head"><div><span class="eyebrow">Коллекция</span><h2>Прогресс по варфреймам</h2></div></div>' +
    '<div class="table-shell"><table><thead><tr><th>Варфрейм</th><th>Чертежи и детали</th><th>Статус</th></tr></thead><tbody>' +
    frames.map(frame => {
      const progress = collected(frame, state);
      return '<tr><td><button class="link-button" data-frame="' + esc(frame.id) + '">' + esc(frame.name) + '</button></td><td>' +
        (progress.total ? progress.have + ' / ' + progress.total : '—') + '</td><td>' + (progress.done ? 'Собран' : 'Не собран') + '</td></tr>';
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
  if (seconds >= 3600) return n(seconds / 3600) + ' ч';
  if (seconds >= 60) return n(seconds / 60) + ' мин';
  return n(seconds) + ' с';
}
function dropList(part, frame) {
  const drops = part.drops?.length ? '<ul>' + part.drops.map(drop =>
    '<li>' + esc(drop.where) + (Number.isFinite(drop.chance) ? ' · ' + n(drop.chance) + '%' : '') + '</li>').join('') + '</ul>' : '';
  const relics = part.relics?.length ? '<h4>Реликвии</h4><p class="small muted">Шанс награды указан для целой реликвии.</p>' + part.relics.map(relic => {
    const places = relicLocations[relic.name];
    return '<details class="relic"><summary>' + esc(relic.name) + ' <small>' + n(relic.chance) +
      '% · ' + (places ? 'Есть в миссиях' : 'Без миссии в таблице') + '</small></summary>' +
      (places ? '<ul>' + places.map(place => '<li>' + esc(place.where) + ' · ' + n(place.chance) + '%</li>').join('') + '</ul>' :
        '<p class="muted">Проверь старые запасы, обмен и текущую ротацию Prime Resurgence.</p>') +
      '</details>';
  }).join('') : '';
  return drops || relics ? drops + relics : '<p class="small muted">Источник не указан. ' + link(frame.wiki, 'Проверить в Wiki') + '</p>';
}
function partView(part, frame, opened, root, inherited) {
  const saved = entry(state, frame);
  const value = inherited ? 2 : saved.parts[part.id] ?? 0;
  const marker = value === 2 ? '✓ Готово' : value === 1 ? '✓ Чертёж' : 'Нужно найти';
  const options = root ? '<label><input class="check" type="checkbox" data-part="' + esc(part.id) + '"' +
    (value ? ' checked' : '') + (inherited ? ' disabled' : '') + '> Чертёж есть</label>' :
    '<select data-part="' + esc(part.id) + '" aria-label="' + esc('Статус: ' + part.name) + '"' + (inherited ? ' disabled' : '') + '>' +
      ['Нужно найти','Чертёж есть','Деталь готова'].map((label, index) => '<option value="' + index + '"' +
        (index === value ? ' selected' : '') + '>' + label + '</option>').join('') + '</select>';
  return '<details class="part" data-section="' + esc(part.id) + '"' + (opened.has(part.id) ? ' open' : '') +
    '><summary><strong>' + esc(part.name) + (part.count > 1 ? ' ×' + part.count : '') + '</strong>' +
    (part.market ? '<span class="gold small" data-price="' + esc(part.market) + '">' + priceLabel(part.market) + '</span>' : '') +
    '<span class="small ' + (value ? 'accent' : 'muted') + '">' + marker + '</span></summary><div class="part-content">' +
    '<div class="actions">' + options + (part.market ? marketLink(part.market, 'Warframe.market') : '') + '</div>' +
    '<h4>Как получить</h4>' + dropList(part, frame) +
    '<h4>Крафт' + (part.time ? ' · ' + timeLabel(part.time) : '') + '</h4>' +
    resourceTable(part.materials.map(row => ({ id: row.id, count: row.count * part.count })), true, part.name) +
    (!root && part.parts.length ? '<h4>Компоненты</h4>' + part.parts.map(node => partView(node, frame, opened, false, value === 2)).join('') : '') +
    '</div></details>';
}
function renderDetail(frame, keep = false) {
  const open = new Set(keep ? [...dialog.querySelectorAll('[data-section][open]')].map(node => node.dataset.section) : [frame.recipe?.id]);
  const y = keep ? dialog.scrollTop : 0;
  const saved = entry(state, frame);
  const progress = collected(frame, state);
  dialog.innerHTML = '<div class="detail-head">' + portrait(frame) + '<div><span class="eyebrow">' +
    (frame.founder ? 'Эксклюзив основателей' : frame.prime ? 'Архив Prime' : 'Архив Тэнно') +
    '</span><h2 id="frame-title">' + esc(frame.name) + '</h2>' + link(frame.wiki, 'Warframe Wiki') +
    '</div><button class="close" aria-label="Закрыть" id="close">×</button></div><div class="detail-body">' +
    '<label class="owned"><input class="check" type="checkbox" id="owned"' + (saved.done ? ' checked' : '') +
    '> <strong>Варфрейм собран</strong>' + (progress.total ? '<span class="muted small"> · ' + progress.have + ' / ' + progress.total + '</span>' : '') + '</label>' +
    (frame.market ? '<div class="buy-line"><span class="gold">Набор: <strong data-price="' + esc(frame.market) + '">' + priceLabel(frame.market) + '</strong></span> ' +
      marketLink(frame.market, 'Warframe.market') + ' <button class="buy" id="refresh-frame">Проверить цены</button></div>' +
      '<label class="small">Фактическая покупка, пл. ' + numberInput('id="paid" placeholder="—"', saved.paid ?? '', 'Фактическая покупка, пл.') +
      '</label><p class="muted small">Пустое поле использует цену набора для оценки трат после сборки.</p>' : '') +
    (frame.founder ? '<p class="notes">Выдавался участникам Founders Program. Реликвий и рыночного набора нет.</p>' :
      '<h3>Чертежи и компоненты</h3>' + (frame.name === 'Equinox' ? '<p class="notes">Для финальной сборки нужны оба готовых аспекта. В каждом раскрывается свой набор из трёх частей.</p>' : '') +
      partView(frame.recipe, frame, open, true, saved.done) +
      frame.recipe.parts.map(part => partView(part, frame, open, false, saved.done)).join('') +
      '<p class="muted small">Запас общий для всей коллекции. Готовая деталь исключает свой рецепт из общей потребности. Остатки после крафта меняются вручную в инвентаре.</p>') +
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
  if (button) { button.disabled = true; button.textContent = 'Загружаем…'; }
  const results = await Promise.all(frameSlugs(frame).map(loadPrice));
  if (button?.isConnected) {
    button.disabled = false;
    button.textContent = results.some(result => result.error) ? 'Повторить загрузку' : 'Проверить цены';
  }
}
function showBatchProgress() {
  const target = app.querySelector('#market-status');
  if (target && batch) target.textContent = (batch.cancelled ? 'Остановлено' : batch.done === batch.total ? 'Готово' : 'Загрузка цен') +
    ' · ' + batch.done + ' / ' + batch.total + (batch.errors ? ' · Ошибок: ' + batch.errors : '');
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
      notify('Warframe.market недоступен. Загрузку цен можно повторить.');
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
    if (confirm('Заменить текущий прогресс данными из файла?')) {
      state = imported;
      const saved = await save();
      renderPage();
      if (saved) notify('Прогресс загружен.');
    }
  } catch {
    notify('Не удалось открыть файл прогресса.');
  } finally {
    event.target.value = '';
  }
});
window.addEventListener('hashchange', route);
route();
fetch('/api/prices').then(response => response.json()).then(saved => {
  quotes = { ...saved, ...quotes };
  if (tab === 'summary' && !batch) summaryView();
}).catch(() => {});
