
export const empty = () => ({ frames: {}, stock: {}, goals: [], notes: {}, lastChange: null });
export const knownStock = (state, id) => Object.hasOwn(state.stock, id) && Number.isSafeInteger(state.stock[id]) && state.stock[id] >= 0;
export function normalizeStock(value) {
  return Object.fromEntries(Object.entries(value).filter(([id, count]) =>
    (id === 'credits' || id.startsWith('/Lotus/')) && Number.isSafeInteger(count) && count >= 0));
}
export function normalizeContext(raw, frames) {
  const valid = new Set(frames.map(frame => frame.id));
  const notes = raw.notes && typeof raw.notes === 'object' && !Array.isArray(raw.notes)
    ? Object.fromEntries(Object.entries(raw.notes).filter(([id, note]) => valid.has(id) && typeof note === 'string').map(([id, note]) => [id, note.slice(0, 2000)])) : {};
  const last = raw.lastChange;
  const lastChange = last && ['stock', 'part', 'owned', 'note'].includes(last.kind) && valid.has(last.frameId) &&
    typeof last.at === 'string' && Number.isFinite(Date.parse(last.at)) ? { kind: last.kind, frameId: last.frameId, at: last.at } : null;
  return { notes, lastChange };
}

// Deterministic recipe traversal: acquisition first, then unfinished children,
// then local materials. It proposes a useful step, not an optimal route.
export function nextAction(frame, state) {
  if (entry(state, frame).done) return { kind: 'complete' };
  if (!frame.recipe) return { kind: 'unavailable' };
  const saved = entry(state, frame);
  function visit(node, root = false) {
    if (!root && saved.parts[node.id] === 2) return null;
    if (!saved.parts[node.id]) return { kind: 'acquire', node };
    for (const child of node.parts) {
      const action = visit(child);
      if (action) return action;
    }
    for (const row of node.materials) {
      const target = row.count * (root ? 1 : node.count);
      if (!knownStock(state, row.id)) return { kind: 'check', node, id: row.id, target };
      if (state.stock[row.id] < target) return { kind: 'farm', node, id: row.id, target, gap: target - state.stock[row.id] };
    }
    return { kind: 'craft', node, root };
  }
  return visit(frame.recipe, true);
}
export function normalizeGoals(value, frames) {
  const valid = new Set(frames.filter(frame => frame.recipe).map(frame => frame.id));
  return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && valid.has(id)))] : [];
}
export function scopedFrames(frames, state, scope) {
  const byId = new Map(frames.map(frame => [frame.id, frame]));
  return scope === 'all' ? frames : normalizeGoals(state.goals, frames).map(id => byId.get(id));
}

export function progressHistory() {
  let previous;
  return {
    get available() { return previous !== undefined; },
    capture(state) { previous = structuredClone(state); },
    undo() { const result = previous; previous = undefined; return result; },
  };
}
export const amount = value => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
export const flatten = node => node ? [node, ...node.parts.flatMap(flatten)] : [];
export const entry = (state, frame) => state.frames[frame.id] ?? { parts: {} };

export function collected(frame, state) {
  const saved = entry(state, frame);
  const parts = flatten(frame.recipe);
  const count = (node, inherited = false) => {
    const crafted = inherited || saved.parts[node.id] === 2;
    return Number(crafted || saved.parts[node.id] === 1) + node.parts.reduce((sum, child) => sum + count(child, crafted), 0);
  };
  return { done: Boolean(saved.done), total: parts.length, have: frame.recipe ? count(frame.recipe, saved.done) : 0 };
}

export function demand(frames, state) {
  const totals = new Map();
  for (const frame of frames) {
    const saved = entry(state, frame);
    if (!frame.recipe || saved.done) continue;
    const visit = (node, multiplier) => {
      if (saved.parts[node.id] === 2) return;
      for (const row of node.materials) totals.set(row.id, (totals.get(row.id) ?? 0) + row.count * multiplier);
      for (const part of node.parts) visit(part, multiplier * part.count);
    };
    visit(frame.recipe, 1);
  }
  return totals;
}

export function estimate(frames, state, quotes) {
  const totals = { full: 0, fullKnown: 0, remaining: 0, remainingKnown: 0, missing: 0, spent: 0, recorded: 0, assumed: 0, assumedKnown: 0, assumedMissing: 0 };
  const price = slug => Number.isFinite(quotes[slug]?.price) ? quotes[slug].price : null;
  for (const frame of frames.filter(item => item.market)) {
    const saved = entry(state, frame);
    const set = price(frame.market);
    if (set !== null) { totals.full += set; totals.fullKnown++; }
    if (saved.paid != null) { totals.spent += saved.paid; totals.recorded++; }
    if (saved.done) {
      const paid = saved.paid ?? set;
      if (paid === null) totals.assumedMissing++;
      else { totals.assumed += paid; totals.assumedKnown++; }
      continue;
    }
    const remaining = [];
    function visit(node) {
      if (!saved.parts[node.id]) remaining.push(node);
      if (saved.parts[node.id] !== 2) node.parts.forEach(visit);
    }
    if (!frame.recipe) { totals.missing++; continue; }
    visit(frame.recipe);
    if (!remaining.length) continue;
    const prices = remaining.map(node => price(node.market));
    const partsCost = prices.every(value => value !== null) ? prices.reduce((sum, value) => sum + value, 0) : null;
    const known = [set, partsCost].filter(value => value !== null);
    if (known.length) { totals.remaining += Math.min(...known); totals.remainingKnown++; }
    else totals.missing++;
  }
  return totals;
}

export function restoreProgress(raw, frames) {
  const byId = new Map(frames.map(frame => [frame.id, frame]));
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  if (!record(raw) || !record(raw.frames) || !record(raw.stock)) {
    throw new Error('Invalid progress');
  }
  const clean = empty();
  clean.goals = normalizeGoals(raw.goals, frames);
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
  clean.stock = normalizeStock(raw.stock);
  Object.assign(clean, normalizeContext(raw, frames));
  return clean;
}
