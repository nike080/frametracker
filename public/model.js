
export const empty = () => ({ frames: {}, stock: {} });
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
