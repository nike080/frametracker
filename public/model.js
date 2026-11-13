import { allRelics } from './relic-library.js';

export const empty = () => ({ frames: {}, stock: {}, relics: {}, goals: [], notes: {}, lastChange: null });
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
  if (workEntry(state, frame).done) return { kind: 'complete' };
  if (!frame.recipe) return { kind: 'unavailable' };
  const saved = workEntry(state, frame);
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

export const helminthEligible = frame => frame.category === 'warframes' && !frame.prime && frame.name !== 'Excalibur Umbra';
export const workEntry = (state, frame) => {
 const saved = entry(state, frame);
 return saved.repeat ? { ...saved, done:false, parts:saved.repeatParts ?? {} } : saved;
};
export const refinementLevels = ['intact','exceptional','flawless','radiant'];
export function relicLibrary(frames, locations = {}) {
 return [...new Set([...allRelics, ...Object.keys(locations), ...frames.flatMap(f => flatten(f.recipe).flatMap(p => (p.relics ?? []).map(r => r.name)))])].sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
}
export const relicTotal = (state,name) => refinementLevels.reduce((sum,level)=>sum+(state.relics?.[name]?.[level] ?? 0),0);
export function missingParts(frame,state) {
 const saved=workEntry(state,frame), result=[];
 if(saved.done) return result;
 function visit(node) {
  if(!node || saved.parts[node.id]===2) return;
  if(!saved.parts[node.id]) result.push(node);
  node.parts.forEach(visit);
 }
 visit(frame.recipe); return result;
}
export function sharedSources(frames,state,locations={}) {
 const groups=new Map();
 for(const frame of frames) for(const part of missingParts(frame,state)) {
  const sources=[...(part.drops ?? []).map(d=>({key:'drop:'+d.where,where:d.where,reward:part.name})), ...(part.relics ?? []).flatMap(r=>(locations[r.name] ?? []).map(d=>({key:'relic:'+d.where,where:d.where,reward:r.name})))];
  for(const source of sources) {
   const group=groups.get(source.key) ?? {where:source.where,rewards:[]};
   if(!group.rewards.some(r=>r.frameId===frame.id && r.partId===part.id && r.reward===source.reward)) group.rewards.push({frameId:frame.id,partId:part.id,reward:source.reward});
   groups.set(source.key,group);
  }
 }
 return [...groups.values()].filter(g=>new Set(g.rewards.map(r=>r.frameId)).size>1).sort((a,b)=>b.rewards.length-a.rewards.length);
}
export function collected(frame, state) {
  const saved = workEntry(state, frame);
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
    const saved = workEntry(state, frame);
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
    const saved = workEntry(state, frame);
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
    if(Object.hasOwn(item,'mastered')) saved.mastered = item.mastered === true;
    if(Object.hasOwn(item,'helminth')) saved.helminth = helminthEligible(byId.get(id) ?? {}) && item.helminth === true;
    if(Object.hasOwn(item,'repeat')) saved.repeat = item.repeat === true;
    if(Object.hasOwn(item,'repeatParts')) saved.repeatParts = record(item.repeatParts) ? Object.fromEntries(Object.entries(item.repeatParts).filter(([key,value])=>key.startsWith('/Lotus/') && [1,2].includes(value)).map(([key,value])=>[key,key===root?1:value])) : {};
    if (record(item.parts)) {
      for (const [part, value] of Object.entries(item.parts)) {
        if (part.startsWith('/Lotus/') && [1, 2].includes(value)) saved.parts[part] = part === root ? 1 : value;
      }
    }
    if (Number.isSafeInteger(item.paid) && item.paid >= 0) saved.paid = item.paid;
    clean.frames[id] = saved;
  }
  const library = new Set(relicLibrary(frames));
  if(record(raw.relics)) for(const [name,levels] of Object.entries(raw.relics)) {
    if(!library.has(name) || !record(levels)) continue;
    clean.relics[name]=Object.fromEntries(refinementLevels.filter(level=>Number.isSafeInteger(levels[level]) && levels[level]>=0).map(level=>[level,levels[level]]));
  }
  clean.stock = normalizeStock(raw.stock);
  Object.assign(clean, normalizeContext(raw, frames));
  return clean;
}

// Archive presentation intentionally groups unknown results into the vaulted bucket.
export const archiveAvailability = row => ['available', 'partial'].includes(row?.status) ? 'available' : 'vaulted';
export function relicPage(rows, {search='', onlyGoals=false, source='all', page=0, pageSize=24}={}) {
 const query=search.trim().toLowerCase();
 const matches=rows.filter(row=>row.name.toLowerCase().includes(query) && (!onlyGoals || row.goal) && (source==='all' || source==='active' && row.active || source==='source' && row.hasSource || source==='no-source' && !row.hasSource));
 const pages=Math.max(1,Math.ceil(matches.length/pageSize));
 const current=Math.max(0,Math.min(page,pages-1));
 return {items:matches.slice(current*pageSize,(current+1)*pageSize),total:matches.length,pages,page:current};
}
